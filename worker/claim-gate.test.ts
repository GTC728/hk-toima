import { describe, expect, it } from 'vitest'
import {
  aiClaimSeats,
  aiMayClaim,
  rejectHumanAction,
  type RoomSeatKind,
} from './claim-gate'
import type { Seat } from '../src/engine'

const kinds = (map: Partial<Record<Seat, RoomSeatKind>>) => (seat: Seat) =>
  map[seat] ?? 'empty'

describe('room claim gate', () => {
  it('rejects actions before start and from non-human seats', () => {
    expect(rejectHumanAction(false, 'human')).toEqual({
      message: '未開始',
      code: 'not_started',
    })
    expect(rejectHumanAction(true, 'ai')).toEqual({
      message: '唔係你嘅座位',
      code: 'not_human',
    })
    expect(rejectHumanAction(true, 'empty')).toEqual({
      message: '唔係你嘅座位',
      code: 'not_human',
    })
    expect(rejectHumanAction(true, 'human')).toBeNull()
  })

  it('does not let AI claim while a human is still awaiting', () => {
    const kindOf = kinds({ 0: 'human', 1: 'ai', 2: 'ai', 3: 'human' })
    const awaiting: Seat[] = [1, 3]
    expect(aiMayClaim(awaiting, kindOf)).toBe(false)
    expect(aiClaimSeats(awaiting, kindOf)).toEqual([])
  })

  it('lets AI claim after every human has answered', () => {
    const kindOf = kinds({ 0: 'human', 1: 'ai', 2: 'ai', 3: 'human' })
    const awaiting: Seat[] = [1, 2]
    expect(aiMayClaim(awaiting, kindOf)).toBe(true)
    expect(aiClaimSeats(awaiting, kindOf)).toEqual([1, 2])
  })

  it('does not claim when nobody awaiting is AI', () => {
    const kindOf = kinds({ 0: 'human', 1: 'human', 2: 'empty', 3: 'empty' })
    expect(aiMayClaim([1], kindOf)).toBe(false)
    expect(aiClaimSeats([], kindOf)).toEqual([])
  })
})
