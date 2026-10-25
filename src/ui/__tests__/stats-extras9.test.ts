import { describe, expect, it } from 'vitest'
import type { MatchRecord, RoundRecord } from '../stats'
import {
  aggregateExtras9,
  searchMatches,
  searchRounds,
} from '../stats-extras9'

function m(
  partial: Partial<MatchRecord> & Pick<MatchRecord, 't' | 'place' | 'playKind'>,
): MatchRecord {
  return { channel: 'local', cash: 1000, ...partial }
}

describe('aggregateExtras9', () => {
  it('win rates by kind and deal-in suit', () => {
    const matches = [
      m({ t: 1, place: 1, playKind: 'ai' }),
      m({ t: 2, place: 4, playKind: 'ai' }),
      m({ t: 3, place: 2, playKind: 'ranked' }),
    ]
    const rounds: RoundRecord[] = [
      {
        t: 1,
        mode: 'local',
        outcome: 'deal_in',
        dealInSuit: 'man',
        firstTenpaiPhase: 'mid',
        decisionMsSum: 2000,
        decisionN: 2,
        lowTimeMoves: 1,
        laNet: 10,
        instantBonusNet: -5,
      },
      {
        t: 2,
        mode: 'local',
        outcome: 'draw',
        reachedTenpai: true,
        tenpaiToWinTurns: undefined,
      },
      {
        t: 3,
        mode: 'local',
        outcome: 'win',
        tenpaiToWinTurns: 3,
        firstTenpaiPhase: 'late',
      },
    ]
    const a = aggregateExtras9(matches, rounds)
    expect(a.winRateByKind.ai.n).toBe(2)
    expect(a.winRateByKind.ai.rate).toBeCloseTo(0.5)
    expect(a.dealInBySuit.man).toBe(1)
    expect(a.tenpaiByPhase.mid).toBe(1)
    expect(a.tenpaiByPhase.late).toBe(1)
    expect(a.avgTenpaiToWin).toBe(3)
    expect(a.drawTenpaiRate).toBe(1)
    expect(a.laNetSum).toBe(10)
    expect(a.instantBonusSum).toBe(-5)
    expect(a.avgDecisionMs).toBe(1000)
    expect(a.lowTimeRate).toBeCloseTo(0.5)
  })
})

describe('search', () => {
  it('filters matches and rounds', () => {
    const matches = [
      m({ t: 1, place: 1, playKind: 'ranked', note: '冠軍' }),
      m({ t: 2, place: 4, playKind: 'ai' }),
    ]
    expect(searchMatches(matches, '排位')).toHaveLength(0)
    expect(searchMatches(matches, 'ranked')).toHaveLength(1)
    expect(searchMatches(matches, '冠')).toHaveLength(1)
    const rounds: RoundRecord[] = [
      { t: 1, mode: 'local', outcome: 'win', note: '8番·自摸' },
      { t: 2, mode: 'local', outcome: 'deal_in', note: '出銃' },
    ]
    expect(searchRounds(rounds, '自摸')).toHaveLength(1)
  })
})
