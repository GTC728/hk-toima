import { describe, expect, it } from 'vitest'
import type { CareerStats, MatchRecord } from '../stats'
import {
  aggregateRulesCombos,
  aggregateTimeoutOutcomes,
  firstPlayAt,
  formatFirstPlay,
} from '../stats-s11'

function m(
  partial: Partial<MatchRecord> & Pick<MatchRecord, 't' | 'place' | 'playKind'>,
): MatchRecord {
  return { channel: 'local', cash: 1000, ...partial }
}

describe('stats-s11', () => {
  it('first play from matches or rounds', () => {
    const stats: CareerStats = {
      rounds: 1,
      wins: 0,
      tsumo: 0,
      ron: 0,
      dealIns: 0,
      draws: 0,
      totalFan: 0,
      netAmount: 0,
      recent: [{ t: 100, mode: 'local', outcome: 'draw' }],
      matches: [m({ t: 200, place: 1, playKind: 'ai' })],
    }
    expect(firstPlayAt(stats)).toBe(100)
    expect(formatFirstPlay(null)).toBe('—')
  })

  it('timeout outcome proxies', () => {
    const a = aggregateTimeoutOutcomes([
      m({
        t: 1,
        place: 1,
        playKind: 'private',
        timeoutsSelf: 0,
        timeoutsOpp: 3,
      }),
      m({
        t: 2,
        place: 4,
        playKind: 'private',
        timeoutsSelf: 5,
        timeoutsOpp: 1,
      }),
      m({ t: 3, place: 2, playKind: 'ai' }),
    ])
    expect(a.wonByOppTimeout).toBe(1)
    expect(a.lostBySelfTimeout).toBe(1)
    expect(a.timeoutsOppSum).toBe(4)
    expect(a.sampleN).toBe(2)
  })

  it('rules combo win rates', () => {
    const rows = aggregateRulesCombos([
      m({
        t: 1,
        place: 1,
        playKind: 'ai',
        rulesBase: 3,
        rulesFanValue: 100,
        turnTimeoutSec: 20,
      }),
      m({
        t: 2,
        place: 4,
        playKind: 'ai',
        rulesBase: 3,
        rulesFanValue: 100,
        turnTimeoutSec: 20,
      }),
      m({
        t: 3,
        place: 1,
        playKind: 'ai',
        rulesBase: 5,
        rulesFanValue: 50,
        turnTimeoutSec: 12,
      }),
    ])
    expect(rows[0]!.n).toBe(2)
    expect(rows[0]!.rate).toBeCloseTo(0.5)
    expect(rows).toHaveLength(2)
  })
})
