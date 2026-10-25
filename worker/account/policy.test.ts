import { describe, expect, it } from 'vitest'
import {
  acceptImport,
  canonicalCareer,
  careerContentHash,
  decideEmailConsume,
  isEmptyAnonymous,
  isProductionRuntime,
  hasOutboundMail,
  mailDelivery,
  normalizeCareer,
  normalizeEmail,
  rateLimitAllows,
  readProfilePatch,
  EMAIL_SEND_LIMIT,
  CLIENT_SEND_LIMIT,
  type AccountSnapshot,
} from './policy'
import { verifyTurnstile } from './turnstile'
import {
  clearSessionCookie,
  cookieSecure,
  extendExpiry,
  initialExpiry,
  randomFriendCode,
  randomToken,
  readSessionCookie,
  serializeSessionCookie,
  sessionUsable,
  sha256Hex,
  SESSION_IDLE_MS,
  SESSION_MAX_MS,
  tokenByteLength,
  TOKEN_BYTES,
} from './token'
import {
  canChangeProfile,
  REDACTED_SEAT_NAME,
  seatAssignment,
  seatTokenMatches,
} from '../seat-auth'

const empty = (id: string, extra: Partial<AccountSnapshot> = {}): AccountSnapshot => ({
  id,
  email: null,
  deleted: false,
  importCount: 0,
  ...extra,
})

describe('session token and cookie', () => {
  it('stores only a hash of a 32-byte token and keeps the cookie HttpOnly', async () => {
    const token = randomToken()
    expect(tokenByteLength(token)).toBe(TOKEN_BYTES)
    const hash = await sha256Hex(token)
    expect(hash).toHaveLength(64)
    expect(hash).not.toBe(token)
    expect(hash).not.toContain(token)

    const guest = serializeSessionCookie(token, { secure: false, maxAgeSec: 60 })
    const parts = guest.split(';').map((part) => part.trim())
    expect(parts[0]).toBe(`toima_session=${token}`)
    expect(parts).toContain('HttpOnly')
    expect(parts).toContain('SameSite=Lax')
    expect(parts.some((part) => part.toLowerCase().startsWith('domain='))).toBe(false)
    expect(parts).not.toContain('Secure')

    const live = serializeSessionCookie(token, { secure: true, maxAgeSec: 60 })
    expect(live.split(';').map((part) => part.trim())).toContain('Secure')
    expect(readSessionCookie(guest)).toBe(token)
    expect(readSessionCookie(null)).toBeNull()
    expect(clearSessionCookie(false)).toContain('Max-Age=0')
  })

  it('extends an idle session but never past 90 days, and rejects revoked ones', () => {
    expect(initialExpiry(0)).toBe(SESSION_IDLE_MS)
    expect(extendExpiry(0, SESSION_IDLE_MS - 1, SESSION_IDLE_MS)).toBe(
      SESSION_IDLE_MS - 1 + SESSION_IDLE_MS,
    )
    expect(extendExpiry(0, SESSION_MAX_MS - 1000, SESSION_MAX_MS - 1)).toBe(
      SESSION_MAX_MS,
    )
    expect(extendExpiry(0, SESSION_MAX_MS, SESSION_MAX_MS)).toBeNull()
    expect(sessionUsable({ revokedAt: 1, expiresAt: 999, now: 0 })).toBe(false)
    expect(sessionUsable({ revokedAt: null, expiresAt: 10, now: 10 })).toBe(false)
    expect(sessionUsable({ revokedAt: null, expiresAt: 10, now: 9 })).toBe(true)
  })

  it('sets Secure only when the host is not localhost', () => {
    expect(cookieSecure(new Request('http://localhost/api/me'))).toBe(false)
    expect(cookieSecure(new Request('http://127.0.0.1:8787/api/me'))).toBe(false)
    expect(cookieSecure(new Request('https://hk-toima.example.workers.dev/api/me'))).toBe(
      true,
    )
  })

  it('generates a friend code now', () => {
    const code = randomFriendCode()
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/)
  })
})

describe('email merge, mail, and career import', () => {
  it('fills email on the same anonymous player', () => {
    const decision = decideEmailConsume({
      linkPlayerId: 'a',
      emailOwnerId: null,
      linkPlayer: empty('a'),
      current: empty('a'),
      hasUnimportedLocalCareer: true,
    })
    expect(decision).toEqual({
      ok: true,
      playerId: 'a',
      attachEmail: true,
      abandonId: null,
      needsImportConfirm: false,
    })
  })

  it('abandons an empty anonymous player and asks before importing local career', () => {
    const decision = decideEmailConsume({
      linkPlayerId: 'a',
      emailOwnerId: 'a',
      linkPlayer: empty('a', { email: 'a@example.com' }),
      current: empty('b'),
      hasUnimportedLocalCareer: true,
    })
    expect(decision).toMatchObject({
      ok: true,
      playerId: 'a',
      attachEmail: false,
      abandonId: 'b',
      needsImportConfirm: true,
    })
  })

  it('does not ask when the new device has no local career', () => {
    const decision = decideEmailConsume({
      linkPlayerId: 'a',
      emailOwnerId: 'a',
      linkPlayer: empty('a', { email: 'a@example.com' }),
      current: null,
      hasUnimportedLocalCareer: false,
    })
    expect(decision).toMatchObject({
      ok: true,
      playerId: 'a',
      abandonId: null,
      needsImportConfirm: false,
    })
  })

  it('never auto-merges two server players', () => {
    expect(isEmptyAnonymous(empty('b', { importCount: 2 }))).toBe(false)
    const decision = decideEmailConsume({
      linkPlayerId: 'a',
      emailOwnerId: 'a',
      linkPlayer: empty('a', { email: 'a@example.com' }),
      current: empty('b', { importCount: 2 }),
      hasUnimportedLocalCareer: true,
    })
    expect(decision).toEqual({ ok: false, code: 'server_player_not_empty' })
  })

  it('refuses a link whose player is already gone', () => {
    expect(
      decideEmailConsume({
        linkPlayerId: 'gone',
        emailOwnerId: null,
        linkPlayer: null,
        current: null,
        hasUnimportedLocalCareer: false,
      }),
    ).toEqual({ ok: false, code: 'player_gone' })
  })

  it('normalizes email and chooses log vs refuse vs send', () => {
    expect(normalizeEmail('  A@Example.com ')).toBe('a@example.com')
    expect(normalizeEmail('not-an-email')).toBeNull()
    expect(mailDelivery({ hasMailBinding: false, production: false })).toBe('log')
    expect(mailDelivery({ hasMailBinding: false, production: true })).toBe('refuse')
    expect(mailDelivery({ hasMailBinding: true, production: true })).toBe('send')
    expect(isProductionRuntime('localhost', undefined)).toBe(false)
    expect(isProductionRuntime('127.0.0.1', undefined)).toBe(false)
    expect(isProductionRuntime('hk-toima.example.workers.dev', undefined)).toBe(true)
    expect(isProductionRuntime('localhost', 'production')).toBe(true)
    expect(isProductionRuntime('example.com', 'development')).toBe(false)
  })

  it('rejects a duplicate career batch and ignores extra fields', async () => {
    const stats = normalizeCareer({
      rounds: 2,
      wins: 1,
      tsumo: 1,
      ron: 0,
      dealIns: 0,
      draws: 1,
      totalFan: 3,
      netAmount: -10,
      recent: [{ t: 1, mode: 'local', outcome: 'draw', note: '流局' }],
      extra: 'ignored',
    })
    expect(stats).not.toBeNull()
    const again = normalizeCareer({ ...stats!, unused: true })
    expect(canonicalCareer(stats!)).toBe(canonicalCareer(again!))
    const hash = await careerContentHash(stats!)
    const seen = new Set<string>()
    expect(acceptImport(seen, hash)).toBe(true)
    expect(acceptImport(seen, hash)).toBe(false)
    expect(normalizeCareer({ rounds: 'x' })).toBeNull()
  })

  it('detects Resend or SendEmail as outbound mail', () => {
    expect(hasOutboundMail({ EMAIL_FROM: 'a@b.com', RESEND_API_KEY: 're_x' })).toBe(
      true,
    )
    expect(hasOutboundMail({ EMAIL_FROM: 'a@b.com', EMAIL: {} })).toBe(true)
    expect(hasOutboundMail({ EMAIL_FROM: 'a@b.com' })).toBe(false)
    expect(hasOutboundMail({ RESEND_API_KEY: 're_x' })).toBe(false)
  })

  it('requires Turnstile success before a send can proceed', async () => {
    const ok = async () => new Response(JSON.stringify({ success: true }))
    const bad = async () => new Response(JSON.stringify({ success: false }))
    expect(
      await verifyTurnstile({ secret: 's', token: 't', ip: null, fetchImpl: ok }),
    ).toBe(true)
    expect(
      await verifyTurnstile({ secret: undefined, token: 't', ip: null, fetchImpl: ok }),
    ).toBe(false)
    expect(
      await verifyTurnstile({
        secret: undefined,
        token: undefined,
        ip: null,
        allowMissingSecret: true,
        fetchImpl: ok,
      }),
    ).toBe(true)
    expect(
      await verifyTurnstile({ secret: 's', token: 't', ip: null, fetchImpl: bad }),
    ).toBe(false)
  })
})

describe('seat link stays off the profile', () => {
  it('keeps the in-progress seat when a different session reconnects', () => {
    expect(
      seatAssignment({
        reconnect: true,
        existingPlayerId: 'owner',
        sessionPlayerId: 'thief',
        existingName: '阿明',
        requestedName: '黑客',
      }),
    ).toEqual({ playerId: 'owner', name: '阿明' })
    expect(
      seatAssignment({
        reconnect: false,
        existingPlayerId: null,
        sessionPlayerId: null,
        existingName: '東',
        requestedName: '',
      }),
    ).toEqual({ playerId: null, name: '東' })
    expect(REDACTED_SEAT_NAME).toBe('已刪除')
  })

  it('rate-limits magic links per email and per client', () => {
    expect(rateLimitAllows(0, 0)).toEqual({ ok: true })
    expect(rateLimitAllows(EMAIL_SEND_LIMIT - 1, CLIENT_SEND_LIMIT - 1)).toEqual({
      ok: true,
    })
    expect(rateLimitAllows(EMAIL_SEND_LIMIT, 0)).toEqual({
      ok: false,
      scope: 'email',
    })
    expect(rateLimitAllows(0, CLIENT_SEND_LIMIT)).toEqual({
      ok: false,
      scope: 'client',
    })
  })

  it('does not let a seat token change the profile', () => {
    const body = { displayName: '新名', seatToken: 'stolen-seat-token' }
    expect(readSessionCookie(null)).toBeNull()
    expect(canChangeProfile(readSessionCookie(null))).toBe(false)
    expect(readProfilePatch(body)).toEqual({ displayName: '新名' })
    expect(JSON.stringify(readProfilePatch(body))).not.toContain('stolen')
    expect(seatTokenMatches('seat-token', 'stolen-seat-token')).toBe(false)
    expect(canChangeProfile('player-1')).toBe(true)
  })
})
