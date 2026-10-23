import { describe, expect, it } from 'vitest'
import type { Meld, TileId } from '../engine'
import {
  assignMeldHighlightFlags,
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
})

describe('fanRepeatTimes', () => {
  it('laoshao 4 fan is once not twice', () => {
    expect(fanRepeatTimes('laoshao', 4)).toBe(1)
  })
})
