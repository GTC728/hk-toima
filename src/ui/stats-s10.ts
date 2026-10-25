/**
 * S10：時限档、分 Δ、形狀準確、技能分、收藏／重播。
 */
import {
  aggregateShapes,
  computeAccuracyV1,
  MATCH_SHAPE_LABEL,
  type MatchShape,
} from './stats-insights'
import {
  loadCareerStats,
  saveCareerStats,
  type MatchRecord,
  type RoundRecord,
} from './stats'

export type TimeClass = 'short' | 'standard' | 'long'

export const TIME_CLASS_LABEL: Record<TimeClass, string> = {
  short: '短',
  standard: '標準',
  long: '長',
}

/** 跟枱規出牌秒：≤12 短、≤25 標準、其餘長 */
export function timeClassFromTimeout(sec: number | undefined): TimeClass | null {
  if (sec == null || !Number.isFinite(sec)) return null
  if (sec <= 12) return 'short'
  if (sec <= 25) return 'standard'
  return 'long'
}

export type TimeClassFilter = 'all' | TimeClass

export function filterByTimeClass(
  matches: readonly MatchRecord[],
  tc: TimeClassFilter,
): MatchRecord[] {
  if (tc === 'all') return [...matches]
  return matches.filter(
    (m) => timeClassFromTimeout(m.turnTimeoutSec) === tc,
  )
}

export interface RatingDeltaDay {
  day: string
  label: string
  delta: number
  games: number
}

export function ratingDeltaByDay(
  matches: readonly MatchRecord[],
  maxDays = 14,
): RatingDeltaDay[] {
  const map = new Map<string, RatingDeltaDay>()
  for (const m of matches) {
    if (m.ratingDelta == null) continue
    const d = new Date(m.t)
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    let b = map.get(day)
    if (!b) {
      b = {
        day,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        delta: 0,
        games: 0,
      }
      map.set(day, b)
    }
    b.delta += m.ratingDelta
    b.games += 1
  }
  return [...map.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-maxDays)
}

export function accuracyByShape(
  matches: readonly MatchRecord[],
  rounds: readonly RoundRecord[],
): Record<MatchShape, number | null> {
  const shapes: MatchShape[] = [
    'stable_win',
    'comeback',
    'collapse',
    'swing',
    'stable_loss',
  ]
  const out = {} as Record<MatchShape, number | null>
  // 形狀係場級；準確用該場時間窗附近局粗對：同日＋前後 2 小時內嘅局
  for (const s of shapes) {
    const ms = matches.filter((m) => m.shape === s)
    if (ms.length === 0) {
      out[s] = null
      continue
    }
    const related: RoundRecord[] = []
    for (const m of ms) {
      for (const r of rounds) {
        if (Math.abs(r.t - m.t) <= 3 * 60 * 60 * 1000) related.push(r)
      }
    }
    out[s] = computeAccuracyV1(related)
  }
  return out
}

/** 規則向技能分 0–100（樣本唔夠 → null） */
export interface SkillScores {
  opening: number | null
  tactics: number | null
  strategy: number | null
  endgame: number | null
}

export function computeSkillScores(
  matches: readonly MatchRecord[],
  rounds: readonly RoundRecord[],
): SkillScores {
  const shapes = aggregateShapes(matches, rounds)
  const early = shapes.accuracyByPhase.early
  const mid = shapes.accuracyByPhase.mid
  const late = shapes.accuracyByPhase.late
  const tacticsRounds = rounds.filter((r) => r.tactics)
  let claimOff = 0
  let claimTake = 0
  let winOff = 0
  let winTake = 0
  let tenpaiN = 0
  let tenpaiHit = 0
  for (const r of tacticsRounds) {
    const t = r.tactics!
    claimOff += t.pong.offered + t.chi.offered + t.kong.offered
    claimTake += t.pong.taken + t.chi.taken + t.kong.taken
    winOff += t.win.offered
    winTake += t.win.taken
  }
  for (const r of rounds) {
    if (r.reachedTenpai != null || r.firstTenpaiTurn != null) {
      tenpaiN += 1
      if (r.reachedTenpai || r.firstTenpaiTurn != null) tenpaiHit += 1
    }
  }
  const dealIns = rounds.filter((r) => r.outcome === 'deal_in').length
  const wins = rounds.filter((r) => r.outcome === 'win').length
  const decisionN = wins + dealIns

  function pct(v: number | null): number | null {
    if (v == null) return null
    return Math.round(Math.max(0, Math.min(1, v)) * 100)
  }

  return {
    opening: pct(early),
    tactics:
      claimOff + winOff >= 5
        ? pct((claimTake + winTake) / (claimOff + winOff))
        : null,
    strategy:
      tenpaiN >= 5 && decisionN >= 3
        ? pct(
            0.5 * (tenpaiHit / tenpaiN) +
              0.5 * (1 - dealIns / decisionN),
          )
        : null,
    endgame: pct(late ?? mid),
  }
}

const FAV_KEY = 'toima.matchFavorites'
const REPLAY_KEY = 'toima.replayViews'

function loadIdMap(key: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const p = JSON.parse(raw) as Record<string, number>
    return p && typeof p === 'object' ? p : {}
  } catch {
    return {}
  }
}

function saveIdMap(key: string, map: Record<string, number>): void {
  try {
    localStorage.setItem(key, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function matchKey(m: MatchRecord): string {
  return `${m.t}|${m.playKind}|${m.place}|${m.cash}`
}

export function isFavoriteMatch(m: MatchRecord): boolean {
  return Boolean(loadIdMap(FAV_KEY)[matchKey(m)])
}

export function toggleFavoriteMatch(m: MatchRecord): boolean {
  const map = loadIdMap(FAV_KEY)
  const k = matchKey(m)
  if (map[k]) {
    delete map[k]
    saveIdMap(FAV_KEY, map)
    return false
  }
  map[k] = Date.now()
  saveIdMap(FAV_KEY, map)
  return true
}

export function replayViewCount(seed: number): number {
  return loadIdMap(REPLAY_KEY)[String(seed)] ?? 0
}

export function bumpReplayView(seed: number): number {
  const map = loadIdMap(REPLAY_KEY)
  const k = String(seed)
  const n = (map[k] ?? 0) + 1
  map[k] = n
  saveIdMap(REPLAY_KEY, map)
  return n
}

export function totalReplayViews(): number {
  return Object.values(loadIdMap(REPLAY_KEY)).reduce((a, b) => a + b, 0)
}

const ADV_KEY = 'toima.insightsAdvanced'

export function loadInsightsAdvanced(): boolean {
  try {
    return localStorage.getItem(ADV_KEY) === '1'
  } catch {
    return false
  }
}

export function saveInsightsAdvanced(on: boolean): void {
  try {
    localStorage.setItem(ADV_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export { MATCH_SHAPE_LABEL }

/** 標記 CareerStats 入場 turnTimeout（寫入用） */
export function patchLastMatchTimeout(sec: number): void {
  const stats = loadCareerStats()
  const m = stats.matches[0]
  if (!m || m.turnTimeoutSec != null) return
  m.turnTimeoutSec = sec
  saveCareerStats(stats)
}
