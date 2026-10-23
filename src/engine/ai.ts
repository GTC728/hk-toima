import type { Action, GameState, Seat, TileId } from './types'
import { getLegalActions } from './game'
import { countTiles, isHonor, isSuitTile, parseTile } from './tiles'

/**
 * 補位 AI：可打完一鋪，只喺 `getLegalActions` 入面揀（叮限制自動遵守）。
 *
 * 優先序：食糊 → 槓 → 碰 → 上 → 摸 → 打最「危險／無用」最低嘅牌 → 過。
 * 唔主動叫叮，避免鎖死；局完（round_over）回傳 null。
 */
export function chooseAiAction(state: GameState, seat: Seat): Action | null {
  const legal = getLegalActions(state, seat)
  if (legal.length === 0) return null

  const win = legal.find((a) => a.type === 'win')
  if (win) return win

  const mingkong = legal.find((a) => a.type === 'mingkong')
  if (mingkong) return mingkong

  const ankong = legal.find((a) => a.type === 'ankong')
  if (ankong) return ankong

  const jiagang = legal.find((a) => a.type === 'jiagang')
  if (jiagang) return jiagang

  const pong = legal.find((a) => a.type === 'pong')
  if (pong) return pong

  const chis = legal.filter((a): a is Extract<Action, { type: 'chi' }> => a.type === 'chi')
  if (chis.length > 0) return pickChi(chis)

  const draw = legal.find((a) => a.type === 'draw')
  if (draw) return draw

  const discards = legal.filter(
    (a): a is Extract<Action, { type: 'discard' }> => a.type === 'discard',
  )
  if (discards.length > 0) return pickLowestDangerDiscard(state, seat, discards)

  const pass = legal.find((a) => a.type === 'pass')
  if (pass) return pass

  // round_over 等非打牌動作：交俾 UI／房主
  return null
}

function pickChi(
  chis: Extract<Action, { type: 'chi' }>[],
): Extract<Action, { type: 'chi' }> {
  // 穩定揀法：按 tiles 字串排序取第一組
  return [...chis].sort((a, b) => a.tiles.join(',').localeCompare(b.tiles.join(',')))[0]!
}

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
 * 危險度／保留價值：分數愈高愈想留，打出時揀分數最低嗰隻。
 * — 孤立字牌／幺九、已多張露面 → 低分（優先打）
 * — 對手有鄰張／自己成對成搭 → 高分（保留）
 */
export function discardKeepScore(
  tile: TileId,
  hand: TileId[],
  visible: Map<TileId, number>,
): number {
  const handCounts = countTiles(hand)
  const inHand = handCounts.get(tile) ?? 0
  const seen = visible.get(tile) ?? 0
  // 其餘未知（牆＋他家手）粗略
  const maxCopies = isHonor(tile) || isSuitTile(tile) ? 4 : 1
  const unknown = Math.max(0, maxCopies - inHand - seen)

  let score = 0

  // 成對／成刻優先留
  if (inHand >= 3) score += 40
  else if (inHand === 2) score += 25

  if (isHonor(tile)) {
    // 單隻字牌：露面愈多愈安全打出
    score += inHand >= 2 ? 10 : 2
    score -= seen * 4
    score += unknown * 2
    return score
  }

  if (!isSuitTile(tile)) {
    score -= seen * 3
    return score
  }

  const info = parseTile(tile)
  const neighbor = (rank: number): number => {
    if (rank < 1 || rank > 9) return 0
    const id = `${info.suit}-${rank}` as TileId
    return handCounts.get(id) ?? 0
  }

  const left = neighbor(info.rank - 1)
  const right = neighbor(info.rank + 1)
  const left2 = neighbor(info.rank - 2)
  const right2 = neighbor(info.rank + 2)

  // 順子潛力
  if (left > 0 && right > 0) score += 30
  else if (left > 0 || right > 0) score += 18
  else if (left2 > 0 || right2 > 0) score += 10

  // 中間牌較值錢
  if (info.rank >= 3 && info.rank <= 7) score += 6
  else if (info.rank === 2 || info.rank === 8) score += 3
  else score += 1 // 幺九

  // 已多張出街 → 較安全／較無用
  score -= seen * 5
  score += unknown * 2

  return score
}

function pickLowestDangerDiscard(
  state: GameState,
  seat: Seat,
  discards: Extract<Action, { type: 'discard' }>[],
): Extract<Action, { type: 'discard' }> {
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
  // 唔帶 declareDing
  return { type: 'discard', tile: best.tile }
}
