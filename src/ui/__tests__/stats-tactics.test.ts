import { describe, expect, it } from 'vitest'
import { SeatTacticsTracker } from '../stats-tactics'
import { aggregateTactics, type RoundRecord } from '../stats'

describe('SeatTacticsTracker', () => {
  it('counts offered taken missed for pong window', () => {
    const tr = new SeatTacticsTracker()
    tr.observe([{ type: 'pong' }, { type: 'pass' }], 'claim:man-1:0')
    expect(tr.snap.pong.offered).toBe(1)
    expect(tr.snap.feedFromOpp).toBe(1)
    tr.onAction({ type: 'pong' })
    expect(tr.snap.pong.taken).toBe(1)
    expect(tr.snap.pong.missed).toBe(0)
  })

  it('marks miss on pass', () => {
    const tr = new SeatTacticsTracker()
    tr.observe([{ type: 'win' }, { type: 'pass' }], 'claim:pin-5:1')
    tr.onAction({ type: 'pass' })
    expect(tr.snap.win.missed).toBe(1)
    expect(tr.snap.win.taken).toBe(0)
  })

  it('tracks hint follow', () => {
    const tr = new SeatTacticsTracker()
    tr.noteHint('man-3', 'man-3')
    tr.noteHint('man-3', 'sou-1')
    expect(tr.snap.hintShown).toBe(2)
    expect(tr.snap.hintFollowed).toBe(1)
  })
})

describe('aggregateTactics', () => {
  it('sums grasp and closed rates', () => {
    const rounds: RoundRecord[] = [
      {
        t: 1,
        mode: 'local',
        outcome: 'win',
        tactics: {
          win: { offered: 2, taken: 1, missed: 1 },
          pong: { offered: 1, taken: 1, missed: 0 },
          chi: { offered: 0, taken: 0, missed: 0 },
          kong: { offered: 0, taken: 0, missed: 0 },
          feedFromOpp: 3,
          hintShown: 4,
          hintFollowed: 2,
          autoDraw: 1,
          autoPass: 0,
          handClosed: true,
          meldChi: 0,
          meldPong: 0,
          meldKong: 0,
        },
      },
      {
        t: 2,
        mode: 'local',
        outcome: 'deal_in',
        tactics: {
          win: { offered: 0, taken: 0, missed: 0 },
          pong: { offered: 1, taken: 0, missed: 1 },
          chi: { offered: 0, taken: 0, missed: 0 },
          kong: { offered: 0, taken: 0, missed: 0 },
          feedFromOpp: 1,
          hintShown: 0,
          hintFollowed: 0,
          autoDraw: 0,
          autoPass: 2,
          handClosed: false,
          meldChi: 1,
          meldPong: 1,
          meldKong: 0,
        },
      },
    ]
    const a = aggregateTactics(rounds)
    expect(a.win.offered).toBe(2)
    expect(a.winRate).toBeCloseTo(0.5)
    expect(a.pong.offered).toBe(2)
    expect(a.pong.taken).toBe(1)
    expect(a.feedFromOpp).toBe(4)
    expect(a.hintFollowRate).toBeCloseTo(0.5)
    expect(a.closed.n).toBe(1)
    expect(a.closed.wins).toBe(1)
    expect(a.open.n).toBe(1)
    expect(a.meldChi).toBe(1)
    expect(a.autoPass).toBe(2)
  })
})
