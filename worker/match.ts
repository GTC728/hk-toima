/**
 * Match queue Durable Object — 普通／排位排隊，湊人開房；逾時可補 AI。
 * 組隊邏輯見 match-algo.ts。
 */
import type { Env } from './env'
import { generateRoomCode } from './room'
import { wsPathFor, type JoinResponse } from './protocol'
import type { TableRules } from '../src/engine'
import { corsHeaders } from './cors'
import {
  bucketPosition,
  clampFillMs as clampFillMsAlgo,
  clampQueueRating,
  enqueueDeduped,
  pickAllMatches,
  type MatchMode,
  type QueuedPlayer,
} from './match-algo'

export type { MatchMode } from './match-algo'

export interface MatchJoinBody {
  mode?: MatchMode
  name?: string
  /** 0 = 唔補 AI，一直等人 */
  fillAiAfterSec?: number
  rules?: Partial<TableRules>
  playerId?: string | null
  /** 排位分數（客戶端／帳戶） */
  rating?: number
}

interface MatchedResult {
  ticketId: string
  join: JoinResponse
  matchedAt: number
  fillAi: boolean
  mode: MatchMode
  rules: Partial<TableRules>
}

interface QueueState {
  queue: QueuedPlayer[]
  results: Record<string, MatchedResult>
}

function json(data: unknown, init: ResponseInit = {}, request?: Request): Response {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  if (request) {
    for (const [k, v] of Object.entries(corsHeaders(request))) {
      headers.set(k, v)
    }
  }
  return new Response(JSON.stringify(data), { ...init, headers })
}

function ticketId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') return '玩家'
  const t = name.trim().slice(0, 16)
  return t || '玩家'
}

/** re-export clamp for DO join path */
function clampFillMs(sec: unknown, mode: MatchMode): number {
  return clampFillMsAlgo(sec, mode)
}

const RESULT_TTL_MS = 10 * 60_000
const ALARM_MS = 2_000

export class MatchQueueDurableObject {
  private ctx: DurableObjectState
  private env: Env
  private mode: MatchMode = 'casual'

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx
    this.env = env
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    const url = new URL(request.url)
    const path = url.pathname
    const modeParam = url.searchParams.get('mode')
    this.mode = modeParam === 'ranked' ? 'ranked' : 'casual'

    if (request.method === 'POST' && path === '/join') {
      return this.handleJoin(request)
    }
    if (request.method === 'GET' && path === '/status') {
      return this.handleStatus(url, request)
    }
    if (request.method === 'POST' && path === '/leave') {
      return this.handleLeave(request)
    }

    return json({ error: 'not found' }, { status: 404 }, request)
  }

  async alarm(): Promise<void> {
    await this.sweepAndMatch()
    const state = await this.load()
    if (state.queue.length > 0 || Object.keys(state.results).length > 0) {
      await this.ctx.storage.setAlarm(Date.now() + ALARM_MS)
    }
  }

  private async load(): Promise<QueueState> {
    const raw = await this.ctx.storage.get<QueueState>('state')
    if (raw && Array.isArray(raw.queue) && raw.results && typeof raw.results === 'object') {
      return { queue: raw.queue, results: raw.results }
    }
    return { queue: [], results: {} }
  }

  private async save(state: QueueState): Promise<void> {
    await this.ctx.storage.put('state', state)
  }

  private async ensureAlarm(): Promise<void> {
    const existing = await this.ctx.storage.getAlarm()
    if (existing == null) {
      await this.ctx.storage.setAlarm(Date.now() + ALARM_MS)
    }
  }

  private async handleJoin(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as MatchJoinBody
    const name = sanitizeName(body.name)
    const fillAiAfterMs = clampFillMs(body.fillAiAfterSec, this.mode)
    const rules = body.rules && typeof body.rules === 'object' ? body.rules : {}
    const playerId =
      typeof body.playerId === 'string' && body.playerId.length > 0
        ? body.playerId
        : null

    const state = await this.load()
    const id = ticketId()
    const next: QueuedPlayer = {
      ticketId: id,
      name,
      playerId,
      joinedAt: Date.now(),
      fillAiAfterMs,
      rules,
      rating: clampQueueRating(body.rating),
    }
    const deduped = enqueueDeduped(state.queue, next)
    for (const old of deduped.replacedTicketIds) {
      delete state.results[old]
    }
    state.queue = deduped.queue
    await this.save(state)
    await this.ensureAlarm()
    await this.sweepAndMatch()

    const after = await this.load()
    const matched = after.results[id]
    if (matched) {
      return json(
        {
          status: 'matched' as const,
          ticketId: id,
          mode: this.mode,
          join: matched.join,
          fillAi: matched.fillAi,
          rules: matched.rules,
        },
        { status: 200 },
        request,
      )
    }

    const pos = bucketPosition(after.queue, id)
    return json(
      {
        status: 'queued' as const,
        ticketId: id,
        mode: this.mode,
        position: pos?.position ?? 1,
        queueSize: pos?.bucketSize ?? after.queue.length,
        waitedSec: 0,
        fillAiAfterSec: Math.floor(fillAiAfterMs / 1000),
      },
      { status: 200 },
      request,
    )
  }

  private async handleStatus(url: URL, request: Request): Promise<Response> {
    const id = url.searchParams.get('ticketId') ?? ''
    if (!id) {
      return json({ error: 'ticketId required' }, { status: 400 }, request)
    }
    await this.sweepAndMatch()
    const state = await this.load()
    const matched = state.results[id]
    if (matched) {
      return json(
        {
          status: 'matched' as const,
          ticketId: id,
          mode: matched.mode,
          join: matched.join,
          fillAi: matched.fillAi,
          rules: matched.rules,
        },
        {},
        request,
      )
    }
    const idx = state.queue.findIndex((q) => q.ticketId === id)
    if (idx < 0) {
      return json(
        { status: 'gone' as const, ticketId: id, error: '票已失效' },
        { status: 404 },
        request,
      )
    }
    const q = state.queue[idx]!
    const pos = bucketPosition(state.queue, id)
    return json(
      {
        status: 'queued' as const,
        ticketId: id,
        mode: this.mode,
        position: pos?.position ?? idx + 1,
        queueSize: pos?.bucketSize ?? state.queue.length,
        waitedSec: Math.floor((Date.now() - q.joinedAt) / 1000),
        fillAiAfterSec: Math.floor(q.fillAiAfterMs / 1000),
      },
      {},
      request,
    )
  }

  private async handleLeave(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as { ticketId?: string }
    const id = typeof body.ticketId === 'string' ? body.ticketId : ''
    if (!id) {
      return json({ error: 'ticketId required' }, { status: 400 }, request)
    }
    const state = await this.load()
    state.queue = state.queue.filter((q) => q.ticketId !== id)
    delete state.results[id]
    await this.save(state)
    return json({ status: 'left' as const, ticketId: id }, {}, request)
  }

  private async sweepAndMatch(): Promise<void> {
    const state = await this.load()
    const now = Date.now()

    for (const [id, r] of Object.entries(state.results)) {
      if (now - r.matchedAt > RESULT_TTL_MS) delete state.results[id]
    }

    const { picks, rest } = pickAllMatches(state.queue, {
      now,
      mode: this.mode,
    })
    const failed: QueuedPlayer[] = []

    for (const pick of picks) {
      const ok = await this.formMatch(state, pick.group, pick.fillAi, pick.rules)
      if (!ok) failed.push(...pick.group)
    }

    state.queue = [...failed, ...rest]
    await this.save(state)
  }

  private async formMatch(
    state: QueueState,
    group: QueuedPlayer[],
    fillAi: boolean,
    rules: Partial<TableRules>,
  ): Promise<boolean> {
    if (group.length === 0 || group.length > 4) return false

    // 等得最耐嘅做房主（座位 0）
    const ordered = [...group].sort((a, b) => a.joinedAt - b.joinedAt)

    let lastErr = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateRoomCode()
      const stub = this.env.ROOM.get(this.env.ROOM.idFromName(code))
      const createRes = await stub.fetch(
        new Request('https://room/create', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: ordered[0]!.name,
            code,
            playerId: ordered[0]!.playerId,
          }),
        }),
      )
      if (createRes.status === 409) {
        lastErr = 'code collision'
        continue
      }
      if (!createRes.ok) {
        lastErr = await createRes.text()
        return false
      }
      const hostJoin = (await createRes.json()) as JoinResponse
      const joins: JoinResponse[] = [hostJoin]

      for (let i = 1; i < ordered.length; i++) {
        const p = ordered[i]!
        const joinRes = await stub.fetch(
          new Request('https://room/join', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              name: p.name,
              playerId: p.playerId,
            }),
          }),
        )
        if (!joinRes.ok) {
          lastErr = await joinRes.text()
          return false
        }
        joins.push((await joinRes.json()) as JoinResponse)
      }

      const matchedAt = Date.now()
      const needAi = fillAi || ordered.length < 4
      for (let i = 0; i < ordered.length; i++) {
        const p = ordered[i]!
        const join = joins[i]!
        state.results[p.ticketId] = {
          ticketId: p.ticketId,
          join: {
            ...join,
            wsPath:
              join.wsPath ||
              wsPathFor(join.code, join.seat, join.seatToken),
          },
          matchedAt,
          fillAi: needAi,
          mode: this.mode,
          rules,
        }
      }
      return true
    }

    console.error('match form failed', lastErr)
    return false
  }
}
