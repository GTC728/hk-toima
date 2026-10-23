import { getFanMeta } from './fan-catalog'
import type { DingState, Meld, Seat, TileId } from './types'
import { isHonor, parseTile, suitOf } from './tiles'
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
import {
  collectChis,
  collectPongs,
  isDaji,
  isDaya,
  isJiaDu,
  isJiangYan,
  isQiuren,
  makeHit,
  scoreAnKeGang,
  scoreBanGaoXiangFeng,
  scoreHonorPongs,
  scoreLaoShao,
  scoreLianKeXiongDi,
  scoreLong,
  scoreMenQi,
  scoreSiGui,
  scoreYaoJiu,
  tongShunBestCount,
  type FanHit,
} from './fan-patterns'

export type { FanHit }

/** @deprecated 用 fan-catalog；保留兼容 */
export { FAN_TABLE_META as fansTable, FAN_TABLE_META } from './fan-catalog'
export { allFanMetas, getFanMeta, fanDescription, fanDisplayName } from './fan-catalog'

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
  /** 連續補花次數（花摸 2n） */
  flowerDrawChain?: number
  /** 連續槓補次數（槓摸 5n） */
  kongDrawChain?: number
  /** 可見嘅 winTile 張數（河＋副露，唔包自己暗牌）→ 明絕／絕絕 */
  visibleWinTileCount?: number
  /** 反雪：一炮多響時加倍標記（由外層處理金額；呢度可加 note fan） */
  fanxue?: boolean
  /** 圈風：0東 1南 2西 3北（計正風／正圈） */
  windRound?: number
}

function fanValue(id: string): { name: string; value: number } {
  const f = getFanMeta(id)
  return { name: f.name, value: f.value }
}

function hit(id: string, override?: number): FanHit {
  return makeHit(fanValue)(id, override)
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

function scoreTongShun(
  best: number,
  fiveFan: number,
): FanHit[] {
  const out: FanHit[] = []
  if (best >= 5) out.push(hit('wutongshun', fiveFan))
  else if (best >= 4) out.push(hit('sitongshun'))
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

  const chis = collectChis(partition, ctx.melds)
  const pongs = collectPongs(partition, ctx.melds)
  const tongBest = tongShunBestCount(chis)

  let isDuiDui = false
  if (partition) {
    if (isAllChiPartition(partition, ctx.melds) && !isHonor(partition.pair)) {
      if (hasNoHonors(tilesNoFlower) && ctx.flowers.length === 0) {
        fans.push(hit('wuzihuadaping'))
      } else if (isDaya(partition, ctx.melds, tilesNoFlower)) {
        fans.push(hit('daya'))
      } else {
        fans.push(hit('pinghu'))
      }
    }
    if (isAllPongs(partition, ctx.melds)) {
      isDuiDui = true
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

    fans.push(...scoreTongShun(tongBest, fiveFan))
    fans.push(
      ...scoreBanGaoXiangFeng(chis, tongBest, excludeParts, hit),
    )
    fans.push(...scoreLong(chis, hit))
    fans.push(...scoreLaoShao(chis, hit))
    fans.push(...scoreSiGui(partition, ctx.melds, hit))
    fans.push(...scoreYaoJiu(partition, ctx.melds, tilesNoFlower, hit))
    fans.push(...scoreAnKeGang(pongs, ctx.melds, hit))
    fans.push(
      ...scoreHonorPongs(pongs, hit, {
        seat: ctx.seat,
        windRound: ctx.windRound ?? 0,
      }),
    )
    fans.push(...scoreLianKeXiongDi(pongs, hit))

    // 小三兄弟：兩兄弟 + 同數眼
    if (isSuitTilePair(partition.pair)) {
      const r = parseTile(partition.pair).rank
      const brothers = pongs.filter(
        (p) =>
          (p.suit === 'man' || p.suit === 'pin' || p.suit === 'sou') &&
          p.rank === r,
      )
      const suits = new Set(brothers.map((p) => p.suit))
      if (suits.size >= 2) fans.push(hit('xiaosanxiongdi'))
    }

    if (isJiangYan(partition.pair)) fans.push(hit('jiangyan'))
  }

  fans.push(...scoreMenQi(tilesNoFlower, ctx.flowers, hit))
  // 大雞＝對對＋五門齊（七門齊已含五門齊，同樣合資格）
  if (
    isDaji(
      isDuiDui,
      fans.some((f) => f.id === 'wumenqi' || f.id === 'qimenqi'),
    )
  ) {
    fans.push(hit('daji'))
  }

  // 求人：ctx.hand 唔包糊牌（自摸已 remove win）；剩 1 張＋五組副露
  if (isQiuren(ctx.melds, ctx.hand.length)) {
    if (ctx.winType === 'tsumo') fans.push(hit('banqiuren'))
    else fans.push(hit('quanqiuren'))
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

  // 花摸／槓摸／錦上添花
  const fChain = ctx.flowerDrawChain ?? 0
  const kChain = ctx.kongDrawChain ?? 0
  if (ctx.winType === 'tsumo') {
    if (fChain > 0) fans.push(hit('huamo', fanValue('huamo').value * fChain))
    if (kChain > 0) fans.push(hit('gangmo', fanValue('gangmo').value * kChain))
    if (fChain > 0 && kChain > 0) {
      fans.push(hit('jinshangtianhua', fChain + kChain >= 3 ? 10 : 5))
    }
  }

  // 明絕／絕絕
  const vis = ctx.visibleWinTileCount ?? 0
  if (vis >= 3) fans.push(hit('juejue'))
  else if (vis === 2) fans.push(hit('mingjue'))

  // 天／地／人胡（優先於子內）
  let earlyWin = false
  if (discards === 0 && ctx.winType === 'tsumo' && ctx.isDealer) {
    fans.push(hit('tianhu'))
    earlyWin = true
  } else if (discards === 1 && ctx.winType === 'ron' && ctx.discarderIsDealer) {
    fans.push(hit('dihu'))
    earlyWin = true
  } else if (discards === 1 && ctx.winType === 'ron' && !ctx.discarderIsDealer) {
    fans.push(hit('renhu'))
    earlyWin = true
  }

  if (!earlyWin) {
    if (discards <= 4) fans.push(hit('sizinnei'))
    else if (discards <= 7) fans.push(hit('qizinnei'))
    else if (discards <= 10) fans.push(hit('shizinnei'))
  }

  if (hasNoHonors(tilesNoFlower) && ctx.flowers.length === 0) {
    fans.push(hit('wuzihua'))
  } else {
    if (hasNoHonors(tilesNoFlower)) fans.push(hit('wuzi'))
    if (ctx.flowers.length === 0) fans.push(hit('wuhua'))
  }

  let zheng = 0
  let lan = 0
  const zhengSet = ctx.zhengHuaTiles ?? []
  for (const f of ctx.flowers) {
    if (zhengSet.includes(f)) zheng++
    else lan++
  }
  if (zheng > 0) fans.push(hit('zhenghua', fanValue('zhenghua').value * zheng))
  if (lan > 0) fans.push(hit('lanhua', fanValue('lanhua').value * lan))

  // 花數特別番
  if (ctx.flowers.length >= 7) fans.push(hit('qizhihua'))
  if (ctx.flowers.length === 6) fans.push(hit('liuhuabuzheng'))
  const hasSeason = ['flower-spring', 'flower-summer', 'flower-autumn', 'flower-winter'].every(
    (f) => ctx.flowers.includes(f as TileId),
  )
  const hasPlant = [
    'flower-plum',
    'flower-orchid',
    'flower-chrysanthemum',
    'flower-bamboo',
  ].every((f) => ctx.flowers.includes(f as TileId))
  if (hasSeason && hasPlant) fans.push(hit('liangtaihua'))

  if (isDuiPengWait(ctx.hand, ctx.melds, ctx.winTile)) fans.push(hit('duipeng'))
  if (isDuduWait(ctx.hand, ctx.melds, ctx.winTile)) fans.push(hit('dudu'))
  else if (isJiaDu(ctx.hand, ctx.melds, ctx.winTile)) fans.push(hit('jiadu'))

  const suits = suitsUsed(tilesNoFlower)
  const hasHonor = tilesNoFlower.some(isHonor)
  const numberSuits = [...suits].filter(
    (s) => s === 'man' || s === 'pin' || s === 'sou',
  )
  if (isAllHonors(tilesNoFlower)) fans.push(hit('ziyise'))
  else if (numberSuits.length === 1 && !hasHonor) fans.push(hit('qingyise'))
  else if (numberSuits.length === 1 && hasHonor) fans.push(hit('hunyise'))

  if (numberSuits.length === 2) fans.push(hit('queimen'))

  if (wallLeft === 0) {
    if (ctx.winType === 'tsumo') fans.push(hit('haidilaoyue'))
    else fans.push(hit('hedilaoyu'))
  }

  if (multiRon >= 3) fans.push(hit('sanxiang'))
  else if (multiRon === 2) fans.push(hit('shuangxiang'))

  if (ctx.fanxue && multiRon >= 2) {
    fans.push(hit('fanxue', 0))
  }

  if (ctx.isDealer) {
    if (ctx.consecutiveWins > 0) {
      fans.push(hit('lianzhuang', 1 + 2 * ctx.consecutiveWins))
    } else {
      fans.push(hit('dealer'))
    }
  }

  return dedupeFans(fans)
}

function isSuitTilePair(id: TileId): boolean {
  return id.startsWith('man-') || id.startsWith('pin-') || id.startsWith('sou-')
}

/**
 * 常見枱表：大牌型包小牌型／同類只留最高。
 * @see design/fan-exclusivity.md
 */
function dedupeFans(fans: FanHit[]): FanHit[] {
  const seen = new Set<string>()
  const out: FanHit[] = []
  // 互斥組：取最高
  const exclusiveGroups = [
    ['qinglaotou', 'hunlaotou', 'quandaiyao', 'hundaiyao'],
    ['wuzihuadaping', 'daya', 'pinghu'],
    ['jijihu', 'daji', 'duiduihu'],
    ['qimenqi', 'wumenqi'],
    ['quanqiuren', 'banqiuren'],
    ['qingyise', 'hunyise'],
    ['menqing_ding', 'menqing_zimo', 'menqing'],
    ['dasixi', 'xiaosixi', 'dasifeng', 'xiaosifeng'],
    ['dasanyuan', 'xiaosanyuan'],
    ['wuanake', 'sianke', 'sananke', 'lianganke'],
    ['juejue', 'mingjue'],
    ['sizinnei', 'qizinnei', 'shizinnei'],
    ['tianhu', 'dihu', 'renhu'],
    ['anqinglong', 'mingqinglong', 'anzalong', 'mingzalong'],
    ['andansebbg', 'mingdansebbg'],
    ['ansansebbg', 'mingsansebbg'],
    ['anyisesitong', 'mingyisesitong', 'anyisesantong', 'mingyisesantong'],
    ['anwuxiangfeng', 'mingwuxiangfeng', 'ansixiangfeng', 'mingsixiangfeng', 'ansanxiangfeng', 'mingsanxiangfeng'],
    ['dasanxiongdi', 'xiaosanxiongdi', 'liangxiongdi'],
    ['dasanseke', 'xiaosanseke'],
    ['xiaoyuwu', 'dayuwu', 'quewu'],
    // 四歸：同類只留最高一档（暗四歸四 > … > 明四歸一）
    [
      'ansiguisi',
      'mingsiguisi',
      'ansiguier',
      'mingsiguier',
      'ansiguiji',
      'mingsiguiji',
    ],
    // 姊妹＝同門相連刻；連刻係舊別名，只留姊妹档
    [
      'sijiemei',
      'sanjiemei',
      'erjiemei',
      'shuangjiemei',
      'dasanlianke',
      'xiaosanlianke',
      'erlianke',
    ],
  ]
  /** 大牌出現 → 吞掉必然包含嘅組件（唔理組件番數高低） */
  const absorb: Record<string, string[]> = {
    wuzihuadaping: ['wuzihua', 'wuzi', 'wuhua', 'pinghu', 'daya'],
    wuzihua: ['wuzi', 'wuhua'],
    daya: ['pinghu'],
    qimenqi: ['wumenqi'],
    daji: ['duiduihu', 'wumenqi'],
    jijihu: ['duiduihu', 'menqing', 'menqing_zimo', 'zimo'],
    // Ting：五暗刻已係對對結構，唔再計對對糊
    wuanake: ['duiduihu'],
    banqiuren: ['zimo'],
    haidilaoyue: ['zimo'],
    shiliubuda: ['menqing', 'menqing_zimo', 'menqing_ding'],
    queimen: ['wuzi'],
    qingyise: ['hunyise', 'queimen', 'wuzi'],
    ziyise: ['hunyise', 'qingyise', 'queimen'],
    menqing_ding: ['ding', 'menqing', 'menqing_zimo'],
    menqing_zimo: ['menqing'],
    // 小於五／大於五已含缺五
    xiaoyuwu: ['quewu'],
    dayuwu: ['quewu'],
    // 五槓子已包各槓入番
    wugangzi: ['minggang', 'angang'],
    // 清龍＝123+456+789；步步高＝123+234+345（唔同牌型）；防舊誤計吞步步高
    anqinglong: ['andansebbg', 'mingdansebbg'],
    mingqinglong: ['andansebbg', 'mingdansebbg'],
  }

  const blocked = new Set<string>()
  for (const group of exclusiveGroups) {
    const present = fans.filter((f) => group.includes(f.id))
    if (present.length <= 1) continue
    present.sort((a, b) => b.value - a.value)
    for (const f of present.slice(1)) blocked.add(f.id)
  }
  const ids = new Set(fans.map((f) => f.id))
  for (const [big, parts] of Object.entries(absorb)) {
    if (!ids.has(big) || blocked.has(big)) continue
    for (const p of parts) blocked.add(p)
  }

  for (const f of fans) {
    if (blocked.has(f.id)) continue
    if (seen.has(f.id)) continue
    seen.add(f.id)
    out.push(f)
  }
  return out
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
    flowerDrawChain: ctx.flowerDrawChain ?? 0,
    kongDrawChain: ctx.kongDrawChain ?? 0,
    visibleWinTileCount: ctx.visibleWinTileCount ?? 0,
    fanxue: ctx.fanxue ?? false,
    windRound: ctx.windRound ?? 0,
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
    const scored = scorePartition(ctx, p)
    const total = scored.reduce((s, f) => s + f.value, 0)
    if (total > bestTotal) {
      bestTotal = total
      best = scored
    }
  }
  return best
}

/** 同 calculateFans：取總番最高嘅標準拆法（高亮用，避免 parts[0] 同計番唔一致） */
export function pickBestWinPartition(
  partial: ScoreContext,
): WinPartition | null {
  const ctx = withDefaults(partial)
  const parts = findStandardWins(ctx.hand, ctx.melds, ctx.winTile)
  if (parts.length === 0) return null
  let best: WinPartition | null = null
  let bestTotal = -1
  for (const p of parts) {
    const total = scorePartition(ctx, p).reduce((s, f) => s + f.value, 0)
    if (total > bestTotal) {
      bestTotal = total
      best = p
    }
  }
  return best
}

export function totalFan(fans: FanHit[]): number {
  return fans.reduce((s, f) => s + f.value, 0)
}

