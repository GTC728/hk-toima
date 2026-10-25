import { describe, expect, it } from 'vitest'
import { afterPlayerAction, createGame } from '../game'
import type { GameState, Seat, TileId } from '../types'
import { DEFAULT_RULES } from '../types'

/**
 * 由 createGame 開局，再用 applyAction（經 afterPlayerAction）打出、碰、食糊。
 * 銀碼同拉帳必須係引擎結算，唔係手寫 ledger。
 */
describe('discard → pong → win', () => {
  it('records la debt and leaves cash until the la is settled', () => {
    let g = createGame({
      seed: 11,
      rules: { ...DEFAULT_RULES, base: 5, fanValue: 2 },
    })
    arrange(g)

    const cashBefore = g.players.map((p) => p.cash)
    expect(g.laLedger).toEqual([])

    g = afterPlayerAction(g, { type: 'discard', tile: 'pin-9' }, 0)
    expect(g.phase).toBe('claim_window')
    expect(g.pendingDiscard?.awaiting).toContain(1)

    g = afterPlayerAction(g, { type: 'pong' }, 1)
    expect(g.phase).toBe('playing')
    expect(g.currentSeat).toBe(1)
    expect(g.mustDiscard).toBe(true)
    expect(g.players[1].melds.some((m) => m.kind === 'pong' && m.claimedTile === 'pin-9')).toBe(
      true,
    )

    g = afterPlayerAction(g, { type: 'discard', tile: 'man-3' }, 1)
    expect(g.phase).toBe('claim_window')
    g = afterPlayerAction(g, { type: 'win' }, 2)
    if (g.phase === 'claim_window' && g.pendingDiscard) {
      for (const seat of [...g.pendingDiscard.awaiting]) {
        g = afterPlayerAction(g, { type: 'pass' }, seat)
      }
    }

    expect(g.phase).toBe('round_over')
    expect(g.lastResult?.kind).toBe('win')
    expect(g.lastResult?.wins.map((w) => w.seat)).toEqual([2])
    const win = g.lastResult!.wins[0]!
    const amount = win.payments[0]!.amount
    expect(amount).toBeGreaterThan(0)
    expect(win.payments).toEqual([{ from: 1, to: 2, amount }])
    expect(g.players.map((p) => p.cash)).toEqual(cashBefore)
    expect(g.laLedger).toEqual([
      {
        creditor: 2,
        debtor: 1,
        amount,
        kou: 1,
        lastHandAmount: amount,
        prevAmount: 0,
      },
    ])
  })
})

function arrange(g: GameState): void {
  const seat0: TileId[] = [
    'pin-9',
    'sou-1', 'sou-2', 'sou-3', 'sou-4', 'sou-5', 'sou-6', 'sou-7', 'sou-8', 'sou-9',
    'man-7', 'man-8', 'man-9',
    'pin-1', 'pin-2', 'pin-3',
  ]
  const seat1: TileId[] = [
    'pin-9', 'pin-9', 'man-3',
    'wind-east', 'wind-east',
    'wind-south', 'wind-south',
    'wind-west', 'wind-west',
    'wind-north', 'wind-north',
    'dragon-zhong', 'dragon-zhong',
    'dragon-fa', 'dragon-fa',
    'dragon-bai',
  ]
  const seat2: TileId[] = [
    'man-1', 'man-2',
    'man-4', 'man-5', 'man-6',
    'man-7', 'man-8', 'man-9',
    'pin-1', 'pin-2', 'pin-3',
    'sou-1', 'sou-2', 'sou-3',
    'sou-9', 'sou-9',
  ]
  const seat3: TileId[] = [
    'wind-east', 'wind-south', 'wind-west', 'wind-north',
    'dragon-zhong', 'dragon-fa', 'dragon-bai',
    'man-9', 'pin-8', 'sou-8',
    'man-8', 'pin-7', 'sou-7',
    'man-6', 'pin-6', 'sou-6',
  ]
  const hands = [seat0, seat1, seat2, seat3]
  for (let s = 0; s < 4; s++) {
    const p = g.players[s as Seat]!
    p.hand = hands[s]!
    p.melds = []
    p.flowers = []
    p.discards = []
    p.ding = null
    p.passedPong = []
    p.passedWinThisLap = false
  }
  g.currentSeat = 0
  g.phase = 'playing'
  g.justDrawn = 'pin-9'
  g.mustDiscard = false
  g.pendingDiscard = null
  g.chankan = false
  g.discardsThisRound = 4
  g.flowerDrawChain = 0
  g.kongDrawChain = 0
  g.lastSupplement = null
}
