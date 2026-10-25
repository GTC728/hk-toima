import { describe, expect, it } from 'vitest'
import {
  canWin,
  findStandardWins,
  isLiguligu,
  isReady,
  isSixteenBuDa,
  isThirteenOrphans,
  waitingTiles,
} from '../win-check'
import type { TileId } from '../types'

describe('win-check', () => {
  it('detects standard 5 melds + pair (16 ready → 17 win)', () => {
    // 16 張叫糊：四組順 + 雀頭差一／聽嵌
    const ready: TileId[] = [
      'man-1', 'man-2', 'man-3',
      'man-4', 'man-5', 'man-6',
      'man-7', 'man-8', 'man-9',
      'pin-1', 'pin-2', 'pin-3',
      'pin-4', 'pin-5',
      'wind-east', 'wind-east',
    ]
    expect(ready).toHaveLength(16)
    expect(canWin(ready, [], 'pin-6')).toBe(true)
    expect(findStandardWins(ready, [], 'pin-6').length).toBeGreaterThan(0)

    const readyPair: TileId[] = [
      'man-1', 'man-2', 'man-3',
      'man-4', 'man-5', 'man-6',
      'man-7', 'man-8', 'man-9',
      'pin-1', 'pin-2', 'pin-3',
      'pin-4', 'pin-5', 'pin-6',
      'wind-east',
    ]
    expect(readyPair).toHaveLength(16)
    expect(canWin(readyPair, [], 'wind-east')).toBe(true)
  })

  it('rejects standard win when hand+win ≠ 剩餘面子×3＋2', () => {
    // 清一色樣但少一對（15+1＝16），唔當標準糊
    const short: TileId[] = [
      'man-1', 'man-1',
      'man-2', 'man-2',
      'man-3',
      'man-4', 'man-4',
      'man-5', 'man-5',
      'man-6', 'man-6',
      'man-7', 'man-7',
      'man-8', 'man-8',
    ]
    expect(short).toHaveLength(15)
    expect(findStandardWins(short, [], 'man-1')).toHaveLength(0)
    expect(canWin(short, [], 'man-1')).toBe(false)

    // 多一張（17+1）
    const long: TileId[] = [...short, 'man-3', 'man-9']
    expect(long).toHaveLength(17)
    expect(findStandardWins(long, [], 'man-1')).toHaveLength(0)
  })

  it('detects 嚦咕嚦咕（七對＋一刻＝17 張）', () => {
    // 八對聽：16 張全對，食其中一隻成一刻
    const eightPairs: TileId[] = [
      'man-1', 'man-1',
      'man-2', 'man-2',
      'man-3', 'man-3',
      'man-4', 'man-4',
      'man-5', 'man-5',
      'man-6', 'man-6',
      'man-7', 'man-7',
      'man-8', 'man-8',
    ]
    expect(eightPairs).toHaveLength(16)
    expect(isLiguligu(eightPairs, 'man-1')).toBe(true)
    expect(canWin(eightPairs, [], 'man-1')).toBe(true)
    expect(isLiguligu(eightPairs, 'man-9')).toBe(false)

    // 四張當兩對
    const withQuad: TileId[] = [
      'man-1', 'man-1', 'man-1',
      'man-2', 'man-2', 'man-2', 'man-2',
      'man-3', 'man-3',
      'man-4', 'man-4',
      'man-5', 'man-5',
      'man-6', 'man-6',
      'man-7',
    ]
    expect(withQuad).toHaveLength(16)
    expect(isLiguligu(withQuad, 'man-7')).toBe(true)
  })

  it('detects 十三么', () => {
    // 17 張成型；叫糊 16 張含十三種
    const hand: TileId[] = [
      'man-1', 'man-9',
      'pin-1', 'pin-9',
      'sou-1', 'sou-9',
      'wind-east', 'wind-south', 'wind-west', 'wind-north',
      'dragon-zhong', 'dragon-fa', 'dragon-bai',
      'man-1', 'pin-1', 'sou-1',
    ]
    expect(hand).toHaveLength(16)
    expect(isThirteenOrphans(hand, 'man-9')).toBe(true)
    expect(canWin(hand, [], 'man-9')).toBe(true)
  })

  it('waitingTiles lists ready tiles', () => {
    const ready: TileId[] = [
      'man-1', 'man-2', 'man-3',
      'man-4', 'man-5', 'man-6',
      'man-7', 'man-8', 'man-9',
      'pin-1', 'pin-2', 'pin-3',
      'pin-4', 'pin-5',
      'wind-east', 'wind-east',
    ]
    expect(isReady(ready, [])).toBe(true)
    const waits = waitingTiles(ready, [])
    expect(waits).toContain('pin-6')
  })

  describe('十六不搭', () => {
    it('accepts 147/258/369 + honor eye', () => {
      // 萬147 筒258 索369 + 東西南北中發 + 南眼（叫糊爭一南）
      const hand: TileId[] = [
        'man-1', 'man-4', 'man-7',
        'pin-2', 'pin-5', 'pin-8',
        'sou-3', 'sou-6', 'sou-9',
        'wind-east', 'wind-west', 'wind-north',
        'dragon-zhong', 'dragon-fa', 'dragon-bai',
        'wind-south',
      ]
      expect(hand).toHaveLength(16)
      expect(isSixteenBuDa(hand, 'wind-south')).toBe(true)
      expect(canWin(hand, [], 'wind-south')).toBe(true)
    })

    it('rejects screenshot hand: 萬 1·3·4·7 有相鄰／可上', () => {
      const hand: TileId[] = [
        'man-1', 'man-4', 'man-7',
        'pin-1', 'pin-4', 'pin-8',
        'sou-5', 'sou-9',
        'wind-east',
        'wind-south', 'wind-south',
        'wind-west', 'wind-north',
        'dragon-zhong', 'dragon-fa', 'dragon-bai',
      ]
      expect(hand).toHaveLength(16)
      expect(isSixteenBuDa(hand, 'man-3')).toBe(false)
      expect(canWin(hand, [], 'man-3')).toBe(false)
    })

    it('rejects adjacent ranks in same suit (差1)', () => {
      const hand: TileId[] = [
        'man-1', 'man-4', 'man-5',
        'pin-2', 'pin-5', 'pin-8',
        'sou-3', 'sou-6', 'sou-9',
        'wind-east', 'wind-west', 'wind-north',
        'dragon-zhong', 'dragon-fa', 'dragon-bai',
        'wind-south',
      ]
      expect(isSixteenBuDa(hand, 'wind-south')).toBe(false)
    })

    it('rejects gap-2 ranks that can chi (差2)', () => {
      const hand: TileId[] = [
        'man-1', 'man-3', 'man-7',
        'pin-2', 'pin-5', 'pin-8',
        'sou-3', 'sou-6', 'sou-9',
        'wind-east', 'wind-west', 'wind-north',
        'dragon-zhong', 'dragon-fa', 'dragon-bai',
        'wind-south',
      ]
      expect(isSixteenBuDa(hand, 'wind-south')).toBe(false)
    })
  })
})
