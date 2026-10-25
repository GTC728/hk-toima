/** 工作階段 cookie。JavaScript 讀唔到；資料庫只存雜湊。 */

export const SESSION_COOKIE = 'toima_session'
export const TOKEN_BYTES = 32
export const SESSION_IDLE_MS = 30 * 24 * 60 * 60 * 1000
export const SESSION_MAX_MS = 90 * 24 * 60 * 60 * 1000
export const EMAIL_LINK_MS = 15 * 60 * 1000

const BASE64URL =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export function randomTokenBytes(byteLength = TOKEN_BYTES): Uint8Array {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytes
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!
    const b1 = i + 1 < bytes.length ? bytes[i + 1]! : 0
    const b2 = i + 2 < bytes.length ? bytes[i + 2]! : 0
    const triple = (b0 << 16) | (b1 << 8) | b2
    out += BASE64URL[(triple >> 18) & 63]
    out += BASE64URL[(triple >> 12) & 63]
    if (i + 1 < bytes.length) out += BASE64URL[(triple >> 6) & 63]
    if (i + 2 < bytes.length) out += BASE64URL[triple & 63]
  }
  return out
}

export function randomToken(): string {
  return bytesToBase64Url(randomTokenBytes(TOKEN_BYTES))
}

/** base64url 長度還原成位元組數（用來確認係 32 bytes）。 */
export function tokenByteLength(token: string): number {
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return -1
  const pad = token.length % 4 === 0 ? 0 : 4 - (token.length % 4)
  return ((token.length + pad) / 4) * 3 - pad
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  )
}

export function cookieSecure(request: Request): boolean {
  return !isLocalHostname(new URL(request.url).hostname)
}

/** 唔設 Domain，先會跟住而家呢個來源。 */
export function serializeSessionCookie(
  token: string,
  opts: { secure: boolean; maxAgeSec: number },
): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(opts.maxAgeSec))}`,
  ]
  if (opts.secure) parts.push('Secure')
  return parts.join('; ')
}

export function clearSessionCookie(secure: boolean): string {
  return serializeSessionCookie('', { secure, maxAgeSec: 0 })
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    if (key !== name) continue
    const value = part.slice(eq + 1).trim()
    return value.length > 0 ? value : null
  }
  return null
}

export function readSessionCookie(header: string | null): string | null {
  return readCookie(header, SESSION_COOKIE)
}

export function initialExpiry(createdAt: number): number {
  return Math.min(createdAt + SESSION_IDLE_MS, createdAt + SESSION_MAX_MS)
}

/** 閒置可延長，但唔超過建立後九十日。過期或已撤銷就唔延長。 */
export function extendExpiry(
  createdAt: number,
  now: number,
  currentExpiry: number,
): number | null {
  if (now >= currentExpiry) return null
  const cap = createdAt + SESSION_MAX_MS
  if (now >= cap) return null
  return Math.min(now + SESSION_IDLE_MS, cap)
}

export function sessionUsable(input: {
  revokedAt: number | null
  expiresAt: number
  now: number
}): boolean {
  if (input.revokedAt != null) return false
  return input.now < input.expiresAt
}

export function deviceSummary(userAgent: string | null): string {
  const text = (userAgent ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return '未知裝置'
  return text.slice(0, 160)
}

const FRIEND_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function randomFriendCode(): string {
  const bytes = randomTokenBytes(8)
  let out = ''
  for (const b of bytes) out += FRIEND_ALPHABET[b % FRIEND_ALPHABET.length]
  return out
}
