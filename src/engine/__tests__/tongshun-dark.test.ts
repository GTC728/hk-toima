import { describe, expect, it } from 'vitest'
import { calculateFans, getFanMeta } from '../fan'
import type { Meld, TileId } from '../types'

describe('明／暗四同順・五同順', () => {
  it('表定明暗番數', () => {
    expect(getFanMeta('mingsitongshun').value).toBe(20)
    expect(getFanMeta('ansitongshun').value).toBe(40)
    expect(getFanMeta('mingwutongshun').value).toBe(40)
    expect(getFanMeta('anwutongshun').value).toBe(80)
  })

  it('全暗四同順 → 暗四同順，並另計暗般高', () => {
    // 四組 234（萬×2＋筒＋索）＋567萬＋眼筒5
    const hand: TileId[] = [
      'man-2', 'man-3', 'man-4',
      'man-2', 'man-3', 'man-4',
      'pin-2', 'pin-3', 'pin-4',
      'sou-2', 'sou-3', 'sou-4',
      'man-5', 'man-6', 'man-7',
      'pin-5',
    ]
    const fans = calculateFans({
      hand,
      melds: [],
      flowers: ['flower-spring'],
      winTile: 'pin-5',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
      discardsThisRound: 20,
    })
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('ansitongshun')
    expect(ids).not.toContain('mingsitongshun')
    expect(ids).not.toContain('sitongshun')
    expect(ids).toContain('anbangao')
    expect(ids).not.toContain('mingbangao')
  })

  it('有上牌四同順 → 明四同順', () => {
    const hand: TileId[] = [
      'man-2', 'man-3', 'man-4',
      'pin-2', 'pin-3', 'pin-4',
      'sou-2', 'sou-3', 'sou-4',
      'man-5', 'man-6', 'man-7',
      'pin-5',
    ]
    const melds: Meld[] = [
      {
        kind: 'chi',
        tiles: ['man-2', 'man-3', 'man-4'],
        fromSeat: 0,
        claimedTile: 'man-4',
      },
    ]
    const fans = calculateFans({
      hand,
      melds,
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
    expect(ids).toContain('mingsitongshun')
    expect(ids).not.toContain('ansitongshun')
  })
})
