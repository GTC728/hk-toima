import { describe, expect, it } from 'vitest'
import type { Meld, TileId } from '../engine'
import {
  assignMeldHighlightFlags,
  calcTileCountLabel,
  fanRepeatTimes,
  tilesForFanHighlight,
} from './settlementHighlight'

describe('tilesForFanHighlight', () => {
  it('lianganke highlights concealed pongs', () => {
    // 副露一上；暗兩刻＋一順＋眼
    const counts = tilesForFanHighlight('lianganke', {
      hand: [
        'man-1', 'man-1', 'man-1',
        'pin-2', 'pin-2', 'pin-2',
        'sou-3', 'sou-4', 'sou-5',
        'man-5',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['sou-6', 'sou-7', 'sou-8'],
          fromSeat: 1,
          claimedTile: 'sou-8',
        },
        {
          kind: 'chi',
          tiles: ['pin-7', 'pin-8', 'pin-9'],
          fromSeat: 2,
          claimedTile: 'pin-9',
        },
      ],
      flowers: [],
      winTile: 'man-5',
      winType: 'ron',
    })
    expect(counts.get('man-1')).toBe(3)
    expect(counts.get('pin-2')).toBe(3)
  })

  it('unknown fan does not fallback to win tile', () => {
    const counts = tilesForFanHighlight('not_a_real_fan', {
      hand: ['man-1', 'man-2', 'man-3', 'pin-5'],
      melds: [],
      flowers: [],
      winTile: 'pin-5',
      winType: 'ron',
    })
    expect(counts.size).toBe(0)
  })

  it('calcTileCountLabel mirrors on-screen hand + win', () => {
    expect(calcTileCountLabel(16, true, 0)).toBe('手 16 + 糊 1 ＝ 17')
    expect(calcTileCountLabel(15, true, 0)).toBe(
      '手 15 + 糊 1 ＝ 16（門清要 17，而家未夠／多咗）',
    )
    expect(calcTileCountLabel(16, false, 0)).toBe('手 16 張（未設糊）')
  })

  it('shop=liguligu skips standard partition (兩暗刻唔亮)', () => {
    const hand: TileId[] = [
      'man-1', 'man-1',
      'man-2', 'man-2',
      'man-3', 'man-3',
      'man-4', 'man-4',
      'man-5', 'man-5',
      'man-6', 'man-6',
      'man-7', 'man-7',
      'man-8', 'man-8',
    ]
    const base = {
      hand,
      melds: [] as Meld[],
      flowers: [] as TileId[],
      winTile: 'man-1' as TileId,
      winType: 'tsumo' as const,
    }
    const nico = tilesForFanHighlight('lianganke', {
      ...base,
      shop: 'liguligu',
    })
    expect(nico.size).toBe(0)
    const std = tilesForFanHighlight('qingyise', {
      ...base,
      shop: 'standard',
    })
    expect(std.get('man-1')).toBeGreaterThan(0)
  })

  it('zimo highlights win tile', () => {
    const counts = tilesForFanHighlight('zimo', {
      hand: ['man-1', 'man-2', 'man-3', 'pin-5', 'pin-5'],
      melds: [],
      flowers: [],
      winTile: 'pin-5',
      winType: 'tsumo',
    })
    expect(counts.get('pin-5')).toBe(1)
  })

  it('zhenghua / lanhua split flowers', () => {
    const zheng = tilesForFanHighlight('zhenghua', {
      hand: [],
      melds: [],
      flowers: ['flower-spring', 'flower-orchid'],
      winTile: 'man-1',
      winType: 'ron',
      zhengHuaTiles: ['flower-spring', 'flower-plum'],
    })
    expect(zheng.get('flower-spring')).toBe(1)
    expect(zheng.get('flower-orchid')).toBeUndefined()

    const lan = tilesForFanHighlight('lanhua', {
      hand: [],
      melds: [],
      flowers: ['flower-spring', 'flower-orchid'],
      winTile: 'man-1',
      winType: 'ron',
      zhengHuaTiles: ['flower-spring', 'flower-plum'],
    })
    expect(lan.get('flower-orchid')).toBe(1)
    expect(lan.get('flower-spring')).toBeUndefined()
  })

  it('erjiemei highlights connected pongs only', () => {
    const counts = tilesForFanHighlight('erjiemei', {
      hand: ['pin-9', 'pin-9'],
      melds: [
        {
          kind: 'pong',
          tiles: ['man-2', 'man-2', 'man-2'],
          fromSeat: 1,
          claimedTile: 'man-2',
        },
        {
          kind: 'pong',
          tiles: ['man-3', 'man-3', 'man-3'],
          fromSeat: 2,
          claimedTile: 'man-3',
        },
        {
          kind: 'pong',
          tiles: ['sou-8', 'sou-8', 'sou-8'],
          fromSeat: 0,
          claimedTile: 'sou-8',
        },
      ],
      flowers: [],
      winTile: 'pin-9',
      winType: 'ron',
    })
    expect(counts.get('man-2')).toBe(3)
    expect(counts.get('man-3')).toBe(3)
    expect(counts.get('sou-8')).toBeUndefined()
  })

  it('相逢只亮同數字異門嗰兩坎，唔亮無關嘅 123', () => {
    const melds: Meld[] = [
      {
        kind: 'chi',
        tiles: ['pin-1', 'pin-2', 'pin-3'],
        fromSeat: 0,
        claimedTile: 'pin-3',
      },
      {
        kind: 'pong',
        tiles: ['sou-1', 'sou-1', 'sou-1'],
        fromSeat: 1,
        claimedTile: 'sou-1',
      },
      {
        kind: 'pong',
        tiles: ['man-7', 'man-7', 'man-7'],
        fromSeat: 2,
        claimedTile: 'man-7',
      },
      {
        kind: 'chi',
        tiles: ['sou-4', 'sou-5', 'sou-6'],
        fromSeat: 0,
        claimedTile: 'sou-6',
      },
    ]
    const hand: TileId[] = ['pin-4', 'pin-5', 'pin-6', 'man-5', 'man-5']
    const counts = tilesForFanHighlight('xiangfeng', {
      hand,
      melds,
      flowers: [],
      winTile: 'man-5',
      winType: 'tsumo',
    })
    expect(counts.get('pin-4')).toBe(1)
    expect(counts.get('sou-4')).toBe(1)
    expect(counts.get('pin-1')).toBeUndefined()

    const { meldFlags } = assignMeldHighlightFlags(melds, counts)
    expect(meldFlags[0]!.every(Boolean)).toBe(false) // 123 pin 唔亮
    expect(meldFlags[1]!.every(Boolean)).toBe(false) // 111 sou 唔亮
    expect(meldFlags[3]!.every(Boolean)).toBe(true) // 456 sou 亮
  })

  it('暗相逢唔亮明順（skipChi；即使牌 id 同暗索）', () => {
    // 明 678索 + 暗 678萬 + 暗 678索（糊7）→ 副露唔好搶走暗索高亮
    const melds: Meld[] = [
      {
        kind: 'chi',
        tiles: ['sou-6', 'sou-7', 'sou-8'],
        fromSeat: 0,
        claimedTile: 'sou-6',
      },
      {
        kind: 'pong',
        tiles: ['dragon-fa', 'dragon-fa', 'dragon-fa'],
        fromSeat: 0,
        claimedTile: 'dragon-fa',
      },
      {
        kind: 'pong',
        tiles: ['wind-west', 'wind-west', 'wind-west'],
        fromSeat: 0,
        claimedTile: 'wind-west',
      },
    ]
    const hand: TileId[] = [
      'man-6',
      'man-7',
      'man-8',
      'sou-6',
      'sou-8',
      'wind-south',
      'wind-south',
    ]
    const counts = tilesForFanHighlight('anxiangfeng', {
      hand,
      melds,
      flowers: [],
      winTile: 'sou-7',
      winType: 'ron',
    })
    expect(counts.get('man-6')).toBe(1)
    expect(counts.get('sou-6')).toBe(1)

    const { meldFlags } = assignMeldHighlightFlags(melds, counts, {
      skipChi: true,
    })
    expect(meldFlags[0]!.every(Boolean)).toBe(false)
  })
})

describe('fanRepeatTimes', () => {
  it('laoshao 4 fan is once not twice', () => {
    expect(fanRepeatTimes('laoshao', 4)).toBe(1)
  })
})

describe('混滿庭芳高亮', () => {
  const melds: Meld[] = [
    {
      kind: 'pong',
      tiles: ['dragon-fa', 'dragon-fa', 'dragon-fa'],
      fromSeat: 0,
      claimedTile: 'dragon-fa',
    },
    {
      kind: 'pong',
      tiles: ['wind-west', 'wind-west', 'wind-west'],
      fromSeat: 0,
      claimedTile: 'wind-west',
    },
  ]
  const hand: TileId[] = [
    'man-6',
    'man-7',
    'man-8',
    'pin-6',
    'pin-7',
    'pin-8',
    'sou-7',
    'sou-8',
    'wind-south',
    'wind-south',
  ]

  it('明牌字組都亮；唔亮無關數', () => {
    const counts = tilesForFanHighlight('hunmantingfang', {
      hand,
      melds,
      flowers: [],
      winTile: 'sou-9',
      winType: 'ron',
    })
    expect(counts.get('man-7')).toBe(1)
    expect(counts.get('man-8')).toBe(1)
    expect(counts.get('man-6')).toBeUndefined()
    expect(counts.get('dragon-fa')).toBe(3)
    expect(counts.get('wind-west')).toBe(3)
    expect(counts.get('wind-south')).toBe(2)
    expect(counts.get('sou-9')).toBeUndefined()

    const { meldFlags } = assignMeldHighlightFlags(melds, counts)
    expect(meldFlags[0]!.every(Boolean)).toBe(true) // 發
    expect(meldFlags[1]!.every(Boolean)).toBe(true) // 西
  })

  it('instance=7 只亮帶七＋字組', () => {
    const counts = tilesForFanHighlight('hunmantingfang', {
      hand,
      melds,
      flowers: [],
      winTile: 'sou-9',
      winType: 'ron',
      instance: '7',
    })
    expect(counts.get('man-7')).toBe(1)
    expect(counts.get('man-8')).toBeUndefined()
    expect(counts.get('dragon-fa')).toBe(3)
  })

  it('明順 678：帶八只亮嗰隻 8，唔要求整坎', () => {
    // 明：678索、發、西；手：67萬＋678筒＋南南；糊：8萬
    const chiMelds: Meld[] = [
      {
        kind: 'chi',
        tiles: ['sou-6', 'sou-7', 'sou-8'],
        fromSeat: 0,
        claimedTile: 'sou-6',
      },
      {
        kind: 'pong',
        tiles: ['dragon-fa', 'dragon-fa', 'dragon-fa'],
        fromSeat: 0,
        claimedTile: 'dragon-fa',
      },
      {
        kind: 'pong',
        tiles: ['wind-west', 'wind-west', 'wind-west'],
        fromSeat: 0,
        claimedTile: 'wind-west',
      },
    ]
    const chiHand: TileId[] = [
      'man-6',
      'man-7',
      'pin-6',
      'pin-7',
      'pin-8',
      'wind-south',
      'wind-south',
    ]
    const counts = tilesForFanHighlight('hunmantingfang', {
      hand: chiHand,
      melds: chiMelds,
      flowers: [],
      winTile: 'man-8',
      winType: 'ron',
      instance: '8',
    })
    expect(counts.get('sou-8')).toBe(1)
    expect(counts.get('sou-6')).toBeUndefined()
    expect(counts.get('sou-7')).toBeUndefined()
    expect(counts.get('man-8')).toBe(1)

    const { meldFlags } = assignMeldHighlightFlags(chiMelds, counts)
    expect(meldFlags[0]).toEqual([false, false, true]) // 只亮 8
    expect(meldFlags[1]!.every(Boolean)).toBe(true) // 發
  })
})

describe('fengke highlight', () => {
  it('風牌只亮風刻，唔亮風眼', () => {
    const melds: Meld[] = [
      {
        kind: 'ankong',
        tiles: ['wind-east', 'wind-east', 'wind-east', 'wind-east'],
        fromSeat: null,
        claimedTile: null,
      },
      {
        kind: 'pong',
        tiles: ['sou-1', 'sou-1', 'sou-1'],
        fromSeat: 1,
        claimedTile: 'sou-1',
      },
    ]
    // 暗：234索 + 45＋糊3 → 345；777索；南眼
    const hand: TileId[] = [
      'sou-2', 'sou-3', 'sou-4',
      'sou-4', 'sou-5',
      'sou-7', 'sou-7', 'sou-7',
      'wind-south', 'wind-south',
    ]
    const counts = tilesForFanHighlight('fengke', {
      hand,
      melds,
      flowers: ['flower-orchid', 'flower-spring'],
      winTile: 'sou-3',
      winType: 'ron',
    })
    expect(counts.get('wind-east')).toBe(4)
    expect(counts.get('wind-south')).toBeUndefined()
  })
})
