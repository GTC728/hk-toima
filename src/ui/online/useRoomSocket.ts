import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClientMessage, ServerMessage } from '../../../worker/protocol'
import { wsUrlFromPath } from './api'

export type ConnStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

interface UseRoomSocketOptions {
  wsPath: string | null
  onMessage: (msg: ServerMessage) => void
  enabled?: boolean
}

export function useRoomSocket({
  wsPath,
  onMessage,
  enabled = true,
}: UseRoomSocketOptions) {
  const [status, setStatus] = useState<ConnStatus>('idle')
  const [lastError, setLastError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage
  const retryRef = useRef(0)
  const closedByUs = useRef(false)

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify(msg))
    return true
  }, [])

  useEffect(() => {
    if (!enabled || !wsPath) {
      setStatus('idle')
      return
    }

    closedByUs.current = false
    let cancelled = false
    let retryTimer: number | undefined

    function connect() {
      if (cancelled) return
      setStatus('connecting')
      setLastError(null)
      const ws = new WebSocket(wsUrlFromPath(wsPath!))
      wsRef.current = ws

      ws.onopen = () => {
        if (cancelled) return
        retryRef.current = 0
        setStatus('open')
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as ServerMessage
          onMessageRef.current(msg)
        } catch {
          /* ignore malformed */
        }
      }

      ws.onerror = () => {
        if (cancelled) return
        setLastError('連線錯誤')
        setStatus('error')
      }

      ws.onclose = () => {
        if (cancelled || closedByUs.current) {
          setStatus('closed')
          return
        }
        setStatus('closed')
        const attempt = retryRef.current++
        const delay = Math.min(8_000, 600 * 2 ** attempt)
        retryTimer = window.setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      cancelled = true
      closedByUs.current = true
      if (retryTimer) window.clearTimeout(retryTimer)
      const ws = wsRef.current
      wsRef.current = null
      if (ws) {
        try {
          ws.close(1000, 'leave')
        } catch {
          /* ignore */
        }
      }
    }
  }, [wsPath, enabled])

  return { status, lastError, send }
}
