import { describe, expect, it } from 'vitest'
import { calculateFans, getFanMeta } from '../fan'
import type { TileId } from '../types'

describe('叮／叮摸', () => {
  it('表定叮 5、叮摸 5', () => {
    expect(getFanMeta('ding').value).toBe(5)
    expect(getFanMeta('dingmo').value).toBe(5)
  })

  it('十六不搭＋叮＋自摸 → 有叮同叮摸（唔被吞光）', () => {
    const hand: TileId[] = [
      'man-1',
      'man-4',
      'man-7',
      'pin-2',
      'pin-5',
      'pin-8',
      'sou-3',
      'sou-6',
      'sou-9',
      'wind-east',
      'wind-west',
      'wind-north',
      'dragon-zhong',
      'dragon-fa',
      'dragon-bai',
      'wind-south',
    ]
    const fans = calculateFans({
      hand,
      melds: [],
      flowers: ['flower-bamboo', 'flower-orchid'],
      winTile: 'wind-south',
      winType: 'tsumo',
      ding: { kind: 'normal', ippatsuActive: false, guoshuiLocked: false },
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
      windRound: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('shiliubuda')
    expect(ids).toContain('ding')
    expect(ids).toContain('dingmo')
    expect(ids).not.toContain('zimo')
    expect(ids).not.toContain('menqing_ding')
    expect(ids).not.toContain('qimenqi')
    expect(ids).not.toContain('wumenqi')
    expect(fans.find((f) => f.id === 'ding')!.value).toBe(5)
    expect(fans.find((f) => f.id === 'dingmo')!.value).toBe(5)
  })

  it('門清叮時唔另計普通叮；出銃唔計叮摸', () => {
    const hand: TileId[] = [
      'man-1',
      'man-2',
      'man-3',
      'man-4',
      'man-5',
      'man-6',
      'pin-1',
      'pin-2',
      'pin-3',
      'sou-1',
      'sou-2',
      'sou-3',
      'pin-5',
      'pin-5',
      'sou-5',
      'sou-5',
    ]
    const fans = calculateFans({
      hand,
      melds: [],
      flowers: ['flower-spring'],
      winTile: 'sou-5',
      winType: 'ron',
      ding: { kind: 'normal', ippatsuActive: false, guoshuiLocked: false },
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('menqing_ding')
    expect(ids).not.toContain('ding')
    expect(ids).not.toContain('dingmo')
  })
})
