import { describe, expect, it } from 'vitest'
import { parseSoundEnabled } from './audio'
import { parsePracticeHints } from './playPrefs'

describe('parseSoundEnabled', () => {
  it('未寫新鍵時，舊靜音等於兩邊都關', () => {
    expect(parseSoundEnabled(null, '1')).toBe(false)
    expect(parseSoundEnabled(null, null)).toBe(true)
    expect(parseSoundEnabled(null, '0')).toBe(true)
  })

  it('寫過新鍵就唔再跟舊靜音', () => {
    expect(parseSoundEnabled('1', '1')).toBe(true)
    expect(parseSoundEnabled('0', '0')).toBe(false)
  })
})

describe('parsePracticeHints', () => {
  it('未設定當開，只有明確關掉先關', () => {
    expect(parsePracticeHints(null)).toBe(true)
    expect(parsePracticeHints('1')).toBe(true)
    expect(parsePracticeHints('0')).toBe(false)
  })
})
