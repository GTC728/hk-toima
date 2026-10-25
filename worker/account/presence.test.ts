import { describe, expect, it } from 'vitest'
import {
  PRESENCE_INGAME_MS,
  PRESENCE_ONLINE_MS,
  presenceOf,
} from './store'

describe('presenceOf', () => {
  const now = 1_000_000

  it('offline when no signals', () => {
    expect(presenceOf(null, null, now)).toBe('offline')
  })

  it('online within window', () => {
    expect(presenceOf(now - PRESENCE_ONLINE_MS + 1, null, now)).toBe('online')
    expect(presenceOf(now - PRESENCE_ONLINE_MS - 1, null, now)).toBe('offline')
  })

  it('ingame beats online', () => {
    expect(
      presenceOf(now, now - PRESENCE_INGAME_MS + 1, now),
    ).toBe('ingame')
  })
})
