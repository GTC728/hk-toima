import type { Meld, TileId } from '../types'
import { countTiles, isHonor, isSuitTile, parseTile } from '../tiles'
import type { AiPersona } from './persona'

/**
 * 成牌保留分：對子、刻子、搭子、中張。
 * 同舊 `discardKeepScore` 入面「想留低」嗰半，數字唔改，練習提示先對得返。
 */
export function tileShapeKeep(tile: TileId, hand: TileId[]): number {
  const handCounts = countTiles(hand)
  const inHand = handCounts.get(tile) ?? 0
  let score = 0
  if (inHand >= 3) score += 40
  else if (inHand === 2) score += 25

  if (isHonor(tile)) {
    score += inHand >= 2 ? 10 : 2
    return score
  }
  if (!isSuitTile(tile)) return score

  const info = parseTile(tile)
  const neighbor = (rank: number): number => {
    if (rank < 1 || rank > 9) return 0
    return handCounts.get(`${info.suit}-${rank}`) ?? 0
  }
  const left = neighbor(info.rank - 1)
  const right = neighbor(info.rank + 1)
  const left2 = neighbor(info.rank - 2)
  const right2 = neighbor(info.rank + 2)
  if (left > 0 && right > 0) score += 30
  else if (left > 0 || right > 0) score += 18
  else if (left2 > 0 || right2 > 0) score += 10

  if (info.rank >= 3 && info.rank <= 7) score += 6
  else if (info.rank === 2 || info.rank === 8) score += 3
  else score += 1
  return score
}

/** 一手暗牌＋已鳴組數嘅成牌分。鳴牌前後用同一把尺比較。 */
export function handShapeScore(hand: TileId[], meldCount: number): number {
  let score = meldCount * 36
  const counts = countTiles(hand)
  for (const [id, n] of counts) {
    if (n >= 3) score += 40
    else if (n === 2) score += 25
    if (isHonor(id)) score += n >= 2 ? 8 : 1
  }

  for (const suit of ['man', 'pin', 'sou'] as const) {
    const ranks = Array<number>(10).fill(0)
    for (let i = 1; i <= 9; i++) ranks[i] = counts.get(`${suit}-${i}`) ?? 0
    for (let i = 1; i <= 7; i++) {
      while (ranks[i]! > 0 && ranks[i + 1]! > 0 && ranks[i + 2]! > 0) {
        ranks[i]!--
        ranks[i + 1]!--
        ranks[i + 2]!--
        score += 32
      }
    }
    for (let i = 1; i <= 8; i++) {
      if (ranks[i]! > 0 && ranks[i + 1]! > 0) score += 16
    }
    for (let i = 1; i <= 7; i++) {
      if (ranks[i]! > 0 && ranks[i + 1] === 0 && ranks[i + 2]! > 0) score += 10
    }
    for (let i = 1; i <= 9; i++) {
      if (ranks[i]! <= 0) continue
      if (i >= 3 && i <= 7) score += 4
      else if (i === 2 || i === 8) score += 2
      else score += 1
    }
  }
  return score
}

export function dominantSuit(
  hand: TileId[],
  melds: Meld[],
): 'man' | 'pin' | 'sou' | null {
  const totals = { man: 0, pin: 0, sou: 0 }
  const add = (tile: TileId) => {
    if (!isSuitTile(tile)) return
    const suit = parseTile(tile).suit
    if (suit !== 'man' && suit !== 'pin' && suit !== 'sou') return
    totals[suit]++
  }
  for (const tile of hand) add(tile)
  for (const meld of melds) for (const tile of meld.tiles) add(tile)
  let best: 'man' | 'pin' | 'sou' | null = null
  let bestN = 0
  for (const suit of ['man', 'pin', 'sou'] as const) {
    if (totals[suit] > bestN) {
      bestN = totals[suit]
      best = suit
    }
  }
  return bestN >= 5 ? best : null
}

/** 搏糊追對對／清一色／字一色；進攻只輕微追一門。加喺保留分上。 */
export function yakuChaseKeep(
  tile: TileId,
  hand: TileId[],
  melds: Meld[],
  persona: AiPersona,
): number {
  if (persona === 'steady') return 0
  const inHand = countTiles(hand).get(tile) ?? 0
  let bonus = 0
  if (persona === 'gamble' && inHand >= 2) bonus += 24
  const suit = dominantSuit(hand, melds)
  if (suit && isSuitTile(tile) && parseTile(tile).suit === suit) {
    bonus += persona === 'gamble' ? 14 : 6
  }
  if (persona === 'gamble' && isHonor(tile)) {
    let honors = 0
    for (const t of hand) if (isHonor(t)) honors++
    for (const meld of melds) for (const t of meld.tiles) if (isHonor(t)) honors++
    if (honors >= 8) bonus += 16
  }
  return bonus
}
