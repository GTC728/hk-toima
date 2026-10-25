import { corsHeaders } from '../cors'
import type { Env } from '../env'
import { canChangeProfile, cleanPlayerId } from '../seat-auth'
import {
  careerContentHash,
  decideEmailConsume,
  isProductionRuntime,
  hasOutboundMail,
  linkOrigin,
  mailDelivery,
  normalizeCareer,
  normalizeEmail,
  rateLimitAllows,
  readProfilePatch,
  SEND_WINDOW_MS,
} from './policy'
import {
  abandonPlayer,
  attachEmail,
  countAcceptedFriends,
  countPendingChallengesOut,
  countPendingOutgoing,
  countSendAttempts,
  createAnonymousPlayer,
  createChallenge,
  createEmailLink,
  createFriendRequest,
  createSession,
  deleteFriendship,
  deletePlayerAccount,
  findFriendshipBetween,
  getChallenge,
  getEmailLink,
  getFriendship,
  getPlayer,
  getPlayerByEmail,
  getPlayerByFriendCode,
  importCount,
  insertImport,
  isPlayerInRoom,
  listChallengesFor,
  listFriendshipsFor,
  listImports,
  listPlayerRooms,
  listRoomPeers,
  listSessions,
  loadActiveSession,
  markEmailLinkUsed,
  MAX_FRIENDS,
  MAX_PENDING_CHALLENGES,
  MAX_PENDING_OUT,
  presenceOf,
  recordSendAttempt,
  getPlayerRanked,
  rememberPlayerSeat,
  revokeAllSessions,
  revokeSession,
  setChallengeStatus,
  setFriendshipStatus,
  touchLastSeen,
  updateDisplayName,
  upsertPlayerRanked,
  type ActiveSession,
  type PlayerRow,
} from './store'
import { generateRoomCode } from '../room'
import type { JoinResponse } from '../protocol'
import { clampRating, emptyRanked, tierForRating } from '../../src/engine/ranked'
import {
  clearSessionCookie,
  cookieSecure,
  EMAIL_LINK_MS,
  randomToken,
  serializeSessionCookie,
  sha256Hex,
} from './token'
import { verifyTurnstile } from './turnstile'

export interface PublicPlayer {
  id: string
  displayName: string
  email: string | null
  friendCode: string
}

function publicPlayer(player: PlayerRow): PublicPlayer {
  return {
    id: player.id,
    displayName: player.display_name,
    email: player.email,
    friendCode: player.friend_code,
  }
}

function json(
  data: unknown,
  status: number,
  request: Request,
  extra?: Headers,
): Response {
  const headers = extra ?? new Headers()
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', 'no-store')
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    headers.set(key, value)
  }
  return new Response(JSON.stringify(data), { status, headers })
}

function cookieHeaders(
  request: Request,
  token: string,
  expiresAt: number,
  now: number,
): Headers {
  const headers = new Headers()
  const maxAge = Math.max(0, Math.floor((expiresAt - now) / 1000))
  headers.append(
    'set-cookie',
    serializeSessionCookie(token, {
      secure: cookieSecure(request),
      maxAgeSec: maxAge,
    }),
  )
  return headers
}

function clearedCookie(request: Request): Headers {
  const headers = new Headers()
  headers.append('set-cookie', clearSessionCookie(cookieSecure(request)))
  return headers
}

async function clientHash(request: Request): Promise<string> {
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for') ??
    ''
  const ua = request.headers.get('user-agent') ?? ''
  return (await sha256Hex(`${ip}|${ua}`)).slice(0, 32)
}

function snapshotOf(
  player: PlayerRow,
  imports: number,
): {
  id: string
  email: string | null
  deleted: boolean
  importCount: number
} {
  return {
    id: player.id,
    email: player.email,
    deleted: player.deleted_at != null,
    importCount: imports,
  }
}

async function issueSession(
  db: D1Database,
  request: Request,
  playerId: string,
  now: number,
): Promise<{ token: string; expiresAt: number }> {
  const created = await createSession(
    db,
    playerId,
    request.headers.get('user-agent'),
    now,
  )
  return { token: created.token, expiresAt: created.session.expires_at }
}

export async function lookupSessionPlayerId(
  request: Request,
  env: Env,
): Promise<string | null> {
  if (!env.DB) return null
  try {
    const active = await loadActiveSession(env.DB, request, Date.now())
    return active?.player.id ?? null
  } catch (err) {
    console.error('[hk-toima] session lookup failed', err)
    return null
  }
}

export async function rememberSeat(
  env: Env,
  playerId: string,
  roomCode: string,
  seat: number,
): Promise<void> {
  if (!env.DB || !cleanPlayerId(playerId)) return
  try {
    await rememberPlayerSeat(env.DB, playerId, roomCode, seat, Date.now())
  } catch (err) {
    console.error('[hk-toima] remember seat failed', err)
  }
}

async function scrubRooms(env: Env, playerId: string): Promise<void> {
  if (!env.DB) return
  const rooms = await listPlayerRooms(env.DB, playerId)
  for (const room of rooms) {
    try {
      const stub = env.ROOM.get(env.ROOM.idFromName(room.room_code.toUpperCase()))
      await stub.fetch(
        new Request('https://room/scrub-player', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ playerId }),
        }),
      )
    } catch (err) {
      console.error('[hk-toima] scrub room failed', room.room_code, err)
    }
  }
}

function requireDb(env: Env, request: Request): D1Database | Response {
  if (!env.DB) {
    return json(
      { error: '帳戶資料庫未設定', code: 'no_db' },
      503,
      request,
    )
  }
  return env.DB
}

export async function handleAccount(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url)
  const { pathname } = url
  if (
    !pathname.startsWith('/api/me') &&
    !pathname.startsWith('/api/auth/') &&
    !pathname.startsWith('/api/friends')
  ) {
    return null
  }

  try {
    if (pathname === '/api/friends' && request.method === 'GET') {
      return listFriends(request, env)
    }
    if (pathname === '/api/friends/request' && request.method === 'POST') {
      return requestFriend(request, env)
    }
    if (pathname === '/api/friends/presence' && request.method === 'POST') {
      return pingPresence(request, env)
    }
    if (pathname === '/api/friends/challenge' && request.method === 'POST') {
      return createFriendChallenge(request, env)
    }
    if (pathname === '/api/friends/peers' && request.method === 'GET') {
      return getRoomPeers(request, env)
    }
    const challengeAction =
      /^\/api\/friends\/challenges\/([^/]+)\/(accept|decline)$/.exec(pathname)
    if (challengeAction && request.method === 'POST') {
      return respondChallenge(
        request,
        env,
        challengeAction[1]!,
        challengeAction[2] as 'accept' | 'decline',
      )
    }
    const friendAction = /^\/api\/friends\/([^/]+)\/(accept|decline)$/.exec(
      pathname,
    )
    if (friendAction && request.method === 'POST') {
      return respondFriend(
        request,
        env,
        friendAction[1]!,
        friendAction[2] as 'accept' | 'decline',
      )
    }
    const friendDel = /^\/api\/friends\/([^/]+)$/.exec(pathname)
    if (friendDel && request.method === 'DELETE') {
      return removeFriend(request, env, friendDel[1]!)
    }
    if (pathname === '/api/me' && request.method === 'POST') {
      return postMe(request, env)
    }
    if (pathname === '/api/me' && request.method === 'PATCH') {
      return patchMe(request, env)
    }
    if (pathname === '/api/me' && request.method === 'DELETE') {
      return deleteMe(request, env)
    }
    if (pathname === '/api/me/export' && request.method === 'GET') {
      return exportMe(request, env)
    }
    if (pathname === '/api/me/sessions' && request.method === 'GET') {
      return getSessions(request, env)
    }
    if (pathname === '/api/me/logout' && request.method === 'POST') {
      return logout(request, env, false)
    }
    if (pathname === '/api/me/logout-all' && request.method === 'POST') {
      return logout(request, env, true)
    }
    if (pathname === '/api/me/imports' && request.method === 'POST') {
      return postImport(request, env)
    }
    if (pathname === '/api/me/ranked' && request.method === 'GET') {
      return getRanked(request, env)
    }
    if (pathname === '/api/me/ranked' && request.method === 'PUT') {
      return putRanked(request, env)
    }
    if (pathname === '/api/auth/email/send' && request.method === 'POST') {
      return sendEmail(request, env)
    }
    if (pathname === '/api/auth/email/consume' && request.method === 'POST') {
      return consumeEmail(request, env)
    }
    return json({ error: '找不到', code: 'not_found' }, 404, request)
  } catch (err) {
    console.error('[hk-toima] account route failed', err)
    return json({ error: '帳戶暫時用唔到', code: 'account_error' }, 500, request)
  }
}

async function postMe(request: Request, env: Env): Promise<Response> {
  const db = requireDb(env, request)
  if (db instanceof Response) return db
  const now = Date.now()
  const active = await loadActiveSession(db, request, now)
  if (active) {
    return json(
      publicPlayer(active.player),
      200,
      request,
      cookieHeaders(request, active.token, active.session.expires_at, now),
    )
  }
  const player = await createAnonymousPlayer(db, now)
  const session = await issueSession(db, request, player.id, now)
  return json(
    publicPlayer(player),
    201,
    request,
    cookieHeaders(request, session.token, session.expiresAt, now),
  )
}

async function requireActive(
  request: Request,
  env: Env,
  opts?: { touch?: boolean },
): Promise<{ db: D1Database; active: ActiveSession; now: number } | Response> {
  const db = requireDb(env, request)
  if (db instanceof Response) return db
  const now = Date.now()
  const active = await loadActiveSession(db, request, now)
  if (!active || !canChangeProfile(active.player.id)) {
    return json({ error: '未登入', code: 'no_session' }, 401, request)
  }
  if (opts?.touch !== false) {
    await touchLastSeen(db, active.player.id, now).catch(() => undefined)
  }
  return { db, active, now }
}

async function patchMe(request: Request, env: Env): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const body = await request.json().catch(() => null)
  const patch = readProfilePatch(body)
  if ('error' in patch) {
    return json({ error: patch.error, code: 'bad_name' }, 400, request)
  }
  await updateDisplayName(gate.db, gate.active.player.id, patch.displayName)
  const player = await getPlayer(gate.db, gate.active.player.id)
  if (!player) {
    return json({ error: '找不到玩家', code: 'no_player' }, 404, request)
  }
  return json(publicPlayer(player), 200, request)
}

async function getSessions(request: Request, env: Env): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const rows = await listSessions(gate.db, gate.active.player.id)
  return json(
    {
      sessions: rows.map((row) => ({
        id: row.id,
        deviceSummary: row.device_summary,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
        current: row.token_hash === gate.active.session.token_hash,
      })),
    },
    200,
    request,
  )
}

async function logout(
  request: Request,
  env: Env,
  all: boolean,
): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  if (all) {
    await revokeAllSessions(gate.db, gate.active.player.id, gate.now)
  } else {
    await revokeSession(gate.db, gate.active.session.token_hash, gate.now)
  }
  return json({ ok: true }, 200, request, clearedCookie(request))
}

async function exportMe(request: Request, env: Env): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const sessions = await listSessions(gate.db, gate.active.player.id)
  const imports = await listImports(gate.db, gate.active.player.id)
  return json(
    {
      player: {
        ...publicPlayer(gate.active.player),
        createdAt: gate.active.player.created_at,
      },
      sessions: sessions.map((row) => ({
        id: row.id,
        deviceSummary: row.device_summary,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
        current: row.token_hash === gate.active.session.token_hash,
      })),
      imports: imports.map((row) => ({
        contentHash: row.content_hash,
        createdAt: row.created_at,
        payload: JSON.parse(row.payload) as unknown,
      })),
    },
    200,
    request,
  )
}

async function deleteMe(request: Request, env: Env): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const playerId = gate.active.player.id
  await deletePlayerAccount(gate.db, playerId, gate.now)
  await scrubRooms(env, playerId)
  return json({ ok: true }, 200, request, clearedCookie(request))
}

async function postImport(request: Request, env: Env): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const length = Number(request.headers.get('content-length') ?? '0')
  if (length > 64_000) {
    return json({ error: '戰績太大', code: 'too_large' }, 400, request)
  }
  const body = (await request.json().catch(() => null)) as { stats?: unknown } | null
  const stats = normalizeCareer(body?.stats)
  if (!stats) {
    return json({ error: '戰績格式唔啱', code: 'bad_stats' }, 400, request)
  }
  const hash = await careerContentHash(stats)
  const result = await insertImport(
    gate.db,
    gate.active.player.id,
    hash,
    stats,
    gate.now,
  )
  if (result === 'duplicate') {
    return json(
      { error: '呢批戰績已經上傳過', code: 'duplicate_import' },
      409,
      request,
    )
  }
  return json({ ok: true, contentHash: hash }, 201, request)
}

async function sendEmail(request: Request, env: Env): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const body = (await request.json().catch(() => null)) as {
    email?: unknown
    turnstileToken?: unknown
  } | null
  const email = normalizeEmail(body?.email)
  if (!email) {
    return json({ error: '電郵格式唔啱', code: 'bad_email' }, 400, request)
  }
  const token =
    typeof body?.turnstileToken === 'string' ? body.turnstileToken : undefined
  const production = isProductionRuntime(
    new URL(request.url).hostname,
    env.ENVIRONMENT,
  )
  const passed = await verifyTurnstile({
    secret: env.TURNSTILE_SECRET_KEY,
    token,
    ip: request.headers.get('cf-connecting-ip'),
    allowMissingSecret: !production,
  })
  if (!passed) {
    return json({ error: '人機驗證未通過', code: 'turnstile' }, 403, request)
  }

  const hash = await clientHash(request)
  const since = gate.now - SEND_WINDOW_MS
  const counts = await countSendAttempts(gate.db, email, hash, since)
  const limit = rateLimitAllows(counts.email, counts.client)
  if (!limit.ok) {
    return json(
      { error: '寄得太密，請遲啲再試', code: 'rate_limited', scope: limit.scope },
      429,
      request,
    )
  }
  await recordSendAttempt(gate.db, email, hash, gate.now)

  const origin = linkOrigin(request, env.APP_ORIGIN)
  if (!origin) {
    return json({ error: '唔知連結應該指向邊', code: 'no_origin' }, 500, request)
  }
  const raw = randomToken()
  const tokenHash = await sha256Hex(raw)
  const expiresAt = gate.now + EMAIL_LINK_MS
  await createEmailLink(gate.db, {
    tokenHash,
    email,
    playerId: gate.active.player.id,
    now: gate.now,
    expiresAt,
  })
  const url = `${origin}/auth/email?token=${encodeURIComponent(raw)}`
  const delivery = mailDelivery({
    hasMailBinding: hasOutboundMail(env),
    production,
  })
  if (delivery === 'refuse') {
    await markEmailLinkUsed(gate.db, tokenHash, gate.now)
    return json(
      {
        error: '未設定寄信，正式環境唔會假扮已寄出',
        code: 'mail_unconfigured',
      },
      503,
      request,
    )
  }
  if (delivery === 'log') {
    console.log(`[hk-toima] magic link ${email} ${url}`)
    return json({ ok: true, delivery: 'logged', devLink: url }, 200, request)
  }
  const text = `撳呢條連結登入（15 分鐘內有效，用一次）：\n${url}\n\n如果你冇要求登入，可以不理呢封信。\n`
  try {
    if (env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM!,
          to: [email],
          subject: '香港台麻登入連結',
          text,
        }),
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.error('[hk-toima] resend failed', res.status, detail)
        return json({ error: '寄信失敗', code: 'mail_failed' }, 502, request)
      }
    } else {
      await env.EMAIL!.send({
        to: email,
        from: env.EMAIL_FROM!,
        subject: '香港台麻登入連結',
        text,
      })
    }
  } catch (err) {
    console.error('[hk-toima] email send failed', err)
    return json({ error: '寄信失敗', code: 'mail_failed' }, 502, request)
  }
  return json({ ok: true, delivery: 'sent' }, 200, request)
}

async function consumeEmail(request: Request, env: Env): Promise<Response> {
  const db = requireDb(env, request)
  if (db instanceof Response) return db
  const now = Date.now()
  const body = (await request.json().catch(() => null)) as {
    token?: unknown
    hasUnimportedLocalCareer?: unknown
  } | null
  const raw = typeof body?.token === 'string' ? body.token : ''
  if (!raw) {
    return json({ error: '連結無效', code: 'bad_link' }, 400, request)
  }
  const link = await getEmailLink(db, await sha256Hex(raw))
  if (!link || link.used_at != null || now >= link.expires_at) {
    return json({ error: '連結無效或者已經用過', code: 'bad_link' }, 400, request)
  }

  const hasUnimported = body?.hasUnimportedLocalCareer === true
  const owner = await getPlayerByEmail(db, link.email)
  const linkPlayer = await getPlayer(db, link.player_id)
  const currentActive = await loadActiveSession(db, request, now)
  const currentImports = currentActive
    ? await importCount(db, currentActive.player.id)
    : 0
  const decision = decideEmailConsume({
    linkPlayerId: link.player_id,
    emailOwnerId: owner?.id ?? null,
    linkPlayer: linkPlayer
      ? snapshotOf(linkPlayer, await importCount(db, linkPlayer.id))
      : null,
    current: currentActive
      ? snapshotOf(currentActive.player, currentImports)
      : null,
    hasUnimportedLocalCareer: hasUnimported,
  })
  if (!decision.ok) {
    const message =
      decision.code === 'server_player_not_empty'
        ? '呢部機已有另一個帳戶嘅資料，唔會自動合併'
        : '連結無效'
    return json({ error: message, code: decision.code }, decision.code === 'server_player_not_empty' ? 409 : 400, request)
  }

  const used = await markEmailLinkUsed(db, link.token_hash, now)
  if (!used) {
    return json({ error: '連結已經用過', code: 'bad_link' }, 400, request)
  }

  if (decision.attachEmail) {
    const attached = await attachEmail(db, decision.playerId, link.email)
    if (!attached) {
      const again = await getPlayer(db, decision.playerId)
      if (!again || again.email !== link.email) {
        return json(
          { error: '呢個電郵已經綁咗另一個帳戶', code: 'email_taken' },
          409,
          request,
        )
      }
    }
  }

  if (decision.abandonId) {
    await abandonPlayer(db, decision.abandonId, now)
    await scrubRooms(env, decision.abandonId)
  }

  const player = await getPlayer(db, decision.playerId)
  if (!player || player.deleted_at != null) {
    return json({ error: '找不到玩家', code: 'no_player' }, 404, request)
  }

  let token = currentActive?.token
  let expiresAt = currentActive?.session.expires_at
  const sameBrowser =
    currentActive != null && currentActive.player.id === player.id && !decision.abandonId
  if (!sameBrowser || !token || expiresAt == null) {
    const session = await issueSession(db, request, player.id, now)
    token = session.token
    expiresAt = session.expiresAt
  }

  return json(
    {
      ok: true,
      player: publicPlayer(player),
      needsImportConfirm: decision.needsImportConfirm,
    },
    200,
    request,
    cookieHeaders(request, token, expiresAt, now),
  )
}

async function getRanked(request: Request, env: Env): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const row = await getPlayerRanked(gate.db, gate.active.player.id)
  const state = row
    ? {
        rating: row.rating,
        rankedGames: row.ranked_games,
        peakRating: row.peak_rating,
      }
    : emptyRanked()
  const tier = tierForRating(state.rating)
  return json(
    {
      ...state,
      tierId: tier.id,
      tierName: tier.name,
    },
    200,
    request,
  )
}

async function putRanked(request: Request, env: Env): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const body = (await request.json().catch(() => ({}))) as {
    rating?: unknown
    rankedGames?: unknown
    peakRating?: unknown
  }
  const rating = clampRating(Number(body.rating))
  const rankedGames = Math.max(0, Math.floor(Number(body.rankedGames) || 0))
  const peakRating = clampRating(Number(body.peakRating) || rating)
  if (!Number.isFinite(Number(body.rating))) {
    return json({ error: '無效分數', code: 'bad_rating' }, 400, request)
  }
  const row = await upsertPlayerRanked(gate.db, gate.active.player.id, {
    rating,
    rankedGames,
    peakRating,
  })
  const tier = tierForRating(row.rating)
  return json(
    {
      rating: row.rating,
      rankedGames: row.ranked_games,
      peakRating: row.peak_rating,
      tierId: tier.id,
      tierName: tier.name,
    },
    200,
    request,
  )
}

function publicFriendEntry(
  row: {
    id: string
    requester_id: string
    addressee_id: string
    status: string
    created_at: number
    updated_at: number
    other_id: string
    other_name: string
    other_code: string
    other_last_seen?: number | null
    other_in_game_at?: number | null
  },
  me: string,
  now: number,
) {
  return {
    id: row.id,
    status: row.status,
    direction: row.requester_id === me ? 'out' : 'in',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    presence: presenceOf(row.other_last_seen, row.other_in_game_at, now),
    player: {
      id: row.other_id,
      displayName: row.other_name,
      friendCode: row.other_code,
    },
  }
}

async function listFriends(request: Request, env: Env): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const me = gate.active.player.id
  const rows = await listFriendshipsFor(gate.db, me, gate.now)
  const friends = []
  const incoming = []
  const outgoing = []
  for (const row of rows) {
    const entry = publicFriendEntry(row, me, gate.now)
    if (row.status === 'accepted') friends.push(entry)
    else if (row.requester_id === me) outgoing.push(entry)
    else incoming.push(entry)
  }
  const challengeRows = await listChallengesFor(gate.db, me, gate.now)
  const challenges = challengeRows.map((c) => ({
    id: c.id,
    friendshipId: c.friendship_id,
    roomCode: c.room_code,
    direction: c.challenger_id === me ? 'out' : 'in',
    expiresAt: c.expires_at,
    createdAt: c.created_at,
    player: {
      id: c.other_id,
      displayName: c.other_name,
      friendCode: c.other_code,
    },
  }))
  return json({ friends, incoming, outgoing, challenges }, 200, request)
}

async function requestFriend(request: Request, env: Env): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const body = (await request.json().catch(() => ({}))) as {
    friendCode?: unknown
  }
  const code =
    typeof body.friendCode === 'string' ? body.friendCode.trim().toUpperCase() : ''
  if (!code) {
    return json({ error: '請輸入朋友碼', code: 'bad_code' }, 400, request)
  }
  const me = gate.active.player.id
  const target = await getPlayerByFriendCode(gate.db, code)
  if (!target) {
    return json({ error: '找不到呢個朋友碼', code: 'not_found' }, 404, request)
  }
  if (target.id === me) {
    return json({ error: '唔可以加自己', code: 'self' }, 400, request)
  }

  const existing = await findFriendshipBetween(gate.db, me, target.id)
  if (existing) {
    if (existing.status === 'accepted') {
      return json({ error: '已經係好友', code: 'already' }, 409, request)
    }
    if (existing.status === 'pending') {
      if (existing.addressee_id === me) {
        await setFriendshipStatus(gate.db, existing.id, 'accepted', gate.now)
        return json(
          { ok: true, id: existing.id, status: 'accepted', autoAccepted: true },
          200,
          request,
        )
      }
      return json({ error: '請求已送出', code: 'already' }, 409, request)
    }
    // declined → allow re-request by flipping roles if needed
    await deleteFriendship(gate.db, existing.id)
  }

  const pendingOut = await countPendingOutgoing(gate.db, me)
  if (pendingOut >= MAX_PENDING_OUT) {
    return json(
      { error: `待處理請求最多 ${MAX_PENDING_OUT} 個`, code: 'limit_pending' },
      429,
      request,
    )
  }
  const friendCount = await countAcceptedFriends(gate.db, me)
  if (friendCount >= MAX_FRIENDS) {
    return json(
      { error: `好友上限 ${MAX_FRIENDS}`, code: 'limit_friends' },
      429,
      request,
    )
  }

  const row = await createFriendRequest(gate.db, me, target.id, gate.now)
  return json(
    {
      ok: true,
      id: row.id,
      status: 'pending',
      player: {
        id: target.id,
        displayName: target.display_name,
        friendCode: target.friend_code,
      },
    },
    201,
    request,
  )
}

async function respondFriend(
  request: Request,
  env: Env,
  friendshipId: string,
  action: 'accept' | 'decline',
): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const me = gate.active.player.id
  const row = await getFriendship(gate.db, friendshipId)
  if (!row || row.status !== 'pending' || row.addressee_id !== me) {
    return json({ error: '找不到請求', code: 'not_found' }, 404, request)
  }
  if (action === 'accept') {
    const friendCount = await countAcceptedFriends(gate.db, me)
    if (friendCount >= MAX_FRIENDS) {
      return json(
        { error: `好友上限 ${MAX_FRIENDS}`, code: 'limit_friends' },
        429,
        request,
      )
    }
    await setFriendshipStatus(gate.db, row.id, 'accepted', gate.now)
    return json({ ok: true, id: row.id, status: 'accepted' }, 200, request)
  }
  await setFriendshipStatus(gate.db, row.id, 'declined', gate.now)
  return json({ ok: true, id: row.id, status: 'declined' }, 200, request)
}

async function removeFriend(
  request: Request,
  env: Env,
  friendshipId: string,
): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const me = gate.active.player.id
  const row = await getFriendship(gate.db, friendshipId)
  if (!row) {
    return json({ error: '找不到關係', code: 'not_found' }, 404, request)
  }
  if (row.requester_id !== me && row.addressee_id !== me) {
    return json({ error: '找不到關係', code: 'not_found' }, 404, request)
  }
  if (row.status === 'pending' && row.requester_id !== me) {
    return json({ error: '請用拒絕', code: 'not_found' }, 404, request)
  }
  await deleteFriendship(gate.db, row.id)
  return json({ ok: true }, 200, request)
}

async function pingPresence(request: Request, env: Env): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  return json({ ok: true, at: gate.now }, 200, request)
}

async function getRoomPeers(request: Request, env: Env): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const url = new URL(request.url)
  const code = (url.searchParams.get('code') ?? '').trim().toUpperCase()
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    return json({ error: '無效房碼', code: 'bad_code' }, 400, request)
  }
  const me = gate.active.player.id
  if (!(await isPlayerInRoom(gate.db, me, code))) {
    return json({ error: '你唔喺呢間房', code: 'not_in_room' }, 403, request)
  }
  const peers = await listRoomPeers(gate.db, code, me)
  return json({ peers }, 200, request)
}

function roomStub(env: Env, code: string): DurableObjectStub {
  const id = env.ROOM.idFromName(code.toUpperCase())
  return env.ROOM.get(id)
}

async function createFriendChallenge(
  request: Request,
  env: Env,
): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const body = (await request.json().catch(() => ({}))) as {
    friendshipId?: unknown
    roomCode?: unknown
  }
  const friendshipId =
    typeof body.friendshipId === 'string' ? body.friendshipId : ''
  if (!friendshipId) {
    return json({ error: '缺少好友', code: 'bad_request' }, 400, request)
  }
  const inviteCode =
    typeof body.roomCode === 'string' ? body.roomCode.trim().toUpperCase() : ''
  if (inviteCode && !/^[A-Z0-9]{6}$/.test(inviteCode)) {
    return json({ error: '房碼無效', code: 'bad_request' }, 400, request)
  }
  const me = gate.active.player.id
  const friendship = await getFriendship(gate.db, friendshipId)
  if (!friendship || friendship.status !== 'accepted') {
    return json({ error: '唔係好友', code: 'not_found' }, 404, request)
  }
  if (friendship.requester_id !== me && friendship.addressee_id !== me) {
    return json({ error: '唔係好友', code: 'not_found' }, 404, request)
  }
  const challengeeId =
    friendship.requester_id === me
      ? friendship.addressee_id
      : friendship.requester_id

  const pending = await countPendingChallengesOut(gate.db, me, gate.now)
  if (pending >= MAX_PENDING_CHALLENGES) {
    return json(
      { error: `待處理約局最多 ${MAX_PENDING_CHALLENGES} 個`, code: 'limit_challenge' },
      429,
      request,
    )
  }

  // 房間內邀請：沿用現有房碼，唔新開房
  if (inviteCode) {
    if (!(await isPlayerInRoom(gate.db, me, inviteCode))) {
      return json({ error: '你唔喺呢間房', code: 'not_in_room' }, 403, request)
    }
    if (await isPlayerInRoom(gate.db, challengeeId, inviteCode)) {
      return json({ error: '對方已喺房內', code: 'already_in_room' }, 409, request)
    }
    const stub = roomStub(env, inviteCode)
    const snapRes = await stub.fetch('https://room/snapshot')
    if (!snapRes.ok) {
      return json({ error: '房間唔存在', code: 'no_room' }, 404, request)
    }
    const snapData = (await snapRes.json()) as {
      room?: { started?: boolean; seats?: { kind?: string }[] }
    }
    const room = snapData.room
    if (!room) {
      return json({ error: '房間唔存在', code: 'no_room' }, 404, request)
    }
    if (room.started) {
      return json({ error: '牌局已開始', code: 'started' }, 409, request)
    }
    const hasEmpty = (room.seats ?? []).some((s) => s.kind === 'empty')
    if (!hasEmpty) {
      return json(
        { error: '冇空位，請先清位或等有人離開', code: 'no_seat' },
        409,
        request,
      )
    }

    const challenge = await createChallenge(gate.db, {
      friendshipId,
      challengerId: me,
      challengeeId,
      roomCode: inviteCode,
      now: gate.now,
    })
    const other = await getPlayer(gate.db, challengeeId)
    return json(
      {
        ok: true,
        invited: true,
        challenge: {
          id: challenge.id,
          roomCode: challenge.room_code,
          expiresAt: challenge.expires_at,
          player: other
            ? {
                id: other.id,
                displayName: other.display_name,
                friendCode: other.friend_code,
              }
            : null,
        },
      },
      201,
      request,
    )
  }

  const hostName = gate.active.player.display_name
  let join: JoinResponse | null = null
  let lastErr = 'could not allocate room'
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode()
    const stub = roomStub(env, code)
    const res = await stub.fetch(
      new Request('https://room/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: hostName, code, playerId: me }),
      }),
    )
    if (res.status === 201) {
      join = (await res.json()) as JoinResponse
      await rememberSeat(env, me, join.code, join.seat)
      break
    }
    if (res.status === 409) continue
    lastErr = await res.text()
    break
  }
  if (!join) {
    return json({ error: lastErr, code: 'room_failed' }, 503, request)
  }

  const challenge = await createChallenge(gate.db, {
    friendshipId,
    challengerId: me,
    challengeeId,
    roomCode: join.code,
    now: gate.now,
  })
  const other = await getPlayer(gate.db, challengeeId)
  return json(
    {
      ok: true,
      invited: false,
      challenge: {
        id: challenge.id,
        roomCode: challenge.room_code,
        expiresAt: challenge.expires_at,
        player: other
          ? {
              id: other.id,
              displayName: other.display_name,
              friendCode: other.friend_code,
            }
          : null,
      },
      join,
    },
    201,
    request,
  )
}

async function respondChallenge(
  request: Request,
  env: Env,
  challengeId: string,
  action: 'accept' | 'decline',
): Promise<Response> {
  const gate = await requireActive(request, env)
  if (gate instanceof Response) return gate
  const me = gate.active.player.id
  const row = await getChallenge(gate.db, challengeId)
  if (!row || row.status !== 'pending') {
    return json({ error: '找不到約局', code: 'not_found' }, 404, request)
  }
  if (row.expires_at <= gate.now) {
    await setChallengeStatus(gate.db, row.id, 'expired', gate.now)
    return json({ error: '約局已過期', code: 'expired' }, 410, request)
  }
  if (action === 'decline') {
    if (row.challengee_id !== me && row.challenger_id !== me) {
      return json({ error: '找不到約局', code: 'not_found' }, 404, request)
    }
    await setChallengeStatus(
      gate.db,
      row.id,
      row.challenger_id === me ? 'cancelled' : 'declined',
      gate.now,
    )
    return json({ ok: true, status: row.challenger_id === me ? 'cancelled' : 'declined' }, 200, request)
  }
  if (row.challengee_id !== me) {
    return json({ error: '找不到約局', code: 'not_found' }, 404, request)
  }
  await setChallengeStatus(gate.db, row.id, 'accepted', gate.now)
  return json(
    {
      ok: true,
      status: 'accepted',
      roomCode: row.room_code,
      joinPath: `#/join/${row.room_code}`,
    },
    200,
    request,
  )
}
