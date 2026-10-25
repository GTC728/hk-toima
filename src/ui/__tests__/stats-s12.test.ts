import { describe, expect, it } from 'vitest'
import type { ActionLogEntry } from '../../engine'
import type { MatchRecord, RoundRecord } from '../stats'
import {
  aggregateDanger,
  aggregateLeaves,
  aggregateOpenings,
  countPassRegrets,
  isBookOpeningTile,
  turnBandFromDiscards,
} from '../stats-s12'

function m(
  partial: Partial<MatchRecord> & Pick<MatchRecord, 't' | 'place' | 'playKind'>,
): MatchRecord {
  return { channel: 'local', cash: 1000, ...partial }
}

describe('stats-s12', () => {
  it('book opening tiles', () => {
    expect(isBookOpeningTile('wind-east')).toBe(true)
    expect(isBookOpeningTile('man-1')).toBe(true)
    expect(isBookOpeningTile('man-5')).toBe(false)
  })

  it('turn bands', () => {
    expect(turnBandFromDiscards(0)).toBe('0-3')
    expect(turnBandFromDiscards(5)).toBe('4-7')
    expect(turnBandFromDiscards(20)).toBe('12+')
  })

  it('pass regrets from log', () => {
    const log: ActionLogEntry[] = [
      { t: 1, seat: 0, action: { type: 'start' }, note: 'createGame' },
      { t: 2, seat: 1, action: { type: 'discard', tile: 'man-1' } },
      { t: 3, seat: 0, action: { type: 'pass' } },
      { t: 4, seat: 2, action: { type: 'pong' } },
    ]
    expect(countPassRegrets(log, 0)).toBe(1)
    expect(countPassRegrets(log, 2)).toBe(0)
  })

  it('openings and danger', () => {
    const rounds: RoundRecord[] = [
      {
        t: 1,
        mode: 'local',
        outcome: 'win',
        wasDealer: true,
        prefs: {
          firstDiscardTile: 'wind-east',
          discards: { man: 0, pin: 0, sou: 0, honor: 1 },
          discardTerminal: 0,
          ding: false,
          flowerCount: 0,
        },
      },
      {
        t: 2,
        mode: 'local',
        outcome: 'deal_in',
        wasDealer: false,
        reachedTenpai: true,
        passRegret: 2,
        prefs: {
          firstDiscardTile: 'man-5',
          discards: { man: 1, pin: 0, sou: 0, honor: 0 },
          discardTerminal: 0,
          ding: false,
          flowerCount: 0,
        },
      },
    ]
    const o = aggregateOpenings(rounds)
    expect(o.bookFollowRate).toBeCloseTo(0.5)
    expect(o.dealerTop[0]?.tile).toBe('wind-east')
    const d = aggregateDanger(rounds)
    expect(d.tenpaiDealIn).toBe(1)
    expect(d.passRegrets).toBe(2)
  })

  it('leave aggregates', () => {
    const a = aggregateLeaves([
      m({ t: 1, place: 4, playKind: 'private', endReason: 'you_left' }),
      m({ t: 2, place: 1, playKind: 'private', endReason: 'opp_left' }),
    ])
    expect(a.youLeft).toBe(1)
    expect(a.oppLeftWins).toBe(1)
  })
})
