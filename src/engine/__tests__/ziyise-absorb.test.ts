import { describe, expect, it } from 'vitest'
import { calculateFans } from '../fan'
import type { Meld, TileId } from '../types'

describe('字一色唔叠無關番', () => {
  it('全字：有字一色／小四喜／三暗刻／對碰；唔要混滿庭芳／混老頭／對對／風三元', () => {
    const melds: Meld[] = [
      {
        kind: 'pong',
        tiles: ['wind-west', 'wind-west', 'wind-west'],
        fromSeat: 0,
        claimedTile: 'wind-west',
      },
      {
        kind: 'pong',
        tiles: ['dragon-fa', 'dragon-fa', 'dragon-fa'],
        fromSeat: 1,
        claimedTile: 'dragon-fa',
      },
    ]
    // 兩副露後手 10：東／南暗刻、北眼、中對碰聽
    const hand: TileId[] = [
      'wind-east', 'wind-east', 'wind-east',
      'wind-south', 'wind-south', 'wind-south',
      'wind-north', 'wind-north',
      'dragon-zhong', 'dragon-zhong',
    ]
    const fans = calculateFans({
      hand,
      melds,
      flowers: ['flower-winter', 'flower-orchid'],
      winTile: 'dragon-zhong',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
      windRound: 2,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('ziyise')
    expect(ids).toContain('xiaosixi')
    expect(ids).toContain('sananke')
    expect(ids).toContain('duipeng')
    expect(ids).toContain('zimo')
    expect(ids).not.toContain('hunmantingfang')
    expect(ids).not.toContain('mantingfang')
    expect(ids).not.toContain('hunlaotou')
    expect(ids).not.toContain('hundaiyao')
    expect(ids).not.toContain('duiduihu')
    expect(ids).not.toContain('fengke')
    expect(ids).not.toContain('sanyuanpai')
  })
})
