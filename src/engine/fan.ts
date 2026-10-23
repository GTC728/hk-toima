import fansJson from './fans.json'
import type { DingState, Meld, Seat, TileId } from './types'
import { isHonor, isSuitTile, parseTile, suitOf } from './tiles'
import {
  findStandardWins,
  hasNoHonors,
  isAllChiPartition,
  isDuduWait,
  isDuiPengWait,
  isLiguligu,
  isSixteenBuDa,
  isThirteenOrphans,
  type WinPartition,
} from './win-check'

const fansTable = fansJson as {
  version: number
  name: string
  note: string
  fans: {
    id: string
    name: string
    value: number
    implemented?: boolean
    note?: string
  }[]
}

export interface FanHit {
  id: string
  name: string
  value: number
}

export interface ScoreContext {
  hand: TileId[]
  melds: Meld[]
  flowers: TileId[]
  winTile: TileId
  winType: 'tsumo' | 'ron' | 'chankan'
  ding: DingState | null
  isDealer: boolean
  consecutiveWins: number
  seat: Seat
  wallRemaining?: number
  discardsThisRound?: number
  multiRonCount?: number
  discarderIsDealer?: boolean
  zhengHuaTiles?: TileId[]
  fiveTongShunFan?: number
  excludeBanGaoXiangFengAfterWuTong?: boolean
}

function fanValue(id: string): { name: string; value: number } {
  const f = fansTable.fans.find((x) => x.id === id)
  if (!f) return { name: id, value: 0 }
  return { name: f.name, value: f.value }
}

function hit(id: string, override?: number): FanHit {
  const { name, value } = fanValue(id)
  return { id, name, value: override ?? value }
}

/** 暗槓不破門清；上／碰／明槓／加槓破 */
export function checkMenqing(melds: Meld[]): boolean {
  return melds.every((m) => m.kind === 'ankong')
}

function suitsUsed(tiles: TileId[]): Set<string> {
  const s = new Set<string>()
  for (const t of tiles) {
    const suit = suitOf(t)
    if (suit === 'flower') continue
    s.add(suit)
  }
  return s
}

function countDragonPongs(
  partition: WinPartition,
  melds: Meld[],
): { pongs: number; pairIsDragon: boolean } {
  const dragons = new Set(['dragon-zhong', 'dragon-fa', 'dragon-bai'])
  let pongs = 0
  for (const m of melds) {
    if (
      (m.kind === 'pong' ||
        m.kind === 'mingkong' ||
        m.kind === 'ankong' ||
        m.kind === 'jiagang') &&
      dragons.has(m.tiles[0]!)
    ) {
      pongs++
    }
  }
  for (const m of partition.melds) {
    if (m.kind === 'pong' && dragons.has(m.tiles[0]!)) pongs++
  }
  return { pongs, pairIsDragon: dragons.has(partition.pair) }
}

function countWindPongs(
  partition: WinPartition,
  melds: Meld[],
): { pongs: number; pairIsWind: boolean } {
  let pongs = 0
  for (const m of melds) {
    if (
      (m.kind === 'pong' ||
        m.kind === 'mingkong' ||
        m.kind === 'ankong' ||
        m.kind === 'jiagang') &&
      m.tiles[0]!.startsWith('wind-')
    ) {
      pongs++
    }
  }
  for (const m of partition.melds) {
    if (m.kind === 'pong' && m.tiles[0]!.startsWith('wind-')) pongs++
  }
  return { pongs, pairIsWind: partition.pair.startsWith('wind-') }
}

function isAllPongs(partition: WinPartition, melds: Meld[]): boolean {
  if (melds.some((m) => m.kind === 'chi')) return false
  return partition.melds.every((m) => m.kind === 'pong')
}

function isAllHonors(tiles: TileId[]): boolean {
  return tiles.length > 0 && tiles.every(isHonor)
}

/** 順子數字簽名，例如 man-1,2,3 → "1-2-3" */
function chiRankKey(tiles: TileId[]): string | null {
  const suitTiles = tiles.filter(isSuitTile)
  if (suitTiles.length !== 3) return null
  const ranks = suitTiles.map((t) => parseTile(t).rank).sort((a, b) => a - b)
  if (ranks[1] !== ranks[0]! + 1 || ranks[2] !== ranks[0]! + 2) return null
  return `${ranks[0]}-${ranks[1]}-${ranks[2]}`
}

function collectChiKeys(partition: WinPartition, melds: Meld[]): string[] {
  const keys: string[] = []
  for (const m of melds) {
    if (m.kind !== 'chi') continue
    const k = chiRankKey(m.tiles)
    if (k) keys.push(k)
  }
  for (const m of partition.melds) {
    if (m.kind !== 'chi') continue
    const k = chiRankKey(m.tiles)
    if (k) keys.push(k)
  }
  return keys
}

function scoreTongShun(
  partition: WinPartition,
  melds: Meld[],
  fiveFan: number,
  excludeParts: boolean,
): FanHit[] {
  const keys = collectChiKeys(partition, melds)
  if (keys.length < 4) return []
  const freq = new Map<string, number>()
  for (const k of keys) freq.set(k, (freq.get(k) ?? 0) + 1)
  let best = 0
  for (const n of freq.values()) best = Math.max(best, n)
  const out: FanHit[] = []
  if (best >= 5) {
    out.push(hit('wutongshun', fiveFan))
    if (!excludeParts) {
      /* 協會計法會另加般高／相逢；常見枱表唔加 — 跟 exclude */
    }
  } else if (best >= 4) {
    out.push(hit('sitongshun'))
  }
  return out
}

function scorePartition(ctx: ScoreContext, partition: WinPartition | null): FanHit[] {
  const fans: FanHit[] = []
  const menqing = checkMenqing(ctx.melds)
  const wallLeft = ctx.wallRemaining ?? 99
  const discards = ctx.discardsThisRound ?? 99
  const multiRon = ctx.multiRonCount ?? 1
  const fiveFan = ctx.fiveTongShunFan ?? 40
  const excludeParts = ctx.excludeBanGaoXiangFengAfterWuTong ?? true
  const tilesNoFlower = [
    ...ctx.hand,
    ctx.winTile,
    ...ctx.melds.flatMap((m) => m.tiles),
  ]

  if (ctx.melds.length === 0 && isThirteenOrphans(ctx.hand, ctx.winTile)) {
    fans.push(hit('shisanyao'))
  }
  if (ctx.melds.length === 0 && isLiguligu(ctx.hand, ctx.winTile)) {
    fans.push(hit('liguligu'))
  }
  if (ctx.melds.length === 0 && isSixteenBuDa(ctx.hand, ctx.winTile)) {
    fans.push(hit('shiliubuda'))
  }

  if (partition) {
    if (isAllChiPartition(partition, ctx.melds) && !isHonor(partition.pair)) {
      if (hasNoHonors(tilesNoFlower) && ctx.flowers.length === 0) {
        fans.push(hit('wuzihuadaping'))
      } else {
        fans.push(hit('pinghu'))
      }
    }
    if (isAllPongs(partition, ctx.melds)) {
      if (menqing && ctx.winType === 'tsumo') fans.push(hit('jijihu'))
      else fans.push(hit('duiduihu'))
    }

    const dr = countDragonPongs(partition, ctx.melds)
    if (dr.pongs === 3) fans.push(hit('dasanyuan'))
    else if (dr.pongs === 2 && dr.pairIsDragon) fans.push(hit('xiaosanyuan'))

    const wd = countWindPongs(partition, ctx.melds)
    if (wd.pongs === 4) fans.push(hit('dasixi'))
    else if (wd.pongs === 3 && wd.pairIsWind) fans.push(hit('xiaosixi'))
    else if (wd.pongs === 3) fans.push(hit('dasifeng'))
    else if (wd.pongs === 2 && wd.pairIsWind) fans.push(hit('xiaosifeng'))

    fans.push(...scoreTongShun(partition, ctx.melds, fiveFan, excludeParts))
  }

  if (menqing) {
    if (ctx.ding) fans.push(hit('menqing_ding'))
    else if (ctx.winType === 'tsumo') fans.push(hit('menqing_zimo'))
    else fans.push(hit('menqing'))
  }

  if (ctx.ding) {
    if (ctx.ding.kind === 'tian') fans.push(hit('tianting'))
    else if (ctx.ding.kind === 'di') fans.push(hit('diting'))
    else if (!menqing) fans.push(hit('ding'))
    if (ctx.ding.ippatsuActive) fans.push(hit('ippatsu'))
  }

  if (ctx.winType === 'tsumo') fans.push(hit('zimo'))
  if (ctx.winType === 'chankan') fans.push(hit('qianggang'))

  // 天／地／人胡
  if (discards === 0 && ctx.winType === 'tsumo' && ctx.isDealer) {
    fans.push(hit('tianhu'))
  } else if (discards === 1 && ctx.winType === 'ron' && ctx.discarderIsDealer) {
    fans.push(hit('dihu'))
  } else if (discards === 1 && ctx.winType === 'ron' && !ctx.discarderIsDealer) {
    fans.push(hit('renhu'))
  }

  if (hasNoHonors(tilesNoFlower) && ctx.flowers.length === 0) {
    fans.push(hit('wuzihua'))
  } else {
    if (hasNoHonors(tilesNoFlower)) fans.push(hit('wuzi'))
    if (ctx.flowers.length === 0) fans.push(hit('wuhua'))
  }

  // 正花／爛花
  let zheng = 0
  let lan = 0
  const zhengSet = ctx.zhengHuaTiles ?? []
  for (const f of ctx.flowers) {
    if (zhengSet.includes(f)) zheng++
    else lan++
  }
  if (zheng > 0) fans.push(hit('zhenghua', 2 * zheng))
  if (lan > 0) fans.push(hit('lanhua', 2 * lan))

  if (isDuiPengWait(ctx.hand, ctx.melds, ctx.winTile)) fans.push(hit('duipeng'))
  if (isDuduWait(ctx.hand, ctx.melds, ctx.winTile)) fans.push(hit('dudu'))

  const suits = suitsUsed(tilesNoFlower)
  const hasHonor = tilesNoFlower.some(isHonor)
  const numberSuits = [...suits].filter(
    (s) => s === 'man' || s === 'pin' || s === 'sou',
  )
  if (isAllHonors(tilesNoFlower)) fans.push(hit('ziyise'))
  else if (numberSuits.length === 1 && !hasHonor) fans.push(hit('qingyise'))
  else if (numberSuits.length === 1 && hasHonor) fans.push(hit('hunyise'))

  // 缺一門：數牌只得兩門
  if (numberSuits.length === 2) fans.push(hit('queimen'))

  // 河底／海底
  if (wallLeft === 0) {
    if (ctx.winType === 'tsumo') fans.push(hit('haidilaoyue'))
    else fans.push(hit('hedilaoyu'))
  }

  // 一炮多響
  if (multiRon >= 3) fans.push(hit('sanxiang'))
  else if (multiRon === 2) fans.push(hit('shuangxiang'))

  if (ctx.isDealer) {
    fans.push(hit('dealer'))
    if (ctx.consecutiveWins > 0) {
      fans.push(hit('lianzhuang', 2 * ctx.consecutiveWins))
    }
  }

  return fans
}

function withDefaults(ctx: ScoreContext): ScoreContext {
  return {
    ...ctx,
    wallRemaining: ctx.wallRemaining ?? 99,
    discardsThisRound: ctx.discardsThisRound ?? 99,
    multiRonCount: ctx.multiRonCount ?? 1,
    discarderIsDealer: ctx.discarderIsDealer ?? false,
    zhengHuaTiles: ctx.zhengHuaTiles ?? [],
    fiveTongShunFan: ctx.fiveTongShunFan ?? 40,
    excludeBanGaoXiangFengAfterWuTong:
      ctx.excludeBanGaoXiangFengAfterWuTong ?? true,
  }
}

/**
 * 計算食糊番種。標準型會試所有拆法，取總番最高。
 */
export function calculateFans(partial: ScoreContext): FanHit[] {
  const ctx = withDefaults(partial)
  if (ctx.melds.length === 0 && isThirteenOrphans(ctx.hand, ctx.winTile)) {
    return scorePartition(ctx, null)
  }
  if (ctx.melds.length === 0 && isLiguligu(ctx.hand, ctx.winTile)) {
    return scorePartition(ctx, null)
  }
  if (ctx.melds.length === 0 && isSixteenBuDa(ctx.hand, ctx.winTile)) {
    return scorePartition(ctx, null)
  }

  const parts = findStandardWins(ctx.hand, ctx.melds, ctx.winTile)
  if (parts.length === 0) return scorePartition(ctx, null)

  let best: FanHit[] = []
  let bestTotal = -1
  for (const p of parts) {
    const fans = scorePartition(ctx, p)
    const total = fans.reduce((s, f) => s + f.value, 0)
    if (total > bestTotal) {
      bestTotal = total
      best = fans
    }
  }
  return best
}

export function totalFan(fans: FanHit[]): number {
  return fans.reduce((s, f) => s + f.value, 0)
}

export { fansTable }
