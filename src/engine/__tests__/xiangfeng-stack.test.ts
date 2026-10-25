import { describe, expect, it } from 'vitest'
import { calculateFans, getFanMeta } from '../fan'
import type { TileId } from '../types'

describe('偏高檔相逢／滿庭芳／假獨', () => {
  it('表定：暗三相逢20、暗相逢5、相逢3、滿庭芳60、假獨1', () => {
    expect(getFanMeta('ansanxiangfeng').value).toBe(20)
    expect(getFanMeta('anxiangfeng').value).toBe(5)
    expect(getFanMeta('xiangfeng').value).toBe(3)
    expect(getFanMeta('mantingfang').value).toBe(60)
    expect(getFanMeta('jiadu').value).toBe(1)
  })

  it('123三色＋789兩色 → 暗三相逢＋暗相逢；唔再亂加囍相逢', () => {
    const hand: TileId[] = [
      'man-1', 'man-2', 'man-3',
      'man-7', 'man-8', 'man-9',
      'pin-1', 'pin-2', 'pin-3',
      'pin-7', 'pin-8', 'pin-9',
      'sou-1', 'sou-2',
      'sou-5', 'sou-5',
    ]
    expect(hand).toHaveLength(16)
    const fans = calculateFans({
      hand,
      melds: [],
      flowers: [],
      winTile: 'sou-3',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('ansanxiangfeng')
    expect(ids).toContain('anxiangfeng')
    expect(ids).not.toContain('xixiangfeng')
  })

  it('滿庭芳：全帶六（每撘／眼都有六）', () => {
    // 456×3門 + 666刻 + 678 + 眼66 → 每組有6
    const hand: TileId[] = [
      'man-4', 'man-5', 'man-6',
      'pin-4', 'pin-5', 'pin-6',
      'sou-4', 'sou-5', 'sou-6',
      'man-6', 'man-6', 'man-6',
      'pin-6', 'pin-7',
      'sou-6', 'sou-6',
    ]
    expect(hand).toHaveLength(16)
    const fans = calculateFans({
      hand,
      melds: [],
      flowers: [],
      winTile: 'pin-8',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    expect(fans.map((f) => f.id)).toContain('mantingfang')
    const mt = fans.find((f) => f.id === 'mantingfang')!
    expect(mt.value).toBe(60)
    expect(mt.name).toBe('滿庭芳·6')
  })

  it('假獨：中洞型式但實際多面聽', () => {
    // 6,7,7,8,9 聽 5／8；食 8 走 789 中洞，事實多聽 → 假獨
    const hand: TileId[] = [
      'man-1', 'man-2', 'man-3',
      'man-4', 'man-5', 'man-6',
      'man-7', 'man-8', 'man-9',
      'sou-2', 'sou-2',
      'pin-6', 'pin-7', 'pin-7', 'pin-8', 'pin-9',
    ]
    const fans = calculateFans({
      hand,
      melds: [],
      flowers: ['flower-spring'],
      winTile: 'pin-8',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    expect(fans.map((f) => f.id)).toContain('jiadu')
  })

  it('真單嵌唔算假獨', () => {
    const hand: TileId[] = [
      'man-1', 'man-2', 'man-3',
      'man-4', 'man-5', 'man-6',
      'man-7', 'man-8', 'man-9',
      'pin-1', 'pin-2', 'pin-3',
      'pin-4', 'pin-6',
      'wind-east', 'wind-east',
    ]
    const fans = calculateFans({
      hand,
      melds: [],
      flowers: [],
      winTile: 'pin-5',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    expect(fans.map((f) => f.id)).not.toContain('jiadu')
  })
})

