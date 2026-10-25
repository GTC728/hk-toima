import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JoinResponse } from '../../worker/protocol'
import type { AccountModel } from './useAccount'
import {
  acceptChallenge,
  acceptFriendRequest,
  challengeFriend,
  declineChallenge,
  declineFriendRequest,
  fetchFriends,
  pingFriendsPresence,
  removeFriendship,
  requestFriendByCode,
  type FriendPresence,
  type FriendsSnapshot,
} from './accountClient'
import {
  challengeRemainLabel,
  copyText,
  joinInviteUrl,
  sortFriendsByPresence,
} from './friendsUi'
import {
  addLocalFriend,
  loadLocalFriends,
  removeLocalFriend,
} from './localFriends'
import { joinRoom } from './online/api'
import { loadDefaultRules } from './rulesPrefs'
import { loadCareerStats } from './stats'
import { frequentOpponents, formatRate } from './stats-s12'
import type { RulesDraft } from './TableRulesEditor'

function presenceLabel(p: FriendPresence | undefined): string {
  if (p === 'ingame') return '對局中'
  if (p === 'online') return '網上'
  return '離線'
}

interface SocialPaneProps {
  account: AccountModel
  onEnterOnline?: (
    join: JoinResponse,
    name: string,
    rules: RulesDraft,
    opts?: { matchMode?: 'private' },
  ) => void
  /** 待處理數量變化（角標） */
  onAlertsChange?: (n: number) => void
}

/** F0 本機備忘 + F1 請求／名單 + F2 在線／約局 */
export function SocialPane({
  account,
  onEnterOnline,
  onAlertsChange,
}: SocialPaneProps) {
  const code = account.me?.friendCode
  const loggedIn = Boolean(account.me)
  const [localFriends, setLocalFriends] = useState(() => loadLocalFriends())
  const [draft, setDraft] = useState('')
  const [snap, setSnap] = useState<FriendsSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const opps = useMemo(
    () => frequentOpponents(loadCareerStats().matches),
    [localFriends, snap],
  )

  const refresh = useCallback(async () => {
    if (!loggedIn) {
      setSnap(null)
      onAlertsChange?.(0)
      return
    }
    setLoading(true)
    const next = await fetchFriends()
    setSnap(next)
    if (next) {
      const alerts =
        next.incoming.length +
        next.challenges.filter((c) => c.direction === 'in').length
      onAlertsChange?.(alerts)
    }
    setLoading(false)
  }, [loggedIn, onAlertsChange])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!loggedIn) return
    void pingFriendsPresence()
    const presence = window.setInterval(() => void pingFriendsPresence(), 45_000)
    const poll = window.setInterval(() => void refresh(), 12_000)
    const tick = window.setInterval(() => setNowTick(Date.now()), 15_000)
    return () => {
      window.clearInterval(presence)
      window.clearInterval(poll)
      window.clearInterval(tick)
    }
  }, [loggedIn, refresh])

  async function sendRequest() {
    const trimmed = draft.trim().toUpperCase()
    if (!trimmed) return
    setMsg(null)
    if (!loggedIn) {
      setLocalFriends(addLocalFriend(trimmed))
      setDraft('')
      setMsg('已加入本機備忘（登入後可用真加友）')
      return
    }
    const result = await requestFriendByCode(trimmed)
    if (!result.ok) {
      setMsg(result.error)
      return
    }
    setDraft('')
    setMsg('已送出好友請求')
    await refresh()
  }

  async function startChallenge(friendshipId: string) {
    if (!onEnterOnline || !account.me) {
      setMsg('暫時唔可以約局')
      return
    }
    setBusyId(friendshipId)
    setMsg(null)
    const result = await challengeFriend(friendshipId)
    setBusyId(null)
    if (!result.ok) {
      setMsg(result.error)
      return
    }
    const link = joinInviteUrl(result.roomCode)
    const copied = await copyText(link)
    setMsg(
      copied
        ? `已開房 ${result.roomCode}，邀請連結已複製`
        : `已開房 ${result.roomCode}`,
    )
    onEnterOnline(result.join, account.me.displayName, loadDefaultRules(), {
      matchMode: 'private',
    })
  }

  async function enterRoom(roomCode: string, busyKey: string) {
    if (!onEnterOnline || !account.me) {
      setMsg('暫時唔可以入房')
      return
    }
    setBusyId(busyKey)
    setMsg(null)
    try {
      const join = await joinRoom({
        code: roomCode,
        name: account.me.displayName,
      })
      setBusyId(null)
      onEnterOnline(join, account.me.displayName, loadDefaultRules(), {
        matchMode: 'private',
      })
    } catch (err) {
      setBusyId(null)
      setMsg(err instanceof Error ? err.message : '入房失敗')
    }
  }

  async function joinChallenge(challengeId: string) {
    setBusyId(challengeId)
    setMsg(null)
    const accepted = await acceptChallenge(challengeId)
    if (!accepted.ok) {
      setBusyId(null)
      setMsg(accepted.error)
      return
    }
    await enterRoom(accepted.roomCode, challengeId)
  }

  async function copyInvite(roomCode: string) {
    const ok = await copyText(joinInviteUrl(roomCode))
    setMsg(ok ? `已複製入房連結（${roomCode}）` : '複製失敗')
  }

  function confirmRemove(id: string, name: string) {
    if (!window.confirm(`解除同「${name}」嘅好友？`)) return
    void removeFriendship(id).then(refresh)
  }

  const filteredFriends = useMemo(() => {
    const list = sortFriendsByPresence(snap?.friends ?? [])
    const q = filter.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (f) =>
        f.player.displayName.toLowerCase().includes(q) ||
        f.player.friendCode.toLowerCase().includes(q),
    )
  }, [snap, filter])

  const challengesIn = snap?.challenges.filter((c) => c.direction === 'in') ?? []
  const challengesOut =
    snap?.challenges.filter((c) => c.direction === 'out') ?? []
  const onlineCount = (snap?.friends ?? []).filter(
    (f) => f.presence === 'online' || f.presence === 'ingame',
  ).length

  return (
    <div className="you-pane">
      <section className="fan-page__section" aria-label="朋友碼">
        <h2>我嘅朋友碼</h2>
        {code ? (
          <>
            <p className="settings-account__code">{code}</p>
            <button
              type="button"
              className="settings-account__btn"
              onClick={() => void account.copyCode()}
            >
              複製朋友碼
            </button>
          </>
        ) : (
          <p className="fan-page__note">登入或開帳戶之後先有朋友碼。</p>
        )}
        <label className="settings-field">
          <span>{loggedIn ? '用朋友碼加友' : '加入本機備忘'}</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void sendRequest()
            }}
            placeholder="貼上朋友碼"
            maxLength={16}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button
          type="button"
          className="settings-account__btn"
          onClick={() => void sendRequest()}
        >
          {loggedIn ? '送出請求' : '加入本機清單'}
        </button>
        {msg && (
          <p className="fan-page__note" role="status">
            {msg}
          </p>
        )}
        {loggedIn && (
          <button
            type="button"
            className="stats-page__fav"
            onClick={() => void refresh()}
          >
            {loading ? '刷新中…' : '刷新名單'}
          </button>
        )}
      </section>

      {loggedIn && (
        <>
          <section className="fan-page__section" aria-label="約局">
            <h2>
              約局邀請
              {(challengesIn.length > 0 || challengesOut.length > 0) && (
                <em className="you-nav__count">
                  {' '}
                  {challengesIn.length + challengesOut.length}
                </em>
              )}
            </h2>
            <p className="fan-page__note">
              私人房／房內邀請 · 10 分鐘內有效 · 可複製 `#/join/房碼`
            </p>
            {challengesIn.length === 0 && challengesOut.length === 0 ? (
              <p className="stats-page__empty">未有約局</p>
            ) : (
              <>
                {challengesIn.length > 0 && (
                  <ul className="stats-page__fan-list" aria-label="收到約局">
                    {challengesIn.map((c) => (
                      <li key={c.id}>
                        <span>
                          {c.player.displayName}{' '}
                          <small>
                            {c.roomCode} · 剩{challengeRemainLabel(c.expiresAt, nowTick)}
                          </small>
                        </span>
                        <span className="friend-row__actions">
                          <button
                            type="button"
                            className="settings-account__btn"
                            disabled={busyId === c.id}
                            onClick={() => void joinChallenge(c.id)}
                          >
                            入席
                          </button>
                          <button
                            type="button"
                            className="stats-page__fav"
                            onClick={() => void copyInvite(c.roomCode)}
                          >
                            複製連結
                          </button>
                          <button
                            type="button"
                            className="stats-page__fav"
                            onClick={() =>
                              void declineChallenge(c.id).then(refresh)
                            }
                          >
                            拒絕
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {challengesOut.length > 0 && (
                  <ul className="stats-page__fan-list" aria-label="已約局">
                    {challengesOut.map((c) => (
                      <li key={c.id}>
                        <span>
                          等 {c.player.displayName} · {c.roomCode}{' '}
                          <small>
                            剩{challengeRemainLabel(c.expiresAt, nowTick)}
                          </small>
                        </span>
                        <span className="friend-row__actions">
                          {onEnterOnline && (
                            <button
                              type="button"
                              className="settings-account__btn"
                              disabled={busyId === `re:${c.id}`}
                              onClick={() =>
                                void enterRoom(c.roomCode, `re:${c.id}`)
                              }
                            >
                              回房
                            </button>
                          )}
                          <button
                            type="button"
                            className="stats-page__fav"
                            onClick={() => void copyInvite(c.roomCode)}
                          >
                            複製連結
                          </button>
                          <button
                            type="button"
                            className="stats-page__fav"
                            onClick={() =>
                              void declineChallenge(c.id).then(refresh)
                            }
                          >
                            取消
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          <section className="fan-page__section" aria-label="請求">
            <h2>
              請求
              {(snap?.incoming.length ?? 0) > 0 && (
                <em className="you-nav__count"> {snap!.incoming.length}</em>
              )}
            </h2>
            {loading && !snap ? (
              <p className="fan-page__note">載入中…</p>
            ) : (
              <>
                <h3 className="settings-account__label">收到</h3>
                {(snap?.incoming.length ?? 0) === 0 ? (
                  <p className="stats-page__empty">未有收到嘅請求</p>
                ) : (
                  <ul className="stats-page__fan-list" aria-label="收到嘅請求">
                    {snap!.incoming.map((f) => (
                      <li key={f.id}>
                        <span>
                          {f.player.displayName}{' '}
                          <small>{f.player.friendCode}</small>
                        </span>
                        <span className="friend-row__actions">
                          <button
                            type="button"
                            className="settings-account__btn"
                            onClick={() =>
                              void acceptFriendRequest(f.id).then(refresh)
                            }
                          >
                            接受
                          </button>
                          <button
                            type="button"
                            className="stats-page__fav"
                            onClick={() =>
                              void declineFriendRequest(f.id).then(refresh)
                            }
                          >
                            拒絕
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <h3 className="settings-account__label">已送出</h3>
                {(snap?.outgoing.length ?? 0) === 0 ? (
                  <p className="stats-page__empty">未有待處理請求</p>
                ) : (
                  <ul className="stats-page__fan-list" aria-label="已送出請求">
                    {snap!.outgoing.map((f) => (
                      <li key={f.id}>
                        <span>
                          {f.player.displayName}{' '}
                          <small>{f.player.friendCode}</small>
                        </span>
                        <button
                          type="button"
                          className="stats-page__fav"
                          onClick={() =>
                            void removeFriendship(f.id).then(refresh)
                          }
                        >
                          取消
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          <section className="fan-page__section" aria-label="好友名單">
            <h2>好友名單</h2>
            <p className="fan-page__note">
              {snap
                ? `${snap.friends.length} 位 · ${onlineCount} 位活躍 · 綠網上 · 金對局中`
                : '載入失敗時可重試'}
            </p>
            <label className="settings-field">
              <span>搜尋</span>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="顯示名或朋友碼"
                maxLength={32}
              />
            </label>
            {filteredFriends.length === 0 ? (
              <p className="stats-page__empty">未有好友</p>
            ) : (
              <ul className="stats-page__fan-list" aria-label="好友">
                {filteredFriends.map((f) => (
                  <li key={f.id}>
                    <span>
                      <span
                        className={`friend-presence friend-presence--${f.presence ?? 'offline'}`}
                        title={presenceLabel(f.presence)}
                        aria-label={presenceLabel(f.presence)}
                      />
                      {f.player.displayName}{' '}
                      <small>
                        {f.player.friendCode}
                        {f.presence && f.presence !== 'offline'
                          ? ` · ${presenceLabel(f.presence)}`
                          : ''}
                      </small>
                    </span>
                    <span className="friend-row__actions">
                      {onEnterOnline && (
                        <button
                          type="button"
                          className="settings-account__btn"
                          disabled={busyId === f.id}
                          onClick={() => void startChallenge(f.id)}
                        >
                          約局
                        </button>
                      )}
                      <button
                        type="button"
                        className="stats-page__fav"
                        onClick={() =>
                          confirmRemove(f.id, f.player.displayName)
                        }
                      >
                        解除
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {!loggedIn && (
        <section className="fan-page__section" aria-label="本機朋友">
          <h2>本機備忘</h2>
          <p className="fan-page__note">
            未登入只記本機朋友碼。登入後可用真加友同約局。
          </p>
          {localFriends.length === 0 ? (
            <p className="stats-page__empty">未有備忘</p>
          ) : (
            <ul className="stats-page__fan-list" aria-label="本機朋友">
              {localFriends.map((f) => (
                <li key={f}>
                  <span>{f}</span>
                  <button
                    type="button"
                    className="stats-page__fav"
                    onClick={() => setLocalFriends(removeLocalFriend(f))}
                  >
                    移除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="fan-page__section" aria-label="常遇">
        <h2>常遇對手</h2>
        <p className="fan-page__note">
          由本機完場對手名累積。有朋友碼可喺上面加友。
        </p>
        {opps.length === 0 ? (
          <p className="stats-page__empty">未有對手名紀錄</p>
        ) : (
          <ul className="stats-page__fan-list" aria-label="常遇">
            {opps.map((o) => (
              <li key={o.name}>
                <span>{o.name}</span>
                <span>
                  {formatRate(o.rate)}（{o.n}）
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="fan-page__section" aria-label="枱團">
        <h2>枱團／俱樂部</h2>
        <p className="fan-page__note">
          枱團實體、成員榜 — F3。而家用私人房碼湊局。
        </p>
      </section>
    </div>
  )
}
