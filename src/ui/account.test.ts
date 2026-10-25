import { describe, expect, it } from 'vitest'
import {
  careerPrompted,
  lobbyDisplayName,
  shouldOfferCareerImport,
} from './account'

describe('lobby account name', () => {
  it('uses the account name when the worker answered', () => {
    expect(lobbyDisplayName('阿明', '玩家')).toBe('阿明')
  })

  it('keeps the local name when the account request failed', () => {
    expect(lobbyDisplayName(null, '東')).toBe('東')
    expect(lobbyDisplayName('  ', '玩家')).toBe('玩家')
    expect(lobbyDisplayName(null, '  ')).toBe('玩家')
  })
})

describe('career import prompt', () => {
  it('asks once, and only when this browser still has local rounds', () => {
    expect(shouldOfferCareerImport(3, 1, false)).toBe(true)
    expect(shouldOfferCareerImport(0, 0, false)).toBe(false)
    expect(shouldOfferCareerImport(3, 1, true)).toBe(false)
    expect(careerPrompted('1')).toBe(true)
    expect(careerPrompted(null)).toBe(false)
  })
})
