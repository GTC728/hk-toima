/**
 * Career stats in localStorage（戰績）。
 */

import type { RoundResult, Seat } from '../engine'

const STATS_KEY = 'toima.careerStats'
const MAX_RECENT = 40

export interface RoundRecord {
  t: number
  mode: 'local' | 'online'
  outcome: 'win' | 'deal_in' | 'draw' | 'other'
  fan?: number
  winType?: 'tsumo' | 'ron' | 'chankan'
  amount?: number
  note?: string
}

export interface CareerStats {
  rounds: number
  wins: number
  tsumo: number
  ron: number
  dealIns: number
  draws: number
  totalFan: number
  netAmount: number
  recent: RoundRecord[]
}

export function emptyStats(): CareerStats {
  return {
    rounds: 0,
    wins: 0,
    tsumo: 0,
    ron: 0,
    dealIns: 0,
    draws: 0,
    totalFan: 0,
    netAmount: 0,
    recent: [],
  }
}

export function loadCareerStats(): CareerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return emptyStats()
    const parsed = JSON.parse(raw) as Partial<CareerStats>
    return { ...emptyStats(), ...parsed, recent: parsed.recent ?? [] }
  } catch {
    return emptyStats()
  }
}

export function saveCareerStats(stats: CareerStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    /* ignore */
  }
}

function pushRecent(stats: CareerStats, rec: RoundRecord): void {
  stats.recent = [rec, ...stats.recent].slice(0, MAX_RECENT)
}

/**
 * Record one finished round for a tracked seat (human / you).
 * Idempotent callers should guard with a recorded key.
 */
export function recordRoundForSeat(
  result: RoundResult | null,
  seat: Seat,
  mode: 'local' | 'online',
): CareerStats {
  const stats = loadCareerStats()
  stats.rounds += 1
  const t = Date.now()

  if (!result || result.kind === 'draw') {
    stats.draws += 1
    pushRecent(stats, { t, mode, outcome: 'draw', note: '流局' })
    saveCareerStats(stats)
    return stats
  }

  const myWins = result.wins.filter((w) => w.seat === seat)
  let net = 0
  for (const w of result.wins) {
    for (const p of w.payments) {
      if (p.to === seat) net += p.amount
      if (p.from === seat) net -= p.amount
    }
  }
  stats.netAmount += net

  if (myWins.length > 0) {
    for (const w of myWins) {
      stats.wins += 1
      stats.totalFan += w.totalFan
      if (w.winType === 'tsumo') stats.tsumo += 1
      else stats.ron += 1
      pushRecent(stats, {
        t,
        mode,
        outcome: 'win',
        fan: w.totalFan,
        winType: w.winType === 'chankan' ? 'chankan' : w.winType,
        amount: net,
        note: `${w.totalFan}番·${w.winType === 'tsumo' ? '自摸' : w.winType === 'chankan' ? '搶槓' : '出銃'}`,
      })
    }
  } else {
    const dealt = result.wins.some(
      (w) =>
        w.winType !== 'tsumo' &&
        w.payments.some((p) => p.from === seat && p.to === w.seat),
    )
    if (dealt) {
      stats.dealIns += 1
      pushRecent(stats, {
        t,
        mode,
        outcome: 'deal_in',
        amount: net,
        note: '出銃',
      })
    } else {
      pushRecent(stats, {
        t,
        mode,
        outcome: 'other',
        amount: net,
        note: net === 0 ? '坐枱' : net > 0 ? '坐枱進帳' : '坐枱輸銀',
      })
    }
  }

  saveCareerStats(stats)
  return stats
}

/** Mark a finished match (四圈完) — bumps match counter via note in recent */
export function recordMatchEnd(netDelta?: number): CareerStats {
  const stats = loadCareerStats()
  pushRecent(stats, {
    t: Date.now(),
    mode: 'local',
    outcome: 'other',
    amount: netDelta,
    note: '一場完',
  })
  saveCareerStats(stats)
  return stats
}

export function clearCareerStats(): void {
  try {
    localStorage.removeItem(STATS_KEY)
  } catch {
    /* ignore */
  }
}
