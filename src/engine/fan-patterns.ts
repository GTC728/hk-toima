/**
 * 港式台牌結構番／么九／暗刻／龍／般高相逢等偵測。
 * 明＝有上碰明槓；暗＝全門清（只計暗槓可破門清規則另見）。
 */

import type { Meld, Suit, TileId } from './types'
import {
  isHonor,
  isOrphan,
  isSuitTile,
  parseTile,
  suitOf,
} from './tiles'
import type { WinPartition } from './win-check'
import {
  findStandardWins,
  isDuiPengWait,
  isSixteenBuDa,
  waitingTiles,
} from './win-check'
import { getFanMeta } from './fan-catalog'

/** 雙食時標明番種屬邊一舖；單舖食糊唔設 */
export type FanShop = 'liguligu' | 'standard'

export interface FanHit {
  id: string
  name: string
  value: number
  /** 雙食分舖；結算／計番機分組同高亮用 */
  shop?: FanShop
  /** 同一番種多條時分辨（如混滿庭芳·7 vs ·8） */
  instance?: string
}

export type ChiInfo = {
  suit: 'man' | 'pin' | 'sou'
  ranks: [number, number, number]
  key: string
  /** "1-2-3" */
  rankKey: string
  concealed: boolean
}

export type PongInfo = {
  id: TileId
  suit: Suit
  rank: number
  concealed: boolean
  isKong: boolean
  isAnKong: boolean
}

function hitFactory(
  fanValue: (id: string) => { name: string; value: number },
) {
  return (id: string, override?: number): FanHit => {
    const { name, value } = fanValue(id)
    return { id, name, value: override ?? value }
  }
}

export function collectChis(
  partition: WinPartition | null,
  melds: Meld[],
): ChiInfo[] {
  const out: ChiInfo[] = []
  for (const m of melds) {
    if (m.kind !== 'chi') continue
    const info = chiInfo(m.tiles, false)
    if (info) out.push(info)
  }
  if (partition) {
    for (const m of partition.melds) {
      if (m.kind !== 'chi') continue
      const info = chiInfo(m.tiles, true)
      if (info) out.push(info)
    }
  }
  return out
}

function chiInfo(tiles: TileId[], concealed: boolean): ChiInfo | null {
  const suitTiles = tiles.filter(isSuitTile)
  if (suitTiles.length !== 3) return null
  const parsed = suitTiles.map((t) => parseTile(t))
  if (parsed.some((p) => p.suit !== parsed[0]!.suit)) return null
  const ranks = parsed.map((p) => p.rank).sort((a, b) => a - b) as [
    number,
    number,
    number,
  ]
  if (ranks[1] !== ranks[0] + 1 || ranks[2] !== ranks[0] + 2) return null
  const suit = parsed[0]!.suit as 'man' | 'pin' | 'sou'
  return {
    suit,
    ranks,
    key: `${suit}:${ranks[0]}-${ranks[1]}-${ranks[2]}`,
    rankKey: `${ranks[0]}-${ranks[1]}-${ranks[2]}`,
    concealed,
  }
}

export function collectPongs(
  partition: WinPartition | null,
  melds: Meld[],
  opts?: {
    winTile?: TileId
    winType?: 'tsumo' | 'ron' | 'chankan'
  },
): PongInfo[] {
  const out: PongInfo[] = []
  for (const m of melds) {
    if (
      m.kind !== 'pong' &&
      m.kind !== 'mingkong' &&
      m.kind !== 'ankong' &&
      m.kind !== 'jiagang'
    ) {
      continue
    }
    const id = m.tiles[0]!
    const t = parseTile(id)
    out.push({
      id,
      suit: t.suit,
      rank: t.rank,
      concealed: m.kind === 'ankong',
      isKong: m.kind !== 'pong',
      isAnKong: m.kind === 'ankong',
    })
  }
  if (partition) {
    for (const m of partition.melds) {
      if (m.kind !== 'pong') continue
      const id = m.tiles[0]!
      const t = parseTile(id)
      // 出銃／搶槓湊刻＝明刻；自摸湊刻先算暗
      const fromOpenWin =
        opts?.winType !== 'tsumo' &&
        opts?.winTile != null &&
        id === opts.winTile
      out.push({
        id,
        suit: t.suit,
        rank: t.rank,
        concealed: !fromOpenWin,
        isKong: false,
        isAnKong: false,
      })
    }
  }
  return out
}

function allConcealedChis(chis: ChiInfo[]): boolean {
  return chis.length > 0 && chis.every((c) => c.concealed)
}

/** 將眼：眼係 2／5／8 */
export function isJiangYan(pair: TileId): boolean {
  if (!isSuitTile(pair)) return false
  const r = parseTile(pair).rank
  return r === 2 || r === 5 || r === 8
}

/**
 * 假獨：以邊張、中洞、獨聽嘅型式聽牌，但事實聽口多過一張。
 * @see https://hktwmjtgt.com/ （胡牌型式類）
 */
export function isJiaDu(
  hand: TileId[],
  melds: Meld[],
  winTile: TileId,
): boolean {
  const waits = waitingTiles(hand, melds)
  if (waits.length < 2 || !waits.includes(winTile)) return false
  // 對碰另計
  if (isDuiPengWait(hand, melds, winTile)) return false
  if (!isSuitTile(winTile) && !isHonor(winTile)) return false

  // 十六不搭：多面聽＋獨釣眼（糊牌湊成唯一對）
  if (melds.length === 0 && isSixteenBuDa(hand, winTile)) {
    return hand.filter((t) => t === winTile).length === 1
  }

  const wr = isSuitTile(winTile) ? parseTile(winTile).rank : -1
  return findStandardWins(hand, melds, winTile).some((p) => {
    // 獨聽型式：糊牌做眼
    if (p.pair === winTile) return true
    if (!isSuitTile(winTile)) return false
    for (const m of p.melds) {
      if (m.kind !== 'chi' || !m.tiles.includes(winTile)) continue
      const ranks = m.tiles
        .map((t) => parseTile(t).rank)
        .sort((a, b) => a - b)
      // 中洞：糊係順中間
      if (wr === ranks[1]) return true
      // 邊張：123 糊 3，或 789 糊 7
      if (ranks[0] === 1 && ranks[2] === 3 && wr === 3) return true
      if (ranks[0] === 7 && ranks[2] === 9 && wr === 7) return true
    }
    return false
  })
}

export function isQiuren(melds: Meld[], handLen: number): boolean {
  if (handLen !== 1) return false
  if (melds.length !== 5) return false
  return melds.every(
    (m) =>
      m.kind === 'chi' ||
      m.kind === 'pong' ||
      m.kind === 'mingkong' ||
      m.kind === 'jiagang',
  )
}

function tileIsYao(t: TileId): boolean {
  return isOrphan(t)
}

function meldTouchesYao(tiles: TileId[]): boolean {
  return tiles.some(tileIsYao)
}

export function scoreYaoJiu(
  partition: WinPartition,
  melds: Meld[],
  allTiles: TileId[],
  hit: (id: string, o?: number) => FanHit,
): FanHit[] {
  const out: FanHit[] = []
  const groups: TileId[][] = [
    ...melds.map((m) => m.tiles),
    ...partition.melds.map((m) => m.tiles),
    [partition.pair, partition.pair],
  ]
  const allTouch = groups.every(meldTouchesYao)
  const allYaoTiles = allTiles.every(tileIsYao)
  const hasHonor = allTiles.some(isHonor)
  const onlyTerminals = allTiles.every(
    (t) => isSuitTile(t) && (parseTile(t).rank === 1 || parseTile(t).rank === 9),
  )

  if (allYaoTiles && onlyTerminals && !hasHonor) {
    out.push(hit('qinglaotou'))
  } else if (allYaoTiles && hasHonor) {
    out.push(hit('hunlaotou'))
  } else if (allTouch && !hasHonor) {
    out.push(hit('quandaiyao'))
  } else if (allTouch && hasHonor) {
    out.push(hit('hundaiyao'))
  }

  // 斷么九
  if (
    allTiles.every((t) => isSuitTile(t)) &&
    allTiles.every((t) => {
      const r = parseTile(t).rank
      return r >= 2 && r <= 8
    })
  ) {
    out.push(hit('duanyaojiu'))
  }

  // 缺五：手牌數牌無「五」（字牌可有）
  // 小於五／大於五：成手只有數牌且全係 1–4 或 6–9（無字；坊間常見）
  const nums = allTiles.filter(isSuitTile).map((t) => parseTile(t).rank)
  const onlySuits = allTiles.length > 0 && allTiles.every(isSuitTile)
  if (nums.length > 0 && nums.every((r) => r !== 5)) out.push(hit('quewu'))
  if (onlySuits && nums.every((r) => r < 5)) out.push(hit('xiaoyuwu'))
  if (onlySuits && nums.every((r) => r > 5)) out.push(hit('dayuwu'))

  // 滿庭芳（全帶 X）：無字；每組都帶同一數 X（2–8）；只計一檔 60
  {
    const digits = mantingfangDigits(groups, 'pure')
    if (digits.length === 1) {
      const h = hit('mantingfang')
      h.name = `滿庭芳·${digits[0]}`
      h.instance = String(digits[0])
      out.push(h)
    }
  }

  // 混滿庭芳：有字；每組＝字 或 帶數 X；每個 X 各自一條 15（方便分開高亮）
  {
    const digits = mantingfangDigits(groups, 'hun')
    const unit = getFanMeta('hunmantingfang').value
    for (const d of digits) {
      const h = hit('hunmantingfang', unit)
      h.name = `混滿庭芳·${d}`
      h.instance = String(d)
      out.push(h)
    }
  }

  return out
}

/** 滿庭芳／混滿庭芳：合資格帶數（2–8） */
export function mantingfangDigits(
  groups: TileId[][],
  mode: 'pure' | 'hun',
): number[] {
  if (groups.length < 6) return []
  const hasHonor = groups.some((g) => g.some(isHonor))
  if (mode === 'pure') {
    if (hasHonor) return []
    for (let x = 2; x <= 8; x++) {
      if (
        groups.every((g) =>
          g.some((t) => isSuitTile(t) && parseTile(t).rank === x),
        )
      ) {
        return [x]
      }
    }
    return []
  }
  if (!hasHonor) return []
  // 至少一組數牌帶 X；唔好全字牌時空虛通過（字一色 ≠ 混滿庭芳）
  const out: number[] = []
  for (let x = 2; x <= 8; x++) {
    const hasDigitGroup = groups.some((g) =>
      g.some((t) => isSuitTile(t) && parseTile(t).rank === x),
    )
    if (!hasDigitGroup) continue
    const ok = groups.every(
      (g) =>
        g.some(isHonor) ||
        g.some((t) => isSuitTile(t) && parseTile(t).rank === x),
    )
    if (ok) out.push(x)
  }
  return out
}

export function scoreLaoShao(
  chis: ChiInfo[],
  hit: (id: string, o?: number) => FanHit,
): FanHit[] {
  const out: FanHit[] = []
  const bySuit = new Map<string, ChiInfo[]>()
  for (const c of chis) {
    const arr = bySuit.get(c.suit) ?? []
    arr.push(c)
    bySuit.set(c.suit, arr)
  }
  for (const arr of bySuit.values()) {
    const has123 = arr.some((c) => c.rankKey === '1-2-3')
    const has789 = arr.some((c) => c.rankKey === '7-8-9')
    if (has123 && has789) {
      const dark =
        arr.find((c) => c.rankKey === '1-2-3')!.concealed &&
        arr.find((c) => c.rankKey === '7-8-9')!.concealed
      out.push(hit('laoshao', dark ? 4 : 2))
    }
  }
  return out
}

function chiHasTile(c: ChiInfo, id: TileId): boolean {
  if (!isSuitTile(id)) return false
  const t = parseTile(id)
  return c.suit === t.suit && c.ranks.includes(t.rank)
}

/**
 * 四歸（Ting）：用盡某一隻數牌嘅四張。
 * - 四歸一：一刻＋至少一順各用該牌（3+1）
 * - 四歸二：眼係該牌，另兩張入兩組順（2+1+1）
 * - 四歸四：四張全部分入四組順（1+1+1+1）
 * 槓唔計入四歸。明＝涉及該牌嘅組有上／碰；暗＝全手裡。
 */
export function scoreSiGui(
  partition: WinPartition,
  melds: Meld[],
  hit: (id: string, o?: number) => FanHit,
): FanHit[] {
  const chis = collectChis(partition, melds)
  const pongs = collectPongs(partition, melds)
  const out: FanHit[] = []
  const seen = new Set<TileId>()

  const consider = (id: TileId) => {
    if (!isSuitTile(id) || seen.has(id)) return
    seen.add(id)

    // 槓＝四張喺同一組，唔算四歸
    if (pongs.some((p) => p.id === id && p.isKong)) return

    const inPair = partition.pair === id ? 2 : 0
    const pung = pongs.find((p) => p.id === id && !p.isKong)
    const inPong = pung ? 3 : 0
    const chiHits = chis.filter((c) => chiHasTile(c, id))
    const chiCount = chiHits.length
    if (inPair + inPong + chiCount < 4) return

    const groupsConcealed: boolean[] = []
    if (inPair) groupsConcealed.push(true) // 眼喺手牌
    if (pung) groupsConcealed.push(pung.concealed)
    for (const c of chiHits) groupsConcealed.push(c.concealed)
    const dark = groupsConcealed.every(Boolean)

    if (inPair === 0 && inPong === 0 && chiCount >= 4) {
      out.push(hit(dark ? 'ansiguisi' : 'mingsiguisi'))
    } else if (inPair === 2 && inPong === 0 && chiCount >= 2) {
      out.push(hit(dark ? 'ansiguier' : 'mingsiguier'))
    } else if (inPong === 3 && chiCount >= 1) {
      out.push(hit(dark ? 'ansiguiji' : 'mingsiguiji'))
    }
  }

  consider(partition.pair)
  for (const p of pongs) consider(p.id)
  for (const c of chis) {
    for (const r of c.ranks) {
      consider(`${c.suit}-${r}` as TileId)
    }
  }

  return out
}

export function scoreAnKeGang(
  pongs: PongInfo[],
  melds: Meld[],
  hit: (id: string, o?: number) => FanHit,
): FanHit[] {
  const out: FanHit[] = []
  // 偏高檔（麻雀撚）：暗刻＋任何槓都計入「暗坎」數（四暗坎等）
  // 明碰唔計；暗碰／自摸刻、明槓／暗槓／加槓都計
  const anKe = pongs.filter((p) => p.concealed || p.isKong).length
  if (anKe >= 5) out.push(hit('wuanake'))
  else if (anKe === 4) out.push(hit('sianke'))
  else if (anKe === 3) out.push(hit('sananke'))
  else if (anKe === 2) out.push(hit('lianganke'))

  let ming = 0
  let an = 0
  for (const m of melds) {
    if (m.kind === 'ankong') an++
    if (m.kind === 'mingkong' || m.kind === 'jiagang') ming++
  }
  if (ming > 0) out.push(hit('minggang', getFanMeta('minggang').value * ming))
  if (an > 0) out.push(hit('angang', getFanMeta('angang').value * an))
  if (ming + an >= 5) out.push(hit('wugangzi'))

  return out
}

const SEAT_WIND: Record<0 | 1 | 2 | 3, TileId> = {
  0: 'wind-east',
  1: 'wind-south',
  2: 'wind-west',
  3: 'wind-north',
}

/** Ting：正風或正圈＝2；否則非正＝1（門風＋圈風同一隻唔叠加） */
export function windPongFan(
  tileId: TileId,
  seat: 0 | 1 | 2 | 3,
  windRound: number,
): number {
  const seatW = SEAT_WIND[seat]
  const roundW = SEAT_WIND[(windRound % 4) as 0 | 1 | 2 | 3]
  if (tileId === seatW || tileId === roundW) return 2
  return 1
}

export function scoreHonorPongs(
  pongs: PongInfo[],
  hit: (id: string, o?: number) => FanHit,
  opts?: { seat?: 0 | 1 | 2 | 3; windRound?: number },
): FanHit[] {
  const out: FanHit[] = []
  const seat = opts?.seat ?? 0
  const windRound = opts?.windRound ?? 0
  let windFan = 0
  let dragons = 0
  for (const p of pongs) {
    if (p.suit === 'wind') windFan += windPongFan(p.id, seat, windRound)
    if (p.suit === 'dragon') dragons++
  }
  if (windFan > 0) out.push(hit('fengke', windFan))
  if (dragons > 0)
    out.push(hit('sanyuanpai', getFanMeta('sanyuanpai').value * dragons))
  return out
}

export function scoreLong(
  chis: ChiInfo[],
  hit: (id: string, o?: number) => FanHit,
): FanHit[] {
  const out: FanHit[] = []
  // 清龍：同門 123+456+789
  for (const suit of ['man', 'pin', 'sou'] as const) {
    const s = chis.filter((c) => c.suit === suit)
    const has = (rk: string) => s.find((c) => c.rankKey === rk)
    const a = has('1-2-3')
    const b = has('4-5-6')
    const c = has('7-8-9')
    if (a && b && c) {
      const dark = a.concealed && b.concealed && c.concealed
      out.push(hit(dark ? 'anqinglong' : 'mingqinglong'))
      return out
    }
  }
  // 雜龍：三門各一段組成 1–9
  const has123 = chis.find((c) => c.rankKey === '1-2-3')
  const has456 = chis.find((c) => c.rankKey === '4-5-6')
  const has789 = chis.find((c) => c.rankKey === '7-8-9')
  if (has123 && has456 && has789) {
    const suits = new Set([has123.suit, has456.suit, has789.suit])
    if (suits.size >= 2) {
      const dark =
        has123.concealed && has456.concealed && has789.concealed
      out.push(hit(dark ? 'anzalong' : 'mingzalong'))
    }
  }
  return out
}

export function scoreBanGaoXiangFeng(
  chis: ChiInfo[],
  tongShunBest: number,
  excludeAfterWuTong: boolean,
  hit: (id: string, o?: number) => FanHit,
): FanHit[] {
  if (excludeAfterWuTong && tongShunBest >= 4) return []
  const out: FanHit[] = []

  // 同門同數字順頻率
  const byKey = new Map<string, ChiInfo[]>()
  for (const c of chis) {
    const arr = byKey.get(c.key) ?? []
    arr.push(c)
    byKey.set(c.key, arr)
  }
  const sameSuitPairs: {
    n: number
    dark: boolean
    key: string
    sample: ChiInfo
  }[] = []
  for (const [key, arr] of byKey) {
    if (arr.length >= 2) {
      sameSuitPairs.push({
        n: arr.length,
        dark: arr.every((x) => x.concealed),
        key,
        sample: arr[0]!,
      })
    }
  }
  sameSuitPairs.sort((a, b) => b.n - a.n)

  // 一色四／三同順優先（三／四組同一順）
  const top = sameSuitPairs[0]
  if (top && top.n >= 4) {
    out.push(hit(top.dark ? 'anyisesitong' : 'mingyisesitong'))
  } else if (top && top.n === 3) {
    out.push(hit(top.dark ? 'anyisesantong' : 'mingyisesantong'))
  } else {
    // 每組般高分開一條（明5／暗10），方便高亮；唔再併「真雙／小雙」
    for (const p of sameSuitPairs) {
      if (p.n < 2) continue
      const id = p.dark ? 'anbangao' : 'mingbangao'
      const h = hit(id)
      const suitLabel =
        p.sample.suit === 'man' ? '萬' : p.sample.suit === 'pin' ? '筒' : '索'
      h.name = `${p.dark ? '暗' : '明'}般高·${p.sample.ranks.join('')}${suitLabel}`
      h.instance = p.key
      out.push(h)
    }
  }

  /**
   * 相逢：同一個數字順、唔同門。
   * - 兩色＝相逢（有副露＝明 3）／暗相逢（全暗 5）
   * - 三色＝明／暗三相逢
   * 多組（唔同 rank）可並計：例如一組明相逢＋一組暗相逢。
   * 唔再亂加「囍相逢」——喜相逢＝相逢別名，唔係兩組加 15。
   */
  const byRank = new Map<string, ChiInfo[]>()
  for (const c of chis) {
    const arr = byRank.get(c.rankKey) ?? []
    arr.push(c)
    byRank.set(c.rankKey, arr)
  }
  // 同一 rank：先睇全部順（明＋暗）嘅門數；三色以上用整組（有明＝明三相逢）。
  // 兩色先：暗子集夠兩色＝暗相逢（同門明順唔抹銷）；否則連明夠兩色＝明相逢。
  const xiangGroups: { suits: number; dark: boolean }[] = []
  for (const arr of byRank.values()) {
    const darkArr = arr.filter((c) => c.concealed)
    const darkSuits = new Set(darkArr.map((c) => c.suit)).size
    const allSuits = new Set(arr.map((c) => c.suit)).size
    if (allSuits >= 3) {
      xiangGroups.push({
        suits: allSuits,
        dark: arr.every((c) => c.concealed),
      })
    } else if (darkSuits >= 2) {
      xiangGroups.push({ suits: darkSuits, dark: true })
    } else if (allSuits >= 2) {
      xiangGroups.push({ suits: allSuits, dark: false })
    }
  }
  xiangGroups.sort((a, b) => b.suits - a.suits)
  // 偏高檔：般高同相逢可並計（影片常見）；四五同順先唔再拆相逢
  const hasYiseTong = out.some(
    (f) => f.id.includes('yisesantong') || f.id.includes('yisesitong'),
  )
  // 兩色相逢可多組並計（明3／暗5 累加）；三色及以上各 rank 一档
  let xiangN = 0
  let anXiangN = 0
  for (const g of xiangGroups) {
    if (g.suits >= 5) {
      out.push(hit(g.dark ? 'anwuxiangfeng' : 'mingwuxiangfeng'))
    } else if (g.suits === 4) {
      out.push(hit(g.dark ? 'ansixiangfeng' : 'mingsixiangfeng'))
    } else if (g.suits === 3) {
      out.push(hit(g.dark ? 'ansanxiangfeng' : 'mingsanxiangfeng'))
    } else if (g.suits === 2 && !hasYiseTong) {
      if (g.dark) anXiangN += 1
      else xiangN += 1
    }
  }
  if (xiangN > 0)
    out.push(hit('xiangfeng', getFanMeta('xiangfeng').value * xiangN))
  if (anXiangN > 0)
    out.push(hit('anxiangfeng', getFanMeta('anxiangfeng').value * anXiangN))


  // 單色步步高：同門至少三組「起始連續」順（123+234+345），唔係清龍 123+456+789
  for (const suit of ['man', 'pin', 'sou'] as const) {
    const s = chis.filter((c) => c.suit === suit)
    if (s.length < 3) continue
    const byStart = new Map<number, ChiInfo[]>()
    for (const c of s) {
      const start = c.ranks[0]
      const arr = byStart.get(start) ?? []
      arr.push(c)
      byStart.set(start, arr)
    }
    const starts = [...byStart.keys()].sort((a, b) => a - b)
    let runStart = starts[0]!
    let runLen = 1
    let best: { from: number; len: number } | null = null
    for (let i = 1; i < starts.length; i++) {
      if (starts[i] === starts[i - 1]! + 1) {
        runLen++
        if (runLen >= 3) best = { from: runStart, len: runLen }
      } else {
        runStart = starts[i]!
        runLen = 1
      }
    }
    if (best) {
      const used: ChiInfo[] = []
      for (let r = best.from; r < best.from + best.len; r++) {
        used.push(byStart.get(r)![0]!)
      }
      const dark = used.every((c) => c.concealed)
      out.push(hit(dark ? 'andansebbg' : 'mingdansebbg'))
      break
    }
  }

  // 三色步步高：三門、起始 rank 連續（如 123萬+234筒+345索）
  for (let r = 1; r <= 7; r++) {
    const pick = (start: number) =>
      chis.filter((c) => c.ranks[0] === start)
    const a = pick(r)
    const b = pick(r + 1)
    const c = pick(r + 2)
    if (!a.length || !b.length || !c.length) continue
    // 試揾三門齊
    for (const ca of a) {
      for (const cb of b) {
        for (const cc of c) {
          if (new Set([ca.suit, cb.suit, cc.suit]).size === 3) {
            const dark = ca.concealed && cb.concealed && cc.concealed
            out.push(hit(dark ? 'ansansebbg' : 'mingsansebbg'))
            return out
          }
        }
      }
    }
  }

  return out
}

export function scoreLianKeXiongDi(
  pongs: PongInfo[],
  hit: (id: string, o?: number) => FanHit,
): FanHit[] {
  const out: FanHit[] = []
  // 同門相連刻只計「姊妹」（Ting）；「連刻」同義唔另計，避免重複

  // 兄弟：同數唔同門刻
  const byRank = new Map<number, PongInfo[]>()
  for (const p of pongs) {
    if (p.suit !== 'man' && p.suit !== 'pin' && p.suit !== 'sou') continue
    const arr = byRank.get(p.rank) ?? []
    arr.push(p)
    byRank.set(p.rank, arr)
  }
  for (const arr of byRank.values()) {
    const suits = new Set(arr.map((p) => p.suit))
    if (suits.size >= 3) out.push(hit('dasanxiongdi'))
    else if (suits.size === 2) out.push(hit('liangxiongdi'))
  }

  // 大三色連刻：三門各一刻，rank 連續（如 444萬+555筒+666索，門可調）
  // 小三色連刻：連續三 rank 刻，只用到兩門
  {
    const suitPongs = pongs.filter(
      (p) => p.suit === 'man' || p.suit === 'pin' || p.suit === 'sou',
    )
    let gotDa = false
    let gotXiao = false
    for (let i = 0; i < suitPongs.length; i++) {
      for (let j = i + 1; j < suitPongs.length; j++) {
        for (let k = j + 1; k < suitPongs.length; k++) {
          const trio = [suitPongs[i]!, suitPongs[j]!, suitPongs[k]!]
          const ranks = trio.map((p) => p.rank).sort((a, b) => a - b)
          if (ranks[1] !== ranks[0]! + 1 || ranks[2] !== ranks[1]! + 1) {
            continue
          }
          const suits = new Set(trio.map((p) => p.suit))
          if (suits.size === 3) gotDa = true
          else if (suits.size === 2) gotXiao = true
        }
      }
    }
    if (gotDa) out.push(hit('dasanseke'))
    else if (gotXiao) out.push(hit('xiaosanseke'))
  }

  // 姊妹：同門相連刻（二／三／四）
  for (const suit of ['man', 'pin', 'sou'] as const) {
    const ranks = [
      ...new Set(
        pongs.filter((p) => p.suit === suit).map((p) => p.rank),
      ),
    ].sort((a, b) => a - b)
    let best = 1
    let run = 1
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] === ranks[i - 1]! + 1) {
        run++
        best = Math.max(best, run)
      } else run = 1
    }
    if (best >= 4) out.push(hit('sijiemei'))
    else if (best === 3) out.push(hit('sanjiemei'))
    else if (best === 2) out.push(hit('erjiemei'))
  }

  // 雙姊妹：兩組同門相連刻對 — 簡化：有兩段二連
  // 用 erjiemei×2 唔另計；shuangjiemei 若有兩門各二連
  {
    let doors = 0
    for (const suit of ['man', 'pin', 'sou'] as const) {
      const ranks = [
        ...new Set(
          pongs.filter((p) => p.suit === suit).map((p) => p.rank),
        ),
      ].sort((a, b) => a - b)
      for (let i = 1; i < ranks.length; i++) {
        if (ranks[i] === ranks[i - 1]! + 1) {
          doors++
          break
        }
      }
    }
    if (doors >= 2) out.push(hit('shuangjiemei'))
  }

  return out
}

export function scoreMenQi(
  allTiles: TileId[],
  flowers: TileId[],
  hit: (id: string, o?: number) => FanHit,
): FanHit[] {
  const out: FanHit[] = []
  const has = {
    man: allTiles.some((t) => t.startsWith('man-')),
    pin: allTiles.some((t) => t.startsWith('pin-')),
    sou: allTiles.some((t) => t.startsWith('sou-')),
    wind: allTiles.some((t) => t.startsWith('wind-')),
    dragon: allTiles.some((t) => t.startsWith('dragon-')),
  }
  const five =
    has.man && has.pin && has.sou && has.wind && has.dragon

  const season = flowers.some((f) =>
    ['flower-spring', 'flower-summer', 'flower-autumn', 'flower-winter'].includes(
      f,
    ),
  )
  const plant = flowers.some((f) =>
    [
      'flower-plum',
      'flower-orchid',
      'flower-chrysanthemum',
      'flower-bamboo',
    ].includes(f),
  )
  // 常見枱表：七門齊包五門齊，只計一档
  if (five && season && plant) out.push(hit('qimenqi'))
  else if (five) out.push(hit('wumenqi'))

  return out
}

export function tongShunBestCount(chis: ChiInfo[]): number {
  const freq = new Map<string, number>()
  for (const c of chis) freq.set(c.rankKey, (freq.get(c.rankKey) ?? 0) + 1)
  let best = 0
  for (const n of freq.values()) best = Math.max(best, n)
  return best
}

export function makeHit(
  fanValue: (id: string) => { name: string; value: number },
): (id: string, o?: number) => FanHit {
  return hitFactory(fanValue)
}

export function isDaya(
  partition: WinPartition,
  melds: Meld[],
  allTiles: TileId[],
): boolean {
  // 平胡型全帶么
  if (melds.some((m) => m.kind !== 'chi')) return false
  if (!partition.melds.every((m) => m.kind === 'chi')) return false
  if (isHonor(partition.pair)) return false
  if (allTiles.some(isHonor)) return false
  const groups: TileId[][] = [
    ...melds.map((m) => m.tiles),
    ...partition.melds.map((m) => m.tiles),
    [partition.pair, partition.pair],
  ]
  return groups.every(meldTouchesYao)
}

export function isDaji(isDuiDui: boolean, hasWumenqi: boolean): boolean {
  return isDuiDui && hasWumenqi
}

export { allConcealedChis, suitOf }
