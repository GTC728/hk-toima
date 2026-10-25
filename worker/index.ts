/**
 * Cloudflare Worker — 香港台麻 HK ToiMa online API
 * Routes HTTP create/join to Room Durable Objects; proxies WebSocket upgrades.
 * Account routes live here; the room reducer does not own the player cookie.
 */
export { RoomDurableObject } from './room'
export { MatchQueueDurableObject } from './match'
import { generateRoomCode } from './room'
import { wsPathFor, type JoinResponse } from './protocol'
import type { Seat } from '../src/engine'
import { corsHeaders } from './cors'
import type { Env } from './env'
import {
  handleAccount,
  lookupSessionPlayerId,
  rememberSeat,
} from './account/routes'
import { getPlayerRanked } from './account/store'
import type { MatchMode } from './match'
import { RANKED_DEFAULT } from '../src/engine/ranked'

export type { Env }

function withCors(res: Response, request: Request): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(corsHeaders(request))) {
    headers.set(k, v)
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

function json(data: unknown, status = 200, request?: Request): Response {
  const headers: HeadersInit = {
    'content-type': 'application/json; charset=utf-8',
    ...(request ? corsHeaders(request) : {}),
  }
  return new Response(JSON.stringify(data), { status, headers })
}

function roomStub(env: Env, code: string): DurableObjectStub {
  const id = env.ROOM.idFromName(code.toUpperCase())
  return env.ROOM.get(id)
}

function matchStub(env: Env, mode: MatchMode): DurableObjectStub {
  const id = env.MATCH.idFromName(`match:${mode}`)
  return env.MATCH.get(id)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    const account = await handleAccount(request, env)
    if (account) return account

    const url = new URL(request.url)
    const { pathname } = url

    if (pathname === '/api/health') {
      return json(
        {
          ok: true,
          product: '香港台麻 HK ToiMa',
          phase: 'accounts',
        },
        200,
        request,
      )
    }

    // POST /api/rooms — create. Cookie is optional; seatToken is still the seat.
    if (pathname === '/api/rooms' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as { name?: string }
      const playerId = await lookupSessionPlayerId(request, env)
      let lastErr: string | null = null
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateRoomCode()
        const stub = roomStub(env, code)
        const res = await stub.fetch(
          new Request('https://room/create', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: body.name, code, playerId }),
          }),
        )
        if (res.status === 201) {
          const data = (await res.json()) as JoinResponse
          if (playerId) await rememberSeat(env, playerId, data.code, data.seat)
          return json(data, 201, request)
        }
        if (res.status === 409) {
          lastErr = 'code collision'
          continue
        }
        const err = await res.text()
        return json({ error: err || 'create failed' }, res.status, request)
      }
      return json(
        { error: lastErr ?? 'could not allocate room code' },
        503,
        request,
      )
    }

    // /api/rooms/:code[...]
    const roomMatch = pathname.match(
      /^\/api\/rooms\/([A-Za-z0-9]{6})(\/join|\/ws)?$/,
    )
    if (roomMatch) {
      const code = roomMatch[1]!.toUpperCase()
      const rest = roomMatch[2] ?? ''
      const stub = roomStub(env, code)

      if (rest === '/join' && request.method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as {
          name?: string
          seat?: number
          seatToken?: string
        }
        const playerId = await lookupSessionPlayerId(request, env)
        const reconnect =
          typeof body.seatToken === 'string' && body.seatToken.length > 0
        const res = await stub.fetch(
          new Request('https://room/join', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              name: body.name,
              seat: body.seat,
              seatToken: body.seatToken,
              playerId,
            }),
          }),
        )
        const data = (await res.json()) as JoinResponse
        if (res.ok && playerId && !reconnect && typeof data.seat === 'number') {
          await rememberSeat(env, playerId, code, data.seat)
        }
        return json(data, res.status, request)
      }

      if (rest === '/ws') {
        const seat = url.searchParams.get('seat')
        const token = url.searchParams.get('token')
        const forward = new URL('https://room/ws')
        if (seat) forward.searchParams.set('seat', seat)
        if (token) forward.searchParams.set('token', token)
        const res = await stub.fetch(new Request(forward.toString(), request))
        // WebSocket upgrade — pass through without wrapping body
        if (res.status === 101) return res
        return withCors(res, request)
      }

      if (rest === '' && request.method === 'GET') {
        const res = await stub.fetch('https://room/snapshot')
        const data = await res.json()
        return json(data, res.status, request)
      }
    }

    // ── Matchmaking ───────────────────────────────────────────────
    // POST /api/match/join  { mode, name, fillAiAfterSec?, rules? }
    // GET  /api/match/status?ticketId=&mode=
    // POST /api/match/leave { ticketId, mode? }
    if (pathname === '/api/match/join' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as {
        mode?: MatchMode
        name?: string
        fillAiAfterSec?: number
        rules?: unknown
        rating?: number
      }
      const mode: MatchMode = body.mode === 'ranked' ? 'ranked' : 'casual'
      const playerId = await lookupSessionPlayerId(request, env)
      let rating =
        typeof body.rating === 'number' && Number.isFinite(body.rating)
          ? body.rating
          : RANKED_DEFAULT
      if (mode === 'ranked' && playerId && env.DB) {
        try {
          const row = await getPlayerRanked(env.DB, playerId)
          if (row) rating = row.rating
        } catch {
          /* D1 未 migrate 時用客戶端分數 */
        }
      }
      const stub = matchStub(env, mode)
      const res = await stub.fetch(
        new Request(`https://match/join?mode=${mode}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            mode,
            name: body.name,
            fillAiAfterSec: body.fillAiAfterSec,
            rules: body.rules,
            playerId,
            rating,
          }),
        }),
      )
      const data = await res.json()
      if (
        res.ok &&
        playerId &&
        data &&
        typeof data === 'object' &&
        (data as { status?: string }).status === 'matched' &&
        (data as { join?: JoinResponse }).join
      ) {
        const join = (data as { join: JoinResponse }).join
        await rememberSeat(env, playerId, join.code, join.seat)
      }
      return json(data, res.status, request)
    }

    if (pathname === '/api/match/status' && request.method === 'GET') {
      const ticketId = url.searchParams.get('ticketId') ?? ''
      const mode: MatchMode =
        url.searchParams.get('mode') === 'ranked' ? 'ranked' : 'casual'
      if (!ticketId) {
        return json({ error: 'ticketId required' }, 400, request)
      }
      const stub = matchStub(env, mode)
      const res = await stub.fetch(
        new Request(
          `https://match/status?mode=${mode}&ticketId=${encodeURIComponent(ticketId)}`,
        ),
      )
      const data = await res.json()
      if (
        res.ok &&
        data &&
        typeof data === 'object' &&
        (data as { status?: string }).status === 'matched'
      ) {
        const playerId = await lookupSessionPlayerId(request, env)
        const join = (data as { join?: JoinResponse }).join
        if (playerId && join) {
          await rememberSeat(env, playerId, join.code, join.seat)
        }
      }
      return json(data, res.status, request)
    }

    if (pathname === '/api/match/leave' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as {
        ticketId?: string
        mode?: MatchMode
      }
      const mode: MatchMode = body.mode === 'ranked' ? 'ranked' : 'casual'
      const stub = matchStub(env, mode)
      const res = await stub.fetch(
        new Request(`https://match/leave?mode=${mode}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ticketId: body.ticketId }),
        }),
      )
      const data = await res.json()
      return json(data, res.status, request)
    }

    // Convenience: document wsPath helper for clients that already have seat+token
    if (pathname === '/api/ws-path' && request.method === 'GET') {
      const code = url.searchParams.get('code')
      const seat = Number(url.searchParams.get('seat'))
      const token = url.searchParams.get('token')
      if (!code || !token || !(seat === 0 || seat === 1 || seat === 2 || seat === 3)) {
        return json({ error: 'code, seat, token required' }, 400, request)
      }
      return json(
        { wsPath: wsPathFor(code.toUpperCase(), seat as Seat, token) },
        200,
        request,
      )
    }

    return json(
      {
        product: '香港台麻 HK ToiMa',
        endpoints: [
          'GET /api/health',
          'POST /api/me',
          'PATCH /api/me',
          'DELETE /api/me',
          'GET /api/me/export',
          'GET /api/me/sessions',
          'POST /api/me/logout',
          'POST /api/me/logout-all',
          'POST /api/me/imports',
          'POST /api/auth/email/send',
          'POST /api/auth/email/consume',
          'GET /api/friends',
          'POST /api/friends/request',
          'POST /api/friends/presence',
          'POST /api/friends/challenge',
          'GET /api/friends/peers',
          'POST /api/friends/:id/accept',
          'POST /api/friends/:id/decline',
          'DELETE /api/friends/:id',
          'POST /api/friends/challenges/:id/accept',
          'POST /api/friends/challenges/:id/decline',
          'POST /api/rooms',
          'POST /api/rooms/:code/join',
          'GET /api/rooms/:code',
          'GET /api/rooms/:code/ws?seat=&token=',
          'POST /api/match/join',
          'GET /api/match/status',
          'POST /api/match/leave',
        ],
      },
      200,
      request,
    )
  },
}
