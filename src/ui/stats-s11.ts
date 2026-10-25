/**
 * S11：首局日、逾時勝負代理、枱規組合。
 */
import {
  formatWinRate,
  type CareerStats,
  type MatchRecord,
} from './stats'

/** 本機首場／首局時間 */
export function firstPlayAt(stats: CareerStats): number | null {
  let min = Infinity
  for (const m of stats.matches) {
    if (m.t < min) min = m.t
  }
  for (const r of stats.recent) {
    if (r.t < min) min = r.t
  }
  return Number.isFinite(min) ? min : null
}

export function formatFirstPlay(ts: number | null): string {
  if (ts == null) return '—'
  return new Date(ts).toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * 對手逾時勝／自己逾時輸（代理）：
 * 冠亞且對手自動操作 > 自己 → 對手逾時勝；
 * 季殿且自己 > 對手 → 自己逾時輸。
 */
export interface TimeoutOutcomes {
  wonByOppTimeout: number
  lostBySelfTimeout: number
  timeoutsOppSum: number
  sampleN: number
}

export function aggregateTimeoutOutcomes(
  matches: readonly MatchRecord[],
): TimeoutOutcomes {
  let wonByOppTimeout = 0
  let lostBySelfTimeout = 0
  let timeoutsOppSum = 0
  let sampleN = 0
  for (const m of matches) {
    const self = m.timeoutsSelf ?? 0
    const opp = m.timeoutsOpp ?? 0
    if (self === 0 && opp === 0) continue
    sampleN += 1
    timeoutsOppSum += opp
    if (m.place <= 2 && opp > self && opp > 0) wonByOppTimeout += 1
    if (m.place >= 3 && self > opp && self > 0) lostBySelfTimeout += 1
  }
  return { wonByOppTimeout, lostBySelfTimeout, timeoutsOppSum, sampleN }
}

export interface RulesComboRow {
  key: string
  label: string
  n: number
  wins: number
  rate: number | null
}

export function rulesComboKey(m: MatchRecord): string | null {
  if (m.rulesBase == null || m.rulesFanValue == null) return null
  const to = m.turnTimeoutSec ?? '—'
  return `${m.rulesBase}|${m.rulesFanValue}|${to}`
}

export function rulesComboLabel(m: MatchRecord): string {
  const base = m.rulesBase ?? '?'
  const fv = m.rulesFanValue ?? '?'
  const to =
    m.turnTimeoutSec != null ? `${m.turnTimeoutSec}s` : '—'
  return `底${base}·$${fv}/番·${to}`
}

export function aggregateRulesCombos(
  matches: readonly MatchRecord[],
  top = 8,
): RulesComboRow[] {
  const map = new Map<string, RulesComboRow>()
  for (const m of matches) {
    const key = rulesComboKey(m)
    if (!key) continue
    let row = map.get(key)
    if (!row) {
      row = {
        key,
        label: rulesComboLabel(m),
        n: 0,
        wins: 0,
        rate: null,
      }
      map.set(key, row)
    }
    row.n += 1
    if (m.place <= 2) row.wins += 1
  }
  const rows = [...map.values()].map((r) => ({
    ...r,
    rate: r.n === 0 ? null : r.wins / r.n,
  }))
  rows.sort((a, b) => b.n - a.n || (b.rate ?? 0) - (a.rate ?? 0))
  return rows.slice(0, top)
}

export function formatComboRate(rate: number | null): string {
  return formatWinRate(rate)
}
