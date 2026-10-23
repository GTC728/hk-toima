import type { Meld, TileId } from './types'
import {
  allOrphanIds,
  countTiles,
  isHonor,
  isOrphan,
  isSuitTile,
  parseTile,
} from './tiles'

export interface PartitionMeld {
  kind: 'chi' | 'pong'
  tiles: TileId[]
}

export interface WinPartition {
  pair: TileId
  melds: PartitionMeld[]
}

function copyCount(m: Map<TileId, number>): Map<TileId, number> {
  return new Map(m)
}

function take(m: Map<TileId, number>, id: TileId, n: number): boolean {
  const c = m.get(id) ?? 0
  if (c < n) return false
  if (c === n) m.delete(id)
  else m.set(id, c - n)
  return true
}

function tileKeys(m: Map<TileId, number>): TileId[] {
  return [...m.keys()].sort()
}

function search(
  counts: Map<TileId, number>,
  remainingMelds: number,
  acc: PartitionMeld[],
  pair: TileId,
  out: WinPartition[],
): void {
  if (remainingMelds === 0) {
    if (tileKeys(counts).length === 0) {
      out.push({ pair, melds: [...acc] })
    }
    return
  }

  const keys = tileKeys(counts)
  if (keys.length === 0) return
  const first = keys[0]!

  if ((counts.get(first) ?? 0) >= 3) {
    const mm = copyCount(counts)
    take(mm, first, 3)
    acc.push({ kind: 'pong', tiles: [first, first, first] })
    search(mm, remainingMelds - 1, acc, pair, out)
    acc.pop()
  }

  if (isSuitTile(first)) {
    const t = parseTile(first)
    if (t.rank <= 7) {
      const b = `${t.suit}-${t.rank + 1}` as TileId
      const c = `${t.suit}-${t.rank + 2}` as TileId
      const mm = copyCount(counts)
      if (take(mm, first, 1) && take(mm, b, 1) && take(mm, c, 1)) {
        acc.push({ kind: 'chi', tiles: [first, b, c] })
        search(mm, remainingMelds - 1, acc, pair, out)
        acc.pop()
      }
    }
  }
}

/**
 * 標準型：5 面子 + 1 對。
 * exposedMelds 已擺出；hand + winTile 為暗牌。
 */
export function findStandardWins(
  hand: TileId[],
  exposedMelds: Meld[],
  winTile: TileId,
): WinPartition[] {
  const remaining = 5 - exposedMelds.length
  if (remaining < 0) return []
  const tiles = [...hand, winTile]
  const base = countTiles(tiles)
  const fixed: WinPartition[] = []

  for (const id of [...base.keys()]) {
    if ((base.get(id) ?? 0) < 2) continue
    const mm = copyCount(base)
    take(mm, id, 2)
    search(mm, remaining, [], id, fixed)
  }

  const seen = new Set<string>()
  return fixed.filter((p) => {
    const key = `${p.pair}|${p.melds
      .map((m) => m.kind + ':' + m.tiles.join(','))
      .sort()
      .join(';')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** 嚦咕嚦咕：八對（成型 16 張，唔跟五組一對） */
export function isLiguligu(hand: TileId[], winTile: TileId): boolean {
  const tiles = [...hand, winTile]
  if (tiles.length !== 16) return false
  const counts = countTiles(tiles)
  if ([...counts.values()].some((n) => n !== 2)) return false
  return counts.size === 8
}

/** 十三么：十三種么九字齊；成型 17 張（16+食／摸）全么九字 */
export function isThirteenOrphans(hand: TileId[], winTile: TileId): boolean {
  const tiles = [...hand, winTile]
  if (tiles.length !== 17) return false
  if (!tiles.every(isOrphan)) return false
  const orphans = allOrphanIds()
  const set = new Set(tiles)
  return orphans.every((o) => set.has(o))
}

/**
 * 十六不搭（簡化）：門清、17 張、恰好一對眼、其餘全單張，
 * 且任何三張都砌唔成順／刻（成手前）。
 */
export function isSixteenBuDa(hand: TileId[], winTile: TileId): boolean {
  const tiles = [...hand, winTile]
  if (tiles.length !== 17) return false
  if (findStandardWins(hand, [], winTile).length > 0) return false
  const counts = countTiles(tiles)
  const vals = [...counts.values()]
  if (vals.filter((n) => n === 2).length !== 1) return false
  if (vals.some((n) => n > 2)) return false
  if (vals.filter((n) => n === 1).length !== 15) return false
  // 唔可以有三連順潛力：同一花色有連續三個單張
  for (const suit of ['man', 'pin', 'sou'] as const) {
    const ranks = new Set<number>()
    for (const [id, n] of counts) {
      if (!id.startsWith(suit + '-') || n < 1) continue
      const r = Number(id.split('-')[1])
      ranks.add(r)
    }
    for (let r = 1; r <= 7; r++) {
      if (ranks.has(r) && ranks.has(r + 1) && ranks.has(r + 2)) return false
    }
  }
  return true
}

export function canWin(
  hand: TileId[],
  melds: Meld[],
  winTile: TileId,
): boolean {
  if (melds.length === 0 && isLiguligu(hand, winTile)) return true
  if (melds.length === 0 && isThirteenOrphans(hand, winTile)) return true
  if (melds.length === 0 && isSixteenBuDa(hand, winTile)) return true
  return findStandardWins(hand, melds, winTile).length > 0
}

/** 叫糊：邊啲牌摸／食可得糊 */
export function waitingTiles(hand: TileId[], melds: Meld[]): TileId[] {
  const candidates = new Set<TileId>()
  for (const suit of ['man', 'pin', 'sou'] as const) {
    for (let r = 1; r <= 9; r++) candidates.add(`${suit}-${r}`)
  }
  for (const w of ['east', 'south', 'west', 'north'] as const) {
    candidates.add(`wind-${w}`)
  }
  for (const d of ['zhong', 'fa', 'bai'] as const) {
    candidates.add(`dragon-${d}`)
  }

  const waits: TileId[] = []
  for (const t of candidates) {
    const all = [...hand, ...melds.flatMap((m) => m.tiles)]
    if (all.filter((x) => x === t).length >= 4) continue
    if (canWin(hand, melds, t)) waits.push(t)
  }
  return waits
}

export function isReady(hand: TileId[], melds: Meld[]): boolean {
  return waitingTiles(hand, melds).length > 0
}

/** 對碰：聽一張，手上已有一對 */
export function isDuiPengWait(
  hand: TileId[],
  melds: Meld[],
  winTile: TileId,
): boolean {
  const waits = waitingTiles(hand, melds)
  if (waits.length !== 1 || waits[0] !== winTile) return false
  return hand.filter((t) => t === winTile).length === 2
}

/** 獨獨（單騎） */
export function isDuduWait(
  hand: TileId[],
  melds: Meld[],
  winTile: TileId,
): boolean {
  const waits = waitingTiles(hand, melds)
  if (waits.length !== 1 || waits[0] !== winTile) return false
  return hand.filter((t) => t === winTile).length === 0
}

export function isAllChiPartition(p: WinPartition, exposed: Meld[]): boolean {
  if (exposed.some((m) => m.kind !== 'chi')) return false
  return p.melds.every((m) => m.kind === 'chi')
}

export function hasNoHonors(tiles: TileId[]): boolean {
  return tiles.every((t) => !isHonor(t))
}
