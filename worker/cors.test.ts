import { describe, expect, it } from 'vitest'
import { corsHeaders, isEchoableOrigin } from './cors'

describe('credential CORS', () => {
  it('never echoes * when credentials are allowed', () => {
    const missing = corsHeaders(new Request('https://hk-toima.example/api/me'))
    expect(missing['access-control-allow-origin']).toBeUndefined()
    expect(missing['access-control-allow-credentials']).toBeUndefined()
    expect(JSON.stringify(missing)).not.toContain('*')

    const echoed = corsHeaders(
      new Request('https://hk-toima.example/api/me', {
        headers: { Origin: 'http://localhost:5173' },
      }),
    )
    expect(echoed['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(echoed['access-control-allow-credentials']).toBe('true')
    expect(isEchoableOrigin('*')).toBe(false)
    expect(isEchoableOrigin('null')).toBe(false)
  })
})
