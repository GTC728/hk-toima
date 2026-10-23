import { describe, expect, it } from 'vitest'
import { calculateFans } from '../fan'
import type { Meld, TileId } from '../types'

describe('常見枱表 · 大包細互斥', () => {
  it('七門齊唔再計五門齊', () => {
    const hand: TileId[] = [
      'man-1', 'man-2', 'man-3',
      'pin-4', 'pin-5', 'pin-6',
      'sou-7', 'sou-8', 'sou-9',
      'wind-east', 'wind-east', 'wind-east',
      'dragon-zhong',
    ]
    const melds: Meld[] = [
      {
        kind: 'pong',
        tiles: ['dragon-fa', 'dragon-fa', 'dragon-fa'],
        fromSeat: 1,
        claimedTile: 'dragon-fa',
      },
    ]
    const fans = calculateFans({
      hand,
      melds,
      flowers: [
        'flower-spring',
        'flower-plum',
      ],
      winTile: 'dragon-zhong',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('qimenqi')
    expect(ids).not.toContain('wumenqi')
  })

  it('無字花大平唔再計平胡／無字／無花', () => {
    // 1 副露順＋手內四順／將：平胡；無字無花 → 無字花大平
    const fans = calculateFans({
      hand: [
        'man-1', 'man-2',
        'man-4', 'man-5', 'man-6',
        'pin-1', 'pin-2', 'pin-3',
        'pin-4', 'pin-5', 'pin-6',
        'sou-5', 'sou-5',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['man-7', 'man-8', 'man-9'],
          fromSeat: 0,
          claimedTile: 'man-9',
        },
      ],
      flowers: [],
      winTile: 'man-3',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('wuzihuadaping')
    expect(ids).not.toContain('pinghu')
    expect(ids).not.toContain('wuzi')
    expect(ids).not.toContain('wuhua')
    expect(ids).not.toContain('wuzihua')
  })

  it('半求人唔加自摸', () => {
    const melds: Meld[] = [
      {
        kind: 'pong',
        tiles: ['man-1', 'man-1', 'man-1'],
        fromSeat: 1,
        claimedTile: 'man-1',
      },
      {
        kind: 'pong',
        tiles: ['pin-2', 'pin-2', 'pin-2'],
        fromSeat: 2,
        claimedTile: 'pin-2',
      },
      {
        kind: 'pong',
        tiles: ['sou-3', 'sou-3', 'sou-3'],
        fromSeat: 3,
        claimedTile: 'sou-3',
      },
      {
        kind: 'chi',
        tiles: ['man-4', 'man-5', 'man-6'],
        fromSeat: 0,
        claimedTile: 'man-6',
      },
      {
        kind: 'chi',
        tiles: ['pin-7', 'pin-8', 'pin-9'],
        fromSeat: 1,
        claimedTile: 'pin-9',
      },
    ]
    // hand 唔包糊牌（自摸已 remove）
    const fans = calculateFans({
      hand: ['wind-east'],
      melds,
      flowers: ['flower-summer'],
      winTile: 'wind-east',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 30,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('banqiuren')
    expect(ids).not.toContain('zimo')
  })

  it('缺一門唔再計無字', () => {
    const fans = calculateFans({
      hand: [
        'man-1', 'man-1', 'man-1',
        'man-2', 'man-3', 'man-4',
        'pin-5', 'pin-5', 'pin-5',
        'pin-6', 'pin-7', 'pin-8',
        'pin-9',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['man-5', 'man-6', 'man-7'],
          fromSeat: 0,
          claimedTile: 'man-7',
        },
      ],
      flowers: ['flower-summer'],
      winTile: 'pin-9',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('queimen')
    expect(ids).not.toContain('wuzi')
  })
})
