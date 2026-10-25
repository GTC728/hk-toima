import { describe, expect, it } from 'vitest'
import { calculateFans, getFanMeta } from '../fan'
import { isDuduWait } from '../win-check'
import type { Meld, TileId } from '../types'

describe('獨獨邊張／缺一門無字', () => {
  it('缺一門 5', () => {
    expect(getFanMeta('queimen').value).toBe(5)
  })

  it('邊張 12 聽 3 → 獨獨＋無字＋缺一門', () => {
    const melds: Meld[] = [
      {
        kind: 'pong',
        tiles: ['sou-1', 'sou-1', 'sou-1'],
        fromSeat: 0,
        claimedTile: 'sou-1',
      },
      {
        kind: 'chi',
        tiles: ['sou-6', 'sou-7', 'sou-8'],
        fromSeat: 0,
        claimedTile: 'sou-6',
      },
    ]
    // 12筒聽3；678筒相逢；眼88；456索
    const hand: TileId[] = [
      'pin-1',
      'pin-2',
      'pin-6',
      'pin-7',
      'pin-8',
      'pin-8',
      'pin-8',
      'sou-4',
      'sou-5',
      'sou-6',
    ]
    expect(isDuduWait(hand, melds, 'pin-3')).toBe(true)
    const fans = calculateFans({
      hand,
      melds,
      flowers: ['flower-spring'],
      winTile: 'pin-3',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      windRound: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('dudu')
    expect(ids).toContain('wuzi')
    expect(ids).toContain('queimen')
    expect(fans.find((f) => f.id === 'queimen')!.value).toBe(5)
  })
})
