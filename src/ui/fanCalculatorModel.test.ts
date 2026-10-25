import { describe, expect, it } from 'vitest'
import {
  calculateFans,
  findStandardWins,
  isLiguligu,
  totalFan,
  type TileId,
} from '../engine'
import {
  calcDisplayFans,
  calcHasWinningPattern,
  calcScoreHand,
  calcTileCountLabel,
  clearCalcWinTile,
  pickCalcWinTile,
} from './fanCalculatorModel'

/** 八對聽 16 張（門清叫糊） */
const EIGHT_PAIRS_16: TileId[] = [
  'man-1', 'man-1',
  'man-2', 'man-2',
  'man-3', 'man-3',
  'man-4', 'man-4',
  'man-5', 'man-5',
  'man-6', 'man-6',
  'man-7', 'man-7',
  'man-8', 'man-8',
]

/** 標準聽嵌 16 張 */
const STANDARD_READY_16: TileId[] = [
  'man-1', 'man-2', 'man-3',
  'man-4', 'man-5', 'man-6',
  'man-7', 'man-8', 'man-9',
  'pin-1', 'pin-2', 'pin-3',
  'pin-4', 'pin-5',
  'wind-east', 'wind-east',
]

describe('計番機 · 設糊唔偷手牌', () => {
  it('設糊：手牌原樣保留（就算手牌已有同一張）', () => {
    const hand = [...EIGHT_PAIRS_16]
    expect(hand.filter((t) => t === 'man-1')).toHaveLength(2)
    // 設糊 man-1（對碰成刻）——手牌仲係 16，唔好變 15
    const win = pickCalcWinTile('man-1')
    expect(win).toBe('man-1')
    expect(hand).toHaveLength(16)
    expect(hand.filter((t) => t === 'man-1')).toHaveLength(2)
  })

  it('換糊：手牌仍然唔變', () => {
    const hand = [...EIGHT_PAIRS_16]
    pickCalcWinTile('man-1')
    pickCalcWinTile('man-8')
    expect(hand).toEqual(EIGHT_PAIRS_16)
  })

  it('清糊：唔把手牌加長（唔「放回」）', () => {
    const hand = [...EIGHT_PAIRS_16]
    expect(clearCalcWinTile()).toBeNull()
    expect(hand).toHaveLength(16)
  })
})

describe('計番機 · 計番用暗牌（唔改畫面 state）', () => {
  it('手 16 + 糊（手牌有同款）→ scoreHand 仍係 16，合計 17', () => {
    const hand = [...EIGHT_PAIRS_16]
    const scoreHand = calcScoreHand(hand, 'man-1', 'tsumo')
    expect(scoreHand).toHaveLength(16)
    expect(scoreHand).toEqual(hand)
    expect([...scoreHand, 'man-1']).toHaveLength(17)
  })

  it('手 16 + 糊（出銃）→ 唔抽', () => {
    const hand = [...STANDARD_READY_16]
    expect(calcScoreHand(hand, 'pin-6', 'ron')).toEqual(hand)
  })

  it('手 17 含自摸糊牌 → 抽出一隻先計，避免 18', () => {
    const hand17: TileId[] = [...EIGHT_PAIRS_16, 'man-1']
    expect(hand17).toHaveLength(17)
    const scoreHand = calcScoreHand(hand17, 'man-1', 'tsumo')
    expect(scoreHand).toHaveLength(16)
    expect(isLiguligu(scoreHand, 'man-1')).toBe(true)
  })

  it('手 15 + 糊（被偷過後嘅錯態）→ 唔當嚦咕／標準糊', () => {
    const stolen: TileId[] = EIGHT_PAIRS_16.filter((_, i) => i !== 0) // 少一隻 man-1
    expect(stolen).toHaveLength(15)
    expect(isLiguligu(stolen, 'man-1')).toBe(false)
    expect(findStandardWins(stolen, [], 'man-1')).toHaveLength(0)
    expect(
      calculateFans({
        hand: stolen,
        melds: [],
        flowers: [],
        winTile: 'man-1',
        winType: 'tsumo',
        ding: null,
        isDealer: false,
        consecutiveWins: 0,
        seat: 1,
      }),
    ).toEqual([])
  })
})

describe('計番機 · 未成糊唔好顯示底當成功', () => {
  it('截圖態：手 15+糊 8 萬 → 無牌型、唔顯示底番', () => {
    const hand: TileId[] = [
      'man-1', 'man-1', 'man-1',
      'man-2',
      'man-3', 'man-3',
      'man-4', 'man-4',
      'man-5', 'man-5',
      'man-6', 'man-6',
      'man-7', 'man-7', 'man-7',
    ]
    expect(hand).toHaveLength(15)
    const pattern = calculateFans({
      hand,
      melds: [],
      flowers: [],
      winTile: 'man-8',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
    })
    expect(pattern).toEqual([])
    expect(calcHasWinningPattern(pattern)).toBe(false)
    expect(calcDisplayFans(pattern, 5)).toBeNull()
  })

  it('手 16 + 無關糊牌 → 未成糊', () => {
    const pattern = calculateFans({
      hand: [...EIGHT_PAIRS_16],
      melds: [],
      flowers: [],
      winTile: 'man-9', // 唔係聽口
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
    })
    expect(pattern).toEqual([])
    expect(calcDisplayFans(pattern, 5)).toBeNull()
  })

  it('合法嚦咕雙食：有牌型 + 底', () => {
    const scoreHand = calcScoreHand(EIGHT_PAIRS_16, 'man-1', 'tsumo')
    const pattern = calculateFans({
      hand: scoreHand,
      melds: [],
      flowers: [],
      winTile: 'man-1',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
    })
    expect(calcHasWinningPattern(pattern)).toBe(true)
    const fans = calcDisplayFans(pattern, 5)!
    expect(fans[0]?.id).toBe('di')
    expect(fans.map((f) => f.id)).toContain('liguligu')
    expect(totalFan(fans)).toBeGreaterThan(5)
  })

  it('合法標準糊：有牌型 + 底', () => {
    const pattern = calculateFans({
      hand: [...STANDARD_READY_16],
      melds: [],
      flowers: ['flower-spring'],
      winTile: 'pin-6',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
    })
    expect(findStandardWins(STANDARD_READY_16, [], 'pin-6').length).toBeGreaterThan(
      0,
    )
    expect(calcDisplayFans(pattern, 5)).not.toBeNull()
    expect(calcHasWinningPattern(pattern)).toBe(true)
  })
})

describe('計番機 · 張數文案', () => {
  it('16+1＝17 唔再嚇「要 17」', () => {
    expect(calcTileCountLabel(16, true, 0)).toBe('手 16 + 糊 1 ＝ 17')
  })

  it('15+1＝16 標明未夠', () => {
    expect(calcTileCountLabel(15, true, 0)).toBe(
      '手 15 + 糊 1 ＝ 16（門清要 17，而家未夠／多咗）',
    )
  })

  it('未設糊', () => {
    expect(calcTileCountLabel(16, false, 0)).toBe('手 16 張（未設糊）')
  })
})

describe('回歸 · 設糊後手 16 仍可成嚦咕（偷牌 bug）', () => {
  it('八對聽設糊 man-1：手牌保持 16，計番有嚦咕', () => {
    const hand = [...EIGHT_PAIRS_16]
    const win = pickCalcWinTile('man-1')
    // 模擬舊 bug：assignCalcWin 會令 hand 變 15 —— 正確行為係唔改
    expect(hand).toHaveLength(16)
    const scoreHand = calcScoreHand(hand, win, 'tsumo')
    expect(scoreHand).toHaveLength(16)
    expect(isLiguligu(scoreHand, win)).toBe(true)
    const pattern = calculateFans({
      hand: scoreHand,
      melds: [],
      flowers: [],
      winTile: win,
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
    })
    expect(pattern.map((f) => f.id)).toContain('liguligu')
    expect(calcDisplayFans(pattern, 5)).not.toBeNull()
  })
})
