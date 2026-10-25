import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatchRecord, RoundRecord } from '../stats'
import {
  accuracyByShape,
  bumpReplayView,
  computeSkillScores,
  filterByTimeClass,
  isFavoriteMatch,
  ratingDeltaByDay,
  timeClassFromTimeout,
  toggleFavoriteMatch,
  totalReplayViews,
} from '../stats-s10'

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

function m(
  partial: Partial<MatchRecord> & Pick<MatchRecord, 't' | 'place' | 'playKind'>,
): MatchRecord {
  return { channel: 'local', cash: 1000, ...partial }
}

describe('stats-s10', () => {
  beforeEach(() => {
    stubStorage()
  })

  it('maps turn timeout to time class', () => {
    expect(timeClassFromTimeout(undefined)).toBeNull()
    expect(timeClassFromTimeout(10)).toBe('short')
    expect(timeClassFromTimeout(20)).toBe('standard')
    expect(timeClassFromTimeout(40)).toBe('long')
  })

  it('filters matches by time class', () => {
    const matches = [
      m({ t: 1, place: 1, playKind: 'ai', turnTimeoutSec: 10 }),
      m({ t: 2, place: 2, playKind: 'ai', turnTimeoutSec: 20 }),
      m({ t: 3, place: 3, playKind: 'ai', turnTimeoutSec: 40 }),
    ]
    expect(filterByTimeClass(matches, 'short')).toHaveLength(1)
    expect(filterByTimeClass(matches, 'all')).toHaveLength(3)
  })

  it('aggregates rating delta by day', () => {
    const t0 = new Date(2026, 2, 1, 12).getTime()
    const t1 = new Date(2026, 2, 1, 18).getTime()
    const days = ratingDeltaByDay([
      m({ t: t0, place: 1, playKind: 'ranked', ratingDelta: 12 }),
      m({ t: t1, place: 4, playKind: 'ranked', ratingDelta: -8 }),
    ])
    expect(days).toHaveLength(1)
    expect(days[0]!.delta).toBe(4)
    expect(days[0]!.games).toBe(2)
  })

  it('accuracy by shape keys nearby rounds', () => {
    const matches = [
      m({ t: 1000, place: 1, playKind: 'ai', shape: 'comeback' }),
    ]
    const rounds: RoundRecord[] = []
    for (let i = 0; i < 4; i++) {
      rounds.push({
        t: 1000 + i,
        mode: 'local',
        outcome: i === 3 ? 'deal_in' : 'win',
        tactics: {
          win: { offered: 2, taken: 2, missed: 0 },
          pong: { offered: 3, taken: 3, missed: 0 },
          chi: { offered: 0, taken: 0, missed: 0 },
          kong: { offered: 0, taken: 0, missed: 0 },
          feedFromOpp: 0,
          hintShown: 0,
          hintFollowed: 0,
          autoDraw: 0,
          autoPass: 0,
        },
      })
    }
    const acc = accuracyByShape(matches, rounds)
    expect(acc.comeback).not.toBeNull()
    expect(acc.collapse).toBeNull()
  })

  it('skill scores need samples', () => {
    expect(computeSkillScores([], []).opening).toBeNull()
  })

  it('favorites and replay views persist', () => {
    const match = m({ t: 9, place: 1, playKind: 'casual' })
    expect(isFavoriteMatch(match)).toBe(false)
    expect(toggleFavoriteMatch(match)).toBe(true)
    expect(isFavoriteMatch(match)).toBe(true)
    expect(toggleFavoriteMatch(match)).toBe(false)

    expect(bumpReplayView(42)).toBe(1)
    expect(bumpReplayView(42)).toBe(2)
    expect(bumpReplayView(7)).toBe(1)
    expect(totalReplayViews()).toBe(3)
  })
})
