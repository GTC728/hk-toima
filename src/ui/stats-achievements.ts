/**
 * S8：本機成就解鎖（跟戰績／排位；唔靠社交後端）。
 */
import {
  aggregateMatches,
  loadCareerStats,
  type CareerStats,
  type MatchRecord,
} from './stats'
import { loadRankedState } from './rankedPrefs'

const KEY = 'toima.achievements.v1'

export interface AchievementDef {
  id: string
  name: string
  desc: string
}

export interface AchievementUnlock {
  id: string
  t: number
}

export interface AchievementContext {
  stats: CareerStats
  rating: number
  rankedGames: number
  peak: number
  playStreak: number
  bestWinStreak: number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_table',
    name: '開枱',
    desc: '打完第一場（四圈）',
  },
  {
    id: 'first_podium',
    name: '上檯',
    desc: '完場入前二',
  },
  {
    id: 'champion',
    name: '莊家夢',
    desc: '完場攞冠',
  },
  {
    id: 'matches_10',
    name: '常客',
    desc: '累積 10 場',
  },
  {
    id: 'matches_50',
    name: '枱邊人',
    desc: '累積 50 場',
  },
  {
    id: 'win_streak_3',
    name: '三連旺',
    desc: '連勝 3 場（前二）',
  },
  {
    id: 'play_streak_3',
    name: '三日火',
    desc: '連續 3 個曆日有打牌',
  },
  {
    id: 'play_streak_7',
    name: '一週火',
    desc: '連續 7 個曆日有打牌',
  },
  {
    id: 'tsumo_10',
    name: '自摸手',
    desc: '累積自摸 10 次',
  },
  {
    id: 'fan_8',
    name: '大牌',
    desc: '單次食糊 ≥ 8 番',
  },
  {
    id: 'comeback',
    name: '翻盤王',
    desc: '中段後二、終場前二',
  },
  {
    id: 'ranked_debut',
    name: '排位初征',
    desc: '打完一場排位',
  },
  {
    id: 'ranked_silver',
    name: '銀牌',
    desc: '排位分達到銀（1100）',
  },
  {
    id: 'closed_win',
    name: '門清',
    desc: '一局門清食糊',
  },
]

const CHECKS: Record<string, (ctx: AchievementContext) => boolean> = {
  first_table: (c) => c.stats.matches.length >= 1,
  first_podium: (c) => c.stats.matches.some((m) => m.place <= 2),
  champion: (c) => c.stats.matches.some((m) => m.place === 1),
  matches_10: (c) => c.stats.matches.length >= 10,
  matches_50: (c) => c.stats.matches.length >= 50,
  win_streak_3: (c) => c.bestWinStreak >= 3,
  play_streak_3: (c) => c.playStreak >= 3,
  play_streak_7: (c) => c.playStreak >= 7,
  tsumo_10: (c) => c.stats.tsumo >= 10,
  fan_8: (c) => c.stats.recent.some((r) => (r.fan ?? 0) >= 8),
  comeback: (c) => c.stats.matches.some((m) => m.shape === 'comeback'),
  ranked_debut: (c) =>
    c.rankedGames >= 1 ||
    c.stats.matches.some((m) => m.playKind === 'ranked'),
  ranked_silver: (c) => c.rating >= 1100 || c.peak >= 1100,
  closed_win: (c) =>
    c.stats.recent.some(
      (r) => r.outcome === 'win' && r.tactics?.handClosed === true,
    ),
}

function dayKey(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** 由今日（或昨日若今日未打）往回連算有打牌嘅曆日 */
export function playDayStreak(
  matches: readonly MatchRecord[],
  now = Date.now(),
): number {
  const days = new Set(matches.map((m) => dayKey(m.t)))
  if (days.size === 0) return 0
  const start = new Date(now)
  start.setHours(12, 0, 0, 0)
  const today = dayKey(start.getTime())
  const yest = new Date(start)
  yest.setDate(yest.getDate() - 1)
  const yesterday = dayKey(yest.getTime())
  let cursor = new Date(start)
  if (!days.has(today)) {
    if (!days.has(yesterday)) return 0
    cursor = yest
  }
  let n = 0
  for (;;) {
    const k = dayKey(cursor.getTime())
    if (!days.has(k)) break
    n += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return n
}

export function firstPlayAt(matches: readonly MatchRecord[]): number | null {
  if (matches.length === 0) return null
  let min = matches[0]!.t
  for (const m of matches) if (m.t < min) min = m.t
  return min
}

export function loadUnlocks(): AchievementUnlock[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AchievementUnlock[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (u) => typeof u?.id === 'string' && typeof u?.t === 'number',
    )
  } catch {
    return []
  }
}

function saveUnlocks(list: AchievementUnlock[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function buildAchievementContext(
  stats: CareerStats = loadCareerStats(),
  now = Date.now(),
): AchievementContext {
  const ranked = loadRankedState()
  const agg = aggregateMatches(stats.matches)
  return {
    stats,
    rating: ranked.rating,
    rankedGames: ranked.rankedGames,
    peak: ranked.peakRating,
    playStreak: playDayStreak(stats.matches, now),
    bestWinStreak: agg.bestWinStreak,
  }
}

/** 對照定義補解鎖；回傳新解鎖 */
export function syncAchievements(
  ctx: AchievementContext = buildAchievementContext(),
): { unlocks: AchievementUnlock[]; newly: AchievementUnlock[] } {
  const unlocks = loadUnlocks()
  const have = new Set(unlocks.map((u) => u.id))
  const newly: AchievementUnlock[] = []
  const now = Date.now()
  for (const def of ACHIEVEMENTS) {
    if (have.has(def.id)) continue
    const check = CHECKS[def.id]
    if (check?.(ctx)) {
      const u = { id: def.id, t: now }
      unlocks.push(u)
      newly.push(u)
    }
  }
  if (newly.length > 0) saveUnlocks(unlocks)
  return { unlocks, newly }
}

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

/** 最近 N 日有冇打牌（熱圖用） */
export function playDaySet(
  matches: readonly MatchRecord[],
  daysBack: number,
  now = Date.now(),
): Set<string> {
  const start = now - daysBack * 86400000
  const set = new Set<string>()
  for (const m of matches) {
    if (m.t >= start) set.add(dayKey(m.t))
  }
  return set
}

export function calendarDays(
  daysBack: number,
  now = Date.now(),
): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  const d = new Date(now)
  d.setHours(12, 0, 0, 0)
  for (let i = daysBack - 1; i >= 0; i--) {
    const x = new Date(d)
    x.setDate(d.getDate() - i)
    out.push({
      key: dayKey(x.getTime()),
      label: `${x.getMonth() + 1}/${x.getDate()}`,
    })
  }
  return out
}
