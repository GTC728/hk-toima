import { describe, expect, it } from 'vitest'
import {
  canWin,
  findStandardWins,
  isLiguligu,
  isReady,
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

  it('detects 嚦咕嚦咕 (8 pairs)', () => {
    const hand: TileId[] = [
      'man-1', 'man-1',
      'man-2', 'man-2',
      'man-3', 'man-3',
      'pin-1', 'pin-1',
      'pin-5', 'pin-5',
      'sou-9', 'sou-9',
      'wind-east', 'wind-east',
      'dragon-zhong', 'dragon-fa',
    ]
    expect(hand).toHaveLength(16)
    expect(isLiguligu(hand, 'dragon-zhong')).toBe(false) // would be 9 pairs / broken
    // 15 + win = 8 pairs
    const h15: TileId[] = [
      'man-1', 'man-1',
      'man-2', 'man-2',
      'man-3', 'man-3',
      'pin-1', 'pin-1',
      'pin-5', 'pin-5',
      'sou-9', 'sou-9',
      'wind-east', 'wind-east',
      'dragon-zhong',
    ]
    // 嚦咕：贏牌後 16 張八對 → 叫糊時 15 張？ 八對=16，叫糊爭一對嘅一張 → 15 張
    // 但台牌平時捧 16 張… 嚦咕叫糊時手牌 15？定 16？
    // 標準：未摸 16，八對贏完 16（摸／食入第 16 張成對）→ 叫糊 15 張。
    // 引擎：手牌張數喺未摸時為 16；特殊牌型用 hand+winTile 長度。
    // 對八對：hand 15 + win = 16。遊戲入面叮／叫糊時可能手牌 16（多一張要打）—
    // 簡化：isLiguligu(hand, win) 要求 hand+win = 16 同八對。
    expect(h15).toHaveLength(15)
    expect(isLiguligu(h15, 'dragon-zhong')).toBe(true)
    expect(canWin(h15, [], 'dragon-zhong')).toBe(true)
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
})
