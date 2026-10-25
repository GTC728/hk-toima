/**
 * S9：補漏聚合 — 勝負準確、聽牌、拉帳、決策、棄門出銃。
 */
import {
  computeAccuracyV1,
  type TimelineBucket,
} from './stats-insights'
import {
  emptyDiscardCounts,
  SUIT_BIAS_LABEL,
  type SuitBias,
} from './stats-prefs'
import {
  aggregateMatches,
  type GamePhase,
  type MatchRecord,
  type RateBucket,
  type RoundRecord,
  type StatsPlayKind,
} from './stats'

function rateBucket(wins: number, n: number): RateBucket {
  return { n, wins, rate: n === 0 ? null : wins / n }
}

function avgOrNull(sum: number, n: number): number | null {
  return n === 0 ? null : sum / n
}

export interface Extras9Aggregates {
  accuracyWhenWin: number | null
  accuracyWhenLose: number | null
  winRateByKind: Record<StatsPlayKind, RateBucket>
  /** 首次聽牌發生喺邊段（次數） */
  tenpaiByPhase: Record<GamePhase, number>
  avgTenpaiToWin: number | null
  drawTenpaiRate: number | null
  drawTenpaiN: number
  dealInBySuit: Record<SuitBias, number>
  laNetSum: number
  instantBonusSum: number
  avgDecisionMs: number | null
  lowTimeRate: number | null
  lowTimeMoves: number
  decisionMoves: number
}

export function aggregateExtras9(
  matches: readonly MatchRecord[],
  rounds: readonly RoundRecord[],
): Extras9Aggregates {
  const winRounds = rounds.filter((r) => r.outcome === 'win')
  const loseRounds = rounds.filter(
    (r) => r.outcome === 'deal_in' || r.outcome === 'other',
  )
  const winRateByKind: Record<StatsPlayKind, RateBucket> = {
    casual: rateBucket(0, 0),
    ranked: rateBucket(0, 0),
    private: rateBucket(0, 0),
    ai: rateBucket(0, 0),
  }
  for (const k of Object.keys(winRateByKind) as StatsPlayKind[]) {
    const list = matches.filter((m) => m.playKind === k)
    const a = aggregateMatches(list)
    winRateByKind[k] = rateBucket(a.wins, a.matches)
  }

  let tenpaiWinSum = 0
  let tenpaiWinN = 0
  let drawN = 0
  let drawTenpai = 0
  const dealInBySuit = emptyDiscardCounts()
  let laNetSum = 0
  let instantBonusSum = 0
  let decisionMsSum = 0
  let decisionN = 0
  let lowTimeMoves = 0
  const tenpaiByPhase: Record<GamePhase, number> = {
    early: 0,
    mid: 0,
    late: 0,
  }

  for (const r of rounds) {
    if (r.firstTenpaiPhase) tenpaiByPhase[r.firstTenpaiPhase] += 1
    if (r.tenpaiToWinTurns != null) {
      tenpaiWinSum += r.tenpaiToWinTurns
      tenpaiWinN += 1
    }
    if (r.outcome === 'draw') {
      drawN += 1
      if (r.reachedTenpai) drawTenpai += 1
    }
    if (r.dealInSuit) dealInBySuit[r.dealInSuit] += 1
    if (r.laNet != null) laNetSum += r.laNet
    if (r.instantBonusNet != null) instantBonusSum += r.instantBonusNet
    if (r.decisionN && r.decisionN > 0) {
      decisionMsSum += r.decisionMsSum ?? 0
      decisionN += r.decisionN
      lowTimeMoves += r.lowTimeMoves ?? 0
    }
  }

  return {
    accuracyWhenWin: computeAccuracyV1(winRounds),
    accuracyWhenLose: computeAccuracyV1(loseRounds),
    winRateByKind,
    tenpaiByPhase,
    avgTenpaiToWin: avgOrNull(tenpaiWinSum, tenpaiWinN),
    drawTenpaiRate: drawN === 0 ? null : drawTenpai / drawN,
    drawTenpaiN: drawN,
    dealInBySuit,
    laNetSum,
    instantBonusSum,
    avgDecisionMs: avgOrNull(decisionMsSum, decisionN),
    lowTimeRate: decisionN === 0 ? null : lowTimeMoves / decisionN,
    lowTimeMoves,
    decisionMoves: decisionN,
  }
}

/** 時間線加準確率：用當日局 */
export function attachTimelineAccuracy(
  buckets: TimelineBucket[],
  rounds: readonly RoundRecord[],
): (TimelineBucket & { accuracy: number | null })[] {
  return buckets.map((b) => {
    const dayRounds = rounds.filter((r) => {
      const d = new Date(r.t)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return key === b.day
    })
    return { ...b, accuracy: computeAccuracyV1(dayRounds) }
  })
}

export function searchMatches(
  matches: readonly MatchRecord[],
  q: string,
): MatchRecord[] {
  const s = q.trim().toLowerCase()
  if (!s) return [...matches]
  return matches.filter((m) => {
    const blob = [
      m.note,
      m.playKind,
      m.place,
      m.shape,
      m.channel,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return blob.includes(s)
  })
}

export function searchRounds(
  rounds: readonly RoundRecord[],
  q: string,
): RoundRecord[] {
  const s = q.trim().toLowerCase()
  if (!s) return [...rounds]
  return rounds.filter((r) => {
    const blob = [
      r.note,
      r.outcome,
      r.winType,
      r.playKind,
      r.endPhase,
      ...(r.prefs?.fanNames ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return blob.includes(s)
  })
}

export function formatDecisionMs(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export { SUIT_BIAS_LABEL }
