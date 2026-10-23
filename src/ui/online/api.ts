import type { JoinResponse } from '../../../worker/protocol'
import type { Seat } from '../../engine'

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
