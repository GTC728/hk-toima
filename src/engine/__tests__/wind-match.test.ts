import { describe, expect, it } from 'vitest'
import {
  applyAction,
  createGame,
  dealerRoundLabel,
  getLegalActions,
  matchRoundLabel,
  windRoundLabel,
} from '../game'
import type { GameState, Seat } from '../types'

function forceRoundOver(
  state: GameState,
  nextDealer: Seat,
  nextConsecutiveWins = 0,
): GameState {
  const s = structuredClone(state)
  s.phase = 'round_over'
  s.lastResult = {
    kind: 'win',
    wins: [],
    nextDealer,
    nextConsecutiveWins,
  }
  return s
}

describe('matchRoundLabel helpers', () => {
  it('formats 東圈·南局', () => {
    expect(windRoundLabel(0)).toBe('東圈')
    expect(dealerRoundLabel(1)).toBe('南局')
    expect(matchRoundLabel(0, 1)).toBe('東圈·南局')
    expect(matchRoundLabel(2, 3)).toBe('西圈·北局')
  })
})

describe('windRound / match_over', () => {
  it('keeps windRound when dealer does not advance', () => {
    let g = createGame({ seed: 10, dealerSeat: 0 })
    expect(g.windRound).toBe(0)
    g = forceRoundOver(g, 0, 1) // 連莊
    g = applyAction(g, { type: 'nextRound', seed: 11 })
    expect(g.phase).toBe('playing')
    expect(g.dealer).toBe(0)
    expect(g.windRound).toBe(0)
    expect(g.round).toBe(2)
  })

  it('keeps windRound when dealer advances within the circle', () => {
    let g = createGame({ seed: 10, dealerSeat: 0 })
    g = forceRoundOver(g, 1, 0)
    g = applyAction(g, { type: 'nextRound', seed: 12 })
    expect(g.dealer).toBe(1)
    expect(g.windRound).toBe(0)
    expect(matchRoundLabel(g.windRound, g.dealer)).toBe('東圈·南局')
  })

  it('bumps windRound when dealership wraps 3→0', () => {
    let g = createGame({ seed: 10, dealerSeat: 3 })
    expect(g.windRound).toBe(0)
    g = forceRoundOver(g, 0, 0)
    g = applyAction(g, { type: 'nextRound', seed: 13 })
    expect(g.dealer).toBe(0)
    expect(g.windRound).toBe(1)
    expect(matchRoundLabel(g.windRound, g.dealer)).toBe('南圈·東局')
  })

  it('sets match_over when next wind would exceed matchCircles-1', () => {
    let g = createGame({
      seed: 10,
      dealerSeat: 3,
      rules: { matchCircles: 1 },
    })
    expect(g.rules.matchCircles).toBe(1)
    expect(g.windRound).toBe(0)
    g = forceRoundOver(g, 0, 0)
    g = applyAction(g, { type: 'nextRound', seed: 14 })
    expect(g.phase).toBe('match_over')
    expect(g.windRound).toBe(0)
    expect(g.dealer).toBe(3)
    const legal = getLegalActions(g, 0)
    expect(legal.some((a) => a.type === 'nextRound')).toBe(false)
    expect(legal.some((a) => a.type === 'settleAll')).toBe(true)
  })

  it('completes 4 circles before match_over', () => {
    let g = createGame({
      seed: 10,
      dealerSeat: 3,
      rules: { matchCircles: 4 },
    })
    // 東圈完 → 南 → 西 → 北；北圈完 → match_over
    for (const expectedWind of [1, 2, 3]) {
      g = forceRoundOver(g, 0, 0)
      g = applyAction(g, { type: 'nextRound', seed: 100 + expectedWind })
      expect(g.phase).toBe('playing')
      expect(g.windRound).toBe(expectedWind)
      // 推進到該圈北局（dealer 3）先再轉圈
      g = forceRoundOver(g, 3, 0)
      g = applyAction(g, { type: 'nextRound', seed: 200 + expectedWind })
      expect(g.dealer).toBe(3)
      expect(g.windRound).toBe(expectedWind)
    }
    g = forceRoundOver(g, 0, 0)
    g = applyAction(g, { type: 'nextRound', seed: 999 })
    expect(g.phase).toBe('match_over')
  })
})

describe('actionLog', () => {
  it('records createGame start and each applyAction', () => {
    let g = createGame({ seed: 7 })
    expect(g.actionLog[0]?.action).toEqual({ type: 'start' })
    expect(g.actionLog[0]?.note).toBe('createGame')
    const before = g.actionLog.length
    const seat = g.currentSeat
    const tile = g.justDrawn!
    g = applyAction(g, { type: 'discard', tile }, seat)
    expect(g.actionLog.length).toBe(before + 1)
    expect(g.actionLog.at(-1)).toMatchObject({
      seat,
      action: { type: 'discard', tile },
    })
    expect(g.history.length).toBeGreaterThan(0)
  })

  it('preserves actionLog across nextRound and marks match_over', () => {
    let g = createGame({
      seed: 8,
      dealerSeat: 3,
      rules: { matchCircles: 1 },
    })
    const startLen = g.actionLog.length
    g = forceRoundOver(g, 0, 0)
    g = applyAction(g, { type: 'nextRound', seed: 88 })
    expect(g.phase).toBe('match_over')
    expect(g.actionLog.length).toBe(startLen + 1)
    expect(g.actionLog.at(-1)?.note).toBe('match_over')
    expect(g.actionLog.at(-1)?.action).toEqual({ type: 'nextRound', seed: 88 })
  })

  it('四家預設金池，nextRound 繼承加扣', () => {
    let g = createGame({ seed: 20, dealerSeat: 0 })
    expect(g.players.every((p) => p.cash === 2000)).toBe(true)
    g.players[0]!.cash = 2100
    g.players[1]!.cash = 1900
    g.players[2]!.cash = 2050
    g.players[3]!.cash = 1950
    g = forceRoundOver(g, 0, 0)
    g = applyAction(g, { type: 'nextRound', seed: 21 })
    expect(g.players.map((p) => p.cash)).toEqual([2100, 1900, 2050, 1950])
  })
})
