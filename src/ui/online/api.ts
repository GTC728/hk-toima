import type { JoinResponse } from '../../../worker/protocol'
import type { Seat, TableRules } from '../../engine'

export type MatchMode = 'casual' | 'ranked'

export type MatchStatusResponse =
  | {
      status: 'queued'
      ticketId: string
      mode: MatchMode
      position: number
      queueSize: number
      waitedSec: number
      fillAiAfterSec: number
    }
  | {
      status: 'matched'
      ticketId: string
      mode: MatchMode
      join: JoinResponse
      fillAi: boolean
      rules?: Partial<TableRules>
    }
  | { status: 'gone'; ticketId: string; error?: string }
  | { status: 'left'; ticketId: string }

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; message?: string }
    return data.error || data.message || res.statusText
  } catch {
    return res.statusText || `HTTP ${res.status}`
  }
}

export async function createRoom(name?: string): Promise<JoinResponse> {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as JoinResponse
}

export async function joinRoom(opts: {
  code: string
  name?: string
  seat?: Seat
  seatToken?: string
}): Promise<JoinResponse> {
  const code = opts.code.trim().toUpperCase()
  const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/join`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: opts.name,
      seat: opts.seat,
      seatToken: opts.seatToken,
    }),
  })
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as JoinResponse
}

export function wsUrlFromPath(wsPath: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}${wsPath}`
}

export async function joinMatch(opts: {
  mode: MatchMode
  name: string
  fillAiAfterSec: number
  rules?: Partial<TableRules>
  rating?: number
}): Promise<MatchStatusResponse> {
  const res = await fetch('/api/match/join', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(opts),
  })
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as MatchStatusResponse
}

export async function matchStatus(
  ticketId: string,
  mode: MatchMode,
): Promise<MatchStatusResponse> {
  const q = new URLSearchParams({ ticketId, mode })
  const res = await fetch(`/api/match/status?${q}`, {
    credentials: 'include',
  })
  if (!res.ok && res.status !== 404) throw new Error(await readError(res))
  return (await res.json()) as MatchStatusResponse
}

export async function leaveMatch(
  ticketId: string,
  mode: MatchMode,
): Promise<void> {
  await fetch('/api/match/leave', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ticketId, mode }),
  })
}
