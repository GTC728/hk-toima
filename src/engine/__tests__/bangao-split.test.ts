import { describe, expect, it } from 'vitest'
import { calculateFans, getFanMeta } from '../fan'
import type { Meld, TileId } from '../types'
import {
  assignMeldHighlightFlags,
  tilesForFanHighlight,
} from '../../ui/settlementHighlight'

describe('般高分開計', () => {
  it('暗般高表定 10', () => {
    expect(getFanMeta('anbangao').value).toBe(10)
    expect(getFanMeta('mingbangao').value).toBe(5)
  })

  it('明123＋暗123＋暗678×2 → 明般高＋暗般高，唔再真雙', () => {
    const melds: Meld[] = [
      {
        kind: 'chi',
        tiles: ['man-1', 'man-2', 'man-3'],
        fromSeat: 0,
        claimedTile: 'man-1',
      },
    ]
    const hand: TileId[] = [
      'man-1',
      'man-2',
      'man-3',
      'man-6',
      'man-6',
      'man-7',
      'man-7',
      'man-8',
      'man-8',
      'pin-2',
      'pin-2',
      'pin-4',
      'pin-4',
    ]
    const fans = calculateFans({
      hand,
      melds,
      flowers: [],
      winTile: 'pin-4',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 2,
      windRound: 2,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).not.toContain('mingzhenshuangbangao')
    expect(ids).not.toContain('anzhenshuangbangao')
    const ming = fans.filter((f) => f.id === 'mingbangao')
    const an = fans.filter((f) => f.id === 'anbangao')
    expect(ming).toHaveLength(1)
    expect(an).toHaveLength(1)
    expect(ming[0]!.value).toBe(5)
    expect(an[0]!.value).toBe(10)
    expect(ming[0]!.name).toContain('123')
    expect(an[0]!.name).toContain('678')
  })

  it('撳暗般高只亮 678，唔亮明 123', () => {
    const melds: Meld[] = [
      {
        kind: 'chi',
        tiles: ['man-1', 'man-2', 'man-3'],
        fromSeat: 0,
        claimedTile: 'man-1',
      },
    ]
    const hand: TileId[] = [
      'man-1',
      'man-2',
      'man-3',
      'man-6',
      'man-6',
      'man-7',
      'man-7',
      'man-8',
      'man-8',
      'pin-2',
      'pin-2',
      'pin-4',
      'pin-4',
    ]
    const counts = tilesForFanHighlight('anbangao', {
      hand,
      melds,
      flowers: [],
      winTile: 'pin-4',
      winType: 'tsumo',
      instance: 'man:6-7-8',
    })
    expect(counts.get('man-6')).toBe(2)
    expect(counts.get('man-1')).toBeUndefined()

    const { meldFlags } = assignMeldHighlightFlags(melds, counts)
    expect(meldFlags[0]!.every(Boolean)).toBe(false)
  })

  it('撳明般高亮明＋手 123', () => {
    const melds: Meld[] = [
      {
        kind: 'chi',
        tiles: ['man-1', 'man-2', 'man-3'],
        fromSeat: 0,
        claimedTile: 'man-1',
      },
    ]
    const hand: TileId[] = [
      'man-1',
      'man-2',
      'man-3',
      'man-6',
      'man-6',
      'man-7',
      'man-7',
      'man-8',
      'man-8',
      'pin-2',
      'pin-2',
      'pin-4',
      'pin-4',
    ]
    const counts = tilesForFanHighlight('mingbangao', {
      hand,
      melds,
      flowers: [],
      winTile: 'pin-4',
      winType: 'tsumo',
      instance: 'man:1-2-3',
    })
    expect(counts.get('man-1')).toBe(2)
    expect(counts.get('man-6')).toBeUndefined()

    const { meldFlags } = assignMeldHighlightFlags(melds, counts)
    expect(meldFlags[0]!.every(Boolean)).toBe(true)
  })
})
