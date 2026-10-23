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
