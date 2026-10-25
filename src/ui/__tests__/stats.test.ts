import { describe, expect, it } from 'vitest'
import type { ActionLogEntry } from '../../engine'
import {
  aggregateMatches,
  aggregatePace,
  aggregateResults,
  filterMatches,
  firstMeldTurnFromLog,
  phaseFromWall,
  SHORT_MATCH_SEC,
  type MatchRecord,
  type RoundRecord,
} from '../stats'

function m(
  partial: Partial<MatchRecord> & Pick<MatchRecord, 't' | 'place' | 'playKind'>,
): MatchRecord {
  return {
    channel: 'local',
    cash: 1000,
    ...partial,
  }
}

describe('filterMatches', () => {
  const now = 1_700_000_000_000
  const list = [
    m({ t: now - 2 * 86400000, place: 1, playKind: 'ranked' }),
    m({ t: now - 40 * 86400000, place: 4, playKind: 'ai' }),
    m({ t: now - 1 * 86400000, place: 2, playKind: 'ai' }),
  ]

  it('filters by play kind', () => {
    expect(filterMatches(list, { play: 'ai', range: 'all', now })).toHaveLength(
      2,
    )
  })

  it('filters by date range', () => {
    expect(filterMatches(list, { play: 'all', range: '7', now })).toHaveLength(
      2,
    )
    expect(filterMatches(list, { play: 'all', range: '30', now })).toHaveLength(
      2,
    )
  })
})

describe('aggregateMatches', () => {
  it('computes win rate and streaks', () => {
    const list = [
      m({ t: 3, place: 1, playKind: 'ai' }),
      m({ t: 2, place: 2, playKind: 'ai' }),
      m({ t: 1, place: 4, playKind: 'ai' }),
    ]
    const a = aggregateMatches(list)
    expect(a.matches).toBe(3)
    expect(a.wins).toBe(2)
    expect(a.winRate).toBeCloseTo(2 / 3)
    expect(a.currentStreak).toEqual({ kind: 'win', n: 2 })
    expect(a.bestWinStreak).toBe(2)
    expect(a.bestLossStreak).toBe(1)
    expect(a.byKind.ai).toBe(3)
  })
})

describe('aggregateResults', () => {
  it('place distribution and dealer rates', () => {
    const matches = [
      m({
        t: 2,
        place: 1,
        playKind: 'ai',
        vsAi: true,
        aiPersonas: ['attack'],
        timeoutsSelf: 2,
      }),
      m({
        t: 1,
        place: 3,
        playKind: 'private',
        vsAi: false,
        humanOpponents: 3,
      }),
    ]
    const rounds: RoundRecord[] = [
      {
        t: 1,
        mode: 'local',
        outcome: 'win',
        wasDealer: true,
        seat: 0,
      },
      {
        t: 2,
        mode: 'local',
        outcome: 'deal_in',
        wasDealer: false,
        seat: 1,
      },
      {
        t: 3,
        mode: 'local',
        outcome: 'win',
        wasDealer: false,
        seat: 1,
      },
    ]
    const r = aggregateResults(matches, rounds)
    expect(r.placeCounts[1]).toBe(1)
    expect(r.placeCounts[3]).toBe(1)
    expect(r.avgPlace).toBe(2)
    expect(r.dealer.n).toBe(1)
    expect(r.dealer.wins).toBe(1)
    expect(r.nonDealer.wins).toBe(1)
    expect(r.byWind[1]?.wins).toBe(1)
    expect(r.timeoutsSelf).toBe(2)
    expect(r.vsAi.n).toBe(1)
    expect(r.vsHuman.n).toBe(1)
    expect(r.byPersona.attack.n).toBe(1)
  })
})

describe('phaseFromWall', () => {
  it('maps early mid late', () => {
    expect(phaseFromWall(41)).toBe('early')
    expect(phaseFromWall(40)).toBe('mid')
    expect(phaseFromWall(17)).toBe('mid')
    expect(phaseFromWall(16)).toBe('late')
  })
})

describe('firstMeldTurnFromLog', () => {
  it('counts discards before first meld in round', () => {
    const log: ActionLogEntry[] = [
      { t: 1, seat: null, action: { type: 'start' }, note: 'createGame' },
      { t: 2, seat: 0, action: { type: 'discard', tile: 'man-1' } },
      { t: 3, seat: 1, action: { type: 'discard', tile: 'man-2' } },
      { t: 4, seat: 0, action: { type: 'pong' } },
    ]
    expect(firstMeldTurnFromLog(log, 0)).toBe(1)
  })
})

describe('aggregatePace', () => {
  it('phase wall short-long and tod', () => {
    const mondayMorning = new Date(2024, 0, 1, 9, 0, 0).getTime() // Mon
    const matches = [
      m({
        t: mondayMorning,
        place: 1,
        playKind: 'ai',
        durationSec: 5 * 60,
      }),
      m({
        t: mondayMorning + 86400000,
        place: 4,
        playKind: 'ai',
        durationSec: SHORT_MATCH_SEC + 60,
      }),
    ]
    const rounds: RoundRecord[] = [
      {
        t: 1,
        mode: 'local',
        outcome: 'win',
        wallRemaining: 50,
        endPhase: 'early',
        firstTenpaiTurn: 4,
        firstMeldTurn: 2,
        reachedTenpai: true,
      },
      {
        t: 2,
        mode: 'local',
        outcome: 'draw',
        wallRemaining: 10,
        endPhase: 'late',
        reachedTenpai: false,
      },
    ]
    const p = aggregatePace(matches, rounds)
    expect(p.byEndPhase.early.n).toBe(1)
    expect(p.byEndPhase.early.wins).toBe(1)
    expect(p.byEndPhase.late.n).toBe(1)
    expect(p.avgWallAtWin).toBe(50)
    expect(p.avgFirstTenpaiTurn).toBe(4)
    expect(p.avgFirstMeldTurn).toBe(2)
    expect(p.tenpaiRate).toBeCloseTo(0.5)
    expect(p.short.n).toBe(1)
    expect(p.short.wins).toBe(1)
    expect(p.long.n).toBe(1)
    expect(p.byTod.morning.n).toBe(2)
    expect(p.byWeekday[1]?.n).toBe(1) // Mon
  })
})
