/**
 * 由牌譜（seed + plies）重建每步枱面幀，供賽後重溫。
 */

import {
  afterPlayerAction,
  createGame,
  formatActionText,
  getPublicView,
  type Action,
  type ActionLogEntry,
  type GameRecord,
  type GameState,
  type PublicGameView,
  type Seat,
  type TileId,
} from '../engine'

export interface ReplayFrame {
  index: number
  public: PublicGameView
  /** 重溫全程可睇手牌演變 */
  hands: TileId[][]
  melds: GameState['players'][0]['melds'][]
  note?: string
  seat: Seat | null
  actionType: string
  ply?: ActionLogEntry
}

/** Minimal input for replay (GameState or terminal PublicGameView) */
export interface ReplaySource {
  seed: number
  dealer: Seat
  consecutiveWins: number
  rules: GameState['rules']
  phase: GameState['phase']
  actionLog: ActionLogEntry[]
  players?: { hand: TileId[] }[]
  revealedHands?: TileId[][]
  round?: number
  windRound?: number
}

export function replaySourceFromState(state: GameState): ReplaySource {
  return {
    seed: state.seed,
    dealer: state.dealer,
    consecutiveWins: state.consecutiveWins,
    rules: state.rules,
    phase: state.phase,
    actionLog: state.actionLog,
    players: state.players,
    revealedHands: state.players.map((p) => [...p.hand]),
    round: state.round,
    windRound: state.windRound,
  }
}

export function replaySourceFromView(view: PublicGameView): ReplaySource {
  return {
    seed: view.seed,
    dealer: view.dealer,
    consecutiveWins: view.consecutiveWins,
    rules: view.rules,
    phase: view.phase,
    actionLog: view.actionLog,
    revealedHands: view.revealedHands,
  }
}

export function replaySourceFromRecord(record: GameRecord): ReplaySource {
  return {
    seed: record.header.seed,
    dealer: record.header.dealer,
    consecutiveWins: record.header.consecutiveWins,
    rules: record.header.rules,
    phase: record.phase ?? 'round_over',
    actionLog: record.plies,
    revealedHands: record.revealedHands,
    round: record.header.round,
    windRound: record.header.windRound,
  }
}

/** Index of first log entry belonging to the current round */
export function currentRoundLogStart(log: ActionLogEntry[]): number {
  for (let i = log.length - 1; i >= 0; i--) {
    const a = log[i]!.action
    if (a.type === 'start' || a.type === 'nextRound') return i + 1
  }
  return 0
}

/**
 * 內部已摸完：牌譜入面跟住嘅 draw 係顯示用，重放要 skip。
 */
function shouldSkipDraw(state: GameState, action: Action): boolean {
  if (action.type !== 'draw') return false
  if (state.justDrawn != null) return true
  if (state.mustDiscard) return true
  if (state.phase !== 'playing') return true
  return false
}

/**
 * Replay this round from seed / dealer / consecutiveWins.
 * Uses afterPlayerAction so auto-pass 同真實對局一致。
 */
export function buildReplayFrames(
  source: ReplaySource,
  names?: string[],
): ReplayFrame[] {
  const log = source.actionLog
  const start = currentRoundLogStart(log)
  const labels = names ?? ['東', '南', '西', '北']

  let state = createGame({
    seed: source.seed,
    dealerSeat: source.dealer,
    consecutiveDealerWins: source.consecutiveWins,
    rules: source.rules,
    playerNames: labels,
  })
  state.actionLog = []

  const snapshot = (s: GameState): Pick<ReplayFrame, 'hands' | 'melds'> => ({
    hands: s.players.map((p) => [...p.hand]),
    melds: s.players.map((p) => p.melds.map((m) => ({ ...m, tiles: [...m.tiles] }))),
  })

  const frames: ReplayFrame[] = [
    {
      index: 0,
      public: getPublicView(state, labels),
      ...snapshot(state),
      seat: null,
      actionType: 'start',
      note: '開局',
    },
  ]

  for (let i = start; i < log.length; i++) {
    const entry = log[i]!
    const { action, seat, note } = entry
    if (action.type === 'start') continue
    if (action.type === 'nextRound') continue

    if (shouldSkipDraw(state, action)) {
      // 仍推一幀顯示「摸牌」文案，但唔改狀態（已摸）
      frames.push({
        index: frames.length,
        public: getPublicView(state, labels),
        ...snapshot(state),
        seat,
        actionType: action.type,
        note: note ?? formatActionText(action, {}, seat),
        ply: entry,
      })
      continue
    }

    try {
      // draw 用 apply 路徑：afterPlayerAction → applyAction；draw 本身唔經 autoPass
      state = afterPlayerAction(state, action, seat ?? undefined)
    } catch {
      continue
    }
    frames.push({
      index: frames.length,
      public: getPublicView(state, labels),
      ...snapshot(state),
      seat,
      actionType: action.type,
      note: note ?? formatActionText(action, {}, seat),
      ply: entry,
    })
  }

  const last = frames[frames.length - 1]
  const terminal =
    source.phase === 'round_over' || source.phase === 'match_over'
  if (last && terminal) {
    const reveal =
      source.revealedHands ??
      source.players?.map((p) => [...p.hand]) ??
      last.hands
    last.hands = reveal
    last.public = {
      ...last.public,
      phase: source.phase,
      revealedHands: reveal,
    }
  }

  return frames
}
