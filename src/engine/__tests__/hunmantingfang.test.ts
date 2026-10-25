import { describe, expect, it } from 'vitest'
import { calculateFans, getFanMeta } from '../fan'
import type { Meld, TileId } from '../types'

describe('混滿庭芳', () => {
  it('表定每數 15', () => {
    expect(getFanMeta('hunmantingfang').value).toBe(15)
  })

  it('7／8 合資格 → 兩條各 15（唔係 ×2）', () => {
    const melds: Meld[] = [
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
      'man-6',
      'man-7',
      'man-8',
      'pin-6',
      'pin-7',
      'pin-8',
      'sou-7',
      'sou-8',
      'wind-south',
      'wind-south',
    ]
    const fans = calculateFans({
      hand,
      melds,
      flowers: [],
      winTile: 'sou-9',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 2,
      windRound: 2,
      discardsThisRound: 20,
    })
    const hs = fans.filter((f) => f.id === 'hunmantingfang')
    expect(hs).toHaveLength(2)
    expect(hs.map((f) => f.instance).sort()).toEqual(['7', '8'])
    expect(hs.every((f) => f.value === 15)).toBe(true)
    expect(hs.find((f) => f.instance === '7')!.name).toBe('混滿庭芳·7')
    expect(hs.find((f) => f.instance === '8')!.name).toBe('混滿庭芳·8')
    expect(fans.map((f) => f.id)).not.toContain('hundaixyz')
  })
})
