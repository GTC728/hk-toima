import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  afterPlayerAction,
  autoPassImpossibleClaims,
  chooseAiAction,
  createGame,
  getLegalActions,
  getPrivateView,
  getPublicView,
  hintDiscard,
  visibleTileCounts,
  AI_DELAY_MS,
  aiThinkMs,
  AI_PERSONA_LABEL,
  timeoutPlayAction,
  isReady,
  wallRemaining,
  type Action,
  type AiPersona,
  type GameState,
  type Seat,
} from '../engine'
import {
  noteFirstTenpai,
  phaseFromWall,
  type TenpaiPaceMap,
  type TenpaiPhaseMap,
} from './stats'
import {
  getDecisionTracker,
  resetDecisionTrackers,
  SeatDecisionTracker,
  type DecisionBySeat,
} from './stats-decision'
import {
  claimWindowKey,
  getSeatTracker,
  playWindowKey,
  resetAllTrackers,
  SeatTacticsTracker,
  type TacticsBySeat,
} from './stats-tactics'
import type { LobbyStartConfig } from './Lobby'
import { useTableChrome } from './useTableChrome'
import { InstantToast } from './InstantToast'
import { PassPrivacy } from './PassPrivacy'
import { Settlement } from './Settlement'
import { TableView } from './TableView'
import { PlaySide } from './PlaySide'
import { hintReasons } from './hintReason'
import {
  loadAutoDraw,
  loadAutoPass,
  loadClaimChime,
  loadPassPrivacy,
} from './extraPrefs'
import { requestLeave } from './matchPrefs'
import { playBeep } from './audio'
import { SoundCaptions } from './SoundCaptions'
import { TableQuickSettings } from './TableQuickSettings'
import { useWakeLock } from './useWakeLock'
import { DEFAULT_RULES_DRAFT } from './TableRulesEditor'

const WIND = ['東', '南', '西', '北'] as const

function isHumanSeat(humanSeats: boolean[], seat: Seat): boolean {
  return Boolean(humanSeats[seat])
}

function humanCountOf(humanSeats: boolean[]): number {
  return humanSeats.filter(Boolean).length
}

function personaAt(personas: readonly AiPersona[], seat: Seat): AiPersona {
  return personas[seat] ?? 'attack'
}

/** 鳴牌窗真人未答完就唔計 AI；否則係下一個要行動嘅 AI。 */
function nextAiThinkSeat(state: GameState, humanSeats: boolean[]): Seat | null {
  if (state.phase === 'round_over' || state.phase === 'match_over') return null
  if (state.phase === 'claim_window' && state.pendingDiscard) {
    const awaiting = state.pendingDiscard.awaiting
    if (awaiting.some((seat) => isHumanSeat(humanSeats, seat))) return null
    return awaiting.find((seat) => !isHumanSeat(humanSeats, seat)) ?? null
  }
  if (state.phase === 'playing' && !isHumanSeat(humanSeats, state.currentSeat)) {
    return state.currentSeat
  }
  return null
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
  return afterPlayerAction(state, action, actor)
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
  onOpenSettings?: () => void
  setup?: ReactNode
}

export function LocalGame({ config, onLeave, onOpenSettings, setup }: LocalGameProps) {
  const leave = useCallback(() => requestLeave(onLeave), [onLeave])
  const [qsOpen, setQsOpen] = useState(false)
  const humanSeats = config.humanSeats
  const names = config.names
  const practiceHints = config.practiceHints !== false
  const personas = config.aiPersonas

  const [state, setState] = useState<GameState>(() =>
    createGame({
      rules: config.rules ?? DEFAULT_RULES_DRAFT,
      playerNames: config.names,
    }),
  )
  const [revealedSeat, setRevealedSeat] = useState<Seat | null>(null)
  const [privacySeat, setPrivacySeat] = useState<Seat | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null)

  const aiBusy = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const claimChimeKey = useRef('')
  const matchStartedAt = useRef(Date.now())
  const timeoutsSelf = useRef(0)
  const tenpaiPace = useRef<TenpaiPaceMap>({})
  const tenpaiPhase = useRef<TenpaiPhaseMap>({})
  const tenpaiRound = useRef(state.round)
  const tacticsMap = useRef(new Map<Seat, SeatTacticsTracker>())
  const tacticsRound = useRef(state.round)
  const tacticsSnap = useRef<TacticsBySeat>({})
  const cashHistory = useRef<number[][]>([])
  const cashRoundKey = useRef<number | null>(null)
  const decisionMap = useRef(new Map<Seat, SeatDecisionTracker>())
  const decisionSnap = useRef<DecisionBySeat>({})
  useWakeLock(
    state.phase !== 'round_over' && state.phase !== 'match_over',
  )

  const actor = useMemo(
    () => getActorSeat(state, humanSeats),
    [state, humanSeats],
  )

  const selectionKey = `${actor ?? 'x'}|${revealedSeat ?? 'h'}`

  const expireRef = useRef<() => void>(() => {})
  const {
    selectedTile,
    setSelectedTile,
    declareDing,
    setDeclareDing,
    remainSec,
  } = useTableChrome({
    actionLog: state.actionLog,
    deadlineAt,
    selectionKey,
    canExpire: () => !aiBusy.current,
    onExpire: () => expireRef.current(),
  })

  const trackSeats = useMemo(
    () =>
      ([0, 1, 2, 3] as Seat[]).filter((s) => isHumanSeat(humanSeats, s)),
    [humanSeats],
  )

  useEffect(() => {
    if (state.round !== tenpaiRound.current) {
      tenpaiRound.current = state.round
      tenpaiPace.current = {}
      tenpaiPhase.current = {}
      resetDecisionTrackers(decisionMap.current)
      decisionSnap.current = {}
    }
    if (state.round !== tacticsRound.current) {
      tacticsRound.current = state.round
      resetAllTrackers(tacticsMap.current)
      tacticsSnap.current = {}
    }
    if (state.phase === 'round_over' || state.phase === 'match_over') {
      if (cashRoundKey.current !== state.round) {
        cashRoundKey.current = state.round
        cashHistory.current.push(state.players.map((p) => p.cash))
      }
      const snap: TacticsBySeat = {}
      for (const seat of trackSeats) {
        const tr = getSeatTracker(tacticsMap.current, seat)
        const chankan =
          state.lastResult?.kind === 'win' &&
          state.lastResult.wins.some(
            (w) => w.seat === seat && w.winType === 'chankan',
          )
        snap[seat] = tr.finalize(state.players[seat].melds, Boolean(chankan))
      }
      tacticsSnap.current = snap
      const dec: DecisionBySeat = {}
      for (const seat of trackSeats) {
        dec[seat] = getDecisionTracker(decisionMap.current, seat).snapshot()
      }
      decisionSnap.current = dec
      return
    }
    const wall = wallRemaining(state.liveIndex, state.deadWallIndex)
    const phase = phaseFromWall(wall)
    for (const seat of trackSeats) {
      const p = state.players[seat]
      noteFirstTenpai(
        tenpaiPace.current,
        seat,
        isReady(p.hand, p.melds),
        p.discards.length,
        tenpaiPhase.current,
        phase,
      )
      const legal = getLegalActions(state, seat)
      const tr = getSeatTracker(tacticsMap.current, seat)
      if (state.phase === 'claim_window' && state.pendingDiscard) {
        if (state.pendingDiscard.awaiting.includes(seat)) {
          tr.observe(
            legal,
            claimWindowKey(
              state.pendingDiscard.tile,
              state.pendingDiscard.awaiting,
            ),
            phase,
            state.players[seat]?.discards.length ?? 0,
          )
        }
      } else if (state.currentSeat === seat) {
        tr.observe(
          legal,
          playWindowKey(
            state.round,
            state.phase,
            seat,
            state.justDrawn,
          ),
          phase,
          state.players[seat]?.discards.length ?? 0,
        )
      }
    }
  }, [state, trackSeats])

  // 鳴牌窗：輪到你應鳴時短 beep
  useEffect(() => {
    if (!loadClaimChime()) return
    if (state.phase !== 'claim_window' || !state.pendingDiscard) return
    const awaiting = state.pendingDiscard.awaiting
    if (!awaiting.some((s) => isHumanSeat(humanSeats, s))) return
    const key = `${state.pendingDiscard.tile}:${[...awaiting].sort().join(',')}`
    if (claimChimeKey.current === key) return
    claimChimeKey.current = key
    playBeep(720, 75, 'triangle', 0.08)
  }, [state.phase, state.pendingDiscard, humanSeats])

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
    // 只有 1 個真人，或設定關咗交機遮罩：唔使遮
    if (humanCountOf(humanSeats) <= 1 || !loadPassPrivacy()) {
      setPrivacySeat(null)
      setRevealedSeat(actor)
      return
    }
    setPrivacySeat(actor)
    setRevealedSeat(null)
  }, [actor, humanSeats, revealedSeat, state.phase])

  // Human turn / claim countdown
  useEffect(() => {
    if (
      state.phase === 'round_over' ||
      state.phase === 'match_over' ||
      privacySeat != null
    ) {
      setDeadlineAt(null)
      return
    }
    if (actor == null || !isHumanSeat(humanSeats, actor)) {
      setDeadlineAt(null)
      return
    }
    if (revealedSeat !== actor) {
      setDeadlineAt(null)
      return
    }
    const sec =
      state.phase === 'claim_window'
        ? state.rules.claimTimeoutSec
        : state.rules.turnTimeoutSec
    const opened = Date.now()
    setDeadlineAt(opened + Math.max(1, sec) * 1000)
    getDecisionTracker(decisionMap.current, actor).openTurn(opened, sec)
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

  expireRef.current = () => {
    const s0 = stateRef.current
    const seat = getActorSeat(s0, humanSeats)
    if (seat == null || !isHumanSeat(humanSeats, seat)) return
    if (privacySeat != null || revealedSeat !== seat) return
    try {
      let action: Action | null = null
      if (s0.phase === 'claim_window') {
        action = getLegalActions(s0, seat).some((a) => a.type === 'pass')
          ? { type: 'pass', reason: 'timeout' }
          : null
      } else {
        action = timeoutPlayAction(s0, seat, {
          preferAiDiscard: practiceHints,
        })
      }
      if (!action) return
      timeoutsSelf.current += 1
      getSeatTracker(tacticsMap.current, seat).onAction(action)
      getDecisionTracker(decisionMap.current, seat).noteAction(Date.now(), 0)
      setError(null)
      setState(applyWithClaims(s0, action, seat))
      setSelectedTile(null)
      setDeclareDing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  // AI turns + auto-pass claims（上／碰後要打牌，唔好自動摸）
  useEffect(() => {
    if (state.phase === 'round_over' || state.phase === 'match_over') return
    if (aiBusy.current) return

    const thinkSeat = nextAiThinkSeat(state, humanSeats)
    const thinkMs =
      thinkSeat != null ? aiThinkMs(personaAt(personas, thinkSeat)) : AI_DELAY_MS

    const delay = window.setTimeout(() => {
      if (aiBusy.current) return
      let s = autoPassImpossibleClaims(stateRef.current)

      // 鳴牌窗：真人未決定前 AI 唔好搶先碰／上（否則 750ms 就被「搶斷」）
      if (s.phase === 'claim_window' && s.pendingDiscard) {
        const humanStillDeciding = s.pendingDiscard.awaiting.some((seat) =>
          isHumanSeat(humanSeats, seat),
        )
        if (humanStillDeciding) {
          if (s !== stateRef.current) setState(s)
          return
        }

        const aiAwaiting = s.pendingDiscard.awaiting.find(
          (seat) => !isHumanSeat(humanSeats, seat),
        )
        if (aiAwaiting != null) {
          aiBusy.current = true
          try {
            const action = chooseAiAction(s, aiAwaiting, personaAt(personas, aiAwaiting))
            if (action) {
              setState(applyWithClaims(s, action, aiAwaiting))
            } else if (
              getLegalActions(s, aiAwaiting).some((a) => a.type === 'pass')
            ) {
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
        const action = chooseAiAction(s, aiSeat, personaAt(personas, aiSeat))
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
  }, [state, humanSeats, privacySeat, revealedSeat, personas])

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
          if (isHumanSeat(humanSeats, actorSeat)) {
            const tr = getSeatTracker(tacticsMap.current, actorSeat)
            if (action.type === 'discard' && practiceHints) {
              tr.noteHint(hintDiscard(prev, actorSeat), action.tile)
            }
            tr.onAction(action)
            getDecisionTracker(decisionMap.current, actorSeat).noteAction(
              Date.now(),
              remainSec,
            )
          }
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
    [humanSeats, practiceHints, remainSec],
  )

  const firstHuman = (humanSeats.findIndex(Boolean) as Seat) || 0
  const viewingSeat: Seat = revealedSeat ?? firstHuman

  // 設定：淨係可以摸／過就自動做
  const autoSoloKey = useRef('')
  useEffect(() => {
    if (privacySeat != null) return
    if (actor == null || !isHumanSeat(humanSeats, actor)) return
    if (revealedSeat != null && revealedSeat !== actor) return
    const legal = getLegalActions(state, actor)
    if (legal.length !== 1) return
    const only = legal[0]!
    if (only.type === 'draw' && loadAutoDraw()) {
      const key = `${selectionKey}|draw`
      if (autoSoloKey.current === key) return
      autoSoloKey.current = key
      getSeatTracker(tacticsMap.current, actor).noteAutoDraw()
      dispatch(only, actor)
      return
    }
    if (only.type === 'pass' && loadAutoPass()) {
      const key = `${selectionKey}|pass`
      if (autoSoloKey.current === key) return
      autoSoloKey.current = key
      getSeatTracker(tacticsMap.current, actor).noteAutoPass()
      dispatch(only, actor)
    }
  }, [state, actor, humanSeats, privacySeat, revealedSeat, dispatch, selectionKey])

  const waitingAiNow = actor != null && !isHumanSeat(humanSeats, actor)
  const yourTurn = !waitingAiNow && actor === viewingSeat
  const hintTileNow =
    practiceHints && yourTurn ? hintDiscard(state, viewingSeat) : null
  const panel = (
    <PlaySide
      names={names}
      actionLog={state.actionLog}
      viewSeat={viewingSeat}
      rules={state.rules}
      instantPayouts={state.instantPayouts}
      laLedger={state.laLedger}
      lastResult={state.lastResult}
      phase={state.phase}
      seats={([0, 1, 2, 3] as Seat[]).map((seat) => ({
        seat,
        name: names[seat] || WIND[seat],
        detail: isHumanSeat(humanSeats, seat)
          ? '真人'
          : AI_PERSONA_LABEL[personaAt(personas, seat)],
      }))}
      hintLines={
        hintTileNow
          ? hintReasons(
              state.players[viewingSeat].hand,
              hintTileNow,
              visibleTileCounts(state, viewingSeat),
            )
          : null
      }
      hintNote={
        practiceHints
          ? yourTurn
            ? '而家唔使打牌'
            : '未輪到你打牌'
          : '練習提示未開。可在設定打開。'
      }
      onNextRound={
        state.phase === 'round_over' ? () => dispatch({ type: 'nextRound' }) : undefined
      }
      onSettleLa={
        (state.phase === 'round_over' || state.phase === 'match_over') &&
        state.laLedger.length > 0
          ? () => dispatch({ type: 'settleAll' })
          : undefined
      }
      onLeave={leave}
      setup={setup}
    />
  )

  if (state.phase === 'round_over' || state.phase === 'match_over') {
    return (
      <div className="table-wrap">
        <div className="table-wrap__main">
          <Settlement
            view={getPublicView(state, names)}
            names={names}
            onAction={dispatch}
            onLeave={leave}
            trackSeats={trackSeats}
            statsMode="local"
            playKind="ai"
            seatIsAi={([0, 1, 2, 3] as const).map(
              (s) => !isHumanSeat(humanSeats, s),
            )}
            aiPersonas={personas}
            matchStartedAt={matchStartedAt.current}
            timeoutsSelf={timeoutsSelf.current}
            tenpaiPace={tenpaiPace.current}
            tenpaiPhase={tenpaiPhase.current}
            tacticsBySeat={tacticsSnap.current}
            cashHistory={cashHistory.current}
            decisionBySeat={decisionSnap.current}
          />
        </div>
        {panel}
      </div>
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
      <div className="table-wrap__main">
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
        personaLabels={([0, 1, 2, 3] as Seat[]).map((seat) =>
          isHumanSeat(humanSeats, seat)
            ? null
            : AI_PERSONA_LABEL[personaAt(personas, seat)],
        )}
      />
      {error && <p className="table__error">{error}</p>}
      <div className="table__chrome-links">
        <button type="button" className="table__leave-link" onClick={() => setQsOpen(true)}>
          設定
        </button>
        <button type="button" className="table__leave-link" onClick={leave}>
          返大廳
        </button>
      </div>
      <SoundCaptions />
      <TableQuickSettings
        open={qsOpen}
        onClose={() => setQsOpen(false)}
        onOpenFull={
          onOpenSettings
            ? () => {
                setQsOpen(false)
                onOpenSettings()
              }
            : undefined
        }
      />
      </div>
      {panel}
    </div>
  )
}
