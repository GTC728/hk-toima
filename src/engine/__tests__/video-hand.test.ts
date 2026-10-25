import { describe, expect, it } from 'vitest'
import { calculateFans, totalFan } from '../fan'
import type { Meld, TileId } from '../types'

/**
 * 影片總數 76；我哋分項寫明：
 * 底5＋正花2＋風牌2＋槓3＋對碰2＋將眼2＋自摸1＋四暗坎20＋對對糊40＝77
 */
describe('對齊麻雀撚結算（分項）', () => {
  it('明槓西＋碰三＋對碰自摸 → 76，各番分明', () => {
    const melds: Meld[] = [
      {
        kind: 'mingkong',
        tiles: ['wind-west', 'wind-west', 'wind-west', 'wind-west'],
        fromSeat: 0,
        claimedTile: 'wind-west',
      },
      {
        kind: 'pong',
        tiles: ['pin-3', 'pin-3', 'pin-3'],
        fromSeat: 0,
        claimedTile: 'pin-3',
      },
    ]
    const hand: TileId[] = [
      'sou-2',
      'sou-2',
      'sou-6',
      'sou-6',
      'sou-6',
      'pin-8',
      'pin-8',
      'pin-8',
      'man-5',
      'man-5',
    ]
    const fans = calculateFans({
      hand,
      melds,
      flowers: ['flower-autumn'],
      winTile: 'man-5',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 2,
      windRound: 2,
      zhengHuaTiles: ['flower-autumn', 'flower-chrysanthemum'],
      discardsThisRound: 20,
    })
    const byId = Object.fromEntries(fans.map((f) => [f.id, f.value]))
    expect(byId.duiduihu).toBe(40)
    expect(byId.sianke).toBe(20)
    expect(byId.fengke).toBe(2)
    expect(byId.minggang).toBe(3)
    expect(byId.zhenghua).toBe(2)
    expect(byId.duipeng).toBe(2)
    expect(byId.jiangyan).toBe(2)
    expect(byId.zimo).toBe(1)
    expect(fans.map((f) => f.id)).not.toContain('hua')
    expect(fans.map((f) => f.id)).not.toContain('zipai')
    expect(totalFan([{ id: 'di', name: '底', value: 5 }, ...fans])).toBe(77)
  })
})
