import { describe, expect, it } from 'vitest'
import {
  chooseAiAction,
  chooseDiscardTile,
  defaultAiPersonas,
  discardKeepScore,
  type AiPersona,
} from '../ai'
import { AI_DELAY_MS, aiThinkMs } from '../timing'
import { applyAction, autoPassImpossibleClaims, createGame, getLegalActions } from '../game'
import type { Action, GameState, Meld, Seat, TileId } from '../types'

const PERSONAS: AiPersona[] = ['steady', 'attack', 'gamble']

function pong(tile: TileId): Meld {
  return { kind: 'pong', tiles: [tile, tile, tile], claimedTile: tile, fromSeat: 0 }
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

/** 南家似聽（三副），西家要打。現張係 pin-5，活張中張係 man-5。 */
function threatDiscard(seed = 11): GameState {
  const g = createGame({ seed, dealerSeat: 0 })
  g.phase = 'playing'
  g.currentSeat = 2
  g.mustDiscard = true
  g.justDrawn = null
  g.pendingDiscard = null
  g.discardsThisRound = 0
  g.players[2].ding = null
  g.players[2].hand = [
    'pin-4', 'pin-5', 'pin-6',
    'man-5',
    'man-9',
    'sou-1',
    'sou-3',
    'sou-7',
    'wind-east',
    'wind-west',
    'wind-south',
    'dragon-fa',
    'dragon-zhong',
    'pin-1',
    'pin-9',
    'sou-2',
    'sou-8',
  ]
  g.players[1].melds = [pong('man-2'), pong('man-3'), pong('man-7')]
  g.players[1].discards = ['pin-5']
  return g
}

describe('ai personas', () => {
  it('defaults human east to steady, attack, gamble on the other seats', () => {
    expect(defaultAiPersonas([true, false, false, false])).toEqual([
      'attack',
      'steady',
      'attack',
      'gamble',
    ])
  })

  it('preferred persona goes to the first AI seat', () => {
    expect(defaultAiPersonas([true, false, false, false], 'gamble')).toEqual([
      'attack',
      'gamble',
      'steady',
      'attack',
    ])
  })

  it('keeps the unweighted discard score used by hints', () => {
    const hand = ['man-1', 'man-2', 'man-3', 'wind-east']
    const visible = new Map<TileId, number>()
    expect(discardKeepScore('man-1', hand, visible)).toBe(25)
    expect(discardKeepScore('man-2', hand, visible)).toBe(39)
    expect(discardKeepScore('man-3', hand, visible)).toBe(30)
    expect(discardKeepScore('wind-east', hand, visible)).toBe(8)
    visible.set('man-1', 2)
    expect(discardKeepScore('man-1', hand, visible)).toBe(11)

    const g = createGame({ seed: 4 })
    g.phase = 'playing'
    g.mustDiscard = true
    g.currentSeat = 0
    g.players[0].hand = hand
    expect(chooseDiscardTile(g, 0, hand)).toBe('wind-east')
  })

  it('attack still pongs and chis', () => {
    const g = createGame({ seed: 1 })
    g.phase = 'claim_window'
    g.chankan = false
    g.pendingDiscard = {
      seat: 0,
      tile: 'man-5',
      awaiting: [1, 2],
      claims: [],
    }
    g.players[1].hand = [
      'man-3', 'man-4',
      'pin-1', 'pin-3', 'pin-5', 'pin-7', 'pin-9',
      'sou-1', 'sou-3', 'sou-5', 'sou-7', 'sou-9',
      'wind-east', 'wind-south', 'dragon-zhong', 'dragon-fa',
    ]
    g.players[1].ding = null
    g.players[2].hand = [
      'man-5', 'man-5',
      'pin-1', 'pin-3', 'pin-5', 'pin-7', 'pin-9',
      'sou-1', 'sou-3', 'sou-5', 'sou-7', 'sou-9',
      'wind-east', 'wind-south', 'dragon-zhong', 'dragon-fa',
    ]
    g.players[2].ding = null
    g.players[2].passedPong = []

    expect(chooseAiAction(g, 2, 'attack')?.type).toBe('pong')
    expect(chooseAiAction(g, 1, 'attack')?.type).toBe('chi')
  })

  it('steady passes a pong that spends the only eye', () => {
    const g = createGame({ seed: 1 })
    g.phase = 'claim_window'
    g.chankan = false
    g.pendingDiscard = {
      seat: 0,
      tile: 'man-5',
      awaiting: [2],
      claims: [],
    }
    g.players[2].hand = [
      'man-5', 'man-5',
      'pin-1', 'pin-3', 'pin-5', 'pin-7', 'pin-9',
      'sou-1', 'sou-3', 'sou-5', 'sou-7', 'sou-9',
      'wind-east', 'wind-south', 'dragon-zhong', 'dragon-fa',
    ]
    g.players[2].ding = null
    g.players[2].passedPong = []
    expect(getLegalActions(g, 2).some((a) => a.type === 'pong')).toBe(true)
    expect(chooseAiAction(g, 2, 'steady')).toEqual({ type: 'pass' })
  })

  it('steady discards genbutsu instead of a live middle when someone looks tenpai', () => {
    const g = threatDiscard()
    const action = chooseAiAction(g, 2, 'steady')
    expect(action).toEqual({ type: 'discard', tile: 'pin-5' })
  })

  it('la debt owed to that player makes steady discard an even safer tile', () => {
    const safeEnough = threatDiscard()
    safeEnough.players[3].discards = ['man-9', 'man-9', 'man-9']
    expect(chooseAiAction(safeEnough, 2, 'steady')).toEqual({
      type: 'discard',
      tile: 'man-9',
    })

    const owing = threatDiscard()
    owing.players[3].discards = ['man-9', 'man-9', 'man-9']
    owing.laLedger = [{ creditor: 1, debtor: 2, amount: 80, kou: 1 }]
    expect(chooseAiAction(owing, 2, 'steady')).toEqual({
      type: 'discard',
      tile: 'pin-5',
    })
  })

  it('same seed discards the same tile', () => {
    const g = threatDiscard(42)
    const first = chooseAiAction(g, 2, 'gamble')
    const second = chooseAiAction(g, 2, 'gamble')
    expect(first?.type).toBe('discard')
    expect(second).toEqual(first)
  })

  it('wins before anything else for every persona', () => {
    for (const persona of PERSONAS) {
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
      expect(getLegalActions(g, 1).some((a) => a.type === 'win'), persona).toBe(true)
      expect(chooseAiAction(g, 1, persona)?.type, persona).toBe('win')
    }
  })

  it('plays a full round for each persona with only legal actions', () => {
    for (const persona of PERSONAS) {
      let state = createGame({ seed: 42 })
      let steps = 0
      while (state.phase !== 'round_over' && steps < 8000) {
        state = autoPassImpossibleClaims(state)
        if (state.phase === 'round_over') break
        const seat: Seat =
          state.phase === 'claim_window' && state.pendingDiscard
            ? state.pendingDiscard.awaiting[0]!
            : state.currentSeat
        const action = chooseAiAction(state, seat, persona)
        expect(action, `${persona} step ${steps}`).not.toBeNull()
        expect(isLegal(state, seat, action!), `${persona} ${action!.type}`).toBe(true)
        state = applyAction(state, action!, seat)
        steps++
      }
      expect(state.phase, persona).toBe('round_over')
      expect(steps, persona).toBeLessThan(8000)
    }
  })

  it('thinks 4500 / 3000 / 1600', () => {
    expect(aiThinkMs('steady')).toBe(4500)
    expect(aiThinkMs('attack')).toBe(3000)
    expect(aiThinkMs('attack')).toBe(AI_DELAY_MS)
    expect(aiThinkMs('gamble')).toBe(1600)
    expect(aiThinkMs()).toBe(3000)
  })
})

function isLegal(state: GameState, seat: Seat, action: Action): boolean {
  return getLegalActions(state, seat).some((legal) => {
    if (legal.type !== action.type) return false
    if (legal.type === 'discard' && action.type === 'discard') return legal.tile === action.tile
    if (legal.type === 'chi' && action.type === 'chi') {
      return [...legal.tiles].sort().join() === [...action.tiles].sort().join()
    }
    if (legal.type === 'ankong' && action.type === 'ankong') return legal.tile === action.tile
    if (legal.type === 'jiagang' && action.type === 'jiagang') return legal.tile === action.tile
    return true
  })
}
