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
import { waitingTiles } from './win-check'
import { getFanMeta } from './fan-catalog'

export interface FanHit {
  id: string
  name: string
  value: number
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
      out.push({
        id,
        suit: t.suit,
        rank: t.rank,
        concealed: true,
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

/** 假獨：邊張或嵌張（單聽且唔係對碰／單騎） */
export function isJiaDu(
  hand: TileId[],
  melds: Meld[],
  winTile: TileId,
): boolean {
  const waits = waitingTiles(hand, melds)
  if (waits.length !== 1 || waits[0] !== winTile) return false
  if (!isSuitTile(winTile)) return false
  const n = hand.filter((t) => t === winTile).length
  if (n === 2 || n === 0) return false // 對碰／獨獨
  // 嵌張：手上有 win±1
  const t = parseTile(winTile)
  const lo = `${t.suit}-${t.rank - 1}` as TileId
  const hi = `${t.suit}-${t.rank + 1}` as TileId
  const hasLo = hand.includes(lo)
  const hasHi = hand.includes(hi)
  if (hasLo && hasHi) return true // 嵌張
  // 邊張 12 聽 3 或 89 聽 7
  if (t.rank === 3 && hand.includes(`${t.suit}-1` as TileId) && hand.includes(`${t.suit}-2` as TileId))
    return true
  if (t.rank === 7 && hand.includes(`${t.suit}-8` as TileId) && hand.includes(`${t.suit}-9` as TileId))
    return true
  return false
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

  // 全帶 X：所有面子／眼都帶同一個數 X（2–8）
  for (let x = 2; x <= 8; x++) {
    const ok = groups.every((g) =>
      g.some((t) => isSuitTile(t) && parseTile(t).rank === x),
    )
    if (ok) {
      out.push(hit('quandaix'))
      break
    }
  }

  // 混帶 XYZ：帶某數 X，另可複合 — 簡化：有字＋所有組帶同一 X
  if (hasHonor) {
    for (let x = 2; x <= 8; x++) {
      const ok = groups.every(
        (g) =>
          g.some(isHonor) ||
          g.some((t) => isSuitTile(t) && parseTile(t).rank === x),
      )
      if (ok && groups.some((g) => g.some(isHonor))) {
        out.push(hit('hundaixyz'))
        break
      }
    }
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
  const anKe = pongs.filter((p) => p.concealed).length
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
  const sameSuitPairs: { n: number; dark: boolean }[] = []
  for (const arr of byKey.values()) {
    if (arr.length >= 2) {
      sameSuitPairs.push({
        n: arr.length,
        dark: arr.every((x) => x.concealed),
      })
    }
  }
  sameSuitPairs.sort((a, b) => b.n - a.n)

  // 一色四／三同順優先
  const top = sameSuitPairs[0]
  if (top && top.n >= 4) {
    out.push(hit(top.dark ? 'anyisesitong' : 'mingyisesitong'))
  } else if (top && top.n === 3) {
    out.push(hit(top.dark ? 'anyisesantong' : 'mingyisesantong'))
  } else if (sameSuitPairs.length >= 2 && sameSuitPairs[0]!.n === 2 && sameSuitPairs[1]!.n === 2) {
    // 真雙般高：兩組不同嘅般高
    const dark = sameSuitPairs[0]!.dark && sameSuitPairs[1]!.dark
    out.push(hit(dark ? 'anzhenshuangbangao' : 'mingzhenshuangbangao'))
  } else if (top && top.n === 2 && sameSuitPairs.length === 1) {
    // 小雙？單一般高
    out.push(hit(top.dark ? 'anbangao' : 'mingbangao'))
  } else if (top && top.n === 2 && sameSuitPairs.length > 1) {
    // 小雙般高：一組般高 + 另一組有重
    const dark = sameSuitPairs.every((p) => p.dark)
    out.push(hit(dark ? 'anxiaoshuangbangao' : 'mingxiaoshuangbangao'))
  }

  // 相逢：同 rankKey 唔同門
  const byRank = new Map<string, ChiInfo[]>()
  for (const c of chis) {
    const arr = byRank.get(c.rankKey) ?? []
    arr.push(c)
    byRank.set(c.rankKey, arr)
  }
  let bestXiang = 0
  let bestXiangDark = true
  for (const arr of byRank.values()) {
    const suits = new Set(arr.map((c) => c.suit))
    if (suits.size >= 2) {
      const n = suits.size
      if (n > bestXiang) {
        bestXiang = n
        bestXiangDark = arr.every((c) => c.concealed)
      }
    }
  }
  // 若已計四／五同順且 exclude，上面已 return
  // 若已計一色三同順等，相逢仍可能；常見枱：同順優先，相逢用剩餘
  if (bestXiang >= 5) {
    out.push(hit(bestXiangDark ? 'anwuxiangfeng' : 'mingwuxiangfeng'))
  } else if (bestXiang === 4) {
    out.push(hit(bestXiangDark ? 'ansixiangfeng' : 'mingsixiangfeng'))
  } else if (bestXiang === 3) {
    out.push(hit(bestXiangDark ? 'ansanxiangfeng' : 'mingsanxiangfeng'))
  } else if (bestXiang === 2 && !out.some((f) => f.id.includes('bangao') || f.id.includes('yise'))) {
    out.push(hit('xiangfeng'))
  }

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
