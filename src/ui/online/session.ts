import type { Seat } from '../../engine'

const STORAGE_KEY = 'hk-toima-room-session'

export interface RoomSession {
  code: string
  seat: Seat
  seatToken: string
  name: string
  savedAt: number
}

export function loadRoomSession(): RoomSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as RoomSession
    if (
      typeof data.code !== 'string' ||
      data.code.length !== 6 ||
      typeof data.seatToken !== 'string' ||
      !(data.seat === 0 || data.seat === 1 || data.seat === 2 || data.seat === 3)
    ) {
      return null
    }
    return data
  } catch {
    return null
  }
}

export function saveRoomSession(session: Omit<RoomSession, 'savedAt'>): void {
  const payload: RoomSession = { ...session, savedAt: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function clearRoomSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function loadSessionForCode(code: string): RoomSession | null {
  const s = loadRoomSession()
  if (!s) return null
  if (s.code.toUpperCase() !== code.toUpperCase()) return null
  return s
}
