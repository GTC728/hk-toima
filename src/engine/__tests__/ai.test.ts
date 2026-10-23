import { describe, expect, it } from 'vitest'
import { chooseAiAction } from '../ai'
import {
  applyAction,
  autoPassImpossibleClaims,
  createGame,
  getLegalActions,
} from '../game'
import type { Action, GameState, Seat, TileId } from '../types'

const MAX_STEPS = 8000

/** 四人 AI 推進一局，直到 round_over 或步數上限 */
function playAiRound(seed: number): { state: GameState; steps: number } {
  let state = createGame({ seed })
  let steps = 0

  while (state.phase !== 'round_over' && steps < MAX_STEPS) {
    state = autoPassImpossibleClaims(state)
    if (state.phase === 'round_over') break

    if (state.phase === 'claim_window' && state.pendingDiscard) {
      const awaiting = state.pendingDiscard.awaiting
      expect(awaiting.length).toBeGreaterThan(0)
      const seat = awaiting[0]!
      const action = chooseAiAction(state, seat)
      expect(action, `claim seat ${seat} step ${steps}`).not.toBeNull()
      expect(isLegalAction(state, seat, action!)).toBe(true)
      state = applyAction(state, action!, seat)
      steps++
      continue
    }

    if (state.phase === 'playing') {
      const seat = state.currentSeat
      const action = chooseAiAction(state, seat)
      expect(action, `playing seat ${seat} step ${steps}`).not.toBeNull()
      expect(isLegalAction(state, seat, action!)).toBe(true)
      state = applyAction(state, action!, seat)
      steps++
      continue
    }

    throw new Error(`unexpected phase ${state.phase} at step ${steps}`)
  }

  return { state, steps }
}

function isLegalAction(state: GameState, seat: Seat, action: Action): boolean {
  return getLegalActions(state, seat).some((a) => actionsEqual(a, action))
}

function actionsEqual(a: Action, b: Action): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'discard' && b.type === 'discard') return a.tile === b.tile
  if (a.type === 'chi' && b.type === 'chi') {
    return [...a.tiles].sort().join() === [...b.tiles].sort().join()
  }
  if (a.type === 'ankong' && b.type === 'ankong') return a.tile === b.tile
  if (a.type === 'jiagang' && b.type === 'jiagang') return a.tile === b.tile
  return true
}

function readyHand(pair: TileId): TileId[] {
  return [
    'man-1', 'man-2', 'man-3',
    'man-4', 'man-5',
    'pin-1', 'pin-2', 'pin-3',
    'pin-7', 'pin-8', 'pin-9',
    'sou-1', 'sou-2', 'sou-3',
    pair, pair,
  ]
}

describe('chooseAiAction', () => {
  it('prefers win when legal in claim window', () => {
    const g = createGame({ seed: 2 })
    g.phase = 'claim_window'
    g.pendingDiscard = {
      seat: 0,
      tile: 'man-6',
      awaiting: [1, 2, 3],
      claims: [],
    }
    g.players[1].hand = readyHand('wind-east')
    g.players[1].ding = null
    g.players[1].passedWinThisLap = false

    const legal = getLegalActions(g, 1)
    expect(legal.some((a) => a.type === 'win')).toBe(true)
    expect(chooseAiAction(g, 1)?.type).toBe('win')
  })

  it('prefers pong over chi and pass', () => {
    const g = createGame({ seed: 1 })
    g.phase = 'claim_window'
    g.chankan = false
    g.pendingDiscard = {
      seat: 0,
      tile: 'man-5',
      awaiting: [1, 2],
      claims: [],
    }
    // seat 1 can chi，但唔會糊
    g.players[1].hand = [
      'man-3', 'man-4',
      'pin-1', 'pin-3', 'pin-5', 'pin-7', 'pin-9',
      'sou-1', 'sou-3', 'sou-5', 'sou-7', 'sou-9',
      'wind-east', 'wind-south', 'dragon-zhong', 'dragon-fa',
    ]
    g.players[1].ding = null
    // seat 2 can pong，但唔會糊（散牌）
    g.players[2].hand = [
      'man-5', 'man-5',
      'pin-1', 'pin-3', 'pin-5', 'pin-7', 'pin-9',
      'sou-1', 'sou-3', 'sou-5', 'sou-7', 'sou-9',
      'wind-east', 'wind-south', 'dragon-zhong', 'dragon-fa',
    ]
    g.players[2].ding = null
    g.players[2].passedPong = []

    expect(chooseAiAction(g, 2)?.type).toBe('pong')
    expect(chooseAiAction(g, 1)?.type).toBe('chi')
  })

  it('passes in claim window when only pass is useful path after declining claims', () => {
    const g = createGame({ seed: 1 })
    g.phase = 'claim_window'
    g.chankan = false
    g.pendingDiscard = {
      seat: 0,
      tile: 'dragon-bai',
      awaiting: [3],
      claims: [],
    }
    // 無碰／槓／上／糊
    g.players[3].hand = [
      'man-1', 'man-2', 'man-3', 'man-4', 'man-5', 'man-6', 'man-7', 'man-8',
      'pin-1', 'pin-2', 'pin-3', 'pin-4', 'sou-1', 'sou-2', 'sou-3', 'sou-4',
    ]
    g.players[3].ding = null
    const legal = getLegalActions(g, 3)
    expect(legal.every((a) => a.type === 'pass')).toBe(true)
    expect(chooseAiAction(g, 3)?.type).toBe('pass')
  })

  it('returns null when seat has no legal actions', () => {
    const g = createGame({ seed: 3 })
    const idle = ((g.currentSeat + 1) % 4) as Seat
    expect(getLegalActions(g, idle)).toHaveLength(0)
    expect(chooseAiAction(g, idle)).toBeNull()
  })

  it('returns null at round_over (no auto nextRound)', () => {
    const g = createGame({ seed: 5 })
    g.phase = 'round_over'
    g.lastResult = {
      kind: 'draw',
      wins: [],
      nextDealer: g.dealer,
      nextConsecutiveWins: g.consecutiveWins,
    }
    expect(chooseAiAction(g, 0)).toBeNull()
  })

  it('plays one full round without throwing or infinite loop', () => {
    const { state, steps } = playAiRound(42)
    expect(steps).toBeLessThan(MAX_STEPS)
    expect(state.phase).toBe('round_over')
    expect(state.lastResult).not.toBeNull()
    expect(['win', 'draw']).toContain(state.lastResult!.kind)
  })

  it('plays many auto rounds without stalling', () => {
    const seeds = [1, 7, 13, 21, 42, 99, 100, 256, 512, 777, 1024, 2024]
    for (const seed of seeds) {
      const { state, steps } = playAiRound(seed)
      expect(steps, `seed ${seed}`).toBeLessThan(MAX_STEPS)
      expect(state.phase, `seed ${seed}`).toBe('round_over')
      expect(state.lastResult, `seed ${seed}`).not.toBeNull()
    }
  })
})
