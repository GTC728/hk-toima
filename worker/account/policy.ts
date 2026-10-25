import { sha256Hex } from './token'

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (email.length > 254) return null
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return null
  return email
}

export interface AccountSnapshot {
  id: string
  email: string | null
  deleted: boolean
  importCount: number
}

export function isEmptyAnonymous(player: AccountSnapshot): boolean {
  return !player.deleted && player.email == null && player.importCount === 0
}

export interface EmailConsumeInput {
  linkPlayerId: string
  emailOwnerId: string | null
  linkPlayer: AccountSnapshot | null
  current: AccountSnapshot | null
  hasUnimportedLocalCareer: boolean
}

export type EmailConsumeDecision =
  | {
      ok: true
      playerId: string
      attachEmail: boolean
      abandonId: string | null
      needsImportConfirm: boolean
    }
  | { ok: false; code: 'server_player_not_empty' | 'player_gone' }

/**
 * 驗證電郵只填電郵。新機登入已有電郵：空匿名玩家棄用；
 * 兩個已有資料嘅伺服器玩家唔合併。
 */
export function decideEmailConsume(input: EmailConsumeInput): EmailConsumeDecision {
  let targetId: string
  let attachEmail: boolean

  if (input.emailOwnerId) {
    targetId = input.emailOwnerId
    attachEmail = false
  } else {
    const linkPlayer = input.linkPlayer
    if (!linkPlayer || linkPlayer.deleted || linkPlayer.id !== input.linkPlayerId) {
      return { ok: false, code: 'player_gone' }
    }
    if (linkPlayer.email != null) return { ok: false, code: 'player_gone' }
    targetId = linkPlayer.id
    attachEmail = true
  }

  const current = input.current && !input.current.deleted ? input.current : null
  let abandonId: string | null = null
  if (current && current.id !== targetId) {
    if (!isEmptyAnonymous(current)) {
      return { ok: false, code: 'server_player_not_empty' }
    }
    abandonId = current.id
  }

  const switching = current == null || current.id !== targetId
  return {
    ok: true,
    playerId: targetId,
    attachEmail,
    abandonId,
    needsImportConfirm: switching && input.hasUnimportedLocalCareer,
  }
}

export const EMAIL_SEND_LIMIT = 3
export const CLIENT_SEND_LIMIT = 8
export const SEND_WINDOW_MS = 60 * 60 * 1000

export function rateLimitAllows(
  emailSendsInWindow: number,
  clientSendsInWindow: number,
): { ok: true } | { ok: false; scope: 'email' | 'client' } {
  if (emailSendsInWindow >= EMAIL_SEND_LIMIT) return { ok: false, scope: 'email' }
  if (clientSendsInWindow >= CLIENT_SEND_LIMIT) {
    return { ok: false, scope: 'client' }
  }
  return { ok: true }
}

export type MailDelivery = 'send' | 'log' | 'refuse'

export function mailDelivery(input: {
  hasMailBinding: boolean
  production: boolean
}): MailDelivery {
  if (input.hasMailBinding) return 'send'
  if (input.production) return 'refuse'
  return 'log'
}

/** Cloudflare SendEmail binding 或 Resend API key 其中一個即可寄。 */
export function hasOutboundMail(env: {
  EMAIL?: unknown
  EMAIL_FROM?: string
  RESEND_API_KEY?: string
}): boolean {
  if (!env.EMAIL_FROM) return false
  if (env.EMAIL) return true
  if (env.RESEND_API_KEY && env.RESEND_API_KEY.length > 0) return true
  return false
}

export function isProductionRuntime(
  hostname: string,
  environment: string | undefined,
): boolean {
  if (environment === 'production') return true
  if (environment === 'development') return false
  const host = hostname.toLowerCase()
  return host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]' && host !== '::1'
}

export function sanitizeDisplayName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim().slice(0, 16)
  if (!name) return null
  return name
}

/** 只讀顯示名。body 裡面嘅 seatToken 唔會變成憑證。 */
export function readProfilePatch(
  body: unknown,
): { displayName: string } | { error: string } {
  if (!body || typeof body !== 'object') return { error: '無效內容' }
  const name = sanitizeDisplayName(
    (body as { displayName?: unknown }).displayName,
  )
  if (!name) return { error: '請輸入顯示名' }
  return { displayName: name }
}

export interface CareerRecent {
  t: number
  mode: 'local' | 'online'
  outcome: 'win' | 'deal_in' | 'draw' | 'other'
  fan?: number
  winType?: 'tsumo' | 'ron' | 'chankan'
  amount?: number
  note?: string
}

export interface CareerImport {
  rounds: number
  wins: number
  tsumo: number
  ron: number
  dealIns: number
  draws: number
  totalFan: number
  netAmount: number
  recent: CareerRecent[]
}

function finiteInt(value: unknown, maxAbs: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const n = Math.trunc(value)
  if (Math.abs(n) > maxAbs) return null
  return n
}

function normalizeRecent(value: unknown): CareerRecent[] | null {
  if (!Array.isArray(value) || value.length > 40) return null
  const recent: CareerRecent[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const row = item as Record<string, unknown>
    const t = finiteInt(row.t, 10_000_000_000_000)
    if (t == null || t < 0) return null
    if (row.mode !== 'local' && row.mode !== 'online') return null
    if (
      row.outcome !== 'win' &&
      row.outcome !== 'deal_in' &&
      row.outcome !== 'draw' &&
      row.outcome !== 'other'
    ) {
      return null
    }
    const next: CareerRecent = { t, mode: row.mode, outcome: row.outcome }
    if (row.fan != null) {
      const fan = finiteInt(row.fan, 10_000)
      if (fan == null || fan < 0) return null
      next.fan = fan
    }
    if (row.winType != null) {
      if (row.winType !== 'tsumo' && row.winType !== 'ron' && row.winType !== 'chankan') {
        return null
      }
      next.winType = row.winType
    }
    if (row.amount != null) {
      const amount = finiteInt(row.amount, 1_000_000_000_000)
      if (amount == null) return null
      next.amount = amount
    }
    if (row.note != null) {
      if (typeof row.note !== 'string') return null
      next.note = row.note.slice(0, 40)
    }
    recent.push(next)
  }
  return recent
}

export function normalizeCareer(input: unknown): CareerImport | null {
  if (!input || typeof input !== 'object') return null
  const row = input as Record<string, unknown>
  const rounds = finiteInt(row.rounds, 10_000_000)
  const wins = finiteInt(row.wins, 10_000_000)
  const tsumo = finiteInt(row.tsumo, 10_000_000)
  const ron = finiteInt(row.ron, 10_000_000)
  const dealIns = finiteInt(row.dealIns, 10_000_000)
  const draws = finiteInt(row.draws, 10_000_000)
  const totalFan = finiteInt(row.totalFan, 1_000_000_000)
  const netAmount = finiteInt(row.netAmount, 1_000_000_000_000)
  const recent = normalizeRecent(row.recent)
  if (
    rounds == null ||
    wins == null ||
    tsumo == null ||
    ron == null ||
    dealIns == null ||
    draws == null ||
    totalFan == null ||
    netAmount == null ||
    recent == null
  ) {
    return null
  }
  if (rounds < 0 || wins < 0 || tsumo < 0 || ron < 0 || dealIns < 0 || draws < 0 || totalFan < 0) {
    return null
  }
  return { rounds, wins, tsumo, ron, dealIns, draws, totalFan, netAmount, recent }
}

export function canonicalCareer(stats: CareerImport): string {
  return JSON.stringify({
    rounds: stats.rounds,
    wins: stats.wins,
    tsumo: stats.tsumo,
    ron: stats.ron,
    dealIns: stats.dealIns,
    draws: stats.draws,
    totalFan: stats.totalFan,
    netAmount: stats.netAmount,
    recent: stats.recent.map((item) => {
      const row: Record<string, unknown> = {
        t: item.t,
        mode: item.mode,
        outcome: item.outcome,
      }
      if (item.fan != null) row.fan = item.fan
      if (item.winType != null) row.winType = item.winType
      if (item.amount != null) row.amount = item.amount
      if (item.note != null) row.note = item.note
      return row
    }),
  })
}

export async function careerContentHash(stats: CareerImport): Promise<string> {
  return sha256Hex(canonicalCareer(stats))
}

export function acceptImport(existing: Set<string>, contentHash: string): boolean {
  if (existing.has(contentHash)) return false
  existing.add(contentHash)
  return true
}

export function linkOrigin(request: Request, appOrigin: string | undefined): string | null {
  if (appOrigin && isHttpOrigin(appOrigin)) return stripSlash(appOrigin)
  const origin = request.headers.get('Origin')
  if (origin && isHttpOrigin(origin)) return origin
  const url = new URL(request.url)
  if (url.protocol === 'http:' || url.protocol === 'https:') return url.origin
  return null
}

function stripSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function isHttpOrigin(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.origin === stripSlash(value)
    )
  } catch {
    return false
  }
}
