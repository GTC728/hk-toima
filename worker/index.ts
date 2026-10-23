/**
 * Cloudflare Worker — 香港台麻 HK ToiMa online API
 * Routes HTTP create/join to Room Durable Objects; proxies WebSocket upgrades.
 */
export { RoomDurableObject } from './room'
import { generateRoomCode } from './room'
import { wsPathFor, type JoinResponse } from './protocol'
import type { Seat } from '../src/engine'

export interface Env {
  ROOM: DurableObjectNamespace
}

function cors(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') ?? '*'
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-credentials': 'true',
  }
}

function withCors(res: Response, request: Request): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(cors(request))) {
    headers.set(k, v)
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

function json(data: unknown, status = 200, request?: Request): Response {
  const headers: HeadersInit = {
    'content-type': 'application/json; charset=utf-8',
    ...(request ? cors(request) : {}),
  }
  return new Response(JSON.stringify(data), { status, headers })
}

function roomStub(env: Env, code: string): DurableObjectStub {
  const id = env.ROOM.idFromName(code.toUpperCase())
  return env.ROOM.get(id)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(request) })
    }

    const url = new URL(request.url)
    const { pathname } = url

    if (pathname === '/api/health') {
      return json(
        {
          ok: true,
          product: '香港台麻 HK ToiMa',
          phase: '2c-online-do',
        },
        200,
        request,
      )
    }

    // POST /api/rooms — create
    if (pathname === '/api/rooms' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as { name?: string }
      let lastErr: string | null = null
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateRoomCode()
        const stub = roomStub(env, code)
        const res = await stub.fetch(
          new Request('https://room/create', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: body.name, code }),
          }),
        )
        if (res.status === 201) {
          const data = (await res.json()) as JoinResponse
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
        const res = await stub.fetch(
          new Request('https://room/join', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: await request.text(),
          }),
        )
        const data = await res.json()
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
          'POST /api/rooms',
          'POST /api/rooms/:code/join',
          'GET /api/rooms/:code',
          'GET /api/rooms/:code/ws?seat=&token=',
        ],
      },
      200,
      request,
    )
  },
}
