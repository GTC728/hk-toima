/**
 * S6／S7：Insights 時間線、形狀、階段準確、表現分。
 */
import {
  aggregateMatches,
  aggregateTactics,
  filterMatches,
  filterRounds,
  rangeStartMs,
  type GamePhase,
  type MatchRecord,
  type RateBucket,
  type RoundRecord,
  type StatsDateRange,
  type StatsPlayFilter,
} from './stats'
import {
  MATCH_SHAPE_LABEL,
  type MatchShape,
  type MoveQualityCounts,
} from './stats-shape'
import { emptyOpp, type OppCounts } from './stats-tactics'

export type RatingBandId =
  | 'much_lower'
  | 'lower'
  | 'even'
  | 'higher'
  | 'much_higher'

export const RATING_BANDS: {
  id: RatingBandId
  label: string
  /** opp − me */
  test: (diff: number) => boolean
}[] = [
  { id: 'much_lower', label: '低好多', test: (d) => d < -150 },
  { id: 'lower', label: '偏低', test: (d) => d >= -150 && d < -50 },
  { id: 'even', label: '接近', test: (d) => d >= -50 && d <= 50 },
  { id: 'higher', label: '偏高', test: (d) => d > 50 && d <= 150 },
  { id: 'much_higher', label: '高好多', test: (d) => d > 150 },
]

export function ratingBandId(diff: number): RatingBandId {
  for (const b of RATING_BANDS) {
    if (b.test(diff)) return b.id
  }
  return 'even'
}

export interface TimelineBucket {
  /** 日鍵 YYYY-MM-DD（本地） */
  day: string
  label: string
  games: number
  wins: number
  winRate: number | null
  /** 當日最後一場嘅 ratingAfter */
  rating: number | null
}

function dayKey(t: number): string {
  const d = new Date(t)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dayLabel(key: string): string {
  const [, m, d] = key.split('-')
  return `${Number(m)}/${Number(d)}`
}

/** 由舊到新；最多 maxDays 個有數據嘅日 */
export function buildMatchTimeline(
  matches: readonly MatchRecord[],
  maxDays = 14,
): TimelineBucket[] {
  // matches[0]=最新 → 由新到舊掃
  const map = new Map<string, TimelineBucket>()
  for (const m of matches) {
    const day = dayKey(m.t)
    let b = map.get(day)
    if (!b) {
      b = {
        day,
        label: dayLabel(day),
        games: 0,
        wins: 0,
        winRate: null,
        rating: null,
      }
      map.set(day, b)
    }
    b.games += 1
    if (m.place <= 2) b.wins += 1
    if (m.ratingAfter != null && b.rating == null) b.rating = m.ratingAfter
  }
  const list = [...map.values()].sort((a, b) => a.day.localeCompare(b.day))
  for (const b of list) {
    b.winRate = b.games === 0 ? null : b.wins / b.games
  }
  return list.slice(-maxDays)
}

export interface PeriodCompare {
  current: { games: number; winRate: number | null; accuracy: number | null }
  previous: { games: number; winRate: number | null; accuracy: number | null }
  deltaWinRate: number | null
  deltaGames: number
  deltaAccuracy: number | null
}

export function previousPeriodBounds(
  range: StatsDateRange,
  now = Date.now(),
): { start: number; end: number } | null {
  if (range === 'all') return null
  const days = Number(range)
  const ms = days * 24 * 60 * 60 * 1000
  const curStart = rangeStartMs(range, now)
  if (curStart == null) return null
  return { start: curStart - ms, end: curStart }
}

/**
 * 規則向準確率 v1（無牌譜引擎）：
 * 可糊把握、鳴牌把握、少出銃、跟提示（有數據先計），加權平均。
 * 詳見 design/accuracy-v1.md
 */
export function computeAccuracyV1(
  rounds: readonly RoundRecord[],
): number | null {
  const t = aggregateTactics(rounds)
  const wins = rounds.filter((r) => r.outcome === 'win').length
  const dealIns = rounds.filter((r) => r.outcome === 'deal_in').length
  const parts: { w: number; v: number }[] = []

  if (t.win.offered >= 2 && t.winRate != null) {
    parts.push({ w: 0.35, v: t.winRate })
  }
  const claimOff = t.pong.offered + t.chi.offered + t.kong.offered
  const claimTake = t.pong.taken + t.chi.taken + t.kong.taken
  if (claimOff >= 3) {
    parts.push({ w: 0.25, v: claimTake / claimOff })
  }
  const decisionN = wins + dealIns
  if (decisionN >= 3) {
    parts.push({ w: 0.25, v: 1 - dealIns / decisionN })
  }
  if (t.hintShown >= 3 && t.hintFollowRate != null) {
    parts.push({ w: 0.15, v: t.hintFollowRate })
  }
  if (parts.length === 0) return null
  const wSum = parts.reduce((s, p) => s + p.w, 0)
  return parts.reduce((s, p) => s + p.v * (p.w / wSum), 0)
}

export function comparePeriods(
  matches: readonly MatchRecord[],
  rounds: readonly RoundRecord[],
  opts: { play: StatsPlayFilter; range: StatsDateRange; now?: number },
): PeriodCompare | null {
  const now = opts.now ?? Date.now()
  const prev = previousPeriodBounds(opts.range, now)
  if (!prev) return null

  const curM = filterMatches(matches, {
    play: opts.play,
    range: opts.range,
    now,
  })
  const curR = filterRounds(rounds, { play: opts.play, range: opts.range, now })
  const prevM = matches.filter((m) => {
    if (opts.play !== 'all' && m.playKind !== opts.play) return false
    return m.t >= prev.start && m.t < prev.end
  })
  const prevR = rounds.filter((r) => {
    if (opts.play !== 'all' && r.playKind != null && r.playKind !== opts.play) {
      return false
    }
    return r.t >= prev.start && r.t < prev.end
  })

  const curA = aggregateMatches(curM)
  const prevA = aggregateMatches(prevM)
  const curAcc = computeAccuracyV1(curR)
  const prevAcc = computeAccuracyV1(prevR)

  return {
    current: {
      games: curA.matches,
      winRate: curA.winRate,
      accuracy: curAcc,
    },
    previous: {
      games: prevA.matches,
      winRate: prevA.winRate,
      accuracy: prevAcc,
    },
    deltaWinRate:
      curA.winRate != null && prevA.winRate != null
        ? curA.winRate - prevA.winRate
        : null,
    deltaGames: curA.matches - prevA.matches,
    deltaAccuracy:
      curAcc != null && prevAcc != null ? curAcc - prevAcc : null,
  }
}

export interface BandResult {
  id: RatingBandId
  label: string
  n: number
  wins: number
  rate: number | null
}

export function aggregateOppRatingBands(
  matches: readonly MatchRecord[],
): BandResult[] {
  const buckets: Record<RatingBandId, { n: number; wins: number }> = {
    much_lower: { n: 0, wins: 0 },
    lower: { n: 0, wins: 0 },
    even: { n: 0, wins: 0 },
    higher: { n: 0, wins: 0 },
    much_higher: { n: 0, wins: 0 },
  }
  for (const m of matches) {
    if (m.myRatingBefore == null || m.oppRatingAvg == null) continue
    const id = ratingBandId(m.oppRatingAvg - m.myRatingBefore)
    buckets[id].n += 1
    if (m.place <= 2) buckets[id].wins += 1
  }
  return RATING_BANDS.map((b) => {
    const x = buckets[b.id]
    return {
      id: b.id,
      label: b.label,
      n: x.n,
      wins: x.wins,
      rate: x.n === 0 ? null : x.wins / x.n,
    }
  })
}

export function formatDeltaRate(d: number | null): string {
  if (d == null) return '—'
  const pct = Math.round(d * 1000) / 10
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct}pt`
}

export function formatAccuracy(a: number | null): string {
  if (a == null) return '—'
  return `${Math.round(a * 100)}%`
}

function rateBucket(wins: number, n: number): RateBucket {
  return { n, wins, rate: n === 0 ? null : wins / n }
}

function graspRate(o: OppCounts): number | null {
  return o.offered === 0 ? null : o.taken / o.offered
}

function mergeOpp(into: OppCounts, from: OppCounts | undefined): void {
  if (!from) return
  into.offered += from.offered
  into.taken += from.taken
  into.missed += from.missed
}

export interface ShapeAggregates {
  byShape: Record<MatchShape, RateBucket>
  comebackRate: number | null
  collapseRate: number | null
  /** 有中場資料嘅場 */
  shaped: number
  avgPerfRating: number | null
  moveQuality: MoveQualityCounts
  accuracyByPhase: Record<GamePhase, number | null>
}

const SHAPES: MatchShape[] = [
  'stable_win',
  'comeback',
  'collapse',
  'swing',
  'stable_loss',
]

export function aggregateShapes(
  matches: readonly MatchRecord[],
  rounds: readonly RoundRecord[],
): ShapeAggregates {
  const shapeN: Record<MatchShape, number> = {
    stable_win: 0,
    comeback: 0,
    collapse: 0,
    swing: 0,
    stable_loss: 0,
  }
  const shapeW: Record<MatchShape, number> = {
    stable_win: 0,
    comeback: 0,
    collapse: 0,
    swing: 0,
    stable_loss: 0,
  }
  let comebackPool = 0
  let comebackHit = 0
  let collapsePool = 0
  let collapseHit = 0
  let perfSum = 0
  let perfN = 0

  for (const m of matches) {
    if (m.shape) {
      shapeN[m.shape] += 1
      if (m.place <= 2) shapeW[m.shape] += 1
    }
    if (m.midPlace != null) {
      if (m.midPlace >= 3) {
        comebackPool += 1
        if (m.place <= 2) comebackHit += 1
      }
      if (m.midPlace <= 2) {
        collapsePool += 1
        if (m.place >= 3) collapseHit += 1
      }
    }
    if (m.perfRating != null) {
      perfSum += m.perfRating
      perfN += 1
    }
  }

  const moveQuality: MoveQualityCounts = { best: 0, good: 0, miss: 0 }
  const phaseOpp: Record<GamePhase, OppCounts> = {
    early: emptyOpp(),
    mid: emptyOpp(),
    late: emptyOpp(),
  }

  for (const r of rounds) {
    const t = r.tactics
    if (t) {
      moveQuality.best += t.hintFollowed
      moveQuality.good += Math.max(0, t.hintShown - t.hintFollowed)
      moveQuality.miss += t.win.missed
      if (t.byPhase) {
        for (const ph of ['early', 'mid', 'late'] as GamePhase[]) {
          const b = t.byPhase[ph]
          if (!b) continue
          mergeOpp(phaseOpp[ph], b.win)
          mergeOpp(phaseOpp[ph], b.pong)
          mergeOpp(phaseOpp[ph], b.chi)
          mergeOpp(phaseOpp[ph], b.kong)
        }
      }
    }
    if (r.outcome === 'deal_in') moveQuality.miss += 1
  }

  return {
    byShape: Object.fromEntries(
      SHAPES.map((s) => [s, rateBucket(shapeW[s], shapeN[s])]),
    ) as Record<MatchShape, RateBucket>,
    comebackRate:
      comebackPool === 0 ? null : comebackHit / comebackPool,
    collapseRate:
      collapsePool === 0 ? null : collapseHit / collapsePool,
    shaped: SHAPES.reduce((n, s) => n + shapeN[s], 0),
    avgPerfRating: perfN === 0 ? null : perfSum / perfN,
    moveQuality,
    accuracyByPhase: {
      early: graspRate(phaseOpp.early),
      mid: graspRate(phaseOpp.mid),
      late: graspRate(phaseOpp.late),
    },
  }
}

export { MATCH_SHAPE_LABEL }
export type { MatchShape }
