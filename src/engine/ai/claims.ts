import type { Action, GameState, Meld, Seat, TileId } from '../types'
import { countTiles, removeMany } from '../tiles'
import { handShapeScore } from './shape'
import { isCloseEnough, type TableRead } from './read'
import { PERSONA_PROFILE, type AiPersona } from './persona'
import { waitingTiles } from '../win-check'

function pairGroups(hand: TileId[]): number {
  let groups = 0
  for (const n of countTiles(hand).values()) {
    if (n >= 2) groups++
  }
  return groups
}

function breaksOnlyEye(before: TileId[], after: TileId[]): boolean {
  return pairGroups(before) === 1 && pairGroups(after) === 0
}

function pongDelta(hand: TileId[], tile: TileId, melds: Meld[]): number {
  const before = handShapeScore(hand, melds.length)
  const after = handShapeScore(removeMany(hand, [tile, tile]), melds.length + 1)
  return after - before
}

function chiDelta(
  hand: TileId[],
  tiles: TileId[],
  melds: Meld[],
): number {
  const before = handShapeScore(hand, melds.length)
  const after = handShapeScore(removeMany(hand, tiles), melds.length + 1)
  return after - before
}

function kongRemoves(action: Action, claimed: TileId | null): TileId[] {
  if (action.type === 'mingkong' && claimed) return [claimed, claimed, claimed]
  if (action.type === 'ankong') return [action.tile, action.tile, action.tile, action.tile]
  if (action.type === 'jiagang') return [action.tile]
  return []
}

function kongBreaksWait(
  hand: TileId[],
  melds: Meld[],
  remove: TileId[],
  extraMeld: boolean,
): boolean {
  if (!isCloseEnough(hand, melds)) return false
  let hadWait = waitingTiles(hand, melds).length > 0
  if (!hadWait) {
    for (const tile of new Set(hand)) {
      if (waitingTiles(removeMany(hand, [tile]), melds).length > 0) {
        hadWait = true
        break
      }
    }
  }
  if (!hadWait) return false
  const nextHand = removeMany(hand, remove)
  const nextMelds = extraMeld
    ? [...melds, { kind: 'mingkong' as const, tiles: remove }]
    : melds
  return waitingTiles(nextHand, nextMelds).length === 0
}

function wantsKong(
  state: GameState,
  seat: Seat,
  persona: AiPersona,
  action: Action,
): boolean {
  const profile = PERSONA_PROFILE[persona]
  if (profile.kong === 'always') return true
  const player = state.players[seat]
  const claimed = state.pendingDiscard?.tile ?? null
  const remove = kongRemoves(action, claimed)
  if (remove.length === 0) return false
  const extraMeld = action.type !== 'jiagang'
  return !kongBreaksWait(player.hand, player.melds, remove, extraMeld)
}

function wantsPong(
  state: GameState,
  seat: Seat,
  persona: AiPersona,
  tile: TileId,
  read: TableRead,
): boolean {
  const player = state.players[seat]
  const after = removeMany(player.hand, [tile, tile])
  const breaks = breaksOnlyEye(player.hand, after)
  const profile = PERSONA_PROFILE[persona]
  if (profile.protectOnlyEye && breaks) return false
  if (profile.earlyPong && read.early) return true
  const delta = pongDelta(player.hand, tile, player.melds)
  if (persona === 'gamble') return true
  if (breaks && delta < 0) return false
  return delta >= (persona === 'steady' ? 0 : -8)
}

function bestChi(
  state: GameState,
  seat: Seat,
  persona: AiPersona,
  chis: Extract<Action, { type: 'chi' }>[],
): Extract<Action, { type: 'chi' }> | null {
  const player = state.players[seat]
  const profile = PERSONA_PROFILE[persona]
  let best: { action: Extract<Action, { type: 'chi' }>; delta: number } | null = null
  for (const action of chis) {
    const after = removeMany(player.hand, action.tiles)
    if (profile.protectOnlyEye && breaksOnlyEye(player.hand, after)) continue
    const delta = chiDelta(player.hand, action.tiles, player.melds)
    if (delta < profile.chiMinDelta) continue
    const key = [...action.tiles].sort().join(',')
    const bestKey = best ? [...best.action.tiles].sort().join(',') : ''
    if (!best || delta > best.delta || (delta === best.delta && key.localeCompare(bestKey) < 0)) {
      best = { action, delta }
    }
  }
  return best?.action ?? null
}

/** 食糊之外嘅鳴牌。唔鳴就回傳 null，呼叫方先至過。 */
export function chooseClaim(
  state: GameState,
  seat: Seat,
  persona: AiPersona,
  legal: Action[],
  read: TableRead,
): Action | null {
  const kongs = legal.filter(
    (action) =>
      action.type === 'mingkong' || action.type === 'ankong' || action.type === 'jiagang',
  )
  for (const kong of kongs) {
    if (wantsKong(state, seat, persona, kong)) return kong
  }

  const pong = legal.find((action) => action.type === 'pong')
  const claimed = state.pendingDiscard?.tile
  if (pong && claimed && wantsPong(state, seat, persona, claimed, read)) return pong

  const chis = legal.filter((action): action is Extract<Action, { type: 'chi' }> => action.type === 'chi')
  return bestChi(state, seat, persona, chis)
}
