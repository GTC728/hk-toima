import type { FlowerKind, Suit, TileId, WindKind, DragonKind } from './types'

export interface TileInfo {
  id: TileId
  suit: Suit
  rank: number
  label: string
}

const WINDS: WindKind[] = ['east', 'south', 'west', 'north']
const DRAGONS: DragonKind[] = ['zhong', 'fa', 'bai']
const FLOWERS: FlowerKind[] = [
  'spring',
  'summer',
  'autumn',
  'winter',
  'plum',
  'orchid',
  'chrysanthemum',
  'bamboo',
]

const WIND_LABEL: Record<WindKind, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
}

const DRAGON_LABEL: Record<DragonKind, string> = {
  zhong: '中',
  fa: '發',
  bai: '白',
}

const FLOWER_LABEL: Record<FlowerKind, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
  plum: '梅',
  orchid: '蘭',
  chrysanthemum: '菊',
  bamboo: '竹',
}

const SUIT_LABEL: Record<'man' | 'pin' | 'sou', string> = {
  man: '萬',
  pin: '筒',
  sou: '索',
}

export function tileId(suit: Suit, rankOrKind: number | string): TileId {
  if (suit === 'man' || suit === 'pin' || suit === 'sou') {
    return `${suit}-${rankOrKind}`
  }
  return `${suit}-${rankOrKind}`
}

export function parseTile(id: TileId): TileInfo {
  const [suit, rest] = id.split('-') as [Suit, string]
  if (suit === 'man' || suit === 'pin' || suit === 'sou') {
    const rank = Number(rest)
    return {
      id,
      suit,
      rank,
      label: `${rank}${SUIT_LABEL[suit]}`,
    }
  }
  if (suit === 'wind') {
    const kind = rest as WindKind
    return { id, suit, rank: WINDS.indexOf(kind), label: WIND_LABEL[kind] }
  }
  if (suit === 'dragon') {
    const kind = rest as DragonKind
    return { id, suit, rank: DRAGONS.indexOf(kind), label: DRAGON_LABEL[kind] }
  }
  const kind = rest as FlowerKind
  return {
    id,
    suit: 'flower',
    rank: FLOWERS.indexOf(kind),
    label: FLOWER_LABEL[kind],
  }
}

export function isFlower(id: TileId): boolean {
  return id.startsWith('flower-')
}

export function isHonor(id: TileId): boolean {
  return id.startsWith('wind-') || id.startsWith('dragon-')
}

export function isTerminal(id: TileId): boolean {
  const t = parseTile(id)
  return (
    (t.suit === 'man' || t.suit === 'pin' || t.suit === 'sou') &&
    (t.rank === 1 || t.rank === 9)
  )
}

export function isOrphan(id: TileId): boolean {
  return isTerminal(id) || isHonor(id)
}

export function isSuitTile(id: TileId): boolean {
  return id.startsWith('man-') || id.startsWith('pin-') || id.startsWith('sou-')
}

export function sameTile(a: TileId, b: TileId): boolean {
  return a === b
}

export function suitOf(id: TileId): Suit {
  return parseTile(id).suit
}

export function rankOf(id: TileId): number {
  return parseTile(id).rank
}

/** 144 張標準牌牆（每隻字牌／數牌 4 張，花 8 張各 1） */
export function createFullWall(): TileId[] {
  const wall: TileId[] = []
  for (const suit of ['man', 'pin', 'sou'] as const) {
    for (let rank = 1; rank <= 9; rank++) {
      for (let i = 0; i < 4; i++) wall.push(tileId(suit, rank))
    }
  }
  for (const w of WINDS) {
    for (let i = 0; i < 4; i++) wall.push(tileId('wind', w))
  }
  for (const d of DRAGONS) {
    for (let i = 0; i < 4; i++) wall.push(tileId('dragon', d))
  }
  for (const f of FLOWERS) {
    wall.push(tileId('flower', f))
  }
  return wall
}

export function countTiles(tiles: TileId[]): Map<TileId, number> {
  const m = new Map<TileId, number>()
  for (const t of tiles) m.set(t, (m.get(t) ?? 0) + 1)
  return m
}

export function removeOne(tiles: TileId[], id: TileId): TileId[] {
  const i = tiles.indexOf(id)
  if (i < 0) throw new Error(`tile not found: ${id}`)
  return [...tiles.slice(0, i), ...tiles.slice(i + 1)]
}

export function removeMany(tiles: TileId[], ids: TileId[]): TileId[] {
  let next = [...tiles]
  for (const id of ids) next = removeOne(next, id)
  return next
}

export function sortTiles(tiles: TileId[]): TileId[] {
  const order = (id: TileId): number => {
    const t = parseTile(id)
    const suitOrder: Record<Suit, number> = {
      man: 0,
      pin: 1,
      sou: 2,
      wind: 3,
      dragon: 4,
      flower: 5,
    }
    return suitOrder[t.suit] * 100 + t.rank
  }
  return [...tiles].sort((a, b) => order(a) - order(b))
}

/** 可否組成順子（只限數牌） */
export function canFormChi(a: TileId, b: TileId, claimed: TileId): boolean {
  if (!isSuitTile(a) || !isSuitTile(b) || !isSuitTile(claimed)) return false
  const pa = parseTile(a)
  const pb = parseTile(b)
  const pc = parseTile(claimed)
  if (pa.suit !== pb.suit || pa.suit !== pc.suit) return false
  const ranks = [pa.rank, pb.rank, pc.rank].sort((x, y) => x - y)
  return ranks[0]! + 1 === ranks[1] && ranks[1]! + 1 === ranks[2]
}

export function allOrphanIds(): TileId[] {
  const ids: TileId[] = []
  for (const suit of ['man', 'pin', 'sou'] as const) {
    ids.push(tileId(suit, 1), tileId(suit, 9))
  }
  for (const w of WINDS) ids.push(tileId('wind', w))
  for (const d of DRAGONS) ids.push(tileId('dragon', d))
  return ids
}

export const FLOWER_SETS = {
  season: ['flower-spring', 'flower-summer', 'flower-autumn', 'flower-winter'] as TileId[],
  plant: [
    'flower-plum',
    'flower-orchid',
    'flower-chrysanthemum',
    'flower-bamboo',
  ] as TileId[],
}
