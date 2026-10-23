import { describe, expect, it } from 'vitest'
import { applyAction, createGame } from '../game'
import type { TileId } from '../types'

describe('叮', () => {
  it('after ding, must discard drawn tile', () => {
    let g = createGame({ seed: 11 })
    g.currentSeat = 0
    g.phase = 'playing'
    g.justDrawn = 'man-9'
    g.players[0].hand = [
      'man-1', 'man-2', 'man-3',
      'man-4', 'man-5', 'man-6',
      'pin-1', 'pin-2', 'pin-3',
      'pin-4', 'pin-5', 'pin-6',
      'sou-1', 'sou-2',
      'wind-east',
      'man-9',
    ]
    g.players[0].ding = {
      kind: 'normal',
      markerDiscard: 'sou-3',
      ippatsuActive: true,
      guoshuiLocked: false,
    }
    expect(() =>
      applyAction(g, { type: 'discard', tile: 'man-1' }, 0),
    ).toThrow(/摸乜打乜/)
    const ok = applyAction(g, { type: 'discard', tile: 'man-9' }, 0)
    expect(ok.phase).toBe('claim_window')
  })

  it('ding blocks chi/pong/kong', () => {
    let g = createGame({ seed: 12 })
    g.phase = 'claim_window'
    g.pendingDiscard = {
      seat: 0,
      tile: 'man-5',
      awaiting: [1, 2, 3],
      claims: [],
    }
    g.players[1].ding = {
      kind: 'normal',
      ippatsuActive: false,
      guoshuiLocked: false,
    }
    g.players[1].hand = ['man-5', 'man-5', 'man-3', 'man-4', ...Array(11).fill('pin-1')] as TileId[]
    expect(() => applyAction(g, { type: 'pong' }, 1)).toThrow(/叮/)
  })
})
