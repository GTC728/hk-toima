import { describe, expect, it } from 'vitest'
import { calculateFans } from '../fan'
import { isJiaDu } from '../fan-patterns'
import { waitingTiles } from '../win-check'
import type { Meld, TileId } from '../types'

describe('截圖手：假獨＋暗相逢', () => {
  it('多面聽＋中洞食糊 → 假獨', () => {
    const melds: Meld[] = [
      {
        kind: 'chi',
        tiles: ['man-7', 'man-8', 'man-9'],
        fromSeat: 0,
        claimedTile: 'man-9',
      },
      {
        kind: 'chi',
        tiles: ['sou-3', 'sou-4', 'sou-5'],
        fromSeat: 0,
        claimedTile: 'sou-5',
      },
    ]
    const hand: TileId[] = [
      'man-5',
      'man-6',
      'man-7',
      'sou-3',
      'sou-3',
      'pin-6',
      'pin-7',
      'pin-7',
      'pin-8',
      'pin-9',
    ]
    expect(waitingTiles(hand, melds).length).toBeGreaterThan(1)
    expect(isJiaDu(hand, melds, 'pin-8')).toBe(true)
    const fans = calculateFans({
      hand,
      melds,
      flowers: ['flower-plum'],
      winTile: 'pin-8',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
      windRound: 0,
      discardsThisRound: 20,
    })
    expect(fans.map((f) => f.id)).toContain('jiadu')
  })

  it('明般高+相逢+暗相逢可並計', () => {
    const melds: Meld[] = [
      {
        kind: 'chi',
        tiles: ['man-4', 'man-5', 'man-6'],
        fromSeat: 0,
        claimedTile: 'man-6',
      },
      {
        kind: 'chi',
        tiles: ['sou-4', 'sou-5', 'sou-6'],
        fromSeat: 0,
        claimedTile: 'sou-6',
      },
    ]
    const hand: TileId[] = [
      'man-4',
      'man-5',
      'man-6',
      'pin-5',
      'pin-7',
      'sou-5',
      'sou-6',
      'sou-7',
      'pin-8',
      'pin-8',
    ]
    const fans = calculateFans({
      hand,
      melds,
      flowers: [],
      winTile: 'pin-6',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('mingbangao')
    expect(ids).toContain('xiangfeng')
    expect(ids).toContain('anxiangfeng')
  })
})
