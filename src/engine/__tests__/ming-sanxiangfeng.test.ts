import { describe, expect, it } from 'vitest'
import { calculateFans } from '../fan'
import type { Meld, TileId } from '../types'

describe('明三相逢：明＋兩暗同數順', () => {
  it('明345萬＋暗345筒＋暗345索 → 明三相逢，唔只暗相逢', () => {
    const melds: Meld[] = [
      {
        kind: 'chi',
        tiles: ['man-3', 'man-4', 'man-5'],
        fromSeat: 0,
        claimedTile: 'man-5',
      },
      {
        kind: 'pong',
        tiles: ['wind-west', 'wind-west', 'wind-west'],
        fromSeat: 1,
        claimedTile: 'wind-west',
      },
    ]
    // 台牌：兩組副露後手 10＋糊；666索刻＋東眼
    const hand: TileId[] = [
      'pin-3', 'pin-4', 'pin-5',
      'sou-3', 'sou-4', 'sou-5',
      'sou-6', 'sou-6', 'sou-6',
      'wind-east',
    ]
    const fans = calculateFans({
      hand,
      melds,
      flowers: ['flower-summer', 'flower-orchid', 'flower-bamboo'],
      winTile: 'wind-east',
      winType: 'tsumo',
      ding: null,
      isDealer: true,
      consecutiveWins: 0,
      seat: 3,
      windRound: 3,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('mingsanxiangfeng')
    expect(ids).not.toContain('ansanxiangfeng')
    expect(ids).not.toContain('anxiangfeng')
    expect(ids).not.toContain('xiangfeng')
  })
})
