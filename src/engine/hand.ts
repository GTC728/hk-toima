import type { Meld, TileId } from './types'
import { countTiles, isSuitTile, parseTile, removeMany } from './tiles'

/** 暗刻／暗牌（未鳴） */
export function concealedTiles(hand: TileId[]): TileId[] {
  return [...hand]
}

export function allTilesInHand(hand: TileId[], melds: Meld[]): TileId[] {
  const out = [...hand]
  for (const m of melds) out.push(...m.tiles)
  return out
}

export function hasTile(hand: TileId[], id: TileId, n = 1): boolean {
  return (countTiles(hand).get(id) ?? 0) >= n
}

/** 搵所有可上組合：手上兩張 + claimed */
export function findChiOptions(hand: TileId[], claimed: TileId): TileId[][] {
  if (!isSuitTile(claimed)) return []
  const c = parseTile(claimed)
  const options: TileId[][] = []
  const candidates = [
    [c.rank - 2, c.rank - 1],
    [c.rank - 1, c.rank + 1],
    [c.rank + 1, c.rank + 2],
  ]
  for (const [r1, r2] of candidates) {
    if (r1! < 1 || r2! > 9) continue
    const t1 = `${c.suit}-${r1}` as TileId
    const t2 = `${c.suit}-${r2}` as TileId
    if (t1 === claimed || t2 === claimed) continue
    try {
      removeMany(hand, [t1, t2])
      options.push([t1, t2])
    } catch {
      /* missing */
    }
  }
  // 去重
  const key = (pair: TileId[]) => [...pair].sort().join(',')
  const seen = new Set<string>()
  return options.filter((o) => {
    const k = key(o)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function canPong(hand: TileId[], claimed: TileId): boolean {
  return hasTile(hand, claimed, 2)
}

export function canMingKong(hand: TileId[], claimed: TileId): boolean {
  return hasTile(hand, claimed, 3)
}

export function canAnKong(hand: TileId[]): TileId[] {
  const counts = countTiles(hand)
  const out: TileId[] = []
  for (const [id, n] of counts) {
    if (n >= 4) out.push(id)
  }
  return out
}

export function canJiaGang(hand: TileId[], melds: Meld[]): TileId[] {
  const out: TileId[] = []
  for (const m of melds) {
    if (m.kind !== 'pong') continue
    const id = m.tiles[0]!
    if (hasTile(hand, id, 1)) out.push(id)
  }
  return out
}
