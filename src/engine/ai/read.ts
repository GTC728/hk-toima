import type { GameState, Meld, Seat, TileId } from '../types'
import { countTiles, removeOne } from '../tiles'
import { wallRemaining } from '../wall'
import { waitingTiles } from '../win-check'

/** 牆尾：剩餘少過呢個數，各家都當似聽。 */
export const LATE_WALL = 16
/** 早段：進攻願意碰。 */
export const EARLY_WALL = 40

export interface TableRead {
  wallRemaining: number
  wallLate: boolean
  early: boolean
  /** 公開資訊睇落似聽嘅對家 */
  threats: Seat[]
  selfTenpai: boolean
}

function greedySequences(hand: TileId[]): number {
  const counts = countTiles(hand)
  let sequences = 0
  for (const suit of ['man', 'pin', 'sou'] as const) {
    const ranks = Array<number>(10).fill(0)
    for (let i = 1; i <= 9; i++) ranks[i] = counts.get(`${suit}-${i}`) ?? 0
    for (let i = 1; i <= 7; i++) {
      while (ranks[i]! > 0 && ranks[i + 1]! > 0 && ranks[i + 2]! > 0) {
        ranks[i]!--
        ranks[i + 1]!--
        ranks[i + 2]!--
        sequences++
      }
    }
  }
  return sequences
}

/**
 * 組數已經接近先至值得掃聽口。
 * 垃圾牌唔好每巡對全表叫 `waitingTiles`。
 */
export function isCloseEnough(hand: TileId[], melds: Meld[]): boolean {
  const meldTiles = melds.reduce((n, meld) => n + Math.min(meld.tiles.length, 3), 0)
  const tileCount = hand.length + meldTiles
  if (tileCount < 16 || tileCount > 17) return false
  const counts = countTiles(hand)
  let pairs = 0
  let triples = 0
  for (const n of counts.values()) {
    if (n >= 3) triples++
    else if (n >= 2) pairs++
  }
  const sets = melds.length + triples + greedySequences(hand)
  if (sets >= 5) return true
  if (sets >= 4 && pairs + triples >= 1) return true
  if (melds.length === 0 && pairs >= 6) return true
  return false
}

function tenpaiDiscards(hand: TileId[], melds: Meld[]): TileId[] {
  const out: TileId[] = []
  for (const tile of new Set(hand)) {
    if (waitingTiles(removeOne(hand, tile), melds).length > 0) out.push(tile)
  }
  return out
}

function looksTenpai(melds: number, flowers: number, wallLate: boolean): boolean {
  if (melds >= 3) return true
  if (wallLate) return true
  if (melds >= 2 && flowers >= 4) return true
  return false
}

/** 只讀牌河、副露、花、牆。唔讀他家手牌。 */
export function readTable(state: GameState, self: Seat): TableRead {
  const remaining = wallRemaining(state.liveIndex, state.deadWallIndex)
  const wallLate = remaining <= LATE_WALL
  const threats: Seat[] = []
  for (let s = 0; s < 4; s++) {
    if (s === self) continue
    const player = state.players[s as Seat]
    if (looksTenpai(player.melds.length, player.flowers.length, wallLate)) {
      threats.push(s as Seat)
    }
  }
  const me = state.players[self]
  const close = isCloseEnough(me.hand, me.melds)
  const waits = close ? tenpaiDiscards(me.hand, me.melds) : []
  return {
    wallRemaining: remaining,
    wallLate,
    early: remaining > EARLY_WALL,
    threats,
    selfTenpai: waits.length > 0,
  }
}

export function discardKeepsWait(
  hand: TileId[],
  melds: Meld[],
  tile: TileId,
): boolean {
  if (!isCloseEnough(hand, melds)) return false
  return waitingTiles(removeOne(hand, tile), melds).length > 0
}
