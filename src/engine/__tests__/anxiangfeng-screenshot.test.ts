import { describe, expect, it } from 'vitest'
import { calculateFans } from '../fan'
import type { Meld, TileId } from '../types'
import {
  assignMeldHighlightFlags,
  fanHighlightSkipsChiMelds,
  tilesForFanHighlight,
} from '../../ui/settlementHighlight'

describe('暗相逢高亮唔搶明順', () => {
  // 明 678索 + 暗 678萬 + 暗 678索（糊7）
  const melds: Meld[] = [
    {
      kind: 'chi',
      tiles: ['sou-6', 'sou-7', 'sou-8'],
      fromSeat: 0,
      claimedTile: 'sou-6',
    },
    {
      kind: 'pong',
      tiles: ['dragon-fa', 'dragon-fa', 'dragon-fa'],
      fromSeat: 0,
      claimedTile: 'dragon-fa',
    },
    {
      kind: 'pong',
      tiles: ['wind-west', 'wind-west', 'wind-west'],
      fromSeat: 0,
      claimedTile: 'wind-west',
    },
  ]
  const hand: TileId[] = [
    'wind-south',
    'wind-south',
    'man-6',
    'man-7',
    'man-8',
    'sou-6',
    'sou-8',
  ]

  it('計得暗相逢', () => {
    const fans = calculateFans({
      hand,
      melds,
      flowers: [],
      winTile: 'sou-7',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 2,
      windRound: 2,
      discardsThisRound: 20,
    })
    expect(fans.map((f) => f.id)).toContain('anxiangfeng')
  })

  it('高亮唔亮明 678；亮手／糊暗順', () => {
    const counts = tilesForFanHighlight('anxiangfeng', {
      hand,
      melds,
      flowers: [],
      winTile: 'sou-7',
      winType: 'ron',
    })
    expect(counts.get('man-6')).toBe(1)
    expect(counts.get('sou-6')).toBe(1)

    const { meldFlags, left } = assignMeldHighlightFlags(melds, counts, {
      skipChi: fanHighlightSkipsChiMelds('anxiangfeng'),
    })
    expect(meldFlags[0]!.every(Boolean)).toBe(false) // 明順唔亮

    // 手／糊扣完應亮暗索同暗萬
    let winSelected = false
    if ((left.get('sou-7') ?? 0) > 0) {
      left.set('sou-7', (left.get('sou-7') ?? 0) - 1)
      winSelected = true
    }
    const mainFlags = hand.map((t) => {
      const n = left.get(t) ?? 0
      if (n > 0) {
        left.set(t, n - 1)
        return true
      }
      return false
    })
    expect(winSelected).toBe(true)
    expect(mainFlags[2]).toBe(true) // man-6
    expect(mainFlags[5]).toBe(true) // sou-6
  })
})
