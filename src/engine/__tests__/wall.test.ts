import { describe, expect, it } from 'vitest'
import { createFullWall, isFlower } from '../tiles'
import { dealWall, wallRemaining } from '../wall'
import { createGame } from '../game'

describe('wall & deal', () => {
  it('full wall has 144 tiles', () => {
    expect(createFullWall()).toHaveLength(144)
  })

  it('deal gives each seat 16 tiles before flower supplement', () => {
    const dealt = dealWall(42, 0)
    for (let s = 0; s < 4; s++) {
      expect(dealt.hands[s as 0 | 1 | 2 | 3]).toHaveLength(16)
    }
    expect(dealt.liveIndex).toBe(64)
    expect(wallRemaining(dealt.liveIndex, dealt.deadIndex)).toBe(80)
  })

  it('createGame supplements flowers and dealer draws', () => {
    const g = createGame({ seed: 7 })
    for (let s = 0; s < 4; s++) {
      const p = g.players[s as 0 | 1 | 2 | 3]
      expect(p.hand.every((t) => !isFlower(t))).toBe(true)
      if (s === g.dealer) {
        // 莊家已摸：17 張（或補花後同等）
        expect(p.hand.length).toBe(17)
      } else {
        expect(p.hand.length).toBe(16)
      }
    }
    expect(g.justDrawn).not.toBeNull()
    expect(g.dice).toHaveLength(3)
  })

  it('same seed is deterministic', () => {
    const a = createGame({ seed: 99 })
    const b = createGame({ seed: 99 })
    expect(a.wall).toEqual(b.wall)
    expect(a.players[0].hand).toEqual(b.players[0].hand)
    expect(a.dice).toEqual(b.dice)
  })
})
