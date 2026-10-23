import { describe, expect, it } from 'vitest'
import {
  deadlineFromOpened,
  isExpired,
  remainingSec,
} from '../turn-timer'

describe('turn-timer', () => {
  it('deadlineFromOpened adds seconds', () => {
    expect(deadlineFromOpened(1_000, 20)).toBe(21_000)
    expect(deadlineFromOpened(1_000, 0)).toBe(1_000)
  })

  it('remainingSec ceilings and clamps at 0', () => {
    expect(remainingSec(10_500, 10_000)).toBe(1)
    expect(remainingSec(10_001, 10_000)).toBe(1)
    expect(remainingSec(10_000, 10_000)).toBe(0)
    expect(remainingSec(9_000, 10_000)).toBe(0)
  })

  it('isExpired', () => {
    expect(isExpired(10_000, 9_999)).toBe(false)
    expect(isExpired(10_000, 10_000)).toBe(true)
  })
})
