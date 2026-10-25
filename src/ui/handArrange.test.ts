import { describe, expect, it } from 'vitest'
import type { TileId } from '../engine'
import { handForDisplay } from './handDisplay'
import {
  ARRANGE_MODES,
  arrangeHand,
  moveTile,
  reconcileOrder,
} from './handArrange'

const id = (s: string) => s as TileId

describe('arrangeHand', () => {
  it('分門同而家的顯示一樣，剛摸的牌喺最右', () => {
    const hand = [id('man-9'), id('pin-1'), id('wind-east'), id('man-1')]
    const drawn = id('pin-1')
    expect(arrangeHand('suit', { hand, justDrawn: drawn })).toEqual(
      handForDisplay(hand, drawn),
    )
    expect(arrangeHand('suit', { hand, justDrawn: drawn }).at(-1)).toBe(drawn)
  })

  it('搭子先面子，再嵌張，孤張在右', () => {
    expect(
      arrangeHand('blocks', {
        hand: [id('wind-east'), id('man-9'), id('man-7'), id('man-3'), id('man-2'), id('man-1')],
      }),
    ).toEqual([
      id('man-1'),
      id('man-2'),
      id('man-3'),
      id('man-7'),
      id('man-9'),
      id('wind-east'),
    ])
  })

  it('眼張對子在左', () => {
    expect(
      arrangeHand('eyes', {
        hand: [id('pin-9'), id('sou-2'), id('sou-1'), id('man-5'), id('man-5')],
      }),
    ).toEqual([id('man-5'), id('man-5'), id('sou-1'), id('sou-2'), id('pin-9')])
  })

  it('浮牌把有搭的牌按分門放左，同搭子的組序唔同', () => {
    const hand = [id('pin-9'), id('man-5'), id('man-5'), id('sou-3'), id('sou-2'), id('sou-1')]
    expect(arrangeHand('float', { hand })).toEqual([
      id('man-5'),
      id('man-5'),
      id('sou-1'),
      id('sou-2'),
      id('sou-3'),
      id('pin-9'),
    ])
    expect(arrangeHand('blocks', { hand }).slice(0, 3)).toEqual([
      id('sou-1'),
      id('sou-2'),
      id('sou-3'),
    ])
  })

  it('進張把對子留左、孤張放右', () => {
    expect(
      arrangeHand('ukeire', {
        hand: [id('pin-9'), id('man-5'), id('man-5')],
      }),
    ).toEqual([id('man-5'), id('man-5'), id('pin-9')])
  })

  it('重張按張數', () => {
    expect(
      arrangeHand('copies', {
        hand: [id('pin-1'), id('sou-9'), id('man-1'), id('sou-9'), id('man-1'), id('man-1')],
      }),
    ).toEqual([
      id('man-1'),
      id('man-1'),
      id('man-1'),
      id('sou-9'),
      id('sou-9'),
      id('pin-1'),
    ])
  })

  it('刻順字牌同對子靠左，只可上的數牌靠右', () => {
    expect(
      arrangeHand('pung', {
        hand: [id('man-3'), id('man-2'), id('pin-9'), id('pin-9'), id('dragon-zhong')],
      }),
    ).toEqual([
      id('dragon-zhong'),
      id('pin-9'),
      id('pin-9'),
      id('man-2'),
      id('man-3'),
    ])
  })

  it('么九字靠左', () => {
    expect(
      arrangeHand('terminals', {
        hand: [id('pin-3'), id('wind-east'), id('man-5'), id('man-1')],
      }),
    ).toEqual([id('man-1'), id('wind-east'), id('man-5'), id('pin-3')])
  })

  it('役向把最多的一門放左', () => {
    expect(
      arrangeHand('aim', {
        hand: [
          id('pin-9'),
          id('dragon-zhong'),
          id('dragon-zhong'),
          id('man-5'),
          id('man-4'),
          id('man-3'),
          id('man-2'),
          id('man-1'),
        ],
      }),
    ).toEqual([
      id('man-1'),
      id('man-2'),
      id('man-3'),
      id('man-4'),
      id('man-5'),
      id('dragon-zhong'),
      id('dragon-zhong'),
      id('pin-9'),
    ])
  })

  it('危險生張在左、現物在右', () => {
    expect(
      arrangeHand('danger', {
        hand: [id('man-1'), id('wind-east')],
        discards: [id('man-1')],
        seen: [id('man-1')],
      }),
    ).toEqual([id('wind-east'), id('man-1')])
  })

  it('過水把過碰同現物放右', () => {
    expect(
      arrangeHand('furiten', {
        hand: [id('man-9'), id('pin-5'), id('man-1')],
        discards: [id('man-9')],
        passedPong: [id('pin-5')],
      }),
    ).toEqual([id('man-1'), id('man-9'), id('pin-5')])
  })

  it('每種排法都唔會多牌少牌，剛摸的留最右', () => {
    const hand = [
      id('man-1'),
      id('man-1'),
      id('man-2'),
      id('man-3'),
      id('pin-5'),
      id('pin-5'),
      id('pin-5'),
      id('sou-9'),
      id('wind-east'),
      id('dragon-zhong'),
      id('flower-plum'),
    ]
    for (const mode of ARRANGE_MODES) {
      const out = arrangeHand(mode.id, {
        hand,
        justDrawn: id('sou-9'),
        discards: [id('pin-5')],
        seen: [id('pin-5'), id('pin-5')],
        passedPong: [id('wind-east')],
      })
      expect([...out].sort()).toEqual([...hand].sort())
      expect(out.at(-1)).toBe(id('sou-9'))
    }
  })
})

describe('manual order', () => {
  it('保留拖過的相對次序，新摸的牌貼右', () => {
    expect(
      reconcileOrder(
        [id('man-3'), id('man-1'), id('pin-5')],
        [id('man-1'), id('man-3'), id('sou-9')],
        id('sou-9'),
      ),
    ).toEqual([id('man-3'), id('man-1'), id('sou-9')])
  })

  it('已經排好的摸牌唔會再被拉去最右', () => {
    const placed = [id('man-3'), id('pin-5'), id('man-1')]
    expect(
      reconcileOrder(placed, [id('man-1'), id('man-3'), id('pin-5')], id('pin-5')),
    ).toEqual(placed)
  })

  it('打出的牌會從手動次序消失', () => {
    expect(
      reconcileOrder([id('man-3'), id('man-1')], [id('man-1')], null),
    ).toEqual([id('man-1')])
  })

  it('拉去指定位置', () => {
    const tiles = ['a', 'b', 'c', 'd']
    expect(moveTile(tiles, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveTile(tiles, 3, 1)).toEqual(['a', 'd', 'b', 'c'])
    expect(moveTile(tiles, 1, 1)).toEqual(tiles)
  })
})
