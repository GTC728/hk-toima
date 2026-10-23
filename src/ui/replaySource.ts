/**
 * Rebuild public frames from actionLog for settlement 重溫.
 * Hides other hands until the final (round_over) frame.
 */

import {
  applyAction,
  createGame,
  getPublicView,
  type ActionLogEntry,
  type GameState,
  type PublicGameView,
  type Seat,
  type TileId,
} from '../engine'

export interface ReplayFrame {
  index: number
  public: PublicGameView
  /** Only set on final frame — full hands for 攤牌 */
  revealHands?: TileId[][]
  note?: string
  seat: Seat | null
  actionType: string
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

/** Index of first log entry belonging to the current round */
export function currentRoundLogStart(log: ActionLogEntry[]): number {
  for (let i = log.length - 1; i >= 0; i--) {
    const a = log[i]!.action
    if (a.type === 'start' || a.type === 'nextRound') return i + 1
  }
  return 0
}

/**
 * Replay this round from seed / dealer / consecutiveWins.
 * Returns public frames; last frame includes revealHands when terminal.
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

  const frames: ReplayFrame[] = [
    {
      index: 0,
      public: getPublicView(state, labels),
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
    try {
      state = applyAction(state, action, seat ?? undefined)
    } catch {
      continue
    }
    frames.push({
      index: frames.length,
      public: getPublicView(state, labels),
      seat,
      actionType: action.type,
      note: note ?? actionLabel(action.type),
    })
  }

  const last = frames[frames.length - 1]
  const terminal =
    source.phase === 'round_over' ||
    source.phase === 'match_over' ||
    source.phase === 'wall_exhausted'
  if (last && terminal) {
    last.revealHands =
      source.revealedHands ??
      source.players?.map((p) => [...p.hand]) ??
      state.players.map((p) => [...p.hand])
    last.public = {
      ...last.public,
      phase: source.phase,
      revealedHands: last.revealHands,
    }
  }

  return frames
}

function actionLabel(type: string): string {
  const map: Record<string, string> = {
    draw: '摸',
    discard: '打',
    chi: '上',
    pong: '碰',
    mingkong: '明槓',
    ankong: '暗槓',
    jiagang: '加槓',
    win: '食',
    pass: 'Pass',
    declareDing: '叮',
  }
  return map[type] ?? type
}
