import type { FriendEntry, FriendPresence, FriendsSnapshot } from './accountClient'

const PRESENCE_RANK: Record<FriendPresence, number> = {
  ingame: 0,
  online: 1,
  offline: 2,
}

/** 待處理：收到嘅加友＋約局 */
export function socialAlertCount(snap: FriendsSnapshot | null): number {
  if (!snap) return 0
  const challengesIn = snap.challenges.filter((c) => c.direction === 'in').length
  return snap.incoming.length + challengesIn
}

export function sortFriendsByPresence(list: FriendEntry[]): FriendEntry[] {
  return [...list].sort((a, b) => {
    const ra = PRESENCE_RANK[a.presence ?? 'offline']
    const rb = PRESENCE_RANK[b.presence ?? 'offline']
    if (ra !== rb) return ra - rb
    return a.player.displayName.localeCompare(b.player.displayName, 'zh-Hant')
  })
}

export function joinInviteUrl(roomCode: string): string {
  const code = roomCode.trim().toUpperCase()
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/join/${code}`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function challengeRemainLabel(expiresAt: number, now = Date.now()): string {
  const sec = Math.max(0, Math.floor((expiresAt - now) / 1000))
  if (sec <= 0) return '已過期'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m <= 0) return `${s}秒`
  return `${m}分${s.toString().padStart(2, '0')}秒`
}
