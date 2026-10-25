/**
 * S7：現金曲線形狀、翻盤／崩盤、表現分。
 */
import {
  expectedScore,
  placesByCash,
  placeScore,
  type Seat,
} from '../engine'

export type MatchShape =
  | 'stable_win'
  | 'comeback'
  | 'collapse'
  | 'swing'
  | 'stable_loss'

export const MATCH_SHAPE_LABEL: Record<MatchShape, string> = {
  stable_win: '穩贏',
  comeback: '翻盤',
  collapse: '崩盤',
  swing: '拉鋸',
  stable_loss: '穩輸',
}

/** 中場名次（半場現金快照）→ 終場名次 */
export function classifyMatchShape(
  midPlace: 1 | 2 | 3 | 4,
  finalPlace: 1 | 2 | 3 | 4,
): MatchShape {
  const midTop = midPlace <= 2
  const finTop = finalPlace <= 2
  if (midTop && finTop) return 'stable_win'
  if (!midTop && finTop) return 'comeback'
  if (midTop && !finTop) return 'collapse'
  if (Math.abs(midPlace - finalPlace) >= 2) return 'swing'
  return 'stable_loss'
}

/** 半場索引：有 N 個完局快照時取中間偏前 */
export function midSnapshotIndex(snapshotCount: number): number {
  if (snapshotCount <= 1) return 0
  return Math.floor((snapshotCount - 1) / 2)
}

export function placeFromCashSnapshot(
  cash: readonly number[],
  seat: Seat,
): 1 | 2 | 3 | 4 {
  return placesByCash(cash)[seat] ?? 4
}

/**
 * 表現分（相對對手）：用名次分同 expected Elo，映去「假如一直咁打」嘅分數。
 * perf ≈ myRating + 400 * log10(actual/expected) 簡化 → my + 800*(actual-exp)
 */
export function performanceRating(opts: {
  myRating: number
  oppRatingAvg: number
  place: 1 | 2 | 3 | 4
}): number {
  const actual = placeScore(opts.place)
  const exp = expectedScore(opts.myRating, opts.oppRatingAvg)
  const raw = opts.myRating + Math.round(800 * (actual - exp))
  return Math.max(100, Math.min(3000, raw))
}

/** 著法品質粗分（提示／出銃／漏糊） */
export type MoveQuality = 'best' | 'good' | 'miss'

export interface MoveQualityCounts {
  best: number
  good: number
  miss: number
}
