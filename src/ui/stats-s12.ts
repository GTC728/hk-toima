/**
 * S12：起手 Top、標準起手、按巡準確、聽牌險棄、過牌後悔、品質時間線、中離。
 */
import { isHonor, type ActionLogEntry, type Seat, type TileId } from '../engine'
import { isTerminal } from '../engine/tiles'
import { emptyOpp, type OppCounts } from './stats-tactics'
import { formatWinRate, type MatchRecord, type RoundRecord } from './stats'

export type TurnBand = '0-3' | '4-7' | '8-11' | '12+'

export const TURN_BANDS: TurnBand[] = ['0-3', '4-7', '8-11', '12+']

export function turnBandFromDiscards(n: number): TurnBand {
  if (n <= 3) return '0-3'
  if (n <= 7) return '4-7'
  if (n <= 11) return '8-11'
  return '12+'
}

/** 「標準起手」：字牌或幺九（規則表簡化，唔係開局書） */
export function isBookOpeningTile(tile: TileId): boolean {
  return isHonor(tile) || isTerminal(tile)
}

function sliceRoundLog(log: readonly ActionLogEntry[]): ActionLogEntry[] {
  let start = 0
  for (let i = 0; i < log.length; i++) {
    const t = log[i]!.action.type
    if (t === 'start' || t === 'nextRound') start = i + 1
  }
  return log.slice(start) as ActionLogEntry[]
}

/** 過牌後同窗被人鳴／糊 */
export function countPassRegrets(
  log: readonly ActionLogEntry[],
  seat: Seat,
): number {
  const slice = sliceRoundLog(log)
  let regrets = 0
  for (let i = 0; i < slice.length; i++) {
    const e = slice[i]!
    if (e.seat !== seat || e.action.type !== 'pass') continue
    // 系統自動過／強制過唔算「主動過牌後悔」
    if (
      e.action.reason === 'auto' ||
      (e.action.forced && e.action.reason !== 'timeout')
    ) {
      continue
    }
    for (let j = i + 1; j < slice.length; j++) {
      const n = slice[j]!
      const t = n.action.type
      if (t === 'discard' || t === 'draw' || t === 'declareDing') break
      if (
        n.seat !== seat &&
        (t === 'chi' ||
          t === 'pong' ||
          t === 'mingkong' ||
          t === 'win')
      ) {
        regrets += 1
        break
      }
    }
  }
  return regrets
}

export interface OpeningRow {
  tile: TileId
  n: number
  wins: number
  rate: number | null
}

function topOpenings(
  rounds: readonly RoundRecord[],
  pred: (r: RoundRecord) => boolean,
  top = 10,
): OpeningRow[] {
  const map = new Map<string, OpeningRow>()
  for (const r of rounds) {
    if (!pred(r)) continue
    const tile = r.prefs?.firstDiscardTile
    if (!tile) continue
    let row = map.get(tile)
    if (!row) {
      row = { tile, n: 0, wins: 0, rate: null }
      map.set(tile, row)
    }
    row.n += 1
    if (r.outcome === 'win') row.wins += 1
  }
  return [...map.values()]
    .map((r) => ({ ...r, rate: r.n === 0 ? null : r.wins / r.n }))
    .sort((a, b) => b.n - a.n || (b.rate ?? 0) - (a.rate ?? 0))
    .slice(0, top)
}

export interface OpeningAggregates {
  dealerTop: OpeningRow[]
  nonDealerTop: OpeningRow[]
  bookFollowRate: number | null
  leftBookRate: number | null
  bookN: number
}

export function aggregateOpenings(
  rounds: readonly RoundRecord[],
): OpeningAggregates {
  let bookOk = 0
  let bookN = 0
  for (const r of rounds) {
    const tile = r.prefs?.firstDiscardTile
    if (!tile) continue
    bookN += 1
    if (isBookOpeningTile(tile)) bookOk += 1
  }
  return {
    dealerTop: topOpenings(rounds, (r) => r.wasDealer === true),
    nonDealerTop: topOpenings(rounds, (r) => r.wasDealer === false),
    bookFollowRate: bookN === 0 ? null : bookOk / bookN,
    leftBookRate: bookN === 0 ? null : 1 - bookOk / bookN,
    bookN,
  }
}

function grasp(o: OppCounts): number | null {
  if (o.offered < 2) return null
  return o.taken / o.offered
}

export function accuracyByTurnBand(
  rounds: readonly RoundRecord[],
): Record<TurnBand, number | null> {
  const bags: Record<TurnBand, OppCounts> = {
    '0-3': emptyOpp(),
    '4-7': emptyOpp(),
    '8-11': emptyOpp(),
    '12+': emptyOpp(),
  }
  for (const r of rounds) {
    const by = r.tactics?.byTurnBand
    if (!by) continue
    for (const b of TURN_BANDS) {
      const o = by[b]
      if (!o) continue
      bags[b].offered += o.offered
      bags[b].taken += o.taken
      bags[b].missed += o.missed
    }
  }
  return Object.fromEntries(
    TURN_BANDS.map((b) => [b, grasp(bags[b])]),
  ) as Record<TurnBand, number | null>
}

export interface DangerAggregates {
  /** 聽牌後出銃局數 */
  tenpaiDealIn: number
  tenpaiRounds: number
  tenpaiDealInRate: number | null
  passRegrets: number
  passRegretRounds: number
}

export function aggregateDanger(
  rounds: readonly RoundRecord[],
): DangerAggregates {
  let tenpaiDealIn = 0
  let tenpaiRounds = 0
  let passRegrets = 0
  let passRegretRounds = 0
  for (const r of rounds) {
    if (r.reachedTenpai) {
      tenpaiRounds += 1
      if (r.outcome === 'deal_in') tenpaiDealIn += 1
    }
    const pr = r.passRegret ?? 0
    if (pr > 0) {
      passRegretRounds += 1
      passRegrets += pr
    }
  }
  return {
    tenpaiDealIn,
    tenpaiRounds,
    tenpaiDealInRate:
      tenpaiRounds === 0 ? null : tenpaiDealIn / tenpaiRounds,
    passRegrets,
    passRegretRounds,
  }
}

export interface QualityDay {
  day: string
  label: string
  best: number
  good: number
  miss: number
  score: number | null
}

export function moveQualityTimeline(
  rounds: readonly RoundRecord[],
  maxDays = 14,
): QualityDay[] {
  const map = new Map<string, QualityDay>()
  for (const r of rounds) {
    const t = r.tactics
    if (!t) continue
    const d = new Date(r.t)
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    let row = map.get(day)
    if (!row) {
      row = {
        day,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        best: 0,
        good: 0,
        miss: 0,
        score: null,
      }
      map.set(day, row)
    }
    row.best += t.hintFollowed
    row.good += Math.max(0, t.hintShown - t.hintFollowed)
    row.miss += t.win.missed + (r.outcome === 'deal_in' ? 1 : 0)
  }
  const rows = [...map.values()].sort((a, b) => a.day.localeCompare(b.day))
  for (const r of rows) {
    const n = r.best + r.good + r.miss
    r.score = n === 0 ? null : (r.best + 0.5 * r.good) / n
  }
  return rows.slice(-maxDays)
}

export interface OppNameRow {
  name: string
  n: number
  wins: number
  rate: number | null
}

export function frequentOpponents(
  matches: readonly MatchRecord[],
  top = 8,
): OppNameRow[] {
  const map = new Map<string, OppNameRow>()
  for (const m of matches) {
    for (const name of m.oppNames ?? []) {
      const key = name.trim()
      if (!key || key === '你' || key === 'AI') continue
      let row = map.get(key)
      if (!row) {
        row = { name: key, n: 0, wins: 0, rate: null }
        map.set(key, row)
      }
      row.n += 1
      if (m.place <= 2) row.wins += 1
    }
  }
  return [...map.values()]
    .map((r) => ({ ...r, rate: r.n === 0 ? null : r.wins / r.n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, top)
}

export interface LeaveAggregates {
  youLeft: number
  oppLeftWins: number
}

export function aggregateLeaves(
  matches: readonly MatchRecord[],
): LeaveAggregates {
  let youLeft = 0
  let oppLeftWins = 0
  for (const m of matches) {
    if (m.endReason === 'you_left') youLeft += 1
    if (m.endReason === 'opp_left' && m.place <= 2) oppLeftWins += 1
  }
  return { youLeft, oppLeftWins }
}

/** 花時機：有花嘅局按終局階段粗分 */
export function flowerTimingByPhase(
  rounds: readonly RoundRecord[],
): Record<'early' | 'mid' | 'late', number> {
  const out = { early: 0, mid: 0, late: 0 }
  for (const r of rounds) {
    const n = r.prefs?.flowerCount ?? 0
    if (n <= 0 || !r.endPhase) continue
    out[r.endPhase] += n
  }
  return out
}

export function brilliantRate(
  rounds: readonly RoundRecord[],
): number | null {
  let best = 0
  let total = 0
  for (const r of rounds) {
    const t = r.tactics
    if (!t || t.hintShown === 0) continue
    best += t.hintFollowed
    total += t.hintShown
  }
  return total === 0 ? null : best / total
}

export function formatRate(r: number | null): string {
  return formatWinRate(r)
}

