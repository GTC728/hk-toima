import { describe, expect, it } from 'vitest'
import type { MatchRecord, RoundRecord } from '../stats'
import { emptyTactics } from '../stats-tactics'
import { aggregateShapes } from '../stats-insights'
import {
  classifyMatchShape,
  midSnapshotIndex,
  performanceRating,
} from '../stats-shape'

describe('classifyMatchShape', () => {
  it('labels comeback and collapse', () => {
    expect(classifyMatchShape(4, 1)).toBe('comeback')
    expect(classifyMatchShape(1, 4)).toBe('collapse')
    expect(classifyMatchShape(1, 2)).toBe('stable_win')
    expect(classifyMatchShape(3, 4)).toBe('stable_loss')
    expect(classifyMatchShape(1, 3)).toBe('collapse')
    expect(classifyMatchShape(4, 2)).toBe('comeback')
  })
})

describe('midSnapshotIndex', () => {
  it('picks middle', () => {
    expect(midSnapshotIndex(1)).toBe(0)
    expect(midSnapshotIndex(4)).toBe(1)
    expect(midSnapshotIndex(5)).toBe(2)
  })
})

describe('performanceRating', () => {
  it('rewards better place vs equal opp', () => {
    const win = performanceRating({
      myRating: 1000,
      oppRatingAvg: 1000,
      place: 1,
    })
    const loss = performanceRating({
      myRating: 1000,
      oppRatingAvg: 1000,
      place: 4,
    })
    expect(win).toBeGreaterThan(1000)
    expect(loss).toBeLessThan(1000)
  })
})

describe('aggregateShapes', () => {
  it('comeback collapse and phase grasp', () => {
    const matches: MatchRecord[] = [
      {
        t: 1,
        place: 1,
        playKind: 'ranked',
        channel: 'online',
        cash: 2200,
        midPlace: 4,
        shape: 'comeback',
        perfRating: 1200,
      },
      {
        t: 2,
        place: 4,
        playKind: 'ranked',
        channel: 'online',
        cash: 800,
        midPlace: 1,
        shape: 'collapse',
        perfRating: 800,
      },
    ]
    const rounds: RoundRecord[] = [
      {
        t: 1,
        mode: 'online',
        outcome: 'win',
        tactics: {
          ...emptyTactics(),
          hintShown: 2,
          hintFollowed: 1,
          win: { offered: 1, taken: 0, missed: 1 },
          byPhase: {
            early: {
              win: { offered: 2, taken: 2, missed: 0 },
              pong: { offered: 0, taken: 0, missed: 0 },
              chi: { offered: 0, taken: 0, missed: 0 },
              kong: { offered: 0, taken: 0, missed: 0 },
            },
          },
        },
      },
    ]
    const a = aggregateShapes(matches, rounds)
    expect(a.comebackRate).toBe(1)
    expect(a.collapseRate).toBe(1)
    expect(a.byShape.comeback.n).toBe(1)
    expect(a.avgPerfRating).toBe(1000)
    expect(a.accuracyByPhase.early).toBe(1)
    expect(a.moveQuality.best).toBe(1)
    expect(a.moveQuality.miss).toBe(1)
  })
})
