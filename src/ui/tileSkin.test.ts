import { describe, expect, it } from 'vitest'
import { parseTileSkin } from './tileSkin'

describe('parseTileSkin', () => {
  it('只接受四款，其餘返紅背', () => {
    expect(parseTileSkin(null)).toBe('ivory')
    expect(parseTileSkin('nope')).toBe('ivory')
    expect(parseTileSkin('black')).toBe('black')
    expect(parseTileSkin('bone')).toBe('bone')
    expect(parseTileSkin('line')).toBe('line')
    expect(parseTileSkin('hk')).toBe('hk')
    expect(parseTileSkin('relief')).toBe('relief')
  })
})
