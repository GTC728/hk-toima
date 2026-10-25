import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchFriends,
  fetchRoomPeers,
  inviteFriendToRoom,
  type FriendEntry,
} from '../accountClient'
import {
  copyText,
  joinInviteUrl,
  sortFriendsByPresence,
} from '../friendsUi'
import { ShellButton } from '../shell/ShellButton'

function presenceLabel(p: FriendEntry['presence']): string {
  if (p === 'ingame') return '對局中'
  if (p === 'online') return '網上'
  return '離線'
}

interface RoomInviteProps {
  roomCode: string
  /** 有空位先可邀請入席 */
  hasEmptySeat: boolean
  disabled?: boolean
}

/** 私人房大廳：邀請好友入席（沿用現有房碼） */
export function RoomInvite({
  roomCode,
  hasEmptySeat,
  disabled = false,
}: RoomInviteProps) {
  const [friends, setFriends] = useState<FriendEntry[] | null>(null)
  const [peerIds, setPeerIds] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [snap, peers] = await Promise.all([
      fetchFriends(),
      fetchRoomPeers(roomCode),
    ])
    setFriends(snap?.friends ?? null)
    setPeerIds(new Set((peers ?? []).map((p) => p.id)))
    setLoading(false)
  }, [roomCode])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 20_000)
    return () => window.clearInterval(id)
  }, [refresh])

  const inviteable = useMemo(() => {
    if (!friends) return []
    return sortFriendsByPresence(
      friends.filter((f) => !peerIds.has(f.player.id)),
    )
  }, [friends, peerIds])

  async function invite(friendshipId: string, name: string) {
    if (disabled || !hasEmptySeat) return
    setBusyId(friendshipId)
    setMsg(null)
    const result = await inviteFriendToRoom(friendshipId, roomCode)
    setBusyId(null)
    if (!result.ok) {
      setMsg(result.error)
      return
    }
    const link = joinInviteUrl(result.roomCode)
    const copied = await copyText(link)
    setMsg(
      copied
        ? `已邀請 ${name} · 連結已複製`
        : `已邀請 ${name} · 房碼 ${result.roomCode}`,
    )
    void refresh()
  }

  async function copyLink() {
    const ok = await copyText(joinInviteUrl(roomCode))
    setMsg(ok ? '邀請連結已複製' : `房碼 ${roomCode}`)
  }

  return (
    <div className="room-invite">
      <p className="room-invite__note">
        對方會喺社交頁收到約局；接受後入呢個房。
      </p>
      <div className="room-invite__actions">
        <ShellButton
          variant="secondary"
          size="sm"
          onClick={() => void copyLink()}
        >
          複製邀請連結
        </ShellButton>
        <ShellButton
          variant="secondary"
          size="sm"
          disabled={loading}
          onClick={() => void refresh()}
        >
          {loading ? '刷新中…' : '刷新名單'}
        </ShellButton>
      </div>

      {friends === null && !loading && (
        <p className="room-invite__hint">登入後可邀請好友入席</p>
      )}

      {friends && inviteable.length === 0 && (
        <p className="room-invite__hint">
          {friends.length === 0 ? '未有好友' : '好友已全部喺房或名單空'}
        </p>
      )}

      {!hasEmptySeat && (
        <p className="room-invite__hint">冇空位 — 請先清位（AI → 空）再邀請</p>
      )}

      {inviteable.length > 0 && (
        <ul className="room-invite__list" aria-label="可邀請好友">
          {inviteable.map((f) => (
            <li key={f.id} className="shell-row">
              <div className="shell-row__main">
                <strong>{f.player.displayName}</strong>
                <span>{presenceLabel(f.presence)}</span>
              </div>
              <ShellButton
                size="sm"
                variant="primary"
                disabled={disabled || !hasEmptySeat || busyId === f.id}
                onClick={() => void invite(f.id, f.player.displayName)}
              >
                {busyId === f.id ? '邀請中…' : '邀請'}
              </ShellButton>
            </li>
          ))}
        </ul>
      )}

      {msg && (
        <p className="room-invite__msg" role="status">
          {msg}
        </p>
      )}
    </div>
  )
}
