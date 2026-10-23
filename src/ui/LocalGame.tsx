import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyAction,
  autoPassImpossibleClaims,
  chooseAiAction,
  createGame,
  discardAndResolve,
  getLegalActions,
  getPrivateView,
  getPublicView,
  hintDiscard,
  remainingSec,
  timeoutPlayAction,
  type Action,
  type GameState,
  type Seat,
  type TileId,
} from '../engine'
import type { LobbyStartConfig } from './Lobby'
import { playForLogEntries } from './audio'
import { InstantToast } from './InstantToast'
import { PassPrivacy } from './PassPrivacy'
import { Settlement } from './Settlement'
import { TableView } from './TableView'
import { DEFAULT_RULES_DRAFT } from './TableRulesEditor'

const WIND = ['東', '南', '西', '北'] as const

/** AI 思考延遲：方便人睇牌河／分析其他人行為 */
const AI_PLAY_MS = 1100
const AI_CLAIM_MS = 750

function isHumanSeat(humanSeats: boolean[], seat: Seat): boolean {
  return Boolean(humanSeats[seat])
}

function humanCountOf(humanSeats: boolean[]): number {
  return humanSeats.filter(Boolean).length
}

/** Who must act next (for privacy / AI). */
function getActorSeat(state: GameState, humanSeats: boolean[]): Seat | null {
  if (state.phase === 'round_over' || state.phase === 'match_over') return null

  if (state.phase === 'claim_window' && state.pendingDiscard) {
    const awaiting = state.pendingDiscard.awaiting
    if (awaiting.length === 0) return null
    const humanAwaiting = awaiting.filter((s) => isHumanSeat(humanSeats, s))
    if (humanAwaiting.length > 0) return humanAwaiting[0]!
    return awaiting[0]!
  }

  if (state.phase === 'playing') return state.currentSeat
  return null
}

function applyWithClaims(
  state: GameState,
  action: Action,
  actor: Seat,
): GameState {
  let next =
    action.type === 'discard'
      ? discardAndResolve(state, action.tile, actor, action.declareDing)
      : applyAction(state, action, actor)
  next = autoPassImpossibleClaims(next)
  return next
}

function turnContextKey(state: GameState, actor: Seat | null): string {
  if (actor == null) return 'idle'
  if (state.phase === 'claim_window' && state.pendingDiscard) {
    return `claim:${state.pendingDiscard.tile}:${[...state.pendingDiscard.awaiting].sort().join(',')}`
  }
  return `play:${state.currentSeat}:${state.mustDiscard}:${state.justDrawn ?? ''}`
}

interface LocalGameProps {
  config: LobbyStartConfig
  onLeave: () => void
}

export function LocalGame({ config, onLeave }: LocalGameProps) {
  const humanSeats = config.humanSeats
  const names = config.names
  const practiceHints = config.practiceHints !== false

  const [state, setState] = useState<GameState>(() =>
    createGame({
      rules: config.rules ?? DEFAULT_RULES_DRAFT,
      playerNames: config.names,
    }),
  )
  const [revealedSeat, setRevealedSeat] = useState<Seat | null>(null)
  const [privacySeat, setPrivacySeat] = useState<Seat | null>(null)
  const [selectedTile, setSelectedTile] = useState<TileId | null>(null)
  const [declareDing, setDeclareDing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null)
  const [remainSec, setRemainSec] = useState<number | null>(null)

  const aiBusy = useRef(false)
  const timeoutFired = useRef(false)
  const logLenRef = useRef(state.actionLog.length)
  const stateRef = useRef(state)
  stateRef.current = state

  const actor = useMemo(
    () => getActorSeat(state, humanSeats),
    [state, humanSeats],
  )

  const trackSeats = useMemo(
    () =>
      ([0, 1, 2, 3] as Seat[]).filter((s) => isHumanSeat(humanSeats, s)),
    [humanSeats],
  )

  // SFX / 報牌 after applyAction（含 AI）
  useEffect(() => {
    const len = state.actionLog.length
    if (len > logLenRef.current) {
      playForLogEntries(state.actionLog, logLenRef.current)
    }
    logLenRef.current = len
  }, [state.actionLog])

  // Pass-and-play privacy when the acting human changes（單人跳過）
  useEffect(() => {
    if (state.phase === 'round_over' || state.phase === 'match_over') {
      setPrivacySeat(null)
      setRevealedSeat(null)
      return
    }
    if (actor == null) return
    if (!isHumanSeat(humanSeats, actor)) return
    if (revealedSeat === actor) return
    // 只有 1 個真人：唔使交機遮罩
    if (humanCountOf(humanSeats) <= 1) {
      setPrivacySeat(null)
      setRevealedSeat(actor)
      setSelectedTile(null)
      setDeclareDing(false)
      return
    }
    setPrivacySeat(actor)
    setRevealedSeat(null)
    setSelectedTile(null)
    setDeclareDing(false)
  }, [actor, humanSeats, revealedSeat, state.phase])

  // Human turn / claim countdown
  useEffect(() => {
    if (
      state.phase === 'round_over' ||
      state.phase === 'match_over' ||
      privacySeat != null
    ) {
      setDeadlineAt(null)
      setRemainSec(null)
      return
    }
    if (actor == null || !isHumanSeat(humanSeats, actor)) {
      setDeadlineAt(null)
      setRemainSec(null)
      return
    }
    if (revealedSeat !== actor) {
      setDeadlineAt(null)
      setRemainSec(null)
      return
    }
    const sec =
      state.phase === 'claim_window'
        ? state.rules.claimTimeoutSec
        : state.rules.turnTimeoutSec
    timeoutFired.current = false
    setDeadlineAt(Date.now() + Math.max(1, sec) * 1000)
  }, [
    humanSeats,
    actor,
    privacySeat,
    revealedSeat,
    state.phase,
    state.rules.claimTimeoutSec,
    state.rules.turnTimeoutSec,
    turnContextKey(state, actor),
  ])

  // Tick countdown; on expiry: 打牌用提示／最新摸；鳴牌自動 pass
  useEffect(() => {
    if (deadlineAt == null) {
      setRemainSec(null)
      return
    }
    const tick = () => {
      const rem = remainingSec(deadlineAt)
      setRemainSec(rem)
      if (rem > 0 || timeoutFired.current || aiBusy.current) return
      timeoutFired.current = true
      const s0 = stateRef.current
      const seat = getActorSeat(s0, humanSeats)
      if (seat == null || !isHumanSeat(humanSeats, seat)) return
      if (privacySeat != null || revealedSeat !== seat) return
      try {
        let action: Action | null = null
        if (s0.phase === 'claim_window') {
          action = getLegalActions(s0, seat).some((a) => a.type === 'pass')
            ? { type: 'pass' }
            : null
        } else {
          action = timeoutPlayAction(s0, seat, {
            preferAiDiscard: practiceHints,
          })
        }
        if (!action) return
        setError(null)
        setState(applyWithClaims(s0, action, seat))
        setSelectedTile(null)
        setDeclareDing(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    }
    tick()
    const id = window.setInterval(tick, 200)
    return () => window.clearInterval(id)
  }, [deadlineAt, humanSeats, privacySeat, revealedSeat, practiceHints])

  // AI turns + auto-pass claims（上／碰後要打牌，唔好自動摸）
  useEffect(() => {
    if (state.phase === 'round_over' || state.phase === 'match_over') return
    if (aiBusy.current) return

    const thinkMs =
      state.phase === 'claim_window' ? AI_CLAIM_MS : AI_PLAY_MS

    const delay = window.setTimeout(() => {
      if (aiBusy.current) return
      let s = autoPassImpossibleClaims(stateRef.current)

      // Prefer resolving AI claimants even while a human privacy screen is up
      if (s.phase === 'claim_window' && s.pendingDiscard) {
        const aiAwaiting = s.pendingDiscard.awaiting.find(
          (seat) => !isHumanSeat(humanSeats, seat),
        )
        if (aiAwaiting != null) {
          aiBusy.current = true
          try {
            const action = chooseAiAction(s, aiAwaiting)
            if (action) {
              setState(applyWithClaims(s, action, aiAwaiting))
            } else if (getLegalActions(s, aiAwaiting).some((a) => a.type === 'pass')) {
              setState(applyWithClaims(s, { type: 'pass' }, aiAwaiting))
            } else {
              setState(s)
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
          } finally {
            aiBusy.current = false
          }
          return
        }
      }

      const seat = getActorSeat(s, humanSeats)
      if (seat == null) {
        if (s !== stateRef.current) setState(s)
        return
      }

      if (isHumanSeat(humanSeats, seat)) {
        if (privacySeat != null || revealedSeat !== seat) {
          if (s !== stateRef.current) setState(s)
          return
        }
        if (s !== stateRef.current) setState(s)
        return
      }

      // AI playing turn
      aiBusy.current = true
      try {
        s = autoPassImpossibleClaims(s)
        const aiSeat = getActorSeat(s, humanSeats)
        if (aiSeat == null || isHumanSeat(humanSeats, aiSeat)) {
          setState(s)
          return
        }
        const action = chooseAiAction(s, aiSeat)
        if (!action) {
          const legal = getLegalActions(s, aiSeat)
          if (legal.some((a) => a.type === 'pass')) {
            s = applyWithClaims(s, { type: 'pass' }, aiSeat)
          }
          setState(s)
          return
        }
        setState(applyWithClaims(s, action, aiSeat))
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        aiBusy.current = false
      }
    }, thinkMs)

    return () => window.clearTimeout(delay)
  }, [state, humanSeats, privacySeat, revealedSeat])

  const dispatch = useCallback(
    (action: Action, seat?: Seat) => {
      setError(null)
      setState((prev) => {
        const actorSeat =
          seat ??
          getActorSeat(prev, humanSeats) ??
          (prev.phase === 'round_over' || prev.phase === 'match_over'
            ? (0 as Seat)
            : prev.currentSeat)
        try {
          const next = applyWithClaims(prev, action, actorSeat)
          setSelectedTile(null)
          setDeclareDing(false)
          return next
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e))
          return prev
        }
      })
    },
    [humanSeats],
  )

  const firstHuman = (humanSeats.findIndex(Boolean) as Seat) || 0
  const viewingSeat: Seat = revealedSeat ?? firstHuman

  if (state.phase === 'round_over' || state.phase === 'match_over') {
    return (
      <Settlement
        view={getPublicView(state, names)}
        names={names}
        onAction={dispatch}
        onLeave={onLeave}
        trackSeats={trackSeats}
        statsMode="local"
      />
    )
  }

  if (privacySeat != null && revealedSeat == null) {
    return (
      <PassPrivacy
        name={names[privacySeat] ?? WIND[privacySeat]}
        windLabel={WIND[privacySeat]}
        onReveal={() => {
          setRevealedSeat(privacySeat)
          setPrivacySeat(null)
        }}
      />
    )
  }

  const waitingAi = actor != null && !isHumanSeat(humanSeats, actor)
  const view = getPrivateView(state, viewingSeat, names)
  const hintTile =
    practiceHints && !waitingAi && actor === viewingSeat
      ? hintDiscard(state, viewingSeat)
      : null

  return (
    <div className="table-wrap">
      <InstantToast payouts={state.instantPayouts} names={names} />
      <TableView
        view={view}
        isHuman={humanSeats}
        selectedTile={waitingAi ? null : selectedTile}
        declareDing={declareDing}
        onSelectTile={waitingAi ? () => {} : setSelectedTile}
        onToggleDing={() => setDeclareDing((d) => !d)}
        onAction={waitingAi ? () => {} : (a) => dispatch(a, viewingSeat)}
        hintDiscardTile={hintTile}
        remainSec={waitingAi ? null : remainSec}
      />
      {waitingAi && (
        <p className="table__ai-banner" role="status">
          AI（{WIND[actor]} · {names[actor]}）諗緊…
        </p>
      )}
      {error && <p className="table__error">{error}</p>}
      <button type="button" className="table__leave-link" onClick={onLeave}>
        返大廳
      </button>
    </div>
  )
}
