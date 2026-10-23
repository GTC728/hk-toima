import { describe, expect, it } from 'vitest'
import { getWaitingTiles, hintDiscard } from '../hints'
import { createGame } from '../game'
import type { TileId } from '../types'
import { waitingTiles } from '../win-check'

function readyHand(pair: TileId): TileId[] {
  return [
    'man-1', 'man-2', 'man-3',
    'man-4', 'man-5',
    'pin-1', 'pin-2', 'pin-3',
    'pin-7', 'pin-8', 'pin-9',
    'sou-1', 'sou-2', 'sou-3',
    pair, pair,
  ]
}

describe('getWaitingTiles', () => {
  it('wraps waitingTiles for a ready hand', () => {
    const hand = readyHand('sou-5')
    const waits = getWaitingTiles(hand, [])
    expect(waits).toEqual(waitingTiles(hand, []))
    expect(waits).toEqual(['man-3', 'man-6'])
  })
})

describe('hintDiscard', () => {
  it('returns a legal discard tile when player must discard', () => {
    const g = createGame({ seed: 42 })
    const seat = g.currentSeat
    expect(g.justDrawn).not.toBeNull()
    const hint = hintDiscard(g, seat)
    expect(hint).not.toBeNull()
    expect(g.players[seat].hand).toContain(hint!)
  })

  it('returns null when seat cannot discard', () => {
    const g = createGame({ seed: 42 })
    const other = ((g.currentSeat + 1) % 4) as 0 | 1 | 2 | 3
    expect(hintDiscard(g, other)).toBeNull()
  })

  it('prefers isolated honors over shape tiles', () => {
    const g = createGame({ seed: 1 })
    const seat = g.currentSeat
    // Force a hand with an orphan wind + strong sequence shape
    g.players[seat].hand = [
      'man-1', 'man-2', 'man-3',
      'man-4', 'man-5', 'man-6',
      'pin-1', 'pin-2', 'pin-3',
      'sou-1', 'sou-2', 'sou-3',
      'pin-7', 'pin-8', 'pin-9',
      'wind-north',
      'wind-east',
    ]
    g.justDrawn = 'wind-east'
    g.mustDiscard = false
    const hint = hintDiscard(g, seat)
    expect(hint === 'wind-north' || hint === 'wind-east').toBe(true)
  })
})
