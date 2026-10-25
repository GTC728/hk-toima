import { useEffect, useRef, useState } from 'react'
import { remainingSec, type ActionLogEntry, type TileId } from '../engine'
import { playBeep, playForLogEntries } from './audio'
import { loadLowTimeWarn } from './extraPrefs'
import { loadLowTimeSec, loadSfxTickOn } from './leftoverPrefs'

/**
 * 本機同聯機共用：動作音效、倒數 tick、選牌／叮 重置。
 * 唔改牌桌版面。
 */
export function useTableChrome(opts: {
  actionLog: ActionLogEntry[] | undefined
  deadlineAt: number | null
  /** 變咗就清選牌同叮。第一次見到唔清（避免入座重播）。 */
  selectionKey: string
  /** 倒數到 0 先叫。回傳 false 就唔鎖死，下一 tick 再試。 */
  canExpire?: () => boolean
  onExpire?: () => void
}) {
  const [selectedTile, setSelectedTile] = useState<TileId | null>(null)
  const [declareDing, setDeclareDing] = useState(false)
  const [remainSec, setRemainSec] = useState<number | null>(null)
  const logLenRef = useRef<number | null>(null)
  const seenKey = useRef<string | null>(null)
  const timeoutFired = useRef(false)
  const lowWarned = useRef(false)
  const onExpireRef = useRef(opts.onExpire)
  const canExpireRef = useRef(opts.canExpire)
  onExpireRef.current = opts.onExpire
  canExpireRef.current = opts.canExpire

  useEffect(() => {
    const log = opts.actionLog
    if (!log) return
    if (logLenRef.current == null) {
      logLenRef.current = log.length
      return
    }
    if (log.length > logLenRef.current) {
      playForLogEntries(log, logLenRef.current)
    }
    logLenRef.current = log.length
  }, [opts.actionLog])

  useEffect(() => {
    if (seenKey.current == null) {
      seenKey.current = opts.selectionKey
      return
    }
    if (seenKey.current === opts.selectionKey) return
    seenKey.current = opts.selectionKey
    setSelectedTile(null)
    setDeclareDing(false)
  }, [opts.selectionKey])

  useEffect(() => {
    if (opts.deadlineAt == null) {
      setRemainSec(null)
      return
    }
    timeoutFired.current = false
    lowWarned.current = false
    const deadlineAt = opts.deadlineAt
    const tick = () => {
      const rem = remainingSec(deadlineAt)
      setRemainSec(rem)
      const lowAt = loadLowTimeSec()
      if (
        rem > 0 &&
        rem <= lowAt &&
        !lowWarned.current &&
        loadLowTimeWarn() &&
        loadSfxTickOn()
      ) {
        lowWarned.current = true
        playBeep(880, 90, 'square', 0.07)
      }
      if (rem > lowAt) lowWarned.current = false
      if (rem > 0 || timeoutFired.current) return
      if (!onExpireRef.current) return
      if (canExpireRef.current && !canExpireRef.current()) return
      timeoutFired.current = true
      onExpireRef.current()
    }
    tick()
    const id = window.setInterval(tick, 200)
    return () => window.clearInterval(id)
  }, [opts.deadlineAt])

  function clearSelection() {
    setSelectedTile(null)
    setDeclareDing(false)
  }

  return {
    selectedTile,
    setSelectedTile,
    declareDing,
    setDeclareDing,
    remainSec,
    clearSelection,
  }
}
