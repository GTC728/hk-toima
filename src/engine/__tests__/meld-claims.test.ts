import { describe, expect, it } from 'vitest'
import {
  applyAction,
  autoPassImpossibleClaims,
  createGame,
  discardAndResolve,
  getLegalActions,
} from '../game'
import { canPong, findChiOptions } from '../hand'
import type { GameState, TileId } from '../types'

describe('chi / pong / kong helpers', () => {
  it('finds chi options', () => {
    const hand: TileId[] = ['man-2', 'man-3', 'pin-5']
    expect(findChiOptions(hand, 'man-1')).toEqual([['man-2', 'man-3']])
    expect(findChiOptions(hand, 'man-4')).toEqual([['man-2', 'man-3']])
  })

  it('detects pong', () => {
    expect(canPong(['man-5', 'man-5', 'pin-1'], 'man-5')).toBe(true)
    expect(canPong(['man-5', 'pin-1'], 'man-5')).toBe(false)
  })
})

describe('claim priority', () => {
  it('pong beats chi', () => {
    let g = createGame({ seed: 1 })
    g.currentSeat = 0
    g.phase = 'playing'
    g.justDrawn = 'man-5'
    g.players[0].hand = [
      'man-5', 'sou-1', 'sou-2', 'sou-3', 'sou-4', 'sou-5', 'sou-6', 'sou-7',
      'sou-8', 'sou-9', 'pin-1', 'pin-2', 'pin-3', 'pin-4', 'pin-5', 'pin-6', 'pin-7',
    ]
    g.players[1].hand = [
      'man-3', 'man-4', 'pin-1', 'pin-1', 'pin-2', 'pin-2', 'pin-3', 'pin-3',
      'sou-1', 'sou-1', 'sou-2', 'sou-2', 'sou-3', 'sou-3', 'wind-east', 'wind-east',
    ]
    g.players[2].hand = [
      'man-5', 'man-5', 'pin-4', 'pin-4', 'pin-5', 'pin-5', 'pin-6', 'pin-6',
      'sou-4', 'sou-4', 'sou-5', 'sou-5', 'sou-6', 'sou-6', 'wind-south', 'wind-south',
    ]
    g.players[3].hand = [
      'dragon-zhong', 'dragon-zhong', 'dragon-fa', 'dragon-fa',
      'wind-west', 'wind-west', 'wind-north', 'wind-north',
      'man-1', 'man-1', 'man-2', 'man-2', 'man-7', 'man-7', 'man-8', 'man-8',
    ]

    g = applyAction(g, { type: 'discard', tile: 'man-5' }, 0)
    expect(g.phase).toBe('claim_window')

    g = applyAction(g, { type: 'chi', tiles: ['man-3', 'man-4'] }, 1)
    g = applyAction(g, { type: 'pong' }, 2)
    g = applyAction(g, { type: 'pass' }, 3)

    expect(g.phase).toBe('playing')
    expect(g.currentSeat).toBe(2)
    expect(g.mustDiscard).toBe(true)
    expect(g.justDrawn).toBeNull()
    expect(getLegalActions(g, 2).every((a) => a.type === 'discard')).toBe(true)
    expect(getLegalActions(g, 2).some((a) => a.type === 'draw')).toBe(false)
    expect(g.players[2].melds.some((m) => m.kind === 'pong')).toBe(true)
    expect(g.players[1].melds).toHaveLength(0)
  })

  it('multi-ron allowed', () => {
    let g = createGame({ seed: 2 })
    g.currentSeat = 0
    g.phase = 'playing'
    g.justDrawn = 'man-6'
    g.players[0].hand = [
      'man-6', 'sou-1', 'sou-2', 'sou-3', 'sou-4', 'sou-5', 'sou-6', 'sou-7',
      'sou-8', 'sou-9', 'pin-1', 'pin-2', 'pin-3', 'pin-4', 'pin-5', 'pin-6', 'pin-7',
    ]
    // 16 張叫糊聽 man-6
    const ready = (pair: TileId): TileId[] => [
      'man-1', 'man-2', 'man-3',
      'man-4', 'man-5',
      'pin-1', 'pin-2', 'pin-3',
      'pin-7', 'pin-8', 'pin-9',
      'sou-1', 'sou-2', 'sou-3',
      pair, pair,
    ]
    g.players[1].hand = ready('wind-east')
    g.players[2].hand = ready('wind-south')
    g.players[3].hand = ready('wind-west')
    expect(g.players[1].hand).toHaveLength(16)

    const probe: GameState = structuredClone(g)
    probe.phase = 'claim_window'
    probe.pendingDiscard = {
      seat: 0,
      tile: 'man-6',
      awaiting: [1, 2, 3],
      claims: [],
    }
    expect(getLegalActions(probe, 1).some((a) => a.type === 'win')).toBe(true)

    g = applyAction(g, { type: 'discard', tile: 'man-6' }, 0)
    g = applyAction(g, { type: 'win' }, 1)
    g = applyAction(g, { type: 'win' }, 2)
    g = applyAction(g, { type: 'pass' }, 3)

    expect(g.phase).toBe('round_over')
    expect(g.lastResult?.kind).toBe('win')
    expect(g.lastResult?.wins).toHaveLength(2)
  })
})

describe('discard flow', () => {
  it('discardAndResolve advances when no claims', () => {
    const g0 = createGame({ seed: 3 })
    const tile = g0.justDrawn!
    const g1 = discardAndResolve(g0, tile, 0)
    expect(['playing', 'claim_window', 'round_over']).toContain(g1.phase)
    if (g1.phase === 'playing') {
      expect(g1.currentSeat).not.toBe(0)
      expect(g1.justDrawn).not.toBeNull()
    }
  })

  it('autoPassImpossibleClaims resolves empty claims', () => {
    let g = createGame({ seed: 4 })
    const tile = g.justDrawn!
    g = applyAction(g, { type: 'discard', tile }, 0)
    g = autoPassImpossibleClaims(g)
    expect(
      g.phase === 'playing' ||
        g.phase === 'round_over' ||
        g.phase === 'claim_window',
    ).toBe(true)
  })

  it('有人提交碰之後，上家唔再見到可上', () => {
    let g = createGame({ seed: 1 })
    g.currentSeat = 0
    g.phase = 'playing'
    g.justDrawn = 'man-5'
    g.players[0].hand = [
      'man-5', 'sou-1', 'sou-2', 'sou-3', 'sou-4', 'sou-5', 'sou-6', 'sou-7',
      'sou-8', 'sou-9', 'pin-1', 'pin-2', 'pin-3', 'pin-4', 'pin-5', 'pin-6', 'pin-7',
    ]
    g.players[1].hand = [
      'man-3', 'man-4', 'pin-1', 'pin-1', 'pin-2', 'pin-2', 'pin-3', 'pin-3',
      'sou-1', 'sou-1', 'sou-2', 'sou-2', 'sou-3', 'sou-3', 'wind-east', 'wind-east',
    ]
    g.players[2].hand = [
      'man-5', 'man-5', 'pin-4', 'pin-4', 'pin-5', 'pin-5', 'pin-6', 'pin-6',
      'sou-4', 'sou-4', 'sou-5', 'sou-5', 'sou-6', 'sou-6', 'wind-south', 'wind-south',
    ]
    g.players[3].hand = [
      'dragon-zhong', 'dragon-zhong', 'dragon-fa', 'dragon-fa',
      'wind-west', 'wind-west', 'wind-north', 'wind-north',
      'man-1', 'man-1', 'man-2', 'man-2', 'man-7', 'man-7', 'man-8', 'man-8',
    ]

    g = applyAction(g, { type: 'discard', tile: 'man-5' }, 0)
    expect(getLegalActions(g, 1).some((a) => a.type === 'chi')).toBe(true)

    g = applyAction(g, { type: 'pong' }, 2)
    const legalChiSeat = getLegalActions(g, 1)
    // 更高優先已提交 → 唔再顯示上／碰／槓（可食仍保留）
    expect(legalChiSeat.some((a) => a.type === 'chi')).toBe(false)
    expect(legalChiSeat.some((a) => a.type === 'pong')).toBe(false)
    expect(legalChiSeat.some((a) => a.type === 'mingkong')).toBe(false)
    expect(legalChiSeat.some((a) => a.type === 'pass')).toBe(true)

    g = applyAction(g, { type: 'pass' }, 1)
    g = autoPassImpossibleClaims(g)
    expect(g.phase).toBe('playing')
    expect(g.currentSeat).toBe(2)
  })

  it('強制 pass（被更高優先搶去）唔記過碰', () => {
    let g = createGame({ seed: 1 })
    g.currentSeat = 0
    g.phase = 'playing'
    g.justDrawn = 'man-5'
    g.players[0].hand = [
      'man-5', 'sou-1', 'sou-2', 'sou-3', 'sou-4', 'sou-5', 'sou-6', 'sou-7',
      'sou-8', 'sou-9', 'pin-1', 'pin-2', 'pin-3', 'pin-4', 'pin-5', 'pin-6', 'pin-7',
    ]
    g.players[1].hand = [
      'man-5', 'man-5', 'pin-1', 'pin-1', 'pin-2', 'pin-2', 'pin-3', 'pin-3',
      'sou-1', 'sou-1', 'sou-2', 'sou-2', 'sou-3', 'sou-3', 'wind-east', 'wind-east',
    ]
    g.players[2].hand = [
      'pin-4', 'pin-4', 'pin-5', 'pin-5', 'pin-6', 'pin-6',
      'sou-4', 'sou-4', 'sou-5', 'sou-5', 'sou-6', 'sou-6', 'wind-south', 'wind-south',
      'man-1', 'man-1',
    ]
    g.players[3].hand = [
      'dragon-zhong', 'dragon-zhong', 'dragon-fa', 'dragon-fa',
      'wind-west', 'wind-west', 'wind-north', 'wind-north',
      'man-2', 'man-2', 'man-7', 'man-7', 'man-8', 'man-8', 'man-3', 'man-3',
    ]

    g = applyAction(g, { type: 'discard', tile: 'man-5' }, 0)
    expect(canPong(g.players[1].hand, 'man-5')).toBe(true)

    // 模擬被更高優先搶去後嘅 autoPass
    g = applyAction(g, { type: 'pass', forced: true }, 1)
    expect(g.players[1].passedPong).not.toContain('man-5')
  })

  it('主動 pass 先記過碰', () => {
    let g = createGame({ seed: 1 })
    g.currentSeat = 0
    g.phase = 'playing'
    g.justDrawn = 'man-5'
    g.players[0].hand = [
      'man-5', 'sou-1', 'sou-2', 'sou-3', 'sou-4', 'sou-5', 'sou-6', 'sou-7',
      'sou-8', 'sou-9', 'pin-1', 'pin-2', 'pin-3', 'pin-4', 'pin-5', 'pin-6', 'pin-7',
    ]
    g.players[1].hand = [
      'man-5', 'man-5', 'pin-1', 'pin-1', 'pin-2', 'pin-2', 'pin-3', 'pin-3',
      'sou-1', 'sou-1', 'sou-2', 'sou-2', 'sou-3', 'sou-3', 'wind-east', 'wind-east',
    ]
    g.players[2].hand = [
      'pin-4', 'pin-4', 'pin-5', 'pin-5', 'pin-6', 'pin-6',
      'sou-4', 'sou-4', 'sou-5', 'sou-5', 'sou-6', 'sou-6', 'wind-south', 'wind-south',
      'man-1', 'man-1',
    ]
    g.players[3].hand = [
      'dragon-zhong', 'dragon-zhong', 'dragon-fa', 'dragon-fa',
      'wind-west', 'wind-west', 'wind-north', 'wind-north',
      'man-2', 'man-2', 'man-7', 'man-7', 'man-8', 'man-8', 'man-3', 'man-3',
    ]

    g = applyAction(g, { type: 'discard', tile: 'man-5' }, 0)
    expect(canPong(g.players[1].hand, 'man-5')).toBe(true)
    g = applyAction(g, { type: 'pass' }, 1)
    expect(g.players[1].passedPong).toContain('man-5')
  })

  it('系統自動過唔入 actionLog；超時過會入', () => {
    let g = createGame({ seed: 1 })
    g.currentSeat = 0
    g.phase = 'playing'
    g.justDrawn = 'sou-9'
    g.players[0].hand = [
      'sou-9', 'man-1', 'man-2', 'man-3', 'man-4', 'man-5', 'man-6', 'man-7',
      'pin-1', 'pin-2', 'pin-3', 'pin-4', 'pin-5', 'pin-6', 'pin-7', 'pin-8', 'pin-9',
    ]
    for (const seat of [1, 2, 3] as const) {
      g.players[seat].hand = [
        'dragon-zhong', 'dragon-fa', 'dragon-bai', 'wind-east',
        'wind-south', 'wind-west', 'wind-north', 'man-1',
        'man-2', 'man-3', 'man-4', 'man-5', 'man-6', 'man-7', 'man-8', 'man-9',
      ]
    }
    g = applyAction(g, { type: 'discard', tile: 'sou-9' }, 0)
    const passBefore = g.actionLog.filter((e) => e.action.type === 'pass').length
    g = autoPassImpossibleClaims(g)
    const autoPasses = g.actionLog.filter(
      (e) => e.action.type === 'pass' && e.action.reason === 'auto',
    )
    expect(autoPasses).toHaveLength(0)
    expect(
      g.actionLog.filter((e) => e.action.type === 'pass').length,
    ).toBe(passBefore)
    // 全自動過後會摸牌（有 draw log），唔再喺 claim_window
    expect(g.phase).toBe('playing')
    expect(g.actionLog.some((e) => e.action.type === 'draw')).toBe(true)

    // 超時過：另開窗驗證仍入 log
    g.phase = 'claim_window'
    g.pendingDiscard = {
      seat: 0,
      tile: 'man-1',
      awaiting: [1],
      claims: [],
    }
    const n = g.actionLog.length
    g = applyAction(g, { type: 'pass', reason: 'timeout' }, 1)
    const timeoutEntry = g.actionLog.find(
      (e, i) => i >= n && e.action.type === 'pass' && e.action.reason === 'timeout',
    )
    expect(timeoutEntry).toBeTruthy()
  })
})
