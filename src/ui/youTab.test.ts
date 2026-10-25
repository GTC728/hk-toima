import { describe, expect, it } from 'vitest'
import { parseYouHash, youHash } from './youTab'
import { isSettingsHash, parseSettingsHash, settingsHash } from './settingsNav'

describe('parseYouHash', () => {
  it('只接受個人頁（設定獨立）', () => {
    expect(parseYouHash('#/you/profile')).toBe('profile')
    expect(parseYouHash('#/you/data')).toBe('data')
    expect(parseYouHash('#/you/awards')).toBe('awards')
    expect(parseYouHash('#/you/social')).toBe('social')
    expect(parseYouHash('#/you/archive')).toBe('archive')
    expect(parseYouHash('#/you/settings')).toBeNull()
    expect(parseYouHash('#/you/nope')).toBeNull()
    expect(parseYouHash('')).toBeNull()
  })

  it('寫出可以再讀返', () => {
    expect(parseYouHash(youHash('archive'))).toBe('archive')
  })
})

describe('settings hash', () => {
  it('獨立設定頁', () => {
    expect(settingsHash('board')).toBe('#/settings/board')
    expect(parseSettingsHash('#/settings')).toBe('board')
    expect(parseSettingsHash('#/settings/sound')).toBe('sound')
    expect(parseSettingsHash('#/settings/account')).toBe('account')
    expect(isSettingsHash('#/settings/board')).toBe(true)
  })

  it('相容舊 #/you/settings', () => {
    expect(parseSettingsHash('#/you/settings')).toBe('board')
    expect(parseSettingsHash('#/you/settings/play')).toBe('play')
    expect(isSettingsHash('#/you/settings/a11y')).toBe(true)
  })
})
