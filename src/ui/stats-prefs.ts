/**
 * S5：起手／棄牌偏好、叮花、番種（多由 actionLog＋結算推導）。
 */
import {
  isHonor,
  parseTile,
  type ActionLogEntry,
  type Seat,
  type TileId,
} from '../engine'
import { isTerminal } from '../engine/tiles'

/** 萬／筒／索／字 */
export type SuitBias = 'man' | 'pin' | 'sou' | 'honor'

function sliceRoundLog(log: readonly ActionLogEntry[]): ActionLogEntry[] {
  let start = 0
  for (let i = 0; i < log.length; i++) {
    const t = log[i]!.action.type
    if (t === 'start' || t === 'nextRound') start = i + 1
  }
  return log.slice(start) as ActionLogEntry[]
}

export const SUIT_BIAS_LABEL: Record<SuitBias, string> = {
  man: '萬',
  pin: '筒',
  sou: '索',
  honor: '字',
}

export function tileSuitBias(tile: TileId): SuitBias {
  if (isHonor(tile)) return 'honor'
  const suit = parseTile(tile).suit
  if (suit === 'man' || suit === 'pin' || suit === 'sou') return suit
  return 'honor'
}

export function emptyDiscardCounts(): Record<SuitBias, number> {
  return { man: 0, pin: 0, sou: 0, honor: 0 }
}

export interface PrefsSnapshot {
  firstDiscard?: SuitBias
  /** 首棄具體牌（起手 Top） */
  firstDiscardTile?: TileId
  discards: Record<SuitBias, number>
  /** 棄出嘅幺九（1／9 數牌） */
  discardTerminal: number
  ding: boolean
  /** 宣布叮時自己已棄幾巡 */
  dingTurn?: number
  flowerCount: number
  fanIds?: string[]
  fanNames?: string[]
}

export function derivePrefsSnapshot(
  log: readonly ActionLogEntry[],
  seat: Seat,
  opts: { flowerCount: number; dingActive: boolean },
): PrefsSnapshot {
  const slice = sliceRoundLog(log)
  const discards = emptyDiscardCounts()
  let firstDiscard: SuitBias | undefined
  let firstDiscardTile: TileId | undefined
  let discardTerminal = 0
  let ding = opts.dingActive
  let dingTurn: number | undefined
  let myDiscards = 0

  for (const e of slice) {
    if (e.seat !== seat) continue
    const a = e.action
    if (a.type === 'declareDing') {
      ding = true
      if (dingTurn == null) dingTurn = myDiscards
      continue
    }
    if (a.type !== 'discard') continue
    const bias = tileSuitBias(a.tile)
    if (firstDiscard == null) {
      firstDiscard = bias
      firstDiscardTile = a.tile
    }
    discards[bias] += 1
    if (isTerminal(a.tile)) discardTerminal += 1
    myDiscards += 1
    if (a.declareDing) {
      ding = true
      if (dingTurn == null) dingTurn = myDiscards
    }
  }

  return {
    firstDiscard,
    firstDiscardTile,
    discards,
    discardTerminal,
    ding,
    dingTurn,
    flowerCount: opts.flowerCount,
  }
}

/** 主攻門：萬筒索棄牌最多嗰門（平手唔計） */
export function dominantSuit(
  discards: Record<SuitBias, number>,
): SuitBias | null {
  let best: SuitBias | null = null
  let bestN = 0
  let tie = false
  for (const s of ['man', 'pin', 'sou'] as const) {
    const n = discards[s]
    if (n > bestN) {
      best = s
      bestN = n
      tie = false
    } else if (n === bestN && n > 0) {
      tie = true
    }
  }
  return tie || bestN === 0 ? null : best
}
