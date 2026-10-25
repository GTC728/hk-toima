import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CareerStats, MatchRecord } from '../stats'
import {
  ACHIEVEMENTS,
  buildAchievementContext,
  playDayStreak,
  syncAchievements,
} from '../stats-achievements'

function stubStorage() {
  const map = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
  })
}

function emptyCareer(partial: Partial<CareerStats> = {}): CareerStats {
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
    ...partial,
  }
}

function match(
  partial: Partial<MatchRecord> & Pick<MatchRecord, 't' | 'place'>,
): MatchRecord {
  return {
    channel: 'local',
    cash: 1000,
    playKind: 'ai',
    ...partial,
  }
}

describe('playDayStreak', () => {
  it('counts consecutive days ending today', () => {
    const now = new Date(2024, 5, 10, 18).getTime()
    const d = (offset: number) => {
      const x = new Date(2024, 5, 10, 12)
      x.setDate(x.getDate() + offset)
      return x.getTime()
    }
    const matches = [
      match({ t: d(0), place: 1 }),
      match({ t: d(-1), place: 2 }),
      match({ t: d(-2), place: 3 }),
      match({ t: d(-5), place: 1 }),
    ]
    expect(playDayStreak(matches, now)).toBe(3)
  })
})

describe('syncAchievements', () => {
  beforeEach(() => {
    stubStorage()
  })

  it('unlocks first table and podium', () => {
    const stats = emptyCareer({
      matches: [match({ t: Date.now(), place: 2 })],
    })
    const ctx = buildAchievementContext(stats)
    const { newly, unlocks } = syncAchievements(ctx)
    const ids = newly.map((u) => u.id)
    expect(ids).toContain('first_table')
    expect(ids).toContain('first_podium')
    expect(unlocks.length).toBeGreaterThanOrEqual(2)
    // idempotent
    expect(syncAchievements(ctx).newly).toHaveLength(0)
  })

  it('has a catalog', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(10)
  })
})
