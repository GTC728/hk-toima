import { describe, expect, it } from 'vitest'
import { calculateFans } from '../fan'
import type { Meld, TileId } from '../types'

describe('出銃暗刻／混老頭缺五', () => {
  it('出銃對碰＋一暗槓 → 唔計兩暗刻；混老頭吞缺五', () => {
    const melds: Meld[] = [
      {
        kind: 'pong',
        tiles: ['wind-east', 'wind-east', 'wind-east'],
        fromSeat: 0,
        claimedTile: 'wind-east',
      },
      {
        kind: 'pong',
        tiles: ['dragon-bai', 'dragon-bai', 'dragon-bai'],
        fromSeat: 1,
        claimedTile: 'dragon-bai',
      },
      {
        kind: 'pong',
        tiles: ['wind-north', 'wind-north', 'wind-north'],
        fromSeat: 2,
        claimedTile: 'wind-north',
      },
      {
        kind: 'ankong',
        tiles: ['wind-west', 'wind-west', 'wind-west', 'wind-west'],
      },
    ]
    const hand: TileId[] = ['man-1', 'man-1', 'wind-south', 'wind-south']
    const fans = calculateFans({
      hand,
      melds,
      flowers: ['flower-bamboo'],
      winTile: 'man-1',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 2,
      windRound: 3,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('xiaosixi')
    expect(ids).toContain('hunlaotou')
    expect(ids).toContain('duiduihu')
    expect(ids).toContain('hunyise')
    expect(ids).toContain('angang')
    expect(ids).toContain('duipeng')
    expect(ids).not.toContain('lianganke')
    expect(ids).not.toContain('sananke')
    expect(ids).not.toContain('quewu')
  })

  it('自摸對碰＋暗槓 → 兩暗刻仍計', () => {
    const melds: Meld[] = [
      {
        kind: 'pong',
        tiles: ['wind-east', 'wind-east', 'wind-east'],
        fromSeat: 0,
        claimedTile: 'wind-east',
      },
      {
        kind: 'pong',
        tiles: ['dragon-bai', 'dragon-bai', 'dragon-bai'],
        fromSeat: 1,
        claimedTile: 'dragon-bai',
      },
      {
        kind: 'pong',
        tiles: ['wind-north', 'wind-north', 'wind-north'],
        fromSeat: 2,
        claimedTile: 'wind-north',
      },
      {
        kind: 'ankong',
        tiles: ['wind-west', 'wind-west', 'wind-west', 'wind-west'],
      },
    ]
    const hand: TileId[] = ['man-1', 'man-1', 'wind-south', 'wind-south']
    const fans = calculateFans({
      hand,
      melds,
      flowers: [],
      winTile: 'man-1',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 2,
      windRound: 3,
      discardsThisRound: 20,
    })
    expect(fans.map((f) => f.id)).toContain('lianganke')
  })
})
