import { describe, expect, it } from 'vitest'
import { applyAction, createGame, getPublicView } from '../game'

describe('getPublicView actionLog / reveal', () => {
  it('includes seed and actionLog', () => {
    const g = createGame({ seed: 42 })
    const pub = getPublicView(g)
    expect(pub.seed).toBe(42)
    expect(pub.actionLog.length).toBeGreaterThan(0)
    expect(pub.actionLog[0]?.action).toEqual({ type: 'start' })
    expect(pub.revealedHands).toBeUndefined()
  })

  it('reveals hands at round_over', () => {
    let g = createGame({ seed: 43 })
    g.phase = 'round_over'
    g.lastResult = {
      kind: 'draw',
      wins: [],
      nextDealer: g.dealer,
      nextConsecutiveWins: g.consecutiveWins,
    }
    const pub = getPublicView(g)
    expect(pub.revealedHands).toHaveLength(4)
    expect(pub.revealedHands![0]!.length).toBe(g.players[0]!.hand.length)
  })

  it('appends discard to actionLog visible in public view', () => {
    let g = createGame({ seed: 44 })
    const seat = g.currentSeat
    const tile = g.justDrawn!
    g = applyAction(g, { type: 'discard', tile }, seat)
    const pub = getPublicView(g)
    expect(pub.actionLog.at(-1)?.action).toEqual({ type: 'discard', tile })
  })
})
