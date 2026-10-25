import { describe, expect, it } from 'vitest'
import { calculateFans, checkMenqing } from '../fan'
import type { Meld, TileId } from '../types'

describe('五暗坎片例番型', () => {
  it('槓唔破門清', () => {
    const melds: Meld[] = [
      {
        kind: 'mingkong',
        tiles: ['dragon-zhong', 'dragon-zhong', 'dragon-zhong', 'dragon-zhong'],
        fromSeat: 0,
        claimedTile: 'dragon-zhong',
      },
      {
        kind: 'ankong',
        tiles: ['sou-2', 'sou-2', 'sou-2', 'sou-2'],
      },
      {
        kind: 'mingkong',
        tiles: ['wind-east', 'wind-east', 'wind-east', 'wind-east'],
        fromSeat: 1,
        claimedTile: 'wind-east',
      },
      {
        kind: 'mingkong',
        tiles: ['man-2', 'man-2', 'man-2', 'man-2'],
        fromSeat: 2,
        claimedTile: 'man-2',
      },
    ]
    expect(checkMenqing(melds)).toBe(true)
  })

  it('三明槓＋暗槓＋自摸對碰 → 五暗坎、對對、門清、門清自摸、槓摸', () => {
    const melds: Meld[] = [
      {
        kind: 'mingkong',
        tiles: ['dragon-zhong', 'dragon-zhong', 'dragon-zhong', 'dragon-zhong'],
        fromSeat: 0,
        claimedTile: 'dragon-zhong',
      },
      {
        kind: 'ankong',
        tiles: ['sou-2', 'sou-2', 'sou-2', 'sou-2'],
      },
      {
        kind: 'mingkong',
        tiles: ['wind-east', 'wind-east', 'wind-east', 'wind-east'],
        fromSeat: 1,
        claimedTile: 'wind-east',
      },
      {
        kind: 'mingkong',
        tiles: ['man-2', 'man-2', 'man-2', 'man-2'],
        fromSeat: 2,
        claimedTile: 'man-2',
      },
    ]
    const hand: TileId[] = ['sou-1', 'sou-1', 'pin-2', 'pin-2']
    const fans = calculateFans({
      hand,
      melds,
      flowers: ['flower-plum'],
      winTile: 'pin-2',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 3,
      windRound: 3,
      discardsThisRound: 20,
      kongDrawChain: 3,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('wuanake')
    expect(ids).toContain('duiduihu')
    expect(ids).toContain('menqing')
    expect(ids).toContain('menqing_zimo')
    expect(ids).not.toContain('zimo')
    expect(ids).toContain('minggang')
    expect(ids).toContain('angang')
    expect(ids).toContain('gangmo')
    expect(ids).toContain('wumenqi')
    expect(ids).toContain('duipeng')
  })
})
