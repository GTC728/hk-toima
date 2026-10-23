import { discardKeepScore, visibleTileCounts } from './ai'
import { getLegalActions } from './game'
import type { Action, GameState, Meld, Seat, TileId } from './types'
import { waitingTiles } from './win-check'

/** 聽牌列表（包裝 waitingTiles） */
export function getWaitingTiles(hand: TileId[], melds: Meld[]): TileId[] {
  return waitingTiles(hand, melds)
}

/**
 * 建議棄牌：喺合法 discard 入面揀保留分最低嗰隻（同 AI 啟發）。
 * 叮狀態下合法棄牌只得摸入嗰張；無法打牌時回傳 null。
 */
export function hintDiscard(state: GameState, seat: Seat): TileId | null {
  const discards = getLegalActions(state, seat).filter(
    (a): a is Extract<Action, { type: 'discard' }> => a.type === 'discard',
  )
  if (discards.length === 0) return null

  const hand = state.players[seat].hand
  const visible = visibleTileCounts(state, seat)

  let best = discards[0]!
  let bestScore = Infinity
  for (const action of discards) {
    const score = discardKeepScore(action.tile, hand, visible)
    if (
      score < bestScore ||
      (score === bestScore && action.tile.localeCompare(best.tile) < 0)
    ) {
      bestScore = score
      best = action
    }
  }
  return best.tile
}

/**
 * 出牌超時自動行動：先摸／可糊則糊；否則打牌。
 * — `preferAiDiscard`（練習提示開）：打 AI／提示建議牌
 * — 否則：打最新摸入（`justDrawn`）；無摸入（上／碰後）則退回建議牌
 */
export function timeoutPlayAction(
  state: GameState,
  seat: Seat,
  opts: { preferAiDiscard: boolean },
): Action | null {
  const legal = getLegalActions(state, seat)
  if (legal.length === 0) return null

  const draw = legal.find((a) => a.type === 'draw')
  if (draw) return draw

  const win = legal.find((a) => a.type === 'win')
  if (win) return win

  const discards = legal.filter(
    (a): a is Extract<Action, { type: 'discard' }> => a.type === 'discard',
  )
  if (discards.length === 0) {
    return legal.find((a) => a.type === 'pass') ?? null
  }

  let tile: TileId | null = null
  if (opts.preferAiDiscard) {
    tile = hintDiscard(state, seat)
  } else {
    const drawn = state.justDrawn
    if (drawn && discards.some((d) => d.tile === drawn)) tile = drawn
    if (!tile) tile = hintDiscard(state, seat)
  }
  if (!tile) tile = discards[0]!.tile

  return { type: 'discard', tile }
}
