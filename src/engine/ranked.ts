/**
 * 排位分數（四人台）— Elo 名次變體，本機／帳戶共用。
 */

export const RANKED_DEFAULT = 1000
export const RANKED_AI_RATING = 950

export type RankTierId =
  | 'rookie'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'master'

export interface RankTier {
  id: RankTierId
  name: string
  min: number
}

export const RANK_TIERS: RankTier[] = [
  { id: 'rookie', name: '新手', min: 0 },
  { id: 'bronze', name: '銅', min: 900 },
  { id: 'silver', name: '銀', min: 1100 },
  { id: 'gold', name: '金', min: 1300 },
  { id: 'platinum', name: '白金', min: 1500 },
  { id: 'master', name: '大師', min: 1700 },
]

export function tierForRating(rating: number): RankTier {
  let best = RANK_TIERS[0]!
  for (const t of RANK_TIERS) {
    if (rating >= t.min) best = t
  }
  return best
}

export function clampRating(n: number): number {
  return Math.max(100, Math.min(3000, Math.round(n)))
}

/** 等得耐 → 配對分差窗擴大（排位） */
export function ratingWindowMs(waitedMs: number): number {
  const base = 120
  const every = 12_000
  const step = 80
  const max = 520
  return Math.min(max, base + Math.floor(Math.max(0, waitedMs) / every) * step)
}

export function expectedScore(my: number, opp: number): number {
  return 1 / (1 + 10 ** ((opp - my) / 400))
}

/** 銀位名次分數：1=冠 → 1，4=殿 → 0 */
export function placeScore(place: 1 | 2 | 3 | 4): number {
  return ([1, 2 / 3, 1 / 3, 0] as const)[place - 1]!
}

export function kFactor(rankedGames: number, withAi: boolean): number {
  let k = rankedGames < 10 ? 40 : rankedGames < 30 ? 28 : 20
  if (withAi) k *= 0.5
  return k
}

/**
 * 現金由高至低排名次；打和時同分攤名次（用平均 place 再夾 1–4）。
 * 回傳每席 place 1–4。
 */
export function placesByCash(cash: readonly number[]): Array<1 | 2 | 3 | 4> {
  const n = cash.length
  const order = cash
    .map((c, seat) => ({ seat, c }))
    .sort((a, b) => b.c - a.c || a.seat - b.seat)
  const raw = new Array<number>(n).fill(n)
  let i = 0
  while (i < order.length) {
    let j = i
    while (j < order.length && order[j]!.c === order[i]!.c) j++
    const avg = (i + 1 + j) / 2
    for (let k = i; k < j; k++) raw[order[k]!.seat] = avg
    i = j
  }
  return raw.map((p) => {
    const r = Math.round(p)
    if (r <= 1) return 1
    if (r >= 4) return 4
    return r as 2 | 3
  })
}

export function ratingDelta(opts: {
  myRating: number
  opponentRatings: readonly number[]
  place: 1 | 2 | 3 | 4
  rankedGames: number
  withAi: boolean
}): number {
  const { myRating, opponentRatings, place, rankedGames, withAi } = opts
  if (opponentRatings.length === 0) return 0
  const actual = placeScore(place)
  let exp = 0
  for (const o of opponentRatings) exp += expectedScore(myRating, o)
  exp /= opponentRatings.length
  const k = kFactor(rankedGames, withAi)
  const raw = k * (actual - exp)
  return Math.max(-48, Math.min(48, Math.round(raw)))
}

export interface RankedState {
  rating: number
  rankedGames: number
  peakRating: number
}

export function emptyRanked(): RankedState {
  return {
    rating: RANKED_DEFAULT,
    rankedGames: 0,
    peakRating: RANKED_DEFAULT,
  }
}

export function applyRankedMatch(
  state: RankedState,
  opts: {
    myCash: number
    allCash: readonly number[]
    mySeat: number
    /** 其他三席 rating；AI 用 RANKED_AI_RATING */
    opponentRatings: readonly number[]
    withAi: boolean
  },
): { next: RankedState; delta: number; place: 1 | 2 | 3 | 4 } {
  const places = placesByCash(opts.allCash)
  const place = places[opts.mySeat] ?? 4
  const delta = ratingDelta({
    myRating: state.rating,
    opponentRatings: opts.opponentRatings,
    place,
    rankedGames: state.rankedGames,
    withAi: opts.withAi,
  })
  const rating = clampRating(state.rating + delta)
  const next: RankedState = {
    rating,
    rankedGames: state.rankedGames + 1,
    peakRating: Math.max(state.peakRating, rating),
  }
  return { next, delta, place }
}
