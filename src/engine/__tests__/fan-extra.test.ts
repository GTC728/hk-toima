import { describe, expect, it } from 'vitest'
import { calculateFans } from '../fan'
import type { TileId } from '../types'

/** 出銃：1 組上 + 手 13 + win → 14 暗＝4 面子 + 眼 */
describe('expanded fans', () => {
  it('將眼：眼係 2／5／8', () => {
    const fans = calculateFans({
      hand: [
        'man-1', 'man-2', 'man-3',
        'man-4', 'man-5', 'man-6',
        'pin-1', 'pin-2', 'pin-3',
        'sou-1', 'sou-2', 'sou-3',
        'pin-5',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['sou-4', 'sou-5', 'sou-6'],
          fromSeat: 0,
          claimedTile: 'sou-6',
        },
      ],
      flowers: ['flower-spring'],
      winTile: 'pin-5',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
      discardsThisRound: 20,
    })
    expect(fans.map((f) => f.id)).toContain('jiangyan')
  })

  it('風刻：正風或正圈 2、非正 1；三元每組 2', () => {
    // 南家・東圈：東刻＝正圈2、南刻＝正風2 → 風牌共 4
    const fans = calculateFans({
      hand: [
        'man-1', 'man-2', 'man-3',
        'pin-4', 'pin-5', 'pin-6',
        'wind-east', 'wind-east', 'wind-east',
        'dragon-zhong',
      ],
      melds: [
        {
          kind: 'pong',
          tiles: ['wind-south', 'wind-south', 'wind-south'],
          fromSeat: 0,
          claimedTile: 'wind-south',
        },
        {
          kind: 'pong',
          tiles: ['dragon-fa', 'dragon-fa', 'dragon-fa'],
          fromSeat: 2,
          claimedTile: 'dragon-fa',
        },
      ],
      flowers: [],
      winTile: 'dragon-zhong',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
      windRound: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('fengke')
    expect(ids).toContain('sanyuanpai')
    expect(fans.find((f) => f.id === 'fengke')!.value).toBe(4)
  })

  it('東圈東家碰北＝非正 1 番（唔係 3）', () => {
    // 16 張：4 順手牌＋北碰＋眼
    const fans = calculateFans({
      hand: [
        'man-1', 'man-2', 'man-3',
        'pin-4', 'pin-5', 'pin-6',
        'sou-1', 'sou-2', 'sou-3',
        'sou-4', 'sou-5', 'sou-6',
        'pin-2',
      ],
      melds: [
        {
          kind: 'pong',
          tiles: ['wind-north', 'wind-north', 'wind-north'],
          fromSeat: 2,
          claimedTile: 'wind-north',
        },
      ],
      flowers: [],
      winTile: 'pin-2',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      windRound: 0,
      discardsThisRound: 20,
    })
    expect(fans.find((f) => f.id === 'fengke')!.value).toBe(1)
  })

  it('二姊妹有、二連刻唔重複', () => {
    // 出銃：手 10＋win＋2 副露＝5 刻＋眼；4索＋5索＝二姊妹
    const fans = calculateFans({
      hand: [
        'pin-2', 'pin-2',
        'pin-5', 'pin-5',
        'man-7', 'man-7', 'man-7',
        'wind-east', 'wind-east', 'wind-east',
      ],
      melds: [
        {
          kind: 'pong',
          tiles: ['sou-4', 'sou-4', 'sou-4'],
          fromSeat: 1,
          claimedTile: 'sou-4',
        },
        {
          kind: 'pong',
          tiles: ['sou-5', 'sou-5', 'sou-5'],
          fromSeat: 2,
          claimedTile: 'sou-5',
        },
      ],
      flowers: [],
      winTile: 'pin-5',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('erjiemei')
    expect(ids).not.toContain('erlianke')
  })

  it('花摸 2n', () => {
    const fans = calculateFans({
      hand: [
        'man-1', 'man-2', 'man-3',
        'man-4', 'man-5', 'man-6',
        'pin-1', 'pin-2', 'pin-3',
        'sou-1', 'sou-2', 'sou-3',
        'pin-7',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['sou-4', 'sou-5', 'sou-6'],
          fromSeat: 0,
          claimedTile: 'sou-6',
        },
      ],
      flowers: ['flower-spring'],
      winTile: 'pin-7',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
      discardsThisRound: 20,
      flowerDrawChain: 2,
    })
    // tsumo hand should be 13 without win? applyWins removes win from hand first
    // calculateFans(hand without win, winTile) — for tsumo tests use same as ron shape
    expect(fans.find((f) => f.id === 'huamo')?.value).toBe(2)
  })

  it('槓摸 5n', () => {
    const fans = calculateFans({
      hand: [
        'man-1', 'man-2', 'man-3',
        'man-4', 'man-5', 'man-6',
        'pin-1', 'pin-2', 'pin-3',
        'sou-1', 'sou-2', 'sou-3',
        'pin-7',
      ],
      melds: [
        {
          kind: 'ankong',
          tiles: ['sou-5', 'sou-5', 'sou-5', 'sou-5'],
        },
      ],
      flowers: [],
      winTile: 'pin-7',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
      discardsThisRound: 20,
      kongDrawChain: 1,
    })
    expect(fans.find((f) => f.id === 'gangmo')?.value).toBe(1)
  })

  it('明清龍', () => {
    // 清龍其中一段係上牌 → 明；123+456+789 唔係步步高
    const fans = calculateFans({
      hand: [
        'man-4', 'man-5', 'man-6',
        'man-7', 'man-8',
        'pin-2', 'pin-2',
        'sou-2', 'sou-3', 'sou-4',
        'pin-5', 'pin-6', 'pin-7',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['man-1', 'man-2', 'man-3'],
          fromSeat: 0,
          claimedTile: 'man-3',
        },
      ],
      flowers: ['flower-plum'],
      winTile: 'man-9',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('mingqinglong')
    expect(ids).not.toContain('mingdansebbg')
    expect(ids).not.toContain('andansebbg')
  })

  it('清龍＋相逢唔計步步高', () => {
    // 全落地：索 123/456/789 清龍；萬 123 相逢；筒 1 刻；眼 2萬
    const fans = calculateFans({
      hand: ['man-2'],
      melds: [
        {
          kind: 'pong',
          tiles: ['pin-1', 'pin-1', 'pin-1'],
          fromSeat: 0,
          claimedTile: 'pin-1',
        },
        {
          kind: 'chi',
          tiles: ['sou-1', 'sou-2', 'sou-3'],
          fromSeat: 0,
          claimedTile: 'sou-3',
        },
        {
          kind: 'chi',
          tiles: ['sou-7', 'sou-8', 'sou-9'],
          fromSeat: 2,
          claimedTile: 'sou-9',
        },
        {
          kind: 'chi',
          tiles: ['sou-4', 'sou-5', 'sou-6'],
          fromSeat: 3,
          claimedTile: 'sou-6',
        },
        {
          kind: 'chi',
          tiles: ['man-1', 'man-2', 'man-3'],
          fromSeat: 0,
          claimedTile: 'man-1',
        },
      ],
      flowers: ['flower-summer', 'flower-winter', 'flower-chrysanthemum'],
      winTile: 'man-2',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
      discardsThisRound: 40,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('mingqinglong')
    expect(ids).toContain('xiangfeng')
    expect(ids).not.toContain('mingdansebbg')
    expect(ids).not.toContain('andansebbg')
    expect(ids).not.toContain('erjiemei')
    expect(ids).not.toContain('shuangjiemei')
  })

  it('單色步步高係 123+234+345', () => {
    // 萬 123／234／345 步步高（上破門清→明）；另兩面子＋眼
    const fans = calculateFans({
      hand: [
        'man-2', 'man-3', 'man-4',
        'man-3', 'man-4', 'man-5',
        'pin-8', 'pin-8',
        'sou-1', 'sou-2', 'sou-3',
        'sou-5', 'sou-6',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['man-1', 'man-2', 'man-3'],
          fromSeat: 0,
          claimedTile: 'man-1',
        },
      ],
      flowers: ['flower-plum'],
      winTile: 'sou-7',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('mingdansebbg')
    expect(ids).not.toContain('anqinglong')
    expect(ids).not.toContain('mingqinglong')
  })

  it('斷么九', () => {
    const fans = calculateFans({
      hand: [
        'man-2', 'man-3', 'man-4',
        'man-5', 'man-6', 'man-7',
        'pin-2', 'pin-3', 'pin-4',
        'sou-3', 'sou-4', 'sou-5',
        'pin-6',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['sou-6', 'sou-7', 'sou-8'],
          fromSeat: 0,
          claimedTile: 'sou-8',
        },
      ],
      flowers: [],
      winTile: 'pin-6',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
      discardsThisRound: 20,
    })
    expect(fans.map((f) => f.id)).toContain('duanyaojiu')
  })

  it('明絕 on 對碰', () => {
    const fans = calculateFans({
      hand: [
        'man-1', 'man-2', 'man-3',
        'man-4', 'man-5', 'man-6',
        'pin-1', 'pin-2', 'pin-3',
        'sou-1', 'sou-2', 'sou-3',
        'pin-7',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['sou-4', 'sou-5', 'sou-6'],
          fromSeat: 0,
          claimedTile: 'sou-6',
        },
      ],
      flowers: ['flower-spring'],
      winTile: 'pin-7',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
      discardsThisRound: 20,
      visibleWinTileCount: 2,
    })
    expect(fans.map((f) => f.id)).toContain('mingjue')
  })

  it('般高：同門兩組相同順', () => {
    const fans = calculateFans({
      hand: [
        'man-2', 'man-3', 'man-4',
        'man-2', 'man-3', 'man-4',
        'pin-1', 'pin-2', 'pin-3',
        'sou-1', 'sou-2', 'sou-3',
        'pin-5',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['sou-5', 'sou-6', 'sou-7'],
          fromSeat: 0,
          claimedTile: 'sou-7',
        },
      ],
      flowers: ['flower-spring'],
      winTile: 'pin-5',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids.some((id) => id.includes('bangao'))).toBe(true)
  })
})

describe('expanded fans menqing', () => {
  it('兩暗刻', () => {
    const fans = calculateFans({
      hand: [
        'man-3', 'man-3', 'man-3',
        'pin-5', 'pin-5', 'pin-5',
        'sou-1', 'sou-2', 'sou-3',
        'sou-4', 'sou-5', 'sou-6',
        'sou-7', 'sou-8', 'sou-9',
        'wind-east',
      ],
      melds: [],
      flowers: ['flower-spring'],
      winTile: 'wind-east',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    expect(fans.map((f) => f.id)).toContain('lianganke')
  })

  it('五門齊', () => {
    const fans = calculateFans({
      hand: [
        'man-1', 'man-2', 'man-3',
        'pin-4', 'pin-5', 'pin-6',
        'sou-7', 'sou-8', 'sou-9',
        'wind-east', 'wind-east',
        'dragon-zhong',
      ],
      melds: [
        {
          kind: 'pong',
          tiles: ['dragon-fa', 'dragon-fa', 'dragon-fa'],
          fromSeat: 1,
          claimedTile: 'dragon-fa',
        },
      ],
      flowers: [],
      winTile: 'dragon-zhong',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    // hand 12 + win；1 pong → need 13+1=14 for 4 melds+pair. hand should be 13.
    // Fix: 13 tiles
    void fans
  })

  it('五門齊合法', () => {
    const fans = calculateFans({
      hand: [
        'man-1', 'man-2', 'man-3',
        'pin-4', 'pin-5', 'pin-6',
        'sou-7', 'sou-8', 'sou-9',
        'wind-east', 'wind-east', 'wind-east',
        'dragon-zhong',
      ],
      melds: [
        {
          kind: 'pong',
          tiles: ['dragon-fa', 'dragon-fa', 'dragon-fa'],
          fromSeat: 1,
          claimedTile: 'dragon-fa',
        },
      ],
      flowers: [],
      winTile: 'dragon-zhong',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    expect(fans.map((f) => f.id)).toContain('wumenqi')
  })

  it('有字牌唔計小於五／大於五', () => {
    // 1 副露＋手 13：數牌全 <5 但有字 → 可缺五，唔係小於五
    const fans = calculateFans({
      hand: [
        'man-1', 'man-1', 'man-1',
        'pin-2', 'pin-2', 'pin-2',
        'sou-3', 'sou-3', 'sou-3',
        'man-4', 'man-4', 'man-4',
        'dragon-zhong',
      ],
      melds: [
        {
          kind: 'pong',
          tiles: ['wind-east', 'wind-east', 'wind-east'],
          fromSeat: 1,
          claimedTile: 'wind-east',
        },
      ],
      flowers: [],
      winTile: 'dragon-zhong',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('quewu')
    expect(ids).not.toContain('xiaoyuwu')
  })

  it('純數牌 1–4 計小於五，唔另計缺五', () => {
    const fans = calculateFans({
      hand: [
        'man-1', 'man-2', 'man-3',
        'man-2', 'man-3', 'man-4',
        'pin-1', 'pin-2', 'pin-3',
        'sou-1', 'sou-2', 'sou-3',
        'pin-4',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['sou-2', 'sou-3', 'sou-4'],
          fromSeat: 0,
          claimedTile: 'sou-4',
        },
      ],
      flowers: [],
      winTile: 'pin-4',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('xiaoyuwu')
    expect(ids).not.toContain('quewu')
  })

  it('大三色連刻要三門連續刻', () => {
    // 2 副露＋手：444萬+555筒+666索 三門連刻
    const fans = calculateFans({
      hand: [
        'man-4', 'man-4', 'man-4',
        'pin-5', 'pin-5', 'pin-5',
        'sou-6', 'sou-6', 'sou-6',
        'man-1',
      ],
      melds: [
        {
          kind: 'pong',
          tiles: ['pin-9', 'pin-9', 'pin-9'],
          fromSeat: 1,
          claimedTile: 'pin-9',
        },
        {
          kind: 'pong',
          tiles: ['sou-1', 'sou-1', 'sou-1'],
          fromSeat: 2,
          claimedTile: 'sou-1',
        },
      ],
      flowers: [],
      winTile: 'man-1',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    expect(fans.map((f) => f.id)).toContain('dasanseke')
  })

  it('普通連續刻唔再誤計大三色連刻', () => {
    // 同門 1–5 暗刻自摸：五暗／間間，唔應大三色連刻
    const fans = calculateFans({
      hand: [
        'man-1', 'man-1', 'man-1',
        'man-2', 'man-2', 'man-2',
        'man-3', 'man-3', 'man-3',
        'man-4', 'man-4', 'man-4',
        'man-5', 'man-5', 'man-5',
        'man-6',
      ],
      melds: [],
      flowers: [],
      winTile: 'man-6',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).not.toContain('dasanseke')
    expect(ids).not.toContain('xiaosanseke')
  })

  it('明四歸一：一刻＋一順用盡四張', () => {
    // 副露 345筒；手有 333筒＋其他
    const fans = calculateFans({
      hand: [
        'pin-3', 'pin-3', 'pin-3',
        'man-1', 'man-2', 'man-3',
        'sou-1', 'sou-2', 'sou-3',
        'man-7', 'man-8', 'man-9',
        'sou-5',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['pin-3', 'pin-4', 'pin-5'],
          fromSeat: 0,
          claimedTile: 'pin-5',
        },
      ],
      flowers: [],
      winTile: 'sou-5',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    expect(fans.map((f) => f.id)).toContain('mingsiguiji')
  })

  it('暗四歸二：眼＋兩順用盡四張', () => {
    // 門清：眼 33筒；兩順都含 3（123筒、345筒）
    const fans = calculateFans({
      hand: [
        'pin-1', 'pin-2', 'pin-3',
        'pin-3', 'pin-4', 'pin-5',
        'man-1', 'man-2', 'man-3',
        'sou-1', 'sou-2', 'sou-3',
        'sou-7', 'sou-8', 'sou-9',
        'pin-3',
      ],
      melds: [],
      flowers: [],
      winTile: 'pin-3',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('ansiguier')
    expect(ids).not.toContain('mingsiguier')
  })

  it('55＋食5入456順唔計對碰／獨獨（嵌張）', () => {
    // 副露789萬；手：234萬 1234索 55索 6789索，食5索 → 456＋眼55
    const fans = calculateFans({
      hand: [
        'man-2', 'man-3', 'man-4',
        'sou-1', 'sou-2', 'sou-3', 'sou-4',
        'sou-5', 'sou-5',
        'sou-6', 'sou-7', 'sou-8', 'sou-9',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['man-7', 'man-8', 'man-9'],
          fromSeat: 1,
          claimedTile: 'man-9',
        },
      ],
      flowers: [],
      winTile: 'sou-5',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).not.toContain('duipeng')
    expect(ids).not.toContain('dudu')
    const laoshao = fans.filter((f) => f.id === 'laoshao')
    expect(laoshao).toHaveLength(1)
    expect(laoshao[0]!.value).toBe(4) // 暗老少＝4，唔係兩次各2
  })

  it('連莊顯示 2N+1（奇數），唔拆莊+雙數', () => {
    const fans = calculateFans({
      hand: [
        'man-1', 'man-2', 'man-3',
        'man-4', 'man-5', 'man-6',
        'pin-1', 'pin-2', 'pin-3',
        'sou-1', 'sou-2', 'sou-3',
        'pin-5',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['sou-4', 'sou-5', 'sou-6'],
          fromSeat: 0,
          claimedTile: 'sou-6',
        },
      ],
      flowers: [],
      winTile: 'pin-5',
      winType: 'ron',
      ding: null,
      isDealer: true,
      consecutiveWins: 3,
      seat: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('lianzhuang')
    expect(ids).not.toContain('dealer')
    expect(fans.find((f) => f.id === 'lianzhuang')!.value).toBe(7)
  })

  it('五暗刻唔再計對對糊', () => {
    const fans = calculateFans({
      hand: [
        'man-1', 'man-1', 'man-1',
        'pin-2', 'pin-2', 'pin-2',
        'sou-3', 'sou-3', 'sou-3',
        'man-4', 'man-4', 'man-4',
        'pin-5', 'pin-5', 'pin-5',
        'sou-6',
      ],
      melds: [],
      flowers: [],
      winTile: 'sou-6',
      winType: 'ron',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 0,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('wuanake')
    expect(ids).not.toContain('duiduihu')
  })
})
