import type { GameState, Seat, TileId } from '../types'
import { countTiles, isHonor, isSuitTile, parseTile } from '../tiles'

/** 可見牌：各家牌河＋副露（唔計自己手牌） */
export function visibleTileCounts(state: GameState, _self: Seat): Map<TileId, number> {
  const tiles: TileId[] = []
  for (let s = 0; s < 4; s++) {
    const p = state.players[s as Seat]
    tiles.push(...p.discards)
    for (const m of p.melds) tiles.push(...m.tiles)
  }
  if (state.pendingDiscard) tiles.push(state.pendingDiscard.tile)
  return countTiles(tiles)
}

/**
 * 舊棄牌分入面「出街張數」嗰半。
 * 安全（想打）喺保留分入面係減分，練習提示沿用呢條，唔跟性格。
 */
export function tileKeepSafetyAdjust(
  tile: TileId,
  hand: TileId[],
  visible: Map<TileId, number>,
): number {
  const inHand = countTiles(hand).get(tile) ?? 0
  const seen = visible.get(tile) ?? 0
  const maxCopies = isHonor(tile) || isSuitTile(tile) ? 4 : 1
  const unknown = Math.max(0, maxCopies - inHand - seen)
  if (isHonor(tile)) return -seen * 4 + unknown * 2
  if (!isSuitTile(tile)) return -seen * 3
  return -seen * 5 + unknown * 2
}

function sujiPartners(rank: number): number[] {
  const partners: number[] = []
  if (rank - 3 >= 1) partners.push(rank - 3)
  if (rank + 3 <= 9) partners.push(rank + 3)
  return partners
}

function sujiLevel(tile: TileId, river: TileId[]): number {
  if (!isSuitTile(tile)) return 0
  const info = parseTile(tile)
  let level = 0
  for (const rank of sujiPartners(info.rank)) {
    if (river.includes(`${info.suit}-${rank}`)) level++
  }
  return level
}

/**
 * 安全分：愈高愈可以打。
 * 現張（該家牌河已經打過）最大，其次筋、露面張數、單張字牌。
 * 只睇公開牌河／副露，唔睇他家手牌。
 */
export function tileSafetyScore(
  tile: TileId,
  state: GameState,
  self: Seat,
  hand: TileId[],
  threats: readonly Seat[],
): number {
  const seen = visibleTileCounts(state, self).get(tile) ?? 0
  let score = seen * 12
  const inHand = countTiles(hand).get(tile) ?? 0
  if (isHonor(tile) && inHand <= 1) score += 18

  for (let s = 0; s < 4; s++) {
    if (s === self) continue
    const river = state.players[s as Seat].discards
    const threat = threats.includes(s as Seat)
    if (river.includes(tile)) {
      score += threat ? 70 : 14
      continue
    }
    const suji = sujiLevel(tile, river)
    if (suji > 0) {
      score += threat ? (suji >= 2 ? 28 : 16) : 5
      continue
    }
    if (threat && isSuitTile(tile)) score -= 6
  }
  return score
}
