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
 * 暗牌張數必須＝剩餘面子×3＋眼 2（門清即 17），唔夠／多都唔當標準糊。
 */
export function findStandardWins(
  hand: TileId[],
  exposedMelds: Meld[],
  winTile: TileId,
): WinPartition[] {
  const remaining = 5 - exposedMelds.length
  if (remaining < 0) return []
  const tiles = [...hand, winTile]
  const need = remaining * 3 + 2
  if (tiles.length !== need) return []
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

/**
 * 嚦咕嚦咕（尼古尼古）：成型 17 張＝七對＋一刻（唔跟五組一對）。
 * 四張相同可當兩對（唔好暗槓）。
 */
export function isLiguligu(hand: TileId[], winTile: TileId): boolean {
  const tiles = [...hand, winTile]
  if (tiles.length !== 17) return false
  const counts = countTiles(tiles)
  let pairs = 0
  let triples = 0
  for (const n of counts.values()) {
    if (n === 1 || n > 4) return false
    if (n === 2) pairs += 1
    else if (n === 3) triples += 1
    else if (n === 4) pairs += 2
  }
  return triples === 1 && pairs === 7
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
 * 十六不搭：門清、17 張、恰好一對眼、其餘全單張，
 * 同門數牌兩兩之間至少差 3（唔可相鄰／隔一上，常見 147／258／369）。
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
  // 同門：排序後相鄰兩 rank 必須 ≥3（禁 3+4 相鄰、1+3 可上）
  for (const suit of ['man', 'pin', 'sou'] as const) {
    const ranks: number[] = []
    for (const [id, n] of counts) {
      if (!id.startsWith(suit + '-') || n < 1) continue
      ranks.push(Number(id.split('-')[1]))
    }
    ranks.sort((a, b) => a - b)
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i]! - ranks[i - 1]! < 3) return false
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

/**
 * 對碰：糊牌用來湊成刻（手上原有一對），唔係做眼、唔係入順。
 * （舊邏輯只睇「手上有兩隻糊牌」會誤判 55 眼＋456 食 5）
 */
export function isDuiPengWait(
  hand: TileId[],
  melds: Meld[],
  winTile: TileId,
): boolean {
  if (hand.filter((t) => t === winTile).length !== 2) return false
  const parts = findStandardWins(hand, melds, winTile)
  return parts.some(
    (p) =>
      p.pair !== winTile &&
      p.melds.some((m) => m.kind === 'pong' && m.tiles[0] === winTile),
  )
}

/**
 * 獨獨：單面聽（聽口得一張）——單騎／邊張／中洞。
 * 對碰另計；多面聽而似獨聽型式 → 假獨。
 */
export function isDuduWait(
  hand: TileId[],
  melds: Meld[],
  winTile: TileId,
): boolean {
  const waits = waitingTiles(hand, melds)
  if (waits.length !== 1 || waits[0] !== winTile) return false
  if (isDuiPengWait(hand, melds, winTile)) return false

  const parts = findStandardWins(hand, melds, winTile)
  const wr = isSuitTile(winTile) ? parseTile(winTile).rank : -1
  return parts.some((p) => {
    // 單騎：糊牌做眼
    if (p.pair === winTile) return true
    if (!isSuitTile(winTile)) return false
    for (const m of p.melds) {
      if (m.kind !== 'chi' || !m.tiles.includes(winTile)) continue
      const ranks = m.tiles
        .map((t) => parseTile(t).rank)
        .sort((a, b) => a - b)
      // 中洞
      if (wr === ranks[1]) return true
      // 邊張：123 糊 3，或 789 糊 7
      if (ranks[0] === 1 && ranks[2] === 3 && wr === 3) return true
      if (ranks[0] === 7 && ranks[2] === 9 && wr === 7) return true
    }
    return false
  })
}

export function isAllChiPartition(p: WinPartition, exposed: Meld[]): boolean {
  if (exposed.some((m) => m.kind !== 'chi')) return false
  return p.melds.every((m) => m.kind === 'chi')
}

export function hasNoHonors(tiles: TileId[]): boolean {
  return tiles.every((t) => !isHonor(t))
}
