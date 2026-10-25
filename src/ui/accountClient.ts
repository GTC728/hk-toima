import type { CareerStats } from './stats'

export interface Me {
  id: string
  displayName: string
  email: string | null
  friendCode: string
}

export interface DeviceSession {
  id: string
  deviceSummary: string
  createdAt: number
  expiresAt: number
  revokedAt: number | null
  current: boolean
}

export interface ConsumeResult {
  ok: boolean
  player?: Me
  needsImportConfirm?: boolean
  error?: string
  code?: string
}

async function readBody(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function asMe(data: Record<string, unknown>): Me | null {
  if (typeof data.id !== 'string' || typeof data.displayName !== 'string') return null
  if (typeof data.friendCode !== 'string') return null
  const email = data.email == null ? null : data.email
  if (email != null && typeof email !== 'string') return null
  return {
    id: data.id,
    displayName: data.displayName,
    email,
    friendCode: data.friendCode,
  }
}

/** 無 cookie 會建立匿名玩家。失敗就當 worker 未開，呼叫方用本機名。 */
export async function fetchMe(): Promise<Me | null> {
  try {
    const res = await fetch('/api/me', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
    if (!res.ok) return null
    return asMe(await readBody(res))
  } catch {
    return null
  }
}

export async function updateDisplayName(displayName: string): Promise<Me | null> {
  try {
    const res = await fetch('/api/me', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName }),
    })
    if (!res.ok) return null
    return asMe(await readBody(res))
  } catch {
    return null
  }
}

export async function fetchSessions(): Promise<DeviceSession[] | null> {
  try {
    const res = await fetch('/api/me/sessions', { credentials: 'include' })
    if (!res.ok) return null
    const data = await readBody(res)
    return Array.isArray(data.sessions) ? (data.sessions as DeviceSession[]) : []
  } catch {
    return null
  }
}

export async function logoutDevice(all: boolean): Promise<boolean> {
  try {
    const res = await fetch(all ? '/api/me/logout-all' : '/api/me/logout', {
      method: 'POST',
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

export async function sendMagicLink(
  email: string,
  turnstileToken: string,
): Promise<
  | { ok: true; delivery: 'sent' | 'logged'; devLink?: string }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch('/api/auth/email/send', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        ...(turnstileToken ? { turnstileToken } : {}),
      }),
    })
    const data = await readBody(res)
    if (!res.ok) {
      return {
        ok: false,
        error: typeof data.error === 'string' ? data.error : '寄唔到連結',
      }
    }
    return {
      ok: true,
      delivery: data.delivery === 'logged' ? 'logged' : 'sent',
      devLink: typeof data.devLink === 'string' ? data.devLink : undefined,
    }
  } catch {
    return { ok: false, error: '暫時連唔到伺服器' }
  }
}

const consumeInflight = new Map<string, Promise<ConsumeResult>>()

export async function consumeMagicLink(
  token: string,
  hasUnimportedLocalCareer: boolean,
): Promise<ConsumeResult> {
  const existing = consumeInflight.get(token)
  if (existing) return existing
  const pending = consumeMagicLinkOnce(token, hasUnimportedLocalCareer)
  consumeInflight.set(token, pending)
  return pending
}

async function consumeMagicLinkOnce(
  token: string,
  hasUnimportedLocalCareer: boolean,
): Promise<ConsumeResult> {
  try {
    const res = await fetch('/api/auth/email/consume', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, hasUnimportedLocalCareer }),
    })
    const data = await readBody(res)
    if (!res.ok) {
      return {
        ok: false,
        error: typeof data.error === 'string' ? data.error : '連結無效',
        code: typeof data.code === 'string' ? data.code : undefined,
      }
    }
    const player = asMe(
      data.player && typeof data.player === 'object'
        ? (data.player as Record<string, unknown>)
        : {},
    )
    if (!player) return { ok: false, error: '登入回應唔完整' }
    return {
      ok: true,
      player,
      needsImportConfirm: data.needsImportConfirm === true,
    }
  } catch {
    return { ok: false, error: '暫時連唔到伺服器' }
  }
}

export async function uploadCareer(
  stats: CareerStats,
): Promise<{ ok: true } | { ok: false; duplicate: boolean; error: string }> {
  try {
    const res = await fetch('/api/me/imports', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stats }),
    })
    const data = await readBody(res)
    if (res.status === 409 || data.code === 'duplicate_import') {
      return {
        ok: false,
        duplicate: true,
        error: typeof data.error === 'string' ? data.error : '呢批戰績已經上傳過',
      }
    }
    if (!res.ok) {
      return {
        ok: false,
        duplicate: false,
        error: typeof data.error === 'string' ? data.error : '上傳失敗',
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, duplicate: false, error: '暫時連唔到伺服器' }
  }
}

export async function downloadOwnData(): Promise<boolean> {
  try {
    const res = await fetch('/api/me/export', { credentials: 'include' })
    if (!res.ok) return false
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'toima-account.json'
    link.click()
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}

export async function deleteAccount(): Promise<boolean> {
  try {
    const res = await fetch('/api/me', {
      method: 'DELETE',
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

/** —— Friends F1 —— */

export interface FriendPlayer {
  id: string
  displayName: string
  friendCode: string
}

export type FriendPresence = 'offline' | 'online' | 'ingame'

export interface FriendEntry {
  id: string
  status: 'pending' | 'accepted' | 'declined'
  direction: 'in' | 'out'
  createdAt: number
  updatedAt: number
  presence?: FriendPresence
  player: FriendPlayer
}

export interface FriendChallenge {
  id: string
  friendshipId: string
  roomCode: string
  direction: 'in' | 'out'
  expiresAt: number
  createdAt: number
  player: FriendPlayer
}

export interface FriendsSnapshot {
  friends: FriendEntry[]
  incoming: FriendEntry[]
  outgoing: FriendEntry[]
  challenges: FriendChallenge[]
}

function asFriendPlayer(raw: unknown): FriendPlayer | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string') return null
  if (typeof o.displayName !== 'string') return null
  if (typeof o.friendCode !== 'string') return null
  return { id: o.id, displayName: o.displayName, friendCode: o.friendCode }
}

function asFriendEntry(raw: unknown): FriendEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string') return null
  if (o.status !== 'pending' && o.status !== 'accepted' && o.status !== 'declined') {
    return null
  }
  if (o.direction !== 'in' && o.direction !== 'out') return null
  const player = asFriendPlayer(o.player)
  if (!player) return null
  const presence =
    o.presence === 'offline' || o.presence === 'online' || o.presence === 'ingame'
      ? o.presence
      : undefined
  return {
    id: o.id,
    status: o.status,
    direction: o.direction,
    createdAt: typeof o.createdAt === 'number' ? o.createdAt : 0,
    updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : 0,
    presence,
    player,
  }
}

function asFriendChallenge(raw: unknown): FriendChallenge | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string') return null
  if (typeof o.friendshipId !== 'string') return null
  if (typeof o.roomCode !== 'string') return null
  if (o.direction !== 'in' && o.direction !== 'out') return null
  const player = asFriendPlayer(o.player)
  if (!player) return null
  return {
    id: o.id,
    friendshipId: o.friendshipId,
    roomCode: o.roomCode,
    direction: o.direction,
    expiresAt: typeof o.expiresAt === 'number' ? o.expiresAt : 0,
    createdAt: typeof o.createdAt === 'number' ? o.createdAt : 0,
    player,
  }
}

function asFriendsSnapshot(data: Record<string, unknown>): FriendsSnapshot | null {
  if (!Array.isArray(data.friends) || !Array.isArray(data.incoming) || !Array.isArray(data.outgoing)) {
    return null
  }
  const friends: FriendEntry[] = []
  const incoming: FriendEntry[] = []
  const outgoing: FriendEntry[] = []
  for (const row of data.friends) {
    const e = asFriendEntry(row)
    if (!e) return null
    friends.push(e)
  }
  for (const row of data.incoming) {
    const e = asFriendEntry(row)
    if (!e) return null
    incoming.push(e)
  }
  for (const row of data.outgoing) {
    const e = asFriendEntry(row)
    if (!e) return null
    outgoing.push(e)
  }
  const challenges: FriendChallenge[] = []
  if (Array.isArray(data.challenges)) {
    for (const row of data.challenges) {
      const c = asFriendChallenge(row)
      if (!c) return null
      challenges.push(c)
    }
  }
  return { friends, incoming, outgoing, challenges }
}

export async function fetchFriends(): Promise<FriendsSnapshot | null> {
  try {
    const res = await fetch('/api/friends', { credentials: 'include' })
    if (!res.ok) return null
    return asFriendsSnapshot(await readBody(res))
  } catch {
    return null
  }
}

export async function requestFriendByCode(
  friendCode: string,
): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  try {
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ friendCode }),
    })
    const data = await readBody(res)
    if (!res.ok) {
      return {
        ok: false,
        error: typeof data.error === 'string' ? data.error : '加友失敗',
        code: typeof data.code === 'string' ? data.code : undefined,
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: '暫時連唔到伺服器' }
  }
}

export async function acceptFriendRequest(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/friends/${encodeURIComponent(id)}/accept`, {
      method: 'POST',
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

export async function declineFriendRequest(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/friends/${encodeURIComponent(id)}/decline`, {
      method: 'POST',
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

export async function removeFriendship(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/friends/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

export async function pingFriendsPresence(): Promise<void> {
  try {
    await fetch('/api/friends/presence', {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    /* ignore */
  }
}

export interface RoomPeer {
  seat: number
  id: string
  displayName: string
  friendCode: string
}

export async function fetchRoomPeers(
  roomCode: string,
): Promise<RoomPeer[] | null> {
  try {
    const q = new URLSearchParams({ code: roomCode })
    const res = await fetch(`/api/friends/peers?${q}`, {
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = await readBody(res)
    if (!Array.isArray(data.peers)) return null
    const out: RoomPeer[] = []
    for (const raw of data.peers) {
      if (!raw || typeof raw !== 'object') continue
      const o = raw as Record<string, unknown>
      if (typeof o.seat !== 'number') continue
      if (typeof o.id !== 'string') continue
      if (typeof o.displayName !== 'string') continue
      if (typeof o.friendCode !== 'string') continue
      out.push({
        seat: o.seat,
        id: o.id,
        displayName: o.displayName,
        friendCode: o.friendCode,
      })
    }
    return out
  } catch {
    return null
  }
}

export async function challengeFriend(friendshipId: string): Promise<
  | { ok: true; roomCode: string; join: { code: string; seat: number; seatToken: string; wsPath: string }; expiresAt: number }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch('/api/friends/challenge', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ friendshipId }),
    })
    const data = await readBody(res)
    if (!res.ok) {
      return {
        ok: false,
        error: typeof data.error === 'string' ? data.error : '約局失敗',
      }
    }
    const challenge = data.challenge as Record<string, unknown> | undefined
    const join = data.join as Record<string, unknown> | undefined
    if (
      !challenge ||
      typeof challenge.roomCode !== 'string' ||
      typeof challenge.expiresAt !== 'number' ||
      !join ||
      typeof join.code !== 'string' ||
      typeof join.seat !== 'number' ||
      typeof join.seatToken !== 'string' ||
      typeof join.wsPath !== 'string'
    ) {
      return { ok: false, error: '約局回應異常' }
    }
    return {
      ok: true,
      roomCode: challenge.roomCode,
      expiresAt: challenge.expiresAt,
      join: {
        code: join.code,
        seat: join.seat as 0 | 1 | 2 | 3,
        seatToken: join.seatToken,
        wsPath: join.wsPath,
      },
    }
  } catch {
    return { ok: false, error: '暫時連唔到伺服器' }
  }
}

/** 邀請好友入現有私人房（唔新開房） */
export async function inviteFriendToRoom(
  friendshipId: string,
  roomCode: string,
): Promise<
  | { ok: true; roomCode: string; expiresAt: number }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch('/api/friends/challenge', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ friendshipId, roomCode }),
    })
    const data = await readBody(res)
    if (!res.ok) {
      return {
        ok: false,
        error: typeof data.error === 'string' ? data.error : '邀請失敗',
      }
    }
    const challenge = data.challenge as Record<string, unknown> | undefined
    if (
      !challenge ||
      typeof challenge.roomCode !== 'string' ||
      typeof challenge.expiresAt !== 'number'
    ) {
      return { ok: false, error: '邀請回應異常' }
    }
    return {
      ok: true,
      roomCode: challenge.roomCode,
      expiresAt: challenge.expiresAt,
    }
  } catch {
    return { ok: false, error: '暫時連唔到伺服器' }
  }
}

export async function acceptChallenge(
  id: string,
): Promise<{ ok: true; roomCode: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `/api/friends/challenges/${encodeURIComponent(id)}/accept`,
      { method: 'POST', credentials: 'include' },
    )
    const data = await readBody(res)
    if (!res.ok) {
      return {
        ok: false,
        error: typeof data.error === 'string' ? data.error : '接受失敗',
      }
    }
    if (typeof data.roomCode !== 'string') {
      return { ok: false, error: '缺少房碼' }
    }
    return { ok: true, roomCode: data.roomCode }
  } catch {
    return { ok: false, error: '暫時連唔到伺服器' }
  }
}

export async function declineChallenge(id: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/friends/challenges/${encodeURIComponent(id)}/decline`,
      { method: 'POST', credentials: 'include' },
    )
    return res.ok
  } catch {
    return false
  }
}
