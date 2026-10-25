import type { Action, GameState, Seat, TileId } from '../types'
import { getLegalActions } from '../legal-actions'
import { createRng } from '../rng'
import { chooseClaim } from './claims'
import { PERSONA_PROFILE, type AiPersona } from './persona'
import { discardKeepsWait, readTable, type TableRead } from './read'
import { safetyPressure } from './risk'
import { tileKeepSafetyAdjust, tileSafetyScore, visibleTileCounts } from './safety'
import { tileShapeKeep, yakuChaseKeep } from './shape'

export type { AiPersona } from './persona'
export {
  AI_PERSONA_LABEL,
  AI_PERSONA_ORDER,
  PERSONA_PROFILE,
  defaultAiPersonas,
  displayPersonas,
  isAiPersona,
  nextAiPersona,
} from './persona'
export { visibleTileCounts } from './safety'
export { tileShapeKeep } from './shape'
export { tileSafetyScore } from './safety'
export { safetyPressure } from './risk'
export { readTable } from './read'

/**
 * 保留分 = 成牌分 + 舊嘅露面調整。
 * 練習提示用呢條，唔加性格權重。
 */
export function discardKeepScore(
  tile: TileId,
  hand: TileId[],
  visible: Map<TileId, number>,
): number {
  return tileShapeKeep(tile, hand) + tileKeepSafetyAdjust(tile, hand, visible)
}

/** 棄牌評分只留呢度。分數愈低愈優先打。hints 同未加權嘅參考都叫呢個。 */
export function chooseDiscardTile(
  state: GameState,
  seat: Seat,
  tiles: TileId[],
): TileId | null {
  if (tiles.length === 0) return null
  const hand = state.players[seat].hand
  const visible = visibleTileCounts(state, seat)
  let best = tiles[0]!
  let bestScore = Infinity
  for (const tile of tiles) {
    const score = discardKeepScore(tile, hand, visible)
    if (score < bestScore || (score === bestScore && tile.localeCompare(best) < 0)) {
      bestScore = score
      best = tile
    }
  }
  return best
}

function discardUtility(
  state: GameState,
  seat: Seat,
  persona: AiPersona,
  tile: TileId,
  read: TableRead,
  pressure: number,
): number {
  const player = state.players[seat]
  const shape =
    tileShapeKeep(tile, player.hand) + yakuChaseKeep(tile, player.hand, player.melds, persona)
  const safety = tileSafetyScore(tile, state, seat, player.hand, read.threats)
  const profile = PERSONA_PROFILE[persona]
  const threatened = read.threats.length > 0 && !read.selfTenpai
  if (read.selfTenpai) return safety * 0.35 * pressure - shape * 0.08
  if (!threatened) return safety * profile.safety * pressure - shape * profile.shape
  if (persona === 'attack') {
    const danger = safety < 8 ? 36 : 0
    return safety * profile.threatSafety * pressure - shape * profile.threatShape - danger
  }
  return safety * profile.threatSafety * pressure - shape * profile.threatShape
}

function pickDiscard(
  state: GameState,
  seat: Seat,
  persona: AiPersona,
  discards: Extract<Action, { type: 'discard' }>[],
  read: TableRead,
): Extract<Action, { type: 'discard' }> {
  const player = state.players[seat]
  const pressure = safetyPressure(state, seat, read.threats, persona)
  let pool = discards
  if (read.selfTenpai) {
    const keeping = discards.filter((action) =>
      discardKeepsWait(player.hand, player.melds, action.tile),
    )
    if (keeping.length > 0) pool = keeping
  }

  const ranked = pool.map((action) => ({
    tile: action.tile,
    score: discardUtility(state, seat, persona, action.tile, read, pressure),
  }))
  ranked.sort((a, b) => b.score - a.score || a.tile.localeCompare(b.tile))
  const mixed = (state.seed + seat * 9973 + state.discardsThisRound * 131) >>> 0
  const roll = createRng(mixed)()
  const mistake = ranked.length > 1 && roll < PERSONA_PROFILE[persona].mistakeRate
  const tile = (mistake ? ranked[1] : ranked[0])!.tile
  return { type: 'discard', tile }
}

/**
 * 補位 AI。只喺 `getLegalActions` 入面揀。
 * 唔傳性格當進攻，原有食糊／碰／上測試維持。
 * 食糊永遠最先，三種性格都唔會放過。
 */
export function chooseAiAction(
  state: GameState,
  seat: Seat,
  persona: AiPersona = 'attack',
): Action | null {
  const legal = getLegalActions(state, seat)
  if (legal.length === 0) return null

  const win = legal.find((action) => action.type === 'win')
  if (win) return win

  if (legal.length === 1 && legal[0]!.type === 'draw') return legal[0]!

  const read = readTable(state, seat)
  const claim = chooseClaim(state, seat, persona, legal, read)
  if (claim) return claim

  if (state.phase === 'claim_window') {
    return legal.find((action) => action.type === 'pass') ?? null
  }

  const draw = legal.find((action) => action.type === 'draw')
  if (draw) return draw

  const discards = legal.filter(
    (action): action is Extract<Action, { type: 'discard' }> => action.type === 'discard',
  )
  if (discards.length > 0) return pickDiscard(state, seat, persona, discards, read)

  return legal.find((action) => action.type === 'pass') ?? null
}
