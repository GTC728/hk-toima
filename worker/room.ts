/**
 * Room Durable Object — authoritative online table for 香港台麻 HK ToiMA.
 * Runs shared engine; WebSocket hibernation for clients.
 */
import {
  applyAction,
  autoPassImpossibleClaims,
  chooseAiAction,
  createGame,
  deadlineFromOpened,
  DEFAULT_RULES,
  getLegalActions,
  getPrivateView,
  getPublicView,
  timeoutPlayAction,
  type Action,
  type GameState,
  type Seat,
  type TableRules,
} from '../src/engine'
import type {
  ClientMessage,
  RoomSnapshot,
  SeatInfo,
  SeatKind,
  ServerMessage,
} from './protocol'
import { wsPathFor } from './protocol'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
/** 網上 AI 思考延遲：方便人睇牌河／分析行牌 */
const AI_DELAY_MS = 1100

interface SeatSlot {
  seat: Seat
  name: string
  kind: SeatKind
  /** Present for human seats (reconnect). */
  token: string | null
}

interface RoomPersist {
  code: string
  hostSeat: Seat
  seats: SeatSlot[]
  rules: TableRules
  game: GameState | null
  /** When claim window opened; alarm auto-passes remaining. */
  claimOpenedAt: number | null
  /** When current playing-phase action window opened. */
  turnOpenedAt: number | null
  /** Fingerprint of playing turn context (seat / draw / mustDiscard). */
  turnKey: string | null
}

interface WsAttachment {
  seat: Seat
  token: string
}

function randomToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function emptySeats(): SeatSlot[] {
  return ([0, 1, 2, 3] as Seat[]).map((seat) => ({
    seat,
    name: ['東', '南', '西', '北'][seat]!,
    kind: 'empty' as SeatKind,
    token: null,
  }))
}

function isSeat(n: unknown): n is Seat {
  return n === 0 || n === 1 || n === 2 || n === 3
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') ?? '*'
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-credentials': 'true',
  }
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

export class RoomDurableObject {
  private ctx: DurableObjectState
  private room: RoomPersist | null = null

  constructor(ctx: DurableObjectState, _env: unknown) {
    this.ctx = ctx
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    const url = new URL(request.url)
    const path = url.pathname

    if (request.method === 'POST' && path === '/create') {
      return this.handleCreate(request)
    }
    if (request.method === 'POST' && path === '/join') {
      return this.handleJoin(request)
    }
    if (request.method === 'GET' && path === '/snapshot') {
      await this.load()
      if (!this.room) {
        return json({ error: 'room not found' }, { status: 404 }, request)
      }
      return json({ room: this.snapshot() }, {}, request)
    }
    if (path === '/ws') {
      return this.handleWebSocket(request, url)
    }

    return json({ error: 'not found' }, { status: 404 }, request)
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.load()
    if (!this.room) {
      this.send(ws, { type: 'error', message: '房間唔存在', code: 'no_room' })
      return
    }

    const attachment = ws.deserializeAttachment() as WsAttachment | null
    if (!attachment || !isSeat(attachment.seat)) {
      this.send(ws, { type: 'error', message: '無效連線', code: 'bad_session' })
      return
    }

    let msg: ClientMessage
    try {
      const text =
        typeof message === 'string' ? message : new TextDecoder().decode(message)
      msg = JSON.parse(text) as ClientMessage
    } catch {
      this.send(ws, { type: 'error', message: '無效 JSON', code: 'bad_json' })
      return
    }

    try {
      await this.onClientMessage(ws, attachment.seat, msg)
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err)
      this.send(ws, { type: 'error', message: text, code: 'handler' })
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    await this.load()
    const attachment = ws.deserializeAttachment() as WsAttachment | null
    if (attachment && this.room && isSeat(attachment.seat)) {
      // leave kind/token; only connected flag in snapshot changes
      this.broadcastRoom()
    }
    try {
      ws.close(code, reason)
    } catch {
      /* already closed */
    }
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    try {
      ws.close(1011, 'error')
    } catch {
      /* ignore */
    }
  }

  async alarm(): Promise<void> {
    await this.load()
    if (!this.room?.game) return

    const game = this.room.game
    const now = Date.now()

    if (game.phase === 'claim_window' && this.room.claimOpenedAt != null) {
      const claimMs = Math.max(1, game.rules.claimTimeoutSec) * 1000
      if (now - this.room.claimOpenedAt >= claimMs) {
        await this.timeoutClaims()
        return
      }
    }

    if (game.phase === 'playing' && this.room.turnOpenedAt != null) {
      const turnMs = Math.max(1, game.rules.turnTimeoutSec) * 1000
      if (now - this.room.turnOpenedAt >= turnMs) {
        await this.timeoutTurn()
        return
      }
    }

    await this.tickAi()
  }

  // ── HTTP handlers ───────────────────────────────────────────────

  private async handleCreate(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string
      code?: string
    }
    const code = (body.code ?? '').toUpperCase()
    if (!code || code.length !== 6) {
      return json({ error: 'missing code' }, { status: 400 }, request)
    }

    await this.load()
    if (this.room) {
      return json({ error: 'room already exists' }, { status: 409 }, request)
    }

    const token = randomToken()
    const name = sanitizeName(body.name) || '東'
    const seats = emptySeats()
    seats[0] = { seat: 0, name, kind: 'human', token }

    this.room = {
      code,
      hostSeat: 0,
      seats,
      rules: { ...DEFAULT_RULES },
      game: null,
      claimOpenedAt: null,
      turnOpenedAt: null,
      turnKey: null,
    }
    await this.save()

    return json(
      {
        code,
        seat: 0 as Seat,
        seatToken: token,
        wsPath: wsPathFor(code, 0, token),
      },
      { status: 201 },
      request,
    )
  }

  private async handleJoin(request: Request): Promise<Response> {
    await this.load()
    if (!this.room) {
      return json({ error: '房間唔存在', code: 'no_room' }, { status: 404 }, request)
    }

    const body = (await request.json().catch(() => ({}))) as {
      name?: string
      seat?: number
      seatToken?: string
    }

    // Reconnect
    if (body.seatToken) {
      const slot = this.room.seats.find((s) => s.token === body.seatToken)
      if (!slot || slot.kind !== 'human') {
        return json(
          { error: '無效 seat token', code: 'bad_token' },
          { status: 403 },
          request,
        )
      }
      if (body.name) slot.name = sanitizeName(body.name) || slot.name
      await this.save()
      return json(
        {
          code: this.room.code,
          seat: slot.seat,
          seatToken: slot.token!,
          wsPath: wsPathFor(this.room.code, slot.seat, slot.token!),
        },
        {},
        request,
      )
    }

    if (this.room.game) {
      return json(
        { error: '牌局已開始，只可用 seatToken 重連', code: 'started' },
        { status: 409 },
        request,
      )
    }

    let seat: Seat | null = null
    if (isSeat(body.seat) && this.room.seats[body.seat]!.kind === 'empty') {
      seat = body.seat
    } else {
      const free = this.room.seats.find((s) => s.kind === 'empty')
      seat = free ? free.seat : null
    }
    if (seat == null) {
      return json({ error: '房間已滿', code: 'full' }, { status: 409 }, request)
    }

    const token = randomToken()
    const defaults = ['東', '南', '西', '北']
    const name = sanitizeName(body.name) || defaults[seat]!
    this.room.seats[seat] = { seat, name, kind: 'human', token }
    await this.save()
    this.broadcastRoom()

    return json(
      {
        code: this.room.code,
        seat,
        seatToken: token,
        wsPath: wsPathFor(this.room.code, seat, token),
      },
      {},
      request,
    )
  }

  private async handleWebSocket(request: Request, url: URL): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return json({ error: 'expected WebSocket' }, { status: 426 }, request)
    }

    await this.load()
    if (!this.room) {
      return json({ error: '房間唔存在' }, { status: 404 }, request)
    }

    const seatNum = Number(url.searchParams.get('seat'))
    const token = url.searchParams.get('token') ?? ''
    if (!isSeat(seatNum)) {
      return json({ error: 'invalid seat' }, { status: 400 }, request)
    }
    const slot = this.room.seats[seatNum]!
    if (slot.kind !== 'human' || !slot.token || slot.token !== token) {
      return json({ error: 'unauthorized' }, { status: 403 }, request)
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
    this.ctx.acceptWebSocket(server, [`seat:${seatNum}`])
    const attachment: WsAttachment = { seat: seatNum, token }
    server.serializeAttachment(attachment)

    this.send(server, {
      type: 'welcome',
      code: this.room.code,
      seat: seatNum,
      seatToken: token,
      room: this.snapshot(),
    })
    if (this.room.game) {
      this.pushGameViewsTo(server, seatNum)
    }
    this.broadcastRoom()

    return new Response(null, { status: 101, webSocket: client })
  }

  // ── WS message handling ─────────────────────────────────────────

  private async onClientMessage(
    ws: WebSocket,
    seat: Seat,
    msg: ClientMessage,
  ): Promise<void> {
    if (!this.room) return

    switch (msg.type) {
      case 'ping':
        this.send(ws, { type: 'pong' })
        return

      case 'setName': {
        const slot = this.room.seats[seat]!
        slot.name = sanitizeName(msg.name) || slot.name
        await this.save()
        this.broadcastRoom()
        return
      }

      case 'setSeatKind': {
        if (seat !== this.room.hostSeat) {
          this.send(ws, {
            type: 'error',
            message: '只有房主可以改座位',
            code: 'not_host',
          })
          return
        }
        if (this.room.game) {
          this.send(ws, {
            type: 'error',
            message: '牌局進行中',
            code: 'started',
          })
          return
        }
        if (!isSeat(msg.seat) || msg.seat === this.room.hostSeat) {
          this.send(ws, {
            type: 'error',
            message: '唔可以改呢個座位',
            code: 'bad_seat',
          })
          return
        }
        const target = this.room.seats[msg.seat]!
        if (target.kind === 'human') {
          this.send(ws, {
            type: 'error',
            message: '座位已有真人',
            code: 'occupied',
          })
          return
        }
        if (msg.kind !== 'empty' && msg.kind !== 'ai') {
          this.send(ws, { type: 'error', message: 'kind 無效', code: 'bad_kind' })
          return
        }
        target.kind = msg.kind
        target.token = null
        if (msg.kind === 'ai') {
          target.name = target.name || `AI${msg.seat}`
        }
        await this.save()
        this.broadcastRoom()
        return
      }

      case 'fillAi': {
        if (seat !== this.room.hostSeat) {
          this.send(ws, {
            type: 'error',
            message: '只有房主可以補 AI',
            code: 'not_host',
          })
          return
        }
        for (const s of this.room.seats) {
          if (s.kind === 'empty') {
            s.kind = 'ai'
            s.token = null
            s.name = s.name.startsWith('AI') ? s.name : `AI${s.seat}`
          }
        }
        await this.save()
        this.broadcastRoom()
        return
      }

      case 'setRules': {
        if (seat !== this.room.hostSeat) {
          this.send(ws, {
            type: 'error',
            message: '只有房主可以改枱規',
            code: 'not_host',
          })
          return
        }
        if (this.room.game) {
          this.send(ws, {
            type: 'error',
            message: '開局後唔改得枱規',
            code: 'started',
          })
          return
        }
        this.room.rules = { ...this.room.rules, ...msg.rules }
        await this.save()
        this.broadcastRoom()
        return
      }

      case 'start': {
        if (seat !== this.room.hostSeat) {
          this.send(ws, {
            type: 'error',
            message: '只有房主可以開始',
            code: 'not_host',
          })
          return
        }
        if (this.room.game) {
          this.send(ws, {
            type: 'error',
            message: '已經開始',
            code: 'started',
          })
          return
        }
        const fillAi = msg.fillAi !== false
        if (fillAi) {
          for (const s of this.room.seats) {
            if (s.kind === 'empty') {
              s.kind = 'ai'
              s.token = null
              s.name = `AI${s.seat}`
            }
          }
        }
        if (this.room.seats.some((s) => s.kind === 'empty')) {
          this.send(ws, {
            type: 'error',
            message: '仲有空位 — 請補 AI 或等人入席',
            code: 'empty_seats',
          })
          return
        }
        if (msg.rules) {
          this.room.rules = { ...this.room.rules, ...msg.rules }
        }
        const names = this.room.seats.map((s) => s.name)
        let game = createGame({
          seed: msg.seed,
          rules: this.room.rules,
          playerNames: names,
        })
        game = afterEngineStep(game)
        this.room.game = game
        this.noteTimers(game, true)
        await this.save()
        this.broadcastRoom()
        this.broadcastGame()
        await this.scheduleNextTick()
        this.broadcastEvent('牌局開始')
        return
      }

      case 'action': {
        await this.applyPlayerAction(ws, seat, msg.action)
        return
      }

      default:
        this.send(ws, {
          type: 'error',
          message: '未知訊息類型',
          code: 'unknown_type',
        })
    }
  }

  private async applyPlayerAction(
    ws: WebSocket,
    seat: Seat,
    action: Action,
  ): Promise<void> {
    if (!this.room?.game) {
      this.send(ws, { type: 'error', message: '未開始', code: 'not_started' })
      return
    }
    if (this.room.seats[seat]!.kind !== 'human') {
      this.send(ws, { type: 'error', message: '唔係你嘅座位', code: 'not_human' })
      return
    }

    try {
      let next = applyAction(this.room.game, action, seat)
      next = afterEngineStep(next)
      this.room.game = next
      this.noteTimers(next, true)
      await this.save()
      this.broadcastGame()
      await this.scheduleNextTick()
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err)
      this.send(ws, { type: 'error', message: text, code: 'illegal' })
    }
  }

  // ── AI + claim / turn timeout ───────────────────────────────────

  private playingTurnKey(game: GameState): string {
    return `play:${game.currentSeat}:${game.mustDiscard}:${game.justDrawn ?? ''}`
  }

  private noteTimers(game: GameState, forceTurnReset = false): void {
    if (!this.room) return
    if (game.phase === 'claim_window') {
      if (this.room.claimOpenedAt == null) {
        this.room.claimOpenedAt = Date.now()
      }
      this.room.turnOpenedAt = null
      this.room.turnKey = null
      return
    }
    this.room.claimOpenedAt = null
    if (game.phase === 'playing') {
      const key = this.playingTurnKey(game)
      if (forceTurnReset || this.room.turnKey !== key || this.room.turnOpenedAt == null) {
        this.room.turnKey = key
        this.room.turnOpenedAt = Date.now()
      }
      return
    }
    this.room.turnOpenedAt = null
    this.room.turnKey = null
  }

  private actionDeadlineAt(): number | null {
    if (!this.room?.game) return null
    const g = this.room.game
    if (g.phase === 'claim_window' && this.room.claimOpenedAt != null) {
      return deadlineFromOpened(this.room.claimOpenedAt, g.rules.claimTimeoutSec)
    }
    if (g.phase === 'playing' && this.room.turnOpenedAt != null) {
      return deadlineFromOpened(this.room.turnOpenedAt, g.rules.turnTimeoutSec)
    }
    return null
  }

  private async timeoutClaims(): Promise<void> {
    if (!this.room?.game || this.room.game.phase !== 'claim_window') return
    let s = this.room.game
    const awaiting = [...(s.pendingDiscard?.awaiting ?? [])]
    for (const seat of awaiting) {
      if (s.phase !== 'claim_window') break
      if (!s.pendingDiscard?.awaiting.includes(seat)) continue
      try {
        s = applyAction(s, { type: 'pass' }, seat)
        s = afterEngineStep(s)
      } catch {
        /* ignore */
      }
    }
    this.room.game = s
    this.noteTimers(s, true)
    await this.save()
    this.broadcastEvent('鳴牌時限到，自動 pass')
    this.broadcastGame()
    await this.scheduleNextTick()
  }

  private async timeoutTurn(): Promise<void> {
    if (!this.room?.game || this.room.game.phase !== 'playing') return
    const seat = this.room.game.currentSeat
    let s = this.room.game
    // 網上無練習提示：超時打最新摸入；可糊仍自動糊
    const choice = timeoutPlayAction(s, seat, { preferAiDiscard: false })
    if (!choice) {
      // Still refresh timer so we don't spin alarms forever
      this.noteTimers(s, true)
      await this.save()
      await this.scheduleNextTick()
      return
    }
    try {
      s = applyAction(s, choice, seat)
      s = afterEngineStep(s)
    } catch {
      this.noteTimers(this.room.game, true)
      await this.save()
      await this.scheduleNextTick()
      return
    }
    this.room.game = s
    this.noteTimers(s, true)
    await this.save()
    this.broadcastEvent(
      choice.type === 'discard'
        ? `出牌時限到，自動打 ${choice.tile}`
        : '出牌時限到，自動行動',
    )
    this.broadcastGame()
    await this.scheduleNextTick()
  }

  private async tickAi(): Promise<void> {
    if (!this.room?.game) return
    let s = this.room.game
    let acted = false

    // Claim window: AI seats still awaiting
    if (s.phase === 'claim_window' && s.pendingDiscard) {
      for (const seat of [...s.pendingDiscard.awaiting]) {
        if (this.room.seats[seat]!.kind !== 'ai') continue
        const choice = chooseAiAction(s, seat)
        if (!choice) continue
        try {
          s = applyAction(s, choice, seat)
          s = afterEngineStep(s)
          acted = true
          break
        } catch {
          try {
            s = applyAction(s, { type: 'pass' }, seat)
            s = afterEngineStep(s)
            acted = true
            break
          } catch {
            /* skip */
          }
        }
      }
    }

    // Playing: current seat is AI
    if (!acted && s.phase === 'playing') {
      const seat = s.currentSeat
      if (this.room.seats[seat]!.kind === 'ai') {
        const choice = chooseAiAction(s, seat)
        if (choice) {
          try {
            s = applyAction(s, choice, seat)
            s = afterEngineStep(s)
            acted = true
          } catch {
            /* AI stub may pick illegal — skip */
          }
        }
      }
    }

    // Round over: host AI / first AI can advance lightly — skip; humans decide

    if (acted) {
      this.room.game = s
      this.noteTimers(s, true)
      await this.save()
      this.broadcastGame()
      await this.scheduleNextTick()
    } else {
      await this.scheduleNextTick()
    }
  }

  private async scheduleNextTick(): Promise<void> {
    if (!this.room?.game) {
      await this.ctx.storage.deleteAlarm()
      return
    }
    const game = this.room.game
    const now = Date.now()

    if (game.phase === 'claim_window') {
      const opened = this.room.claimOpenedAt ?? now
      this.room.claimOpenedAt = opened
      await this.save()
      const deadline = deadlineFromOpened(opened, game.rules.claimTimeoutSec)
      const aiWaiting = game.pendingDiscard?.awaiting.some(
        (seat) => this.room!.seats[seat]!.kind === 'ai',
      )
      if (aiWaiting) {
        await this.ctx.storage.setAlarm(Math.min(now + AI_DELAY_MS, deadline))
        return
      }
      await this.ctx.storage.setAlarm(deadline)
      return
    }

    if (game.phase === 'playing') {
      const opened = this.room.turnOpenedAt ?? now
      if (this.room.turnOpenedAt == null) {
        this.room.turnOpenedAt = opened
        this.room.turnKey = this.playingTurnKey(game)
        await this.save()
      }
      const deadline = deadlineFromOpened(opened, game.rules.turnTimeoutSec)
      if (this.room.seats[game.currentSeat]!.kind === 'ai') {
        await this.ctx.storage.setAlarm(Math.min(now + AI_DELAY_MS, deadline))
        return
      }
      await this.ctx.storage.setAlarm(deadline)
      return
    }

    await this.ctx.storage.deleteAlarm()
  }

  // ── Broadcast helpers ───────────────────────────────────────────

  private snapshot(): RoomSnapshot {
    const room = this.room!
    return {
      code: room.code,
      hostSeat: room.hostSeat,
      started: room.game != null,
      rules: room.rules,
      seats: room.seats.map((s) => this.seatInfo(s)),
    }
  }

  private seatInfo(slot: SeatSlot): SeatInfo {
    const connected =
      slot.kind === 'human' &&
      this.ctx.getWebSockets(`seat:${slot.seat}`).length > 0
    return {
      seat: slot.seat,
      name: slot.name,
      kind: slot.kind,
      connected: slot.kind === 'ai' ? true : connected,
    }
  }

  private playerNames(): string[] {
    return this.room!.seats.map((s) => s.name)
  }

  private broadcastRoom(): void {
    if (!this.room) return
    const msg: ServerMessage = { type: 'room', room: this.snapshot() }
    this.broadcast(msg)
  }

  private broadcastEvent(message: string): void {
    this.broadcast({ type: 'event', message })
  }

  private broadcastGame(): void {
    if (!this.room?.game) return
    const names = this.playerNames()
    const deadline = this.actionDeadlineAt()
    const publicView = getPublicView(this.room.game, names)
    this.broadcast({
      type: 'public',
      view: publicView,
      actionDeadlineAt: deadline,
    })

    for (const seat of [0, 1, 2, 3] as Seat[]) {
      if (this.room.seats[seat]!.kind !== 'human') continue
      const view = getPrivateView(this.room.game, seat, names)
      for (const ws of this.ctx.getWebSockets(`seat:${seat}`)) {
        this.send(ws, {
          type: 'private',
          view,
          actionDeadlineAt: deadline,
        })
      }
    }
  }

  private pushGameViewsTo(ws: WebSocket, seat: Seat): void {
    if (!this.room?.game) return
    const names = this.playerNames()
    const deadline = this.actionDeadlineAt()
    this.send(ws, {
      type: 'public',
      view: getPublicView(this.room.game, names),
      actionDeadlineAt: deadline,
    })
    this.send(ws, {
      type: 'private',
      view: getPrivateView(this.room.game, seat, names),
      actionDeadlineAt: deadline,
    })
  }

  private broadcast(msg: ServerMessage): void {
    const raw = JSON.stringify(msg)
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(raw)
      } catch {
        /* drop */
      }
    }
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg))
    } catch {
      /* drop */
    }
  }

  // ── Persistence ─────────────────────────────────────────────────

  private async load(): Promise<void> {
    if (this.room) return
    this.room = (await this.ctx.storage.get<RoomPersist>('room')) ?? null
    if (this.room) {
      // Migrate older persist shapes
      if (this.room.turnOpenedAt === undefined) this.room.turnOpenedAt = null
      if (this.room.turnKey === undefined) this.room.turnKey = null
      if (!this.room.rules.turnTimeoutSec) {
        this.room.rules = { ...DEFAULT_RULES, ...this.room.rules }
      }
    }
  }

  private async save(): Promise<void> {
    if (!this.room) return
    await this.ctx.storage.put('room', this.room)
  }
}

/** 上／碰後係 mustDiscard（唔好自動摸）；只自動 pass 無法鳴牌者 */
function afterEngineStep(state: GameState): GameState {
  return autoPassImpossibleClaims(state)
}

function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') return ''
  return name.trim().slice(0, 16)
}

/** Generate a 6-char room code (caller uses idFromName). */
export function generateRoomCode(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length]!
  }
  return out
}
