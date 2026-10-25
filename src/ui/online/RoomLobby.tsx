import type { AiPersona, Seat } from '../../engine'
import { AI_PERSONA_LABEL } from '../../engine'
import { ShellButton } from '../shell/ShellButton'
import { TableRulesEditor, type RulesDraft } from '../TableRulesEditor'
import { RoomInvite } from './RoomInvite'

const WIND = ['東', '南', '西', '北'] as const

export type RoomSeatRow = {
  seat: Seat
  name: string
  kind: 'human' | 'ai' | 'empty'
  connected?: boolean
  persona?: AiPersona
}

interface RoomLobbyProps {
  code: string
  seat: Seat
  isHost: boolean
  statusLabel: string
  seats: RoomSeatRow[]
  hostSeat: Seat
  rules: RulesDraft
  roomRulesSummary?: string | null
  started: boolean
  error?: string | null
  eventLog?: string | null
  onCopyCode: () => void
  onRulesChange: (next: RulesDraft) => void
  onRulesCommit: (next: RulesDraft) => void
  onSetPersona: (seat: Seat, persona: AiPersona) => void
  onToggleAi: (seat: Seat, kind: 'ai' | 'empty') => void
  onFillAi: () => void
  onStart: () => void
  onLeave: () => void
}

/** 房間大廳：只佔右欄（中間留枱面） */
export function RoomLobby({
  code,
  seat,
  isHost,
  statusLabel,
  seats,
  hostSeat,
  rules,
  roomRulesSummary,
  started,
  error,
  eventLog,
  onCopyCode,
  onRulesChange,
  onRulesCommit,
  onSetPersona,
  onToggleAi,
  onFillAi,
  onStart,
  onLeave,
}: RoomLobbyProps) {
  return (
    <aside className="side room-side" aria-label="房間大廳">
      <header className="side__title room-side__head">
        <div className="room-side__code-block">
          <span className="room-side__label">房碼</span>
          <strong className="room-side__code">{code}</strong>
          <em className="room-side__meta">
            {WIND[seat]}家{isHost ? ' · 房主' : ''} · {statusLabel}
          </em>
        </div>
        <ShellButton variant="secondary" size="sm" onClick={onCopyCode}>
          複製
        </ShellButton>
      </header>

      <div className="side__body room-side__body">
        <h2>座位</h2>
        <div className="room-side__seats">
          {seats.map((s) => (
            <div
              key={s.seat}
              className={`shell-row room-side__seat${s.seat === seat ? ' is-you' : ''}`}
            >
              <div className="shell-row__main">
                <strong>
                  {WIND[s.seat]} · {s.name}
                </strong>
                <span>
                  {s.kind === 'human'
                    ? s.connected
                      ? '真人 · 在線'
                      : '真人 · 離線'
                    : s.kind === 'ai'
                      ? `AI · ${AI_PERSONA_LABEL[s.persona ?? 'attack']}`
                      : '空位'}
                </span>
              </div>
              {isHost &&
                !started &&
                s.kind !== 'human' &&
                s.seat !== hostSeat && (
                  <div className="room-side__seat-tools">
                    <select
                      className="shell-select"
                      aria-label={`${WIND[s.seat]}性格`}
                      value={s.persona ?? 'attack'}
                      onChange={(e) =>
                        onSetPersona(s.seat, e.target.value as AiPersona)
                      }
                    >
                      <option value="steady">穩陣</option>
                      <option value="attack">進攻</option>
                      <option value="gamble">搏糊</option>
                    </select>
                    <ShellButton
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        onToggleAi(s.seat, s.kind === 'ai' ? 'empty' : 'ai')
                      }
                    >
                      {s.kind === 'ai' ? '清位' : '設 AI'}
                    </ShellButton>
                  </div>
                )}
            </div>
          ))}
        </div>

        {isHost && !started && (
          <>
            <h2>枱規</h2>
            <TableRulesEditor
              value={rules}
              onChange={onRulesChange}
              onCommit={onRulesCommit}
            />
          </>
        )}

        {!isHost && roomRulesSummary && (
          <>
            <h2>枱規</h2>
            <p className="room-side__rules-ro">{roomRulesSummary}</p>
          </>
        )}

        {!started && (
          <>
            <h2>邀請</h2>
            <RoomInvite
              roomCode={code}
              hasEmptySeat={seats.some((s) => s.kind === 'empty')}
            />
          </>
        )}

        {isHost && !started && (
          <div className="room-side__actions">
            <ShellButton variant="secondary" onClick={onFillAi}>
              空位補 AI
            </ShellButton>
            <ShellButton variant="primary" onClick={onStart}>
              開始打牌
            </ShellButton>
          </div>
        )}

        {!isHost && !started && (
          <p className="room-side__wait">等緊房主開局…</p>
        )}
        {started && <p className="room-side__wait">載入枱面中…</p>}

        {(error || eventLog) && (
          <p className={error ? 'room-side__error' : 'room-side__event'}>
            {error || eventLog}
          </p>
        )}

        <ShellButton variant="ghost" onClick={onLeave}>
          離開房間
        </ShellButton>
      </div>
    </aside>
  )
}
