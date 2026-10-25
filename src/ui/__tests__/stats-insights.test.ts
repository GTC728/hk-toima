import { describe, expect, it } from 'vitest'
import type { MatchRecord, RoundRecord } from '../stats'
import { emptyTactics } from '../stats-tactics'
import {
  aggregateOppRatingBands,
  buildMatchTimeline,
  comparePeriods,
  computeAccuracyV1,
  ratingBandId,
} from '../stats-insights'

function match(
  partial: Partial<MatchRecord> & Pick<MatchRecord, 't' | 'place' | 'playKind'>,
): MatchRecord {
  return { channel: 'local', cash: 1000, ...partial }
}

describe('ratingBandId', () => {
  it('buckets diffs', () => {
    expect(ratingBandId(-200)).toBe('much_lower')
    expect(ratingBandId(-100)).toBe('lower')
    expect(ratingBandId(0)).toBe('even')
    expect(ratingBandId(100)).toBe('higher')
    expect(ratingBandId(200)).toBe('much_higher')
  })
})

describe('buildMatchTimeline', () => {
  it('groups by day', () => {
    const d0 = new Date(2024, 5, 10, 12).getTime()
    const d1 = new Date(2024, 5, 11, 12).getTime()
    const list = [
      match({ t: d1, place: 1, playKind: 'ranked', ratingAfter: 1010 }),
      match({ t: d0, place: 4, playKind: 'ranked', ratingAfter: 1000 }),
      match({ t: d0 + 1000, place: 2, playKind: 'ranked' }),
    ]
    const tl = buildMatchTimeline(list)
    expect(tl).toHaveLength(2)
    expect(tl[0]!.games).toBe(2)
    expect(tl[1]!.games).toBe(1)
    expect(tl[1]!.rating).toBe(1010)
  })
})

describe('computeAccuracyV1', () => {
  it('returns null without samples', () => {
    expect(computeAccuracyV1([])).toBeNull()
  })

  it('weights grasp and deal-in', () => {
    const base = emptyTactics()
    const rounds: RoundRecord[] = []
    for (let i = 0; i < 4; i++) {
      rounds.push({
        t: i,
        mode: 'local',
        outcome: i === 3 ? 'deal_in' : 'win',
        tactics: {
          ...base,
          win: { offered: 2, taken: 2, missed: 0 },
          pong: { offered: 3, taken: 3, missed: 0 },
        },
      })
    }
    // bump offered totals across rounds
    const a = computeAccuracyV1(rounds)
    expect(a).not.toBeNull()
    expect(a!).toBeGreaterThan(0.7)
  })
})

describe('comparePeriods', () => {
  it('diffs current vs previous window', () => {
    const now = new Date(2024, 5, 30, 12).getTime()
    const matches = [
      match({ t: now - 2 * 86400000, place: 1, playKind: 'ai' }),
      match({ t: now - 40 * 86400000, place: 4, playKind: 'ai' }),
    ]
    const c = comparePeriods(matches, [], {
      play: 'all',
      range: '30',
      now,
    })
    expect(c).not.toBeNull()
    expect(c!.current.games).toBe(1)
    expect(c!.previous.games).toBe(1)
    expect(c!.deltaGames).toBe(0)
  })
})

describe('aggregateOppRatingBands', () => {
  it('counts by band', () => {
    const matches = [
      match({
        t: 1,
        place: 1,
        playKind: 'ranked',
        myRatingBefore: 1000,
        oppRatingAvg: 1000,
      }),
      match({
        t: 2,
        place: 4,
        playKind: 'ranked',
        myRatingBefore: 1000,
        oppRatingAvg: 1200,
      }),
    ]
    const bands = aggregateOppRatingBands(matches)
    const even = bands.find((b) => b.id === 'even')!
    const higher = bands.find((b) => b.id === 'much_higher')!
    expect(even.n).toBe(1)
    expect(even.wins).toBe(1)
    expect(higher.n).toBe(1)
  })
})
