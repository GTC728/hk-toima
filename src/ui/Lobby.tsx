import { useState } from 'react'
import type { Seat } from '../engine'
import {
  DEFAULT_RULES_DRAFT,
  TableRulesEditor,
  type RulesDraft,
} from './TableRulesEditor'
import { createRoom, joinRoom } from './online/api'
import type { JoinResponse } from '../../worker/protocol'
import {
  clearRoomSession,
  loadRoomSession,
  loadSessionForCode,
  saveRoomSession,
} from './online/session'
import { isMuted, setMuted } from './audio'
import { buildSeatNames, resolveStartNames } from './playerNames'

const SEAT_LABELS = ['東', '南', '西', '北'] as const

export interface LobbyStartConfig {
  humanSeats: boolean[]
  names: string[]
  rules: RulesDraft
  /** 練習提示：棄牌高亮；本機預設開 */
  practiceHints: boolean
}

export type LobbyMode = 'local' | 'create' | 'join'

interface LobbyProps {
  onStartLocal: (config: LobbyStartConfig) => void
  onEnterOnline: (join: JoinResponse, name: string, rules: RulesDraft) => void
  onOpenFans: () => void
  onOpenCalculator?: () => void
  onOpenLaBook?: () => void
  onOpenTutorial?: () => void
  onOpenStats?: () => void
}

export function Lobby({
  onStartLocal,
  onEnterOnline,
  onOpenFans,
  onOpenCalculator,
  onOpenLaBook,
  onOpenTutorial,
  onOpenStats,
}: LobbyProps) {
  const saved = loadRoomSession()
  const [mode, setMode] = useState<LobbyMode>('local')
  const [human, setHuman] = useState<boolean[]>([true, false, false, false])
  const [names, setNames] = useState(() =>
    buildSeatNames([true, false, false, false]),
  )
  const [rules, setRules] = useState<RulesDraft>({ ...DEFAULT_RULES_DRAFT })
  /** 本機預設開、網上預設關 */
  const [practiceHints, setPracticeHints] = useState(true)
  const [muted, setMutedUi] = useState(() => isMuted())
  const [playerName, setPlayerName] = useState(saved?.name || '玩家')
  const [joinCode, setJoinCode] = useState(saved?.code || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const humanCount = human.filter(Boolean).length

  function toggleSeat(seat: Seat) {
    setHuman((prev) => {
      const next = [...prev]
      if (next[seat] && humanCount <= 1) return prev
      next[seat] = !next[seat]
      setNames(buildSeatNames(next))
      return next
    })
  }

  function setAllHuman(count: number) {
    const next = [0, 1, 2, 3].map((i) => i < count)
    setHuman(next)
    setNames(buildSeatNames(next))
  }

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      const join = await createRoom(playerName.trim() || '東')
      saveRoomSession({
        code: join.code,
        seat: join.seat,
        seatToken: join.seatToken,
        name: playerName.trim() || '東',
      })
      onEnterOnline(join, playerName.trim() || '東', rules)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(reconnect = false) {
    setBusy(true)
    setError(null)
    try {
      const code = joinCode.trim().toUpperCase()
      if (code.length !== 6) throw new Error('請輸入 6 位房碼')
      const session = reconnect ? loadSessionForCode(code) : null
      const join = await joinRoom({
        code,
        name: playerName.trim() || undefined,
        seatToken: session?.seatToken,
      })
      saveRoomSession({
        code: join.code,
        seat: join.seat,
        seatToken: join.seatToken,
        name: playerName.trim() || '玩家',
      })
      onEnterOnline(join, playerName.trim() || '玩家', rules)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleReconnectSaved() {
    if (!saved) return
    setJoinCode(saved.code)
    setPlayerName(saved.name)
    setBusy(true)
    setError(null)
    try {
      const join = await joinRoom({
        code: saved.code,
        name: saved.name,
        seatToken: saved.seatToken,
      })
      saveRoomSession({
        code: join.code,
        seat: join.seat,
        seatToken: join.seatToken,
        name: saved.name,
      })
      onEnterOnline(join, saved.name, rules)
    } catch (e) {
      clearRoomSession()
      setError(
        e instanceof Error
          ? `重連失敗：${e.message}`
          : '重連失敗，請重新入房',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="lobby">
      <div className="lobby__hero">
        <p className="lobby__brand-en">HK ToiMA</p>
        <h1 className="lobby__brand">香港台麻</h1>
        <p className="lobby__tagline">港式台牌 · 十六張 · 本機／聯機</p>
      </div>

      <div className="lobby__modes" role="tablist" aria-label="玩法">
        {(
          [
            ['local', '本機'],
            ['create', '開房'],
            ['join', '入房'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            className={`lobby__mode ${mode === id ? 'is-active' : ''}`}
            onClick={() => {
              setMode(id)
              setPracticeHints(id === 'local')
              setError(null)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="lobby__panel" aria-label="開枱設定">
        <TableRulesEditor value={rules} onChange={setRules} disabled={busy} />

        <label className="lobby__toggle">
          <input
            type="checkbox"
            checked={practiceHints}
            onChange={(e) => setPracticeHints(e.target.checked)}
            disabled={busy}
          />
          <span>練習提示</span>
          <em>
            {mode === 'local'
              ? '建議棄牌高亮；聽牌顯示「等」'
              : '網上唔顯示棄牌提示（聽牌「等」仍會顯示）'}
          </em>
        </label>

        {mode === 'local' && (
          <>
            <h2 className="lobby__section-title">幾位真人入座？</h2>
            <p className="lobby__hint">其餘座位交 AI 補位；換位會遮手牌</p>

            <div className="lobby__quick">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`lobby__chip ${humanCount === n ? 'is-active' : ''}`}
                  onClick={() => setAllHuman(n)}
                >
                  {n} 人
                </button>
              ))}
            </div>

            <div className="lobby__seats">
              {([0, 1, 2, 3] as Seat[]).map((seat) => (
                <button
                  key={seat}
                  type="button"
                  className={`lobby__seat ${human[seat] ? 'is-human' : 'is-ai'}`}
                  onClick={() => toggleSeat(seat)}
                >
                  <span className="lobby__seat-wind">{SEAT_LABELS[seat]}</span>
                  <span className="lobby__seat-role">
                    {human[seat] ? '真人' : 'AI'}
                  </span>
                  {human[seat] && (
                    <input
                      className="lobby__seat-name"
                      value={names[seat]}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const v = e.target.value
                        setNames((prev) => {
                          const next = [...prev]
                          next[seat] = v
                          return next
                        })
                      }}
                      aria-label={`${SEAT_LABELS[seat]}家名`}
                      maxLength={8}
                    />
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="lobby__start"
              disabled={humanCount < 1}
              onClick={() =>
                onStartLocal({
                  humanSeats: human,
                  names: resolveStartNames(human, names),
                  rules,
                  practiceHints,
                })
              }
            >
              開枱
            </button>
          </>
        )}

        {mode === 'create' && (
          <>
            <h2 className="lobby__section-title">開網上房</h2>
            <p className="lobby__hint">
              產生 6 位房碼；要同時跑 worker（見 README）
            </p>
            <label className="lobby__field">
              <span>你嘅名</span>
              <input
                value={playerName}
                maxLength={16}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={busy}
              />
            </label>
            <button
              type="button"
              className="lobby__start"
              disabled={busy}
              onClick={() => void handleCreate()}
            >
              {busy ? '開房中…' : '開房'}
            </button>
          </>
        )}

        {mode === 'join' && (
          <>
            <h2 className="lobby__section-title">入網上房</h2>
            <p className="lobby__hint">輸入房碼；有 seatToken 可重連同一座位</p>
            <label className="lobby__field">
              <span>你嘅名</span>
              <input
                value={playerName}
                maxLength={16}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="lobby__field">
              <span>房碼</span>
              <input
                className="lobby__code-input"
                value={joinCode}
                maxLength={6}
                placeholder="例如 A3K9MP"
                onChange={(e) =>
                  setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                }
                disabled={busy}
                autoCapitalize="characters"
              />
            </label>
            <button
              type="button"
              className="lobby__start"
              disabled={busy || joinCode.trim().length !== 6}
              onClick={() => void handleJoin(false)}
            >
              {busy ? '入房中…' : '入房'}
            </button>
            {loadSessionForCode(joinCode.trim().toUpperCase()) && (
              <button
                type="button"
                className="lobby__secondary"
                disabled={busy}
                onClick={() => void handleJoin(true)}
              >
                用本機 token 重連
              </button>
            )}
            {saved && (
              <button
                type="button"
                className="lobby__secondary"
                disabled={busy}
                onClick={() => void handleReconnectSaved()}
              >
                重連上次房間 {saved.code}
              </button>
            )}
          </>
        )}

        {error && <p className="lobby__error">{error}</p>}
      </section>

      <nav className="lobby__footer">
        <button type="button" className="lobby__link" onClick={onOpenFans}>
          番數表
        </button>
        {onOpenCalculator && (
          <button
            type="button"
            className="lobby__link"
            onClick={onOpenCalculator}
          >
            計番機
          </button>
        )}
        {onOpenLaBook && (
          <button
            type="button"
            className="lobby__link"
            onClick={onOpenLaBook}
          >
            拉數簿
          </button>
        )}
        {onOpenTutorial && (
          <button
            type="button"
            className="lobby__link"
            onClick={onOpenTutorial}
          >
            學打牌
          </button>
        )}
        {onOpenStats && (
          <button type="button" className="lobby__link" onClick={onOpenStats}>
            戰績
          </button>
        )}
        <button
          type="button"
          className={`lobby__link lobby__mute ${muted ? 'is-muted' : ''}`}
          aria-pressed={muted}
          onClick={() => {
            const next = !muted
            setMuted(next)
            setMutedUi(next)
          }}
        >
          {muted ? '已靜音' : '靜音'}
        </button>
      </nav>
    </main>
  )
}
