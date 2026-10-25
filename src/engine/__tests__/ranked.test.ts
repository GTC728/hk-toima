import { describe, expect, it } from 'vitest'
import {
  applyRankedMatch,
  emptyRanked,
  placesByCash,
  ratingDelta,
  ratingWindowMs,
  tierForRating,
} from '../ranked'

describe('placesByCash', () => {
  it('orders by cash high to low', () => {
    expect(placesByCash([100, 300, 200, 50])).toEqual([3, 1, 2, 4])
  })

  it('ties share mid place', () => {
    const p = placesByCash([200, 200, 100, 50])
    expect(p[0]).toBe(p[1])
    expect(p[0]).toBe(2) // avg of 1 and 2 → 1.5 → 2
  })
})

describe('ratingDelta', () => {
  it('first place vs equal rating gains', () => {
    const d = ratingDelta({
      myRating: 1000,
      opponentRatings: [1000, 1000, 1000],
      place: 1,
      rankedGames: 20,
      withAi: false,
    })
    expect(d).toBeGreaterThan(0)
  })

  it('last place loses', () => {
    const d = ratingDelta({
      myRating: 1000,
      opponentRatings: [1000, 1000, 1000],
      place: 4,
      rankedGames: 20,
      withAi: false,
    })
    expect(d).toBeLessThan(0)
  })

  it('AI matches use half K', () => {
    const full = ratingDelta({
      myRating: 1000,
      opponentRatings: [1000, 1000, 1000],
      place: 1,
      rankedGames: 20,
      withAi: false,
    })
    const half = ratingDelta({
      myRating: 1000,
      opponentRatings: [1000, 1000, 1000],
      place: 1,
      rankedGames: 20,
      withAi: true,
    })
    expect(Math.abs(half)).toBeLessThanOrEqual(Math.abs(full))
  })
})

describe('applyRankedMatch', () => {
  it('bumps games and peak', () => {
    const { next, place } = applyRankedMatch(emptyRanked(), {
      myCash: 500,
      allCash: [500, 200, 150, 100],
      mySeat: 0,
      opponentRatings: [1000, 1000, 1000],
      withAi: false,
    })
    expect(place).toBe(1)
    expect(next.rankedGames).toBe(1)
    expect(next.peakRating).toBeGreaterThanOrEqual(next.rating)
  })
})

describe('tierForRating / window', () => {
  it('maps tiers', () => {
    expect(tierForRating(1000).id).toBe('bronze')
    expect(tierForRating(1700).id).toBe('master')
  })

  it('expands window over wait', () => {
    expect(ratingWindowMs(0)).toBe(120)
    expect(ratingWindowMs(12_000)).toBeGreaterThan(120)
  })
})
