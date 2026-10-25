/**
 * Career stats in localStorage（戰績）。
 * S1：場級 MatchRecord＋篩選／連勝。
 * S2：名次分布、莊閑／門風、逾時、人／AI。
 * S3：早中晚、聽牌／副露巡、短長、時段星期。
 * S4：可糊鳴把握、門清副露、提示／自動摸過。
 * S5：首棄／主攻門、叮花、番種 Top。
 * S7：形狀／表現分欄位。
 */

import {
  placesByCash,
  type ActionLogEntry,
  type AiPersona,
  type RoundResult,
  type Seat,
} from '../engine'
import type { MatchShape } from './stats-shape'
import type { OppCounts, TacticsSnapshot } from './stats-tactics'
import { emptyOpp } from './stats-tactics'
import {
  dominantSuit,
  emptyDiscardCounts,
  SUIT_BIAS_LABEL,
  tileSuitBias,
  type PrefsSnapshot,
  type SuitBias,
} from './stats-prefs'

const STATS_KEY = 'toima.careerStats'
const MAX_RECENT = 40
const MAX_MATCHES = 80

/** 玩法（對齊大廳） */
export type StatsPlayKind = 'casual' | 'ranked' | 'private' | 'ai'

export type StatsChannel = 'local' | 'online'

/** 對齊 engine/ai/read：早 >40，晚 ≤16，其餘中 */
export const PHASE_EARLY_MIN_WALL = 40
export const PHASE_LATE_MAX_WALL = 16

export type GamePhase = 'early' | 'mid' | 'late'

/** 短場：少於呢個秒數（約 12 分） */
export const SHORT_MATCH_SEC = 12 * 60

export function phaseFromWall(wallRemaining: number): GamePhase {
  if (wallRemaining > PHASE_EARLY_MIN_WALL) return 'early'
  if (wallRemaining <= PHASE_LATE_MAX_WALL) return 'late'
  return 'mid'
}

export function phaseLabel(p: GamePhase): string {
  return p === 'early' ? '早' : p === 'mid' ? '中' : '晚'
}

/** 本圈 actionLog（上一次 start／nextRound 之後） */
export function sliceRoundActionLog(
  log: readonly ActionLogEntry[],
): ActionLogEntry[] {
  let start = 0
  for (let i = 0; i < log.length; i++) {
    const t = log[i]!.action.type
    if (t === 'start' || t === 'nextRound') start = i + 1
  }
  return log.slice(start) as ActionLogEntry[]
}

/**
 * 首次副露時自己已打咗幾巡（棄牌次數；未打牌就副露＝0）。
 */
/** 本圈自己最後一棄（出銃門類） */
export function lastDiscardSuitFromLog(
  log: readonly ActionLogEntry[],
  seat: Seat,
): SuitBias | undefined {
  const slice = sliceRoundActionLog(log)
  for (let i = slice.length - 1; i >= 0; i--) {
    const e = slice[i]!
    if (e.seat !== seat) continue
    if (e.action.type === 'discard') return tileSuitBias(e.action.tile)
  }
  return undefined
}

export function firstMeldTurnFromLog(
  log: readonly ActionLogEntry[],
  seat: Seat,
): number | undefined {
  const slice = sliceRoundActionLog(log)
  let discards = 0
  for (const e of slice) {
    if (e.seat !== seat) continue
    const t = e.action.type
    if (t === 'discard') {
      discards += 1
      continue
    }
    if (
      t === 'chi' ||
      t === 'pong' ||
      t === 'mingkong' ||
      t === 'ankong' ||
      t === 'jiagang'
    ) {
      return discards
    }
  }
  return undefined
}

export interface RoundRecord {
  t: number
  mode: StatsChannel
  outcome: 'win' | 'deal_in' | 'draw' | 'other'
  fan?: number
  winType?: 'tsumo' | 'ron' | 'chankan'
  amount?: number
  note?: string
  playKind?: StatsPlayKind
  /** 你嘅座位（門風） */
  seat?: Seat
  /** 呢一局你係咪莊 */
  wasDealer?: boolean
  /** 終局牆剩 */
  wallRemaining?: number
  endPhase?: GamePhase
  /** 首次聽牌時自己棄牌數 */
  firstTenpaiTurn?: number
  /** 首次副露時自己棄牌數 */
  firstMeldTurn?: number
  reachedTenpai?: boolean
  /** S4 戰術快照 */
  tactics?: TacticsSnapshot
  /** S5 偏好／番種 */
  prefs?: PrefsSnapshot
  /** S9：首次聽牌時階段 */
  firstTenpaiPhase?: GamePhase
  /** 聽牌後幾巡先食糊（棄牌差） */
  tenpaiToWinTurns?: number
  /** 決策用時合計 ms／次數 */
  decisionMsSum?: number
  decisionN?: number
  lowTimeMoves?: number
  /** 本局拉帳淨變（你） */
  laNet?: number
  /** 即時賞罰淨（花／暗槓等，你） */
  instantBonusNet?: number
  /** 出銃時你打出嘅門類 */
  dealInSuit?: SuitBias
  /** 過牌後被人鳴／糊次數 */
  passRegret?: number
}

/** 一場（多圈完） */
export interface MatchRecord {
  t: number
  playKind: StatsPlayKind
  channel: StatsChannel
  /** 1=冠 … 4=殿 */
  place: 1 | 2 | 3 | 4
  /** 你嘅最終現金 */
  cash: number
  /** 相對開局淨變（可選） */
  netDelta?: number
  /** 秒 */
  durationSec?: number
  note?: string
  mySeat?: Seat
  /** 對手有 AI */
  vsAi?: boolean
  /** 其餘三席有幾多真人 */
  humanOpponents?: number
  /** 對手 AI 性格（可重複） */
  aiPersonas?: AiPersona[]
  /** 你被倒數自動操作次數 */
  timeoutsSelf?: number
  /** 對手被倒數自動操作次數（合計） */
  timeoutsOpp?: number
  /** 枱規：底番 */
  rulesBase?: number
  /** 枱規：$／番 */
  rulesFanValue?: number
  /** 排位：開場前自己分數 */
  myRatingBefore?: number
  /** 排位：場後分數 */
  ratingAfter?: number
  ratingDelta?: number
  /** 其餘三席平均分（估） */
  oppRatingAvg?: number
  /** 半場名次（現金） */
  midPlace?: 1 | 2 | 3 | 4
  /** 曲線形狀 */
  shape?: MatchShape
  /** 表現分 */
  perfRating?: number
  /** 枱規出牌時限（秒）→ 時限档 */
  turnTimeoutSec?: number
  /** 對手顯示名（本機常遇） */
  oppNames?: string[]
  /** 完場原因：正常／你中離／對手中離（代理） */
  endReason?: 'normal' | 'you_left' | 'opp_left'
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
  matches: MatchRecord[]
}

export type StatsDateRange = '7' | '30' | '90' | 'all'
export type StatsPlayFilter = 'all' | StatsPlayKind

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
    matches: [],
  }
}

export function loadCareerStats(): CareerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return emptyStats()
    const parsed = JSON.parse(raw) as Partial<CareerStats>
    return {
      ...emptyStats(),
      ...parsed,
      recent: parsed.recent ?? [],
      matches: Array.isArray(parsed.matches) ? parsed.matches : [],
    }
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

function pushMatch(stats: CareerStats, rec: MatchRecord): void {
  stats.matches = [rec, ...stats.matches].slice(0, MAX_MATCHES)
}

/**
 * Record one finished round for a tracked seat (human / you).
 * Idempotent callers should guard with a recorded key.
 */
export interface RoundRecordExtras {
  wasDealer?: boolean
  wallRemaining?: number
  endPhase?: GamePhase
  firstTenpaiTurn?: number
  firstMeldTurn?: number
  reachedTenpai?: boolean
  tactics?: TacticsSnapshot
  prefs?: PrefsSnapshot
  firstTenpaiPhase?: GamePhase
  tenpaiToWinTurns?: number
  decisionMsSum?: number
  decisionN?: number
  lowTimeMoves?: number
  laNet?: number
  instantBonusNet?: number
  dealInSuit?: SuitBias
  passRegret?: number
}

export function recordRoundForSeat(
  result: RoundResult | null,
  seat: Seat,
  mode: StatsChannel,
  playKind?: StatsPlayKind,
  extras?: RoundRecordExtras,
): CareerStats {
  const stats = loadCareerStats()
  stats.rounds += 1
  const t = Date.now()
  const wall = extras?.wallRemaining
  const endPhase =
    extras?.endPhase ?? (wall != null ? phaseFromWall(wall) : undefined)
  const base = {
    seat,
    wasDealer: extras?.wasDealer,
    playKind,
    wallRemaining: wall,
    endPhase,
    firstTenpaiTurn: extras?.firstTenpaiTurn,
    firstMeldTurn: extras?.firstMeldTurn,
    reachedTenpai: extras?.reachedTenpai,
    tactics: extras?.tactics,
    prefs: extras?.prefs,
    firstTenpaiPhase: extras?.firstTenpaiPhase,
    tenpaiToWinTurns: extras?.tenpaiToWinTurns,
    decisionMsSum: extras?.decisionMsSum,
    decisionN: extras?.decisionN,
    lowTimeMoves: extras?.lowTimeMoves,
    laNet: extras?.laNet,
    instantBonusNet: extras?.instantBonusNet,
    dealInSuit: extras?.dealInSuit,
    passRegret: extras?.passRegret,
  } as const

  if (!result || result.kind === 'draw') {
    stats.draws += 1
    pushRecent(stats, {
      t,
      mode,
      outcome: 'draw',
      note: '流局',
      ...base,
    })
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
        ...base,
        prefs: {
          ...(base.prefs ?? {
            discards: emptyDiscardCounts(),
            discardTerminal: 0,
            ding: false,
            flowerCount: 0,
          }),
          fanIds: w.fans.map((f) => f.id),
          fanNames: w.fans.map((f) => f.name),
        },
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
        ...base,
      })
    } else {
      pushRecent(stats, {
        t,
        mode,
        outcome: 'other',
        amount: net,
        note: net === 0 ? '坐枱' : net > 0 ? '坐枱進帳' : '坐枱輸銀',
        ...base,
      })
    }
  }

  saveCareerStats(stats)
  return stats
}

export interface RecordMatchEndInput {
  playKind: StatsPlayKind
  channel: StatsChannel
  mySeat: Seat
  cash: readonly number[]
  durationSec?: number
  /** 開局現金合計差；唔傳就用名次推 */
  netDelta?: number
  vsAi?: boolean
  humanOpponents?: number
  aiPersonas?: AiPersona[]
  timeoutsSelf?: number
  timeoutsOpp?: number
  rulesBase?: number
  rulesFanValue?: number
  myRatingBefore?: number
  ratingAfter?: number
  ratingDelta?: number
  oppRatingAvg?: number
  midPlace?: 1 | 2 | 3 | 4
  shape?: MatchShape
  perfRating?: number
  turnTimeoutSec?: number
  oppNames?: string[]
  endReason?: 'normal' | 'you_left' | 'opp_left'
}

/** 四圈／一場完：寫入場級紀錄 */
export function recordMatchEnd(input: RecordMatchEndInput): CareerStats {
  const stats = loadCareerStats()
  const places = placesByCash(input.cash)
  const place =
    input.endReason === 'you_left'
      ? 4
      : (places[input.mySeat] ?? 4)
  const myCash = input.cash[input.mySeat] ?? 0
  const rec: MatchRecord = {
    t: Date.now(),
    playKind: input.playKind,
    channel: input.channel,
    place,
    cash: myCash,
    netDelta: input.netDelta,
    durationSec: input.durationSec,
    mySeat: input.mySeat,
    vsAi: input.vsAi,
    humanOpponents: input.humanOpponents,
    aiPersonas: input.aiPersonas,
    timeoutsSelf: input.timeoutsSelf,
    timeoutsOpp: input.timeoutsOpp,
    rulesBase: input.rulesBase,
    rulesFanValue: input.rulesFanValue,
    myRatingBefore: input.myRatingBefore,
    ratingAfter: input.ratingAfter,
    ratingDelta: input.ratingDelta,
    oppRatingAvg: input.oppRatingAvg,
    midPlace: input.midPlace,
    shape: input.shape,
    perfRating: input.perfRating,
    turnTimeoutSec: input.turnTimeoutSec,
    oppNames: input.oppNames,
    endReason: input.endReason ?? 'normal',
    note:
      place === 1
        ? '冠軍'
        : place === 2
          ? '亞軍'
          : place === 3
            ? '季軍'
            : '殿軍',
  }
  pushMatch(stats, rec)
  pushRecent(stats, {
    t: rec.t,
    mode: input.channel,
    outcome: place <= 2 ? 'win' : 'other',
    amount: input.netDelta,
    note: `一場完·${rec.note}`,
    playKind: input.playKind,
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

export function playKindLabel(k: StatsPlayKind): string {
  switch (k) {
    case 'ranked':
      return '排位'
    case 'casual':
      return '普通'
    case 'private':
      return '私人'
    case 'ai':
      return 'AI'
  }
}

export function rangeStartMs(range: StatsDateRange, now = Date.now()): number | null {
  if (range === 'all') return null
  const days = Number(range)
  return now - days * 24 * 60 * 60 * 1000
}

export function filterMatches(
  matches: readonly MatchRecord[],
  opts: { play: StatsPlayFilter; range: StatsDateRange; now?: number },
): MatchRecord[] {
  const start = rangeStartMs(opts.range, opts.now)
  return matches.filter((m) => {
    if (opts.play !== 'all' && m.playKind !== opts.play) return false
    if (start != null && m.t < start) return false
    return true
  })
}

export function filterRounds(
  recent: readonly RoundRecord[],
  opts: { play: StatsPlayFilter; range: StatsDateRange; now?: number },
): RoundRecord[] {
  const start = rangeStartMs(opts.range, opts.now)
  return recent.filter((r) => {
    if (opts.play !== 'all' && r.playKind != null && r.playKind !== opts.play) {
      return false
    }
    if (opts.play !== 'all' && r.playKind == null) {
      // 舊紀錄無 playKind：普通／AI 篩選時仍顯示本機／網上粗分
      if (opts.play === 'ai' && r.mode !== 'local') return false
      if (opts.play !== 'ai' && r.mode === 'local') return false
    }
    if (start != null && r.t < start) return false
    return true
  })
}

export interface MatchAggregates {
  matches: number
  wins: number
  /** 前二當「勝場」 */
  winRate: number | null
  byKind: Record<StatsPlayKind, number>
  currentStreak: { kind: 'win' | 'loss' | 'none'; n: number }
  bestWinStreak: number
  bestLossStreak: number
}

/** 前二名當勝；三四當負（用嚟連勝／勝率） */
export function aggregateMatches(
  matches: readonly MatchRecord[],
): MatchAggregates {
  const byKind: Record<StatsPlayKind, number> = {
    casual: 0,
    ranked: 0,
    private: 0,
    ai: 0,
  }
  let wins = 0
  for (const m of matches) {
    byKind[m.playKind] += 1
    if (m.place <= 2) wins += 1
  }
  const n = matches.length
  let bestWin = 0
  let bestLoss = 0
  let run = 0
  let runKind: 'win' | 'loss' | null = null
  // matches[0] = 最新
  for (const m of matches) {
    const w = m.place <= 2
    const k: 'win' | 'loss' = w ? 'win' : 'loss'
    if (runKind === k) run += 1
    else {
      runKind = k
      run = 1
    }
    if (k === 'win') bestWin = Math.max(bestWin, run)
    else bestLoss = Math.max(bestLoss, run)
  }
  let current: MatchAggregates['currentStreak'] = { kind: 'none', n: 0 }
  if (matches[0]) {
    const w = matches[0].place <= 2
    let c = 0
    for (const m of matches) {
      if (m.place <= 2 === w) c += 1
      else break
    }
    current = { kind: w ? 'win' : 'loss', n: c }
  }
  return {
    matches: n,
    wins,
    winRate: n === 0 ? null : wins / n,
    byKind,
    currentStreak: current,
    bestWinStreak: bestWin,
    bestLossStreak: bestLoss,
  }
}

export function formatWinRate(rate: number | null): string {
  if (rate == null) return '—'
  return `${Math.round(rate * 100)}%`
}

export function formatDuration(sec: number | undefined): string {
  if (sec == null || sec < 0) return '—'
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s === 0 ? `${m}分` : `${m}分${s}秒`
}

export function placeLabel(place: 1 | 2 | 3 | 4): string {
  return (['冠', '亞', '季', '殿'] as const)[place - 1]!
}

export const WIND_LABELS = ['東', '南', '西', '北'] as const

export interface RateBucket {
  n: number
  wins: number
  rate: number | null
}

function rateBucket(wins: number, n: number): RateBucket {
  return { n, wins, rate: n === 0 ? null : wins / n }
}

/** S2：名次／莊閑／門風／逾時／人機 */
export interface ResultAggregates {
  placeCounts: Record<1 | 2 | 3 | 4, number>
  avgPlace: number | null
  dealer: RateBucket
  nonDealer: RateBucket
  byWind: RateBucket[]
  timeoutsSelf: number
  matchesWithTimeout: number
  vsAi: RateBucket
  vsHuman: RateBucket
  byPersona: Record<AiPersona, RateBucket>
}

export function aggregateResults(
  matches: readonly MatchRecord[],
  rounds: readonly RoundRecord[],
): ResultAggregates {
  const placeCounts: Record<1 | 2 | 3 | 4, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  }
  let placeSum = 0
  let timeoutsSelf = 0
  let matchesWithTimeout = 0
  let vsAiW = 0
  let vsAiN = 0
  let vsHuW = 0
  let vsHuN = 0
  const personaN: Record<AiPersona, number> = {
    steady: 0,
    attack: 0,
    gamble: 0,
  }
  const personaW: Record<AiPersona, number> = {
    steady: 0,
    attack: 0,
    gamble: 0,
  }

  for (const m of matches) {
    placeCounts[m.place] += 1
    placeSum += m.place
    const t = m.timeoutsSelf ?? 0
    timeoutsSelf += t
    if (t > 0) matchesWithTimeout += 1
    const win = m.place <= 2
    if (m.vsAi) {
      vsAiN += 1
      if (win) vsAiW += 1
      for (const p of m.aiPersonas ?? []) {
        personaN[p] += 1
        if (win) personaW[p] += 1
      }
    } else if (m.vsAi === false) {
      vsHuN += 1
      if (win) vsHuW += 1
    } else if ((m.humanOpponents ?? 0) === 0 && m.playKind === 'ai') {
      vsAiN += 1
      if (win) vsAiW += 1
    } else if (m.channel === 'online' && m.playKind !== 'ai') {
      vsHuN += 1
      if (win) vsHuW += 1
    }
  }

  let dealerW = 0
  let dealerN = 0
  let nonW = 0
  let nonN = 0
  const windW = [0, 0, 0, 0]
  const windN = [0, 0, 0, 0]
  for (const r of rounds) {
    const win = r.outcome === 'win'
    if (r.wasDealer === true) {
      dealerN += 1
      if (win) dealerW += 1
    } else if (r.wasDealer === false) {
      nonN += 1
      if (win) nonW += 1
    }
    if (r.seat === 0 || r.seat === 1 || r.seat === 2 || r.seat === 3) {
      windN[r.seat] += 1
      if (win) windW[r.seat] += 1
    }
  }

  const n = matches.length
  return {
    placeCounts,
    avgPlace: n === 0 ? null : placeSum / n,
    dealer: rateBucket(dealerW, dealerN),
    nonDealer: rateBucket(nonW, nonN),
    byWind: [0, 1, 2, 3].map((i) => rateBucket(windW[i]!, windN[i]!)),
    timeoutsSelf,
    matchesWithTimeout,
    vsAi: rateBucket(vsAiW, vsAiN),
    vsHuman: rateBucket(vsHuW, vsHuN),
    byPersona: {
      steady: rateBucket(personaW.steady, personaN.steady),
      attack: rateBucket(personaW.attack, personaN.attack),
      gamble: rateBucket(personaW.gamble, personaN.gamble),
    },
  }
}

export function formatAvgPlace(avg: number | null): string {
  if (avg == null) return '—'
  return avg.toFixed(2)
}

function avgOrNull(sum: number, n: number): number | null {
  return n === 0 ? null : sum / n
}

export const WEEKDAY_LABELS = [
  '日',
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
] as const

/** 時段四桶：夜／朝／晏／晚 */
export const TOD_BUCKETS = [
  { id: 'night', label: '深夜', hours: [0, 1, 2, 3, 4, 5] },
  { id: 'morning', label: '朝早', hours: [6, 7, 8, 9, 10, 11] },
  { id: 'afternoon', label: '晏晝', hours: [12, 13, 14, 15, 16, 17] },
  { id: 'evening', label: '晚黑', hours: [18, 19, 20, 21, 22, 23] },
] as const

export type TodBucketId = (typeof TOD_BUCKETS)[number]['id']

export function todBucketId(hour: number): TodBucketId {
  if (hour < 6) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

/** S3：階段／節奏／時段 */
export interface PaceAggregates {
  byEndPhase: Record<GamePhase, RateBucket>
  avgWallAtWin: number | null
  avgFirstTenpaiTurn: number | null
  avgFirstMeldTurn: number | null
  tenpaiRate: number | null
  tenpaiN: number
  short: RateBucket
  long: RateBucket
  avgDurationSec: number | null
  byTod: Record<TodBucketId, RateBucket>
  byWeekday: RateBucket[]
}

export function aggregatePace(
  matches: readonly MatchRecord[],
  rounds: readonly RoundRecord[],
): PaceAggregates {
  const phaseN: Record<GamePhase, number> = { early: 0, mid: 0, late: 0 }
  const phaseW: Record<GamePhase, number> = { early: 0, mid: 0, late: 0 }
  let wallSum = 0
  let wallN = 0
  let tenpaiTurnSum = 0
  let tenpaiTurnN = 0
  let meldTurnSum = 0
  let meldTurnN = 0
  let tenpaiHits = 0
  let tenpaiSample = 0

  for (const r of rounds) {
    if (r.endPhase) {
      phaseN[r.endPhase] += 1
      if (r.outcome === 'win') phaseW[r.endPhase] += 1
    }
    if (r.outcome === 'win' && r.wallRemaining != null) {
      wallSum += r.wallRemaining
      wallN += 1
    }
    if (r.firstTenpaiTurn != null) {
      tenpaiTurnSum += r.firstTenpaiTurn
      tenpaiTurnN += 1
    }
    if (r.firstMeldTurn != null) {
      meldTurnSum += r.firstMeldTurn
      meldTurnN += 1
    }
    if (r.reachedTenpai === true || r.firstTenpaiTurn != null) {
      tenpaiSample += 1
      tenpaiHits += 1
    } else if (r.reachedTenpai === false) {
      tenpaiSample += 1
    } else if (r.outcome === 'win' && r.wallRemaining != null) {
      tenpaiSample += 1
      tenpaiHits += 1
    }
  }

  let shortW = 0
  let shortN = 0
  let longW = 0
  let longN = 0
  let durSum = 0
  let durN = 0
  const todN: Record<TodBucketId, number> = {
    night: 0,
    morning: 0,
    afternoon: 0,
    evening: 0,
  }
  const todW: Record<TodBucketId, number> = {
    night: 0,
    morning: 0,
    afternoon: 0,
    evening: 0,
  }
  const wdN = [0, 0, 0, 0, 0, 0, 0]
  const wdW = [0, 0, 0, 0, 0, 0, 0]

  for (const m of matches) {
    const win = m.place <= 2
    if (m.durationSec != null) {
      durSum += m.durationSec
      durN += 1
      if (m.durationSec < SHORT_MATCH_SEC) {
        shortN += 1
        if (win) shortW += 1
      } else {
        longN += 1
        if (win) longW += 1
      }
    }
    const d = new Date(m.t)
    const tod = todBucketId(d.getHours())
    todN[tod] += 1
    if (win) todW[tod] += 1
    const wd = d.getDay()
    wdN[wd]! += 1
    if (win) wdW[wd]! += 1
  }

  return {
    byEndPhase: {
      early: rateBucket(phaseW.early, phaseN.early),
      mid: rateBucket(phaseW.mid, phaseN.mid),
      late: rateBucket(phaseW.late, phaseN.late),
    },
    avgWallAtWin: avgOrNull(wallSum, wallN),
    avgFirstTenpaiTurn: avgOrNull(tenpaiTurnSum, tenpaiTurnN),
    avgFirstMeldTurn: avgOrNull(meldTurnSum, meldTurnN),
    tenpaiRate: avgOrNull(tenpaiHits, tenpaiSample),
    tenpaiN: tenpaiSample,
    short: rateBucket(shortW, shortN),
    long: rateBucket(longW, longN),
    avgDurationSec: avgOrNull(durSum, durN),
    byTod: {
      night: rateBucket(todW.night, todN.night),
      morning: rateBucket(todW.morning, todN.morning),
      afternoon: rateBucket(todW.afternoon, todN.afternoon),
      evening: rateBucket(todW.evening, todN.evening),
    },
    byWeekday: [0, 1, 2, 3, 4, 5, 6].map((i) =>
      rateBucket(wdW[i]!, wdN[i]!),
    ),
  }
}

export function formatAvgNum(n: number | null, digits = 1): string {
  if (n == null) return '—'
  return n.toFixed(digits)
}

/** 對戰中：首次聽牌巡（每位只記一次；換圈要 reset） */
export type TenpaiPaceMap = Partial<Record<Seat, number>>
export type TenpaiPhaseMap = Partial<Record<Seat, GamePhase>>

export function noteFirstTenpai(
  map: TenpaiPaceMap,
  seat: Seat,
  ready: boolean,
  discardCount: number,
  phaseMap?: TenpaiPhaseMap,
  phase?: GamePhase,
): void {
  if (!ready) return
  if (map[seat] != null) return
  map[seat] = discardCount
  if (phaseMap && phase) phaseMap[seat] = phase
}

function mergeOpp(into: OppCounts, from: OppCounts | undefined): void {
  if (!from) return
  into.offered += from.offered
  into.taken += from.taken
  into.missed += from.missed
}

function graspRate(o: OppCounts): number | null {
  return o.offered === 0 ? null : o.taken / o.offered
}

/** S4：鳴糊把握／門清／提示 */
export interface TacticsAggregates {
  win: OppCounts
  pong: OppCounts
  chi: OppCounts
  kong: OppCounts
  winRate: number | null
  pongRate: number | null
  chiRate: number | null
  kongRate: number | null
  feedFromOpp: number
  hintFollowRate: number | null
  hintShown: number
  autoDraw: number
  autoPass: number
  closed: RateBucket
  open: RateBucket
  meldChi: number
  meldPong: number
  meldKong: number
  chankan: number
}

export function aggregateTactics(
  rounds: readonly RoundRecord[],
): TacticsAggregates {
  const win = emptyOpp()
  const pong = emptyOpp()
  const chi = emptyOpp()
  const kong = emptyOpp()
  let feedFromOpp = 0
  let hintShown = 0
  let hintFollowed = 0
  let autoDraw = 0
  let autoPass = 0
  let closedW = 0
  let closedN = 0
  let openW = 0
  let openN = 0
  let meldChi = 0
  let meldPong = 0
  let meldKong = 0
  let chankan = 0

  for (const r of rounds) {
    const t = r.tactics
    if (t) {
      mergeOpp(win, t.win)
      mergeOpp(pong, t.pong)
      mergeOpp(chi, t.chi)
      mergeOpp(kong, t.kong)
      feedFromOpp += t.feedFromOpp
      hintShown += t.hintShown
      hintFollowed += t.hintFollowed
      autoDraw += t.autoDraw
      autoPass += t.autoPass
      meldChi += t.meldChi ?? 0
      meldPong += t.meldPong ?? 0
      meldKong += t.meldKong ?? 0
      if (t.handClosed === true) {
        closedN += 1
        if (r.outcome === 'win') closedW += 1
      } else if (t.handClosed === false) {
        openN += 1
        if (r.outcome === 'win') openW += 1
      }
    }
    if (t?.chankan || r.winType === 'chankan') chankan += 1
  }

  return {
    win,
    pong,
    chi,
    kong,
    winRate: graspRate(win),
    pongRate: graspRate(pong),
    chiRate: graspRate(chi),
    kongRate: graspRate(kong),
    feedFromOpp,
    hintFollowRate:
      hintShown === 0 ? null : hintFollowed / hintShown,
    hintShown,
    autoDraw,
    autoPass,
    closed: rateBucket(closedW, closedN),
    open: rateBucket(openW, openN),
    meldChi,
    meldPong,
    meldKong,
    chankan,
  }
}

export function formatGrasp(o: OppCounts, rate: number | null): string {
  if (o.offered === 0) return '—'
  return `${formatWinRate(rate)}（${o.taken}/${o.offered}）`
}

export { SUIT_BIAS_LABEL, dominantSuit }
export type { PrefsSnapshot, SuitBias }

/** S5：棄牌偏好／叮花／番 */
export interface PrefsAggregates {
  firstDiscard: Record<SuitBias, number>
  discardTotals: Record<SuitBias, number>
  discardTerminal: number
  discardAll: number
  mainSuit: SuitBias | null
  dingRate: number | null
  dingN: number
  avgDingTurn: number | null
  avgFlowers: number | null
  roundsWithFlower: number
  avgFan: number | null
  maxFan: number | null
  fanTop: { name: string; n: number }[]
  firstDiscardWin: Record<SuitBias, RateBucket>
}

const FAN_TOP_N = 8

export function aggregatePrefs(
  rounds: readonly RoundRecord[],
): PrefsAggregates {
  const firstDiscard = emptyDiscardCounts()
  const discardTotals = emptyDiscardCounts()
  let discardTerminal = 0
  let discardAll = 0
  let dingHits = 0
  let dingSample = 0
  let dingTurnSum = 0
  let dingTurnN = 0
  let flowerSum = 0
  let flowerSample = 0
  let flowerRounds = 0
  let fanSum = 0
  let fanN = 0
  let maxFan: number | null = null
  const fanCount = new Map<string, number>()
  const fdN: Record<SuitBias, number> = emptyDiscardCounts()
  const fdW: Record<SuitBias, number> = emptyDiscardCounts()

  for (const r of rounds) {
    const p = r.prefs
    if (p) {
      if (p.firstDiscard) {
        firstDiscard[p.firstDiscard] += 1
        fdN[p.firstDiscard] += 1
        if (r.outcome === 'win') fdW[p.firstDiscard] += 1
      }
      for (const s of ['man', 'pin', 'sou', 'honor'] as const) {
        discardTotals[s] += p.discards[s]
        discardAll += p.discards[s]
      }
      discardTerminal += p.discardTerminal
      dingSample += 1
      if (p.ding) dingHits += 1
      if (p.dingTurn != null) {
        dingTurnSum += p.dingTurn
        dingTurnN += 1
      }
      flowerSample += 1
      flowerSum += p.flowerCount
      if (p.flowerCount > 0) flowerRounds += 1
      for (const name of p.fanNames ?? []) {
        fanCount.set(name, (fanCount.get(name) ?? 0) + 1)
      }
    }
    if (r.outcome === 'win' && r.fan != null) {
      fanSum += r.fan
      fanN += 1
      maxFan = maxFan == null ? r.fan : Math.max(maxFan, r.fan)
    }
  }

  const fanTop = [...fanCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-HK'))
    .slice(0, FAN_TOP_N)
    .map(([name, n]) => ({ name, n }))

  return {
    firstDiscard,
    discardTotals,
    discardTerminal,
    discardAll,
    mainSuit: dominantSuit(discardTotals),
    dingRate: dingSample === 0 ? null : dingHits / dingSample,
    dingN: dingSample,
    avgDingTurn: avgOrNull(dingTurnSum, dingTurnN),
    avgFlowers: avgOrNull(flowerSum, flowerSample),
    roundsWithFlower: flowerRounds,
    avgFan: avgOrNull(fanSum, fanN),
    maxFan,
    fanTop,
    firstDiscardWin: {
      man: rateBucket(fdW.man, fdN.man),
      pin: rateBucket(fdW.pin, fdN.pin),
      sou: rateBucket(fdW.sou, fdN.sou),
      honor: rateBucket(fdW.honor, fdN.honor),
    },
  }
}
