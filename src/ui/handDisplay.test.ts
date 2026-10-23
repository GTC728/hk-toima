import { describe, expect, it } from 'vitest'
import { handForDisplay } from './handDisplay'
import type { TileId } from '../engine'

describe('handForDisplay', () => {
  it('puts justDrawn at the right end', () => {
    const hand: TileId[] = ['man-3', 'man-1', 'pin-5', 'man-1']
    expect(handForDisplay(hand, 'pin-5')).toEqual([
      'man-1',
      'man-1',
      'man-3',
      'pin-5',
    ])
  })

  it('sorts fully when no justDrawn', () => {
    const hand: TileId[] = ['sou-9', 'man-2', 'man-1']
    expect(handForDisplay(hand, null)).toEqual(['man-1', 'man-2', 'sou-9'])
  })
})
