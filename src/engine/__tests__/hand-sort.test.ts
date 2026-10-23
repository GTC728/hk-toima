import { describe, expect, it } from 'vitest'
import { applyAction, createGame, getPrivateView, parseTile } from '../index'

function isSorted(hand: string[]): boolean {
  const order = (id: string): number => {
    const t = parseTile(id as never)
    const suitOrder: Record<string, number> = {
      man: 0,
      pin: 1,
      sou: 2,
      wind: 3,
      dragon: 4,
      flower: 5,
    }
    return suitOrder[t.suit]! * 100 + t.rank
  }
  for (let i = 1; i < hand.length; i++) {
    if (order(hand[i]!) < order(hand[i - 1]!)) return false
  }
  return true
}

describe('hand stays sorted', () => {
  it('createGame hands are sorted', () => {
    const g = createGame({ seed: 42 })
    for (const p of g.players) {
      expect(isSorted(p.hand)).toBe(true)
    }
  })

  it('after draw + discard private view stays sorted', () => {
    let g = createGame({ seed: 99 })
    const seat = g.currentSeat
    // 莊家開局已摸；打牌
    const tile = g.justDrawn ?? g.players[seat]!.hand[0]!
    g = applyAction(g, { type: 'discard', tile }, seat)
    // 可能 claim；盡量推進至有人摸完
    for (let i = 0; i < 8; i++) {
      if (g.phase === 'playing' && !g.justDrawn && !g.mustDiscard) {
        g = applyAction(g, { type: 'draw' }, g.currentSeat)
        break
      }
      if (g.phase === 'claim_window' && g.pendingDiscard) {
        for (const s of [...g.pendingDiscard.awaiting]) {
          g = applyAction(g, { type: 'pass' }, s)
        }
      } else break
    }
    const view = getPrivateView(g, g.currentSeat)
    expect(isSorted(view.hand)).toBe(true)
  })
})
