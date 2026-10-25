import {
  isHonor,
  parseTile,
  sortTiles,
  type Meld,
  type TileId,
} from '../engine'
import { handForDisplay } from './handDisplay'

/** 牌局內可選的排法。分門係預設，同而家顯示一樣。 */
export const ARRANGE_MODES = [
  { id: 'suit', label: '分門', hint: '萬、筒、索、風、三元' },
  { id: 'blocks', label: '搭子', hint: '面子、兩面、嵌張、邊張、對子，孤張在右' },
  { id: 'eyes', label: '眼張', hint: '對子在左，再搭子，孤張在右' },
  { id: 'float', label: '浮牌', hint: '有搭的牌按分門靠左，孤張靠右' },
  { id: 'ukeire', label: '進張', hint: '留低對成牌幫助大的，廢張靠右' },
  { id: 'copies', label: '重張', hint: '張數多的靠左' },
  { id: 'pung', label: '刻順', hint: '字牌、刻子、對子靠左，淨係可以上的靠右' },
  { id: 'terminals', label: '么九', hint: '么九字靠左，中張靠右' },
  { id: 'aim', label: '役向', hint: '張數最多的一門靠左' },
  { id: 'danger', label: '危險', hint: '生張靠左，現物同死張靠右' },
  { id: 'furiten', label: '過水', hint: '過碰同現物靠右' },
] as const

export type ArrangeMode = (typeof ARRANGE_MODES)[number]['id']

const STORAGE_KEY = 'hktoima.handArrange'

export interface ArrangeInput {
  hand: TileId[]
  justDrawn?: TileId | null
  /** 各家打出、以及待食的一張，用來認現物 */
  discards?: TileId[]
  /** 河牌加明牌，用來認死張 */
  seen?: TileId[]
  passedPong?: TileId[]
  melds?: Meld[]
}

const NUMBERED = ['man', 'pin', 'sou'] as const

export function loadArrangeMode(): ArrangeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && ARRANGE_MODES.some((m) => m.id === saved)) return saved as ArrangeMode
  } catch {
    /* 無 localStorage 就用分門 */
  }
  return 'suit'
}

export function saveArrangeMode(mode: ArrangeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* 私人模式唔阻止排牌 */
  }
}

export function arrangeHand(mode: ArrangeMode, input: ArrangeInput): TileId[] {
  const body =
    mode === 'suit' ? handForDisplay(input.hand, null) : orderBody(mode, input)
  return finish(input.hand, body, input.justDrawn)
}

/** 拖完之後，手牌內容變咗都盡量留住相對次序；新牌（含剛摸）貼最右。 */
export function reconcileOrder(
  prev: TileId[],
  next: TileId[],
  justDrawn: TileId | null | undefined,
): TileId[] {
  const want = count(next)
  const kept: TileId[] = []
  for (const id of prev) {
    const n = want.get(id) ?? 0
    if (n <= 0) continue
    kept.push(id)
    want.set(id, n - 1)
  }
  const extras: TileId[] = []
  for (const id of next) {
    const n = want.get(id) ?? 0
    if (n <= 0) continue
    extras.push(id)
    want.set(id, n - 1)
  }
  // 只把新出現的摸牌貼右。已經排好的位置唔好再拉動。
  if (justDrawn) {
    const at = extras.lastIndexOf(justDrawn)
    if (at >= 0 && at !== extras.length - 1) {
      extras.splice(at, 1)
      extras.push(justDrawn)
    }
  }
  return [...kept, ...extras]
}

/** `to` 係放手之後嗰張牌要去的位置。 */
export function moveTile<T>(tiles: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= tiles.length ||
    to >= tiles.length
  ) {
    return tiles
  }
  const next = tiles.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item as T)
  return next
}

function orderBody(mode: ArrangeMode, input: ArrangeInput): TileId[] {
  const { hand } = input
  const counts = count(hand)
  switch (mode) {
    case 'suit':
      return sortTiles(hand)
    case 'blocks': {
      const b = bucket(hand)
      return [...b.sets, ...b.ryanmen, ...b.kanchan, ...b.penchan, ...b.pairs, ...b.isolated]
    }
    case 'eyes':
      return eyesOrder(hand)
    case 'float': {
      const b = bucket(hand)
      const used = [
        ...b.sets,
        ...b.ryanmen,
        ...b.kanchan,
        ...b.penchan,
        ...b.pairs,
      ]
      return [...sortTiles(used), ...b.isolated]
    }
    case 'ukeire':
      return sortBy(hand, (id) => -keepValue(hand, id))
    case 'copies':
      return sortBy(hand, (id) => -(counts.get(id) ?? 0))
    case 'pung':
      return sortBy(hand, (id) => pungBand(id, counts))
    case 'terminals':
      return sortBy(hand, (id) => (orphan(id) ? 0 : 1))
    case 'aim':
      return sortBy(hand, (id) => aimBand(id, hand, input.melds, counts))
    case 'danger':
      return sortBy(hand, (id) => safety(id, count(input.seen ?? input.discards)))
    case 'furiten': {
      const passed = new Set(input.passedPong ?? [])
      const river = new Set(input.discards ?? [])
      return sortBy(hand, (id) => (passed.has(id) || river.has(id) ? 1 : 0))
    }
    default:
      return sortTiles(hand)
  }
}

function eyesOrder(hand: TileId[]): TileId[] {
  const counts = count(hand)
  const paired: TileId[] = []
  const rest: TileId[] = []
  for (const id of sortTiles(hand)) {
    if ((counts.get(id) ?? 0) >= 2) paired.push(id)
    else rest.push(id)
  }
  const b = bucket(rest)
  return [...paired, ...b.sets, ...b.ryanmen, ...b.kanchan, ...b.penchan, ...b.isolated]
}

function keepValue(hand: TileId[], id: TileId): number {
  const full = structureScore(hand)
  const without = hand.slice()
  const at = without.indexOf(id)
  if (at >= 0) without.splice(at, 1)
  return full - structureScore(without)
}

function structureScore(hand: TileId[]): number {
  const b = bucket(hand)
  return (
    (b.sets.length / 3) * 80 +
    (b.pairs.length / 2) * 30 +
    (b.ryanmen.length / 2) * 18 +
    (b.kanchan.length / 2) * 12 +
    (b.penchan.length / 2) * 8
  )
}

function pungBand(id: TileId, counts: Map<TileId, number>): number {
  const n = counts.get(id) ?? 0
  if (isHonor(id) || n >= 3) return 0
  if (n >= 2) return 1
  if (hasNeighbor(id, counts)) return 2
  return 3
}

function orphan(id: TileId): boolean {
  const t = parseTile(id)
  if (t.suit === 'wind' || t.suit === 'dragon') return true
  return (
    (t.suit === 'man' || t.suit === 'pin' || t.suit === 'sou') &&
    (t.rank === 1 || t.rank === 9)
  )
}

function hasNeighbor(id: TileId, counts: Map<TileId, number>): boolean {
  const t = parseTile(id)
  if (t.suit !== 'man' && t.suit !== 'pin' && t.suit !== 'sou') return false
  for (const d of [-2, -1, 1, 2]) {
    const rank = t.rank + d
    if (rank < 1 || rank > 9) continue
    if ((counts.get(`${t.suit}-${rank}` as TileId) ?? 0) > 0) return true
  }
  return false
}

function aimBand(
  id: TileId,
  hand: TileId[],
  melds: Meld[] | undefined,
  counts: Map<TileId, number>,
): number {
  const t = parseTile(id)
  if (t.suit === 'flower') return 9000
  const suitCount = { man: 0, pin: 0, sou: 0 }
  const pool = [...hand, ...(melds?.flatMap((m) => m.tiles) ?? [])]
  for (const tile of pool) {
    const s = parseTile(tile).suit
    if (s === 'man' || s === 'pin' || s === 'sou') suitCount[s] += 1
  }
  const primary = NUMBERED.slice().sort(
    (a, b) => suitCount[b] - suitCount[a] || a.localeCompare(b),
  )[0]!
  if (t.suit === primary) return 0
  if (isHonor(id) && (counts.get(id) ?? 0) >= 2) return 1000
  if (t.suit === 'man' || t.suit === 'pin' || t.suit === 'sou') {
    return 2000 + (9 - suitCount[t.suit]) * 100
  }
  return 3000
}

/** 數值愈大愈安全，排得愈右。 */
function safety(id: TileId, seen: Map<TileId, number>): number {
  const n = seen.get(id) ?? 0
  let score = n * 10
  if (n > 0) score += 20
  if (n >= 4) score += 30
  if (isHonor(id) && n === 0) score -= 20
  return score
}

interface Buckets {
  sets: TileId[]
  ryanmen: TileId[]
  kanchan: TileId[]
  penchan: TileId[]
  pairs: TileId[]
  isolated: TileId[]
}

/** 貪心拆搭：先刻後順，再兩面、嵌張、邊張、對子。唔係完整向聽搜尋。 */
function bucket(hand: TileId[]): Buckets {
  const counts = count(hand)
  const sets: TileId[] = []
  const ryanmen: TileId[] = []
  const kanchan: TileId[] = []
  const penchan: TileId[] = []
  const pairs: TileId[] = []
  const isolated: TileId[] = []

  const take = (id: TileId, bag: TileId[]): boolean => {
    const n = counts.get(id) ?? 0
    if (n <= 0) return false
    counts.set(id, n - 1)
    bag.push(id)
    return true
  }

  for (const id of sortTiles([...counts.keys()])) {
    while ((counts.get(id) ?? 0) >= 3) {
      take(id, sets)
      take(id, sets)
      take(id, sets)
    }
  }
  for (const suit of NUMBERED) {
    for (let r = 1; r <= 7; r++) {
      const a = tileId(suit, r)
      const b = tileId(suit, r + 1)
      const c = tileId(suit, r + 2)
      while ((counts.get(a) ?? 0) && (counts.get(b) ?? 0) && (counts.get(c) ?? 0)) {
        take(a, sets)
        take(b, sets)
        take(c, sets)
      }
    }
  }
  for (const suit of NUMBERED) {
    for (let r = 2; r <= 7; r++) {
      const a = tileId(suit, r)
      const b = tileId(suit, r + 1)
      while ((counts.get(a) ?? 0) && (counts.get(b) ?? 0)) {
        take(a, ryanmen)
        take(b, ryanmen)
      }
    }
  }
  for (const suit of NUMBERED) {
    for (let r = 1; r <= 7; r++) {
      const a = tileId(suit, r)
      const c = tileId(suit, r + 2)
      while ((counts.get(a) ?? 0) && (counts.get(c) ?? 0)) {
        take(a, kanchan)
        take(c, kanchan)
      }
    }
  }
  for (const suit of NUMBERED) {
    for (const [a, b] of [
      [tileId(suit, 1), tileId(suit, 2)],
      [tileId(suit, 8), tileId(suit, 9)],
    ] as const) {
      while ((counts.get(a) ?? 0) && (counts.get(b) ?? 0)) {
        take(a, penchan)
        take(b, penchan)
      }
    }
  }
  for (const id of sortTiles([...counts.keys()])) {
    while ((counts.get(id) ?? 0) >= 2) {
      take(id, pairs)
      take(id, pairs)
    }
  }
  for (const id of sortTiles([...counts.keys()])) {
    while ((counts.get(id) ?? 0) > 0) take(id, isolated)
  }
  return { sets, ryanmen, kanchan, penchan, pairs, isolated }
}

function finish(
  hand: TileId[],
  ordered: TileId[],
  justDrawn: TileId | null | undefined,
): TileId[] {
  const want = count(hand)
  const out: TileId[] = []
  for (const id of ordered) {
    const n = want.get(id) ?? 0
    if (n <= 0) continue
    out.push(id)
    want.set(id, n - 1)
  }
  const rest: TileId[] = []
  for (const id of hand) {
    const n = want.get(id) ?? 0
    if (n <= 0) continue
    rest.push(id)
    want.set(id, n - 1)
  }
  return pinDrawn([...out, ...sortTiles(rest)], justDrawn)
}

function pinDrawn(tiles: TileId[], justDrawn: TileId | null | undefined): TileId[] {
  if (!justDrawn) return tiles
  const at = tiles.lastIndexOf(justDrawn)
  if (at < 0 || at === tiles.length - 1) return tiles
  const next = tiles.slice()
  next.splice(at, 1)
  next.push(justDrawn)
  return next
}

function sortBy(tiles: TileId[], key: (id: TileId) => number): TileId[] {
  return tiles
    .map((id, i) => ({ id, i, k: key(id) }))
    .sort((a, b) => a.k - b.k || suitKey(a.id) - suitKey(b.id) || a.i - b.i)
    .map((row) => row.id)
}

function suitKey(id: TileId): number {
  const t = parseTile(id)
  const suitOrder: Record<string, number> = {
    man: 0,
    pin: 1,
    sou: 2,
    wind: 3,
    dragon: 4,
    flower: 5,
  }
  return (suitOrder[t.suit] ?? 9) * 100 + t.rank
}

function count(tiles: Iterable<TileId> | undefined): Map<TileId, number> {
  const map = new Map<TileId, number>()
  if (!tiles) return map
  for (const id of tiles) map.set(id, (map.get(id) ?? 0) + 1)
  return map
}

function tileId(suit: string, rank: number): TileId {
  return `${suit}-${rank}` as TileId
}
