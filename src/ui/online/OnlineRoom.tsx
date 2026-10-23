import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ClientMessage,
  JoinResponse,
  RoomSnapshot,
  ServerMessage,
} from '../../../worker/protocol'
import {
  remainingSec,
  type Action,
  type PrivateGameView,
  type Seat,
  type TableRules,
  type TileId,
} from '../../engine'
import { announceCall, playForLogEntries } from '../audio'
import { InstantToast } from '../InstantToast'
import { Settlement } from '../Settlement'
import { TableView } from '../TableView'
import {
  DEFAULT_RULES_DRAFT,
  TableRulesEditor,
  type RulesDraft,
} from '../TableRulesEditor'
import { clearRoomSession, saveRoomSession } from './session'
import { useRoomSocket } from './useRoomSocket'

const WIND = ['東', '南', '西', '北'] as const

function rulesDraftFrom(rules: TableRules): RulesDraft {
  return {
    base: rules.base,
    fanValue: rules.fanValue,
    maxLaKou: rules.maxLaKou,
    fiveTongShunFan: rules.fiveTongShunFan,
    turnTimeoutSec: rules.turnTimeoutSec ?? DEFAULT_RULES_DRAFT.turnTimeoutSec,
    claimTimeoutSec:
      rules.claimTimeoutSec ?? DEFAULT_RULES_DRAFT.claimTimeoutSec,
    matchCircles: rules.matchCircles ?? DEFAULT_RULES_DRAFT.matchCircles,
  }
}

interface OnlineRoomProps {
  join: JoinResponse
  playerName: string
  /** Host draft rules — sent with start */
  rulesDraft: RulesDraft
  onLeave: () => void
}

export function OnlineRoom({
  join,
  playerName,
  rulesDraft,
  onLeave,
}: OnlineRoomProps) {
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [view, setView] = useState<PrivateGameView | null>(null)
  const [seat, setSeat] = useState<Seat>(join.seat)
  const [error, setError] = useState<string | null>(null)
  const [eventLog, setEventLog] = useState<string | null>(null)
  const [selectedTile, setSelectedTile] = useState<TileId | null>(null)
  const [declareDing, setDeclareDing] = useState(false)
  const [rules, setRules] = useState<RulesDraft>(rulesDraft)
  const [actionDeadlineAt, setActionDeadlineAt] = useState<number | null>(null)
  const [remainSec, setRemainSec] = useState<number | null>(null)
  const logLenRef = useRef(0)
  const phaseRef = useRef<string>('')

  const onMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'welcome':
        setSeat(msg.seat)
        setRoom(msg.room)
        setRules(rulesDraftFrom(msg.room.rules))
        saveRoomSession({
          code: msg.code,
          seat: msg.seat,
          seatToken: msg.seatToken,
          name: playerName,
        })
        break
      case 'room':
        setRoom(msg.room)
        setRules(rulesDraftFrom(msg.room.rules))
        break
      case 'private':
        setView(msg.view)
        setActionDeadlineAt(
          msg.actionDeadlineAt === undefined
            ? null
            : msg.actionDeadlineAt,
        )
        break
      case 'public':
        if (msg.actionDeadlineAt !== undefined) {
          setActionDeadlineAt(msg.actionDeadlineAt)
        }
        break
      case 'error':
        setError(msg.message)
        break
      case 'event':
        setEventLog(msg.message)
        // Fallback voice cues from event text
        if (/碰/.test(msg.message)) announceCall('pong')
        else if (/上|吃/.test(msg.message)) announceCall('chi')
        else if (/槓/.test(msg.message)) announceCall('kong')
        else if (/食|糊|自摸/.test(msg.message)) announceCall('win')
        else if (/叮/.test(msg.message)) announceCall('ding')
        break
      case 'pong':
        break
    }
  }, [playerName])

  const { status, lastError, send } = useRoomSocket({
    wsPath: join.wsPath,
    onMessage,
  })

  const handKeyRef = useRef<string>('')
  useEffect(() => {
    if (!view) return
    const key = `${view.phase}|${view.justDrawn ?? ''}|${view.hand.join(',')}`
    if (handKeyRef.current && handKeyRef.current !== key) {
      setSelectedTile(null)
      setDeclareDing(false)
    }
    handKeyRef.current = key
  }, [view])

  // SFX from actionLog（primary）；phase 變化作後備（舊 worker 無 log）
  useEffect(() => {
    if (!view) return
    const log = view.actionLog
    if (log && log.length > logLenRef.current) {
      playForLogEntries(log, logLenRef.current)
      logLenRef.current = log.length
    } else if (
      phaseRef.current &&
      phaseRef.current !== view.phase &&
      view.phase === 'round_over' &&
      view.lastResult?.kind === 'win'
    ) {
      announceCall('win')
    }
    phaseRef.current = view.phase
  }, [view])

  useEffect(() => {
    if (actionDeadlineAt == null) {
      setRemainSec(null)
      return
    }
    const tick = () => setRemainSec(remainingSec(actionDeadlineAt))
    tick()
    const id = window.setInterval(tick, 200)
    return () => window.clearInterval(id)
  }, [actionDeadlineAt])

  const isHost = room != null && seat === room.hostSeat
  const started = room?.started ?? false
  const names = useMemo(
    () => room?.seats.map((s) => s.name) ?? ['東', '南', '西', '北'],
    [room],
  )
  const isHuman = useMemo(
    () =>
      room?.seats.map((s) => s.kind === 'human') ?? [true, false, false, false],
    [room],
  )

  function sendMsg(msg: ClientMessage) {
    setError(null)
    if (!send(msg)) setError('未連上房間，稍後再試')
  }

  function dispatchAction(action: Action) {
    sendMsg({ type: 'action', action })
  }

  function leave() {
    clearRoomSession()
    onLeave()
  }

  // —— Settlement ——
  if (
    started &&
    (view?.phase === 'round_over' || view?.phase === 'match_over')
  ) {
    return (
      <Settlement
        view={view}
        names={names}
        onAction={(a) => dispatchAction(a)}
        onLeave={leave}
        trackSeats={[seat]}
        statsMode="online"
      />
    )
  }

  // —— In-game table ——
  if (started && view) {
    return (
      <div className="table-wrap">
        <InstantToast payouts={view.instantPayouts} names={names} />
        <TableView
          view={view}
          isHuman={isHuman}
          selectedTile={selectedTile}
          declareDing={declareDing}
          onSelectTile={setSelectedTile}
          onToggleDing={() => setDeclareDing((d) => !d)}
          onAction={dispatchAction}
          remainSec={remainSec}
        />
        {(error || lastError) && (
          <p className="table__error">{error || lastError}</p>
        )}
        <button type="button" className="table__leave-link" onClick={leave}>
          離開房間
        </button>
      </div>
    )
  }

  // —— Online lobby ——
  return (
    <main className="online-lobby">
      <header className="online-lobby__hero">
        <p className="lobby__brand-en">HK ToiMA</p>
        <h1 className="online-lobby__label">房碼</h1>
        <p className="online-lobby__code" aria-live="polite">
          {join.code}
        </p>
        <p className="online-lobby__meta">
          你係 {WIND[seat]}家
          {isHost ? ' · 房主' : ''}
          {' · '}
          {status === 'open'
            ? '已連線'
            : status === 'connecting'
              ? '連線中…'
              : '未連線'}
        </p>
      </header>

      <section className="online-lobby__panel" aria-label="座位">
        <h2 className="lobby__section-title">座位</h2>
        <div className="online-lobby__seats">
          {(room?.seats ?? []).map((s) => (
            <div
              key={s.seat}
              className={`online-lobby__seat online-lobby__seat--${s.kind} ${
                s.seat === seat ? 'is-you' : ''
              }`}
            >
              <strong>
                {WIND[s.seat]} · {s.name}
              </strong>
              <span>
                {s.kind === 'human'
                  ? s.connected
                    ? '真人 · 在線'
                    : '真人 · 離線'
                  : s.kind === 'ai'
                    ? 'AI'
                    : '空位'}
              </span>
              {isHost && !started && s.kind !== 'human' && s.seat !== room!.hostSeat && (
                <button
                  type="button"
                  className="online-lobby__seat-btn"
                  onClick={() =>
                    sendMsg({
                      type: 'setSeatKind',
                      seat: s.seat,
                      kind: s.kind === 'ai' ? 'empty' : 'ai',
                    })
                  }
                >
                  {s.kind === 'ai' ? '清位' : '設 AI'}
                </button>
              )}
            </div>
          ))}
        </div>

        {isHost && !started && (
          <TableRulesEditor
            value={rules}
            onChange={setRules}
            onCommit={(next) => sendMsg({ type: 'setRules', rules: next })}
          />
        )}

        {!isHost && room && (
          <p className="online-lobby__rules">
            枱規：底 {room.rules.base}番 · ${room.rules.fanValue}/番 · 拉
            {room.rules.maxLaKou}口 · 五同順 {room.rules.fiveTongShunFan}番 ·
            出牌 {room.rules.turnTimeoutSec}s · 鳴牌{' '}
            {room.rules.claimTimeoutSec}s · {room.rules.matchCircles}圈
          </p>
        )}

        {isHost && !started && (
          <div className="online-lobby__host">
            <button
              type="button"
              className="lobby__chip"
              onClick={() => sendMsg({ type: 'fillAi' })}
            >
              空位補 AI
            </button>
            <button
              type="button"
              className="lobby__start"
              onClick={() =>
                sendMsg({
                  type: 'start',
                  fillAi: true,
                  rules: { ...rules },
                })
              }
            >
              開始打牌
            </button>
          </div>
        )}

        {!isHost && !started && (
          <p className="lobby__hint">等緊房主開局…</p>
        )}

        {started && !view && (
          <p className="lobby__hint">牌局已開始，載入枱面中…</p>
        )}

        {(error || lastError) && (
          <p className="online-lobby__error">{error || lastError}</p>
        )}
        {eventLog && <p className="online-lobby__event">{eventLog}</p>}

        <button type="button" className="online-lobby__leave" onClick={leave}>
          離開房間
        </button>
      </section>
    </main>
  )
}
