import { describe, expect, it } from 'vitest'
import type { ActionLogEntry } from '../../engine'
import {
  aggregatePrefs,
  type RoundRecord,
} from '../stats'
import {
  derivePrefsSnapshot,
  dominantSuit,
  tileSuitBias,
} from '../stats-prefs'

describe('tileSuitBias', () => {
  it('classifies suits', () => {
    expect(tileSuitBias('man-3')).toBe('man')
    expect(tileSuitBias('pin-9')).toBe('pin')
    expect(tileSuitBias('sou-1')).toBe('sou')
    expect(tileSuitBias('wind-east')).toBe('honor')
    expect(tileSuitBias('dragon-zhong')).toBe('honor')
  })
})

describe('derivePrefsSnapshot', () => {
  it('reads first discard ding and terminals', () => {
    const log: ActionLogEntry[] = [
      { t: 1, seat: null, action: { type: 'start' } },
      { t: 2, seat: 0, action: { type: 'discard', tile: 'man-1' } },
      { t: 3, seat: 1, action: { type: 'discard', tile: 'pin-5' } },
      {
        t: 4,
        seat: 0,
        action: { type: 'discard', tile: 'wind-east', declareDing: true },
      },
    ]
    const p = derivePrefsSnapshot(log, 0, {
      flowerCount: 2,
      dingActive: true,
    })
    expect(p.firstDiscard).toBe('man')
    expect(p.discards.man).toBe(1)
    expect(p.discards.honor).toBe(1)
    expect(p.discardTerminal).toBe(1)
    expect(p.ding).toBe(true)
    expect(p.dingTurn).toBe(2)
    expect(p.flowerCount).toBe(2)
  })
})

describe('dominantSuit', () => {
  it('picks clear leader', () => {
    expect(
      dominantSuit({ man: 5, pin: 2, sou: 1, honor: 3 }),
    ).toBe('man')
    expect(
      dominantSuit({ man: 2, pin: 2, sou: 1, honor: 0 }),
    ).toBeNull()
  })
})

describe('aggregatePrefs', () => {
  it('fans and first discard', () => {
    const rounds: RoundRecord[] = [
      {
        t: 1,
        mode: 'local',
        outcome: 'win',
        fan: 8,
        prefs: {
          firstDiscard: 'man',
          discards: { man: 4, pin: 1, sou: 2, honor: 1 },
          discardTerminal: 2,
          ding: true,
          dingTurn: 3,
          flowerCount: 1,
          fanNames: ['平糊', '門清'],
        },
      },
      {
        t: 2,
        mode: 'local',
        outcome: 'deal_in',
        prefs: {
          firstDiscard: 'sou',
          discards: { man: 1, pin: 1, sou: 5, honor: 0 },
          discardTerminal: 0,
          ding: false,
          flowerCount: 0,
        },
      },
    ]
    const a = aggregatePrefs(rounds)
    expect(a.firstDiscard.man).toBe(1)
    expect(a.mainSuit).toBe('sou')
    expect(a.avgFan).toBe(8)
    expect(a.maxFan).toBe(8)
    expect(a.fanTop[0]?.name).toBe('平糊')
    expect(a.dingRate).toBeCloseTo(0.5)
    expect(a.avgFlowers).toBeCloseTo(0.5)
  })
})
