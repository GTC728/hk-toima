import {
  getFanMeta,
  isHonor,
  isSuitTile,
  parseTile,
  pickBestWinPartition,
  type FanShop,
  type Meld,
  type TileId,
} from '../engine'
import {
  collectChis,
  collectPongs,
  mantingfangDigits,
} from '../engine/fan-patterns'
import { countTiles } from '../engine/tiles'
import { calcScoreHand } from './fanCalculatorModel'

export type HighlightCounts = Map<TileId, number>

function empty(): HighlightCounts {
  return new Map()
}

function add(map: HighlightCounts, id: TileId, n = 1): void {
  map.set(id, (map.get(id) ?? 0) + n)
}

function addAll(map: HighlightCounts, tiles: TileId[]): void {
  for (const t of tiles) add(map, t)
}

/** 顯示用手牌：出銃時補上糊牌；自摸時糊牌已在手內 */
export function displayHandForWin(
  hand: TileId[],
  winTile: TileId,
  winType: 'tsumo' | 'ron' | 'chankan',
): { tiles: TileId[]; winIndex: number } {
  if (winType === 'tsumo') {
    const idx = hand.lastIndexOf(winTile)
    if (idx >= 0) return { tiles: hand, winIndex: idx }
    return { tiles: [...hand, winTile], winIndex: hand.length }
  }
  // 出銃／搶槓：糊牌唔喺贏家手牌
  return { tiles: [...hand, winTile], winIndex: hand.length }
}

/** 計番用暗牌（唔包糊牌） */
export function concealedForWin(
  hand: TileId[],
  winTile: TileId,
  winType: 'tsumo' | 'ron' | 'chankan',
): TileId[] {
  if (winType === 'tsumo') {
    const idx = hand.lastIndexOf(winTile)
    if (idx >= 0) {
      const next = [...hand]
      next.splice(idx, 1)
      return next
    }
  }
  return [...hand]
}

/** @deprecated 用 fanCalculatorModel；設糊唔再偷手牌 */
export { calcTileCountLabel } from './fanCalculatorModel'

/**
 * 同一番種累加幾次（用表定單位番除實際番）。
 * 例：明槓單位 2、實際 4 → 2次；連莊 value=0 唔顯示次數。
 */
export function fanRepeatTimes(fanId: string, value: number): number {
  // 暗老少＝4番（單位2+暗加價），唔係計兩次
  if (fanId === 'laoshao') return 1
  const unit = getFanMeta(fanId).value
  if (unit <= 0 || value <= 0) return 1
  if (value % unit !== 0) return 1
  const n = value / unit
  return n >= 2 ? n : 1
}

export function fanShopLabel(shop: FanShop | undefined): string | null {
  if (shop === 'liguligu') return '第1舖 · 嚦咕'
  if (shop === 'standard') return '第2舖 · 標準'
  return null
}

/**
 * 撳番種 → 要高亮嘅牌（帶張數）。
 * 未知番唔再 fallback 亮糊牌（避免兩暗刻誤亮眼）。
 * 雙食傳 shop：嚦咕舖唔用標準拆法（避免兩粒清一色亮成同一舖結構）。
 */
export function tilesForFanHighlight(
  fanId: string,
  opts: {
    hand: TileId[]
    melds: Meld[]
    flowers: TileId[]
    winTile: TileId
    winType: 'tsumo' | 'ron' | 'chankan'
    /** 贏家門風正花；唔傳則正／爛花一齊亮所有花 */
    zhengHuaTiles?: TileId[]
    /** 雙食：邊一舖嘅番 */
    shop?: FanShop
    /** 混／滿庭芳：只亮呢個帶數（分開兩條時用） */
    instance?: string
  },
): HighlightCounts {
  const set = empty()
  // 計番機：手／糊分開用 calcScoreHand；牌局自摸手裡含水：拆唔成再 fallback concealedForWin
  let scoreHand = calcScoreHand(opts.hand, opts.winTile, opts.winType)
  const pick = (hand: TileId[]) =>
    opts.shop === 'liguligu'
      ? null
      : pickBestWinPartition({
          hand,
          melds: opts.melds,
          flowers: opts.flowers,
          winTile: opts.winTile,
          winType: opts.winType,
          ding: null,
          isDealer: false,
          consecutiveWins: 0,
          seat: 0,
        })
  let partition = pick(scoreHand)
  if (!partition && opts.winType === 'tsumo') {
    const fallback = concealedForWin(opts.hand, opts.winTile, 'tsumo')
    const p2 = pick(fallback)
    if (p2) {
      scoreHand = fallback
      partition = p2
    }
  }
  const pongs = collectPongs(partition, opts.melds, {
    winTile: opts.winTile,
    winType: opts.winType,
  })
  const chis = collectChis(partition, opts.melds)

  const addPong = (id: TileId, kong: boolean) => add(set, id, kong ? 4 : 3)

  const allTiles = () => [
    ...scoreHand,
    opts.winTile,
    ...opts.melds.flatMap((m) => m.tiles),
  ]

  const addAllChi = () => {
    for (const m of opts.melds) {
      if (m.kind === 'chi') addAll(set, m.tiles)
    }
    if (partition) {
      for (const m of partition.melds) {
        if (m.kind === 'chi') addAll(set, m.tiles)
      }
    }
  }

  /**
   * 相逢：只亮計番嗰組「同數字、唔同門」順。
   * mode=dark → 只亮暗順（暗相逢／暗三相逢…）
   * mode=open → 只亮「含明」嗰組（明相逢）；唔好亮純暗組
   * mode=any → 唔限
   */
  const addXiangFengChi = (mode: 'any' | 'dark' | 'open' = 'any') => {
    const byRank = new Map<string, typeof chis>()
    for (const c of chis) {
      const arr = byRank.get(c.rankKey) ?? []
      arr.push(c)
      byRank.set(c.rankKey, arr)
    }
    let best: (typeof chis)[number][] | null = null
    let bestSuits = 0
    for (const arr of byRank.values()) {
      const pool =
        mode === 'dark'
          ? arr.filter((c) => c.concealed)
          : mode === 'open'
            ? arr.every((c) => c.concealed)
              ? []
              : arr
            : arr
      const bySuit = new Map<string, (typeof chis)[number]>()
      for (const c of pool) {
        // 暗模式：同門優先留暗；明模式：同門優先留明
        const prev = bySuit.get(c.suit)
        if (!prev) {
          bySuit.set(c.suit, c)
        } else if (mode === 'open' && prev.concealed && !c.concealed) {
          bySuit.set(c.suit, c)
        } else if (mode === 'dark' && !prev.concealed && c.concealed) {
          bySuit.set(c.suit, c)
        }
      }
      if (bySuit.size >= 2 && bySuit.size > bestSuits) {
        bestSuits = bySuit.size
        best = [...bySuit.values()]
      }
    }
    if (!best) return
    for (const c of best) {
      for (const r of c.ranks) {
        add(set, `${c.suit}-${r}` as TileId)
      }
    }
  }

  /** 清龍：只亮同門 123+456+789 */
  const addQingLongChi = () => {
    for (const suit of ['man', 'pin', 'sou'] as const) {
      const s = chis.filter((c) => c.suit === suit)
      const a = s.find((c) => c.rankKey === '1-2-3')
      const b = s.find((c) => c.rankKey === '4-5-6')
      const c = s.find((c) => c.rankKey === '7-8-9')
      if (a && b && c) {
        for (const chi of [a, b, c]) {
          for (const r of chi.ranks) add(set, `${suit}-${r}` as TileId)
        }
        return
      }
    }
    addAllChi()
  }

  switch (fanId) {
    case 'di':
    case 'dealer':
    case 'lianzhuang':
    case 'ippatsu':
    case 'tianting':
    case 'diting':
    case 'ding':
    case 'fanxue':
    case 'tianhu':
    case 'dihu':
    case 'renhu':
    case 'sizinnei':
    case 'qizinnei':
    case 'shizinnei':
      break

    case 'zimo':
    case 'dingmo':
    case 'qianggang':
    case 'duipeng':
    case 'dudu':
    case 'jiadu':
    case 'mingjue':
    case 'juejue':
      add(set, opts.winTile)
      break

    case 'zhenghua': {
      const zheng = opts.zhengHuaTiles ?? []
      if (zheng.length === 0) addAll(set, opts.flowers)
      else {
        for (const f of opts.flowers) {
          if (zheng.includes(f)) add(set, f)
        }
      }
      break
    }

    case 'lanhua': {
      const zheng = opts.zhengHuaTiles ?? []
      if (zheng.length === 0) addAll(set, opts.flowers)
      else {
        for (const f of opts.flowers) {
          if (!zheng.includes(f)) add(set, f)
        }
      }
      break
    }

    case 'yitaihua':
    case 'yitaicao':
    case 'qizhihua':
    case 'liangtaihua':
    case 'liuhuabuzheng':
      addAll(set, opts.flowers)
      break

    case 'wuzi':
    case 'wuzihua':
    case 'wuzihuadaping':
      for (const t of allTiles()) if (!isHonor(t)) add(set, t)
      break

    case 'wuhua':
      // 無花：唔亮牌
      break

    case 'queimen': {
      // 缺一門：亮有嘅數牌門
      const suits = new Set<string>()
      for (const t of allTiles()) {
        if (isSuitTile(t)) suits.add(parseTile(t).suit)
      }
      for (const t of allTiles()) {
        if (isSuitTile(t) && suits.has(parseTile(t).suit)) add(set, t)
      }
      break
    }

    case 'qingyise':
    case 'hunyise': {
      const all = allTiles()
      const suit = all.find(isSuitTile)
      if (suit) {
        const s = parseTile(suit).suit
        for (const t of all) {
          if (isSuitTile(t) && parseTile(t).suit === s) add(set, t)
          if (fanId === 'hunyise' && isHonor(t)) add(set, t)
        }
      }
      break
    }

    case 'ziyise':
      for (const t of allTiles()) if (isHonor(t)) add(set, t)
      break

    case 'dasanyuan':
    case 'xiaosanyuan':
    case 'sanyuanpai':
      for (const p of pongs) {
        if (p.suit === 'dragon') addPong(p.id, p.isKong)
      }
      if (partition && parseTile(partition.pair).suit === 'dragon') {
        add(set, partition.pair, 2)
      }
      break

    case 'dasixi':
    case 'xiaosixi':
    case 'dasifeng':
    case 'xiaosifeng':
      for (const p of pongs) {
        if (p.suit === 'wind') addPong(p.id, p.isKong)
      }
      if (partition && parseTile(partition.pair).suit === 'wind') {
        add(set, partition.pair, 2)
      }
      break

    case 'fengke':
      // 風牌只計風刻／槓（正風／正圈），唔計風眼
      for (const p of pongs) {
        if (p.suit === 'wind') addPong(p.id, p.isKong)
      }
      break

    case 'lianganke':
    case 'sananke':
    case 'sianke':
    case 'wuanake':
      for (const p of pongs.filter((x) => x.concealed || x.isKong)) {
        addPong(p.id, p.isKong)
      }
      break

    case 'angang':
      for (const m of opts.melds) {
        if (m.kind === 'ankong') addAll(set, m.tiles)
      }
      break

    case 'minggang':
      for (const m of opts.melds) {
        if (m.kind === 'mingkong' || m.kind === 'jiagang') addAll(set, m.tiles)
      }
      break

    case 'mingsiguiji':
    case 'ansiguiji':
    case 'mingsiguier':
    case 'ansiguier':
    case 'mingsiguisi':
    case 'ansiguisi': {
      // 高亮用盡四張嗰隻數牌（刻／順／眼入面）
      const counts = new Map<TileId, number>()
      const bump = (id: TileId, n: number) =>
        counts.set(id, (counts.get(id) ?? 0) + n)
      for (const p of pongs) bump(p.id, p.isKong ? 4 : 3)
      for (const c of chis) {
        for (const r of c.ranks) bump(`${c.suit}-${r}` as TileId, 1)
      }
      if (partition) bump(partition.pair, 2)
      for (const [id, n] of counts) {
        if (
          n >= 4 &&
          (id.startsWith('man-') ||
            id.startsWith('pin-') ||
            id.startsWith('sou-'))
        ) {
          add(set, id, 4)
        }
      }
      break
    }

    case 'liangxiongdi':
    case 'dasanxiongdi':
    case 'xiaosanxiongdi': {
      const byRank = new Map<number, typeof pongs>()
      for (const p of pongs) {
        if (p.suit !== 'man' && p.suit !== 'pin' && p.suit !== 'sou') continue
        const arr = byRank.get(p.rank) ?? []
        arr.push(p)
        byRank.set(p.rank, arr)
      }
      for (const arr of byRank.values()) {
        const suits = new Set(arr.map((p) => p.suit))
        const need = fanId === 'dasanxiongdi' ? 3 : 2
        if (suits.size >= need) {
          for (const p of arr) addPong(p.id, p.isKong)
          if (fanId === 'xiaosanxiongdi' && partition) {
            const pr = parseTile(partition.pair)
            if (isSuitTile(partition.pair) && pr.rank === arr[0]!.rank) {
              add(set, partition.pair, 2)
            }
          }
        }
      }
      break
    }

    case 'jiangyan':
      if (partition) add(set, partition.pair, 2)
      break

    case 'duiduihu':
    case 'jijihu':
      for (const p of pongs) addPong(p.id, p.isKong)
      if (partition) add(set, partition.pair, 2)
      break

    case 'pinghu':
    case 'daya':
    case 'mingzalong':
    case 'anzalong':
    case 'laoshao':
    case 'tongshun':
    case 'wutongshun':
    case 'sitongshun':
    case 'mingwutongshun':
    case 'anwutongshun':
    case 'mingsitongshun':
    case 'ansitongshun':
    case 'mingdansebbg':
    case 'andansebbg':
    case 'mingsansebbg':
    case 'ansansebbg':
      addAllChi()
      break

    case 'bangao':
    case 'mingbangao':
    case 'anbangao':
    case 'mingzhenshuangbangao':
    case 'anzhenshuangbangao':
    case 'mingxiaoshuangbangao':
    case 'anxiaoshuangbangao': {
      // 有 instance（如 man:6-7-8）只亮嗰組般高；否則亮所有成對同門順
      const wantKey = opts.instance
      const byKey = new Map<string, typeof chis>()
      for (const c of chis) {
        const arr = byKey.get(c.key) ?? []
        arr.push(c)
        byKey.set(c.key, arr)
      }
      for (const [key, arr] of byKey) {
        if (arr.length < 2) continue
        if (wantKey && key !== wantKey) continue
        for (const c of arr) {
          for (const r of c.ranks) {
            add(set, `${c.suit}-${r}` as TileId)
          }
        }
      }
      break
    }

    case 'mingqinglong':
    case 'anqinglong':
      addQingLongChi()
      break

    case 'xiangfeng':
      addXiangFengChi('open')
      break
    case 'anxiangfeng':
      addXiangFengChi('dark')
      break
    case 'mingsanxiangfeng':
    case 'mingsixiangfeng':
    case 'mingwuxiangfeng':
      addXiangFengChi('open')
      break
    case 'ansanxiangfeng':
    case 'ansixiangfeng':
    case 'anwuxiangfeng':
      addXiangFengChi('dark')
      break

    case 'mantingfang':
    case 'hunmantingfang':
    case 'quandaix':
    case 'hundaixyz': {
      // 按組高亮：字組全亮；數組只亮帶數 X（明／手／糊一視同仁）
      const groups: TileId[][] = partition
        ? [
            ...opts.melds.map((m) => m.tiles),
            ...partition.melds.map((m) => m.tiles),
            [partition.pair, partition.pair],
          ]
        : opts.melds.map((m) => m.tiles)
      const hun =
        fanId === 'hunmantingfang' || fanId === 'hundaixyz'
      let digits = mantingfangDigits(groups, hun ? 'hun' : 'pure')
      if (opts.instance) {
        const only = Number(opts.instance)
        digits = digits.filter((d) => d === only)
      }
      if (digits.length === 0) break
      for (const g of groups) {
        const honorGroup = g.some(isHonor)
        if (hun && honorGroup) {
          addAll(set, g)
          continue
        }
        for (const x of digits) {
          for (const t of g) {
            if (isSuitTile(t) && parseTile(t).rank === x) add(set, t)
          }
        }
      }
      break
    }

    case 'erjiemei':
    case 'sanjiemei':
    case 'sijiemei':
    case 'shuangjiemei':
    case 'erlianke':
    case 'xiaosanlianke':
    case 'dasanlianke': {
      // 同門相連刻：只亮連續嗰段（唔係所有數牌刻）
      const need =
        fanId === 'sijiemei'
          ? 4
          : fanId === 'sanjiemei' ||
              fanId === 'xiaosanlianke' ||
              fanId === 'dasanlianke'
            ? 3
            : 2
      for (const suit of ['man', 'pin', 'sou'] as const) {
        const suitPongs = pongs
          .filter((p) => p.suit === suit)
          .sort((a, b) => a.rank - b.rank)
        const ranks = [...new Set(suitPongs.map((p) => p.rank))]
        let run = 1
        for (let i = 1; i <= ranks.length; i++) {
          const cont =
            i < ranks.length && ranks[i] === ranks[i - 1]! + 1
          if (cont) {
            run++
            continue
          }
          if (run >= need || (fanId === 'shuangjiemei' && run >= 2)) {
            const start = i - run
            for (let k = 0; k < run; k++) {
              const rank = ranks[start + k]!
              for (const p of suitPongs.filter((x) => x.rank === rank)) {
                addPong(p.id, p.isKong)
              }
            }
          }
          run = 1
        }
      }
      break
    }

    case 'menqing':
    case 'menqing_zimo':
    case 'menqing_ding':
      addAll(set, concealed)
      add(set, opts.winTile)
      break

    case 'liguligu':
      addAll(set, allTiles())
      break

    case 'shisanyao': {
      for (const t of [...concealed, opts.winTile]) {
        if (isHonor(t)) add(set, t)
        else if (isSuitTile(t)) {
          const r = parseTile(t).rank
          if (r === 1 || r === 9) add(set, t)
        }
      }
      break
    }

    case 'dasanseke':
    case 'xiaosanseke':
      for (const p of pongs) {
        if (p.suit === 'man' || p.suit === 'pin' || p.suit === 'sou') {
          addPong(p.id, p.isKong)
        }
      }
      break

    default:
      break
  }

  return set
}

/** 按張數標記每張牌係咪高亮 */
export function selectionFlags(
  tiles: TileId[],
  counts: HighlightCounts | null | undefined,
): boolean[] {
  if (!counts || counts.size === 0) return tiles.map(() => false)
  const left = new Map(counts)
  return tiles.map((t) => {
    const n = left.get(t) ?? 0
    if (n > 0) {
      left.set(t, n - 1)
      return true
    }
    return false
  })
}

/**
 * 副露高亮：
 * 1) 優先整坎匹配（相逢等：避免碰吞咗順嘅牌）
 * 2) 其餘逐張 take（混滿庭芳只亮帶數：678 明順只亮嗰隻 8）
 * skipChi：暗相逢等——明順同暗順共用牌 id，副露先扣會搶光，故跳過上牌
 * 回傳 [meldFlags, 剩餘 counts 畀手牌／花繼續 take]。
 */
export function assignMeldHighlightFlags(
  melds: Meld[],
  counts: HighlightCounts,
  opts?: { skipChi?: boolean },
): { meldFlags: boolean[][]; left: HighlightCounts } {
  const left = new Map(counts)
  const meldFlags = melds.map((m) => m.tiles.map(() => false))
  const whollyLit = new Set<number>()
  for (let i = 0; i < melds.length; i++) {
    const m = melds[i]!
    if (opts?.skipChi && m.kind === 'chi') continue
    const need = countTiles(m.tiles)
    const fits = [...need].every(([t, n]) => (left.get(t) ?? 0) >= n)
    if (!fits) continue
    // 整坎都喺高亮額度入面先至亮（唔好用碰嘅一隻去吞順）
    const whollyInBudget = [...need].every(
      ([t, n]) => (counts.get(t) ?? 0) >= n,
    )
    if (!whollyInBudget) continue
    for (const [t, n] of need) {
      left.set(t, (left.get(t) ?? 0) - n)
    }
    meldFlags[i] = m.tiles.map(() => true)
    whollyLit.add(i)
  }
  // 第二輪：未整坎亮嘅副露，逐張扣額度（帶數只亮部分）
  for (let i = 0; i < melds.length; i++) {
    if (whollyLit.has(i)) continue
    const m = melds[i]!
    if (opts?.skipChi && m.kind === 'chi') continue
    meldFlags[i] = m.tiles.map((t) => {
      const n = left.get(t) ?? 0
      if (n > 0) {
        left.set(t, n - 1)
        return true
      }
      return false
    })
  }
  return { meldFlags, left }
}

/** 暗相逢類：高亮唔好落到明順 */
export function fanHighlightSkipsChiMelds(fanId: string): boolean {
  return (
    fanId === 'anxiangfeng' ||
    fanId === 'ansanxiangfeng' ||
    fanId === 'ansixiangfeng' ||
    fanId === 'anwuxiangfeng'
  )
}
