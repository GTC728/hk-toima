/**
 * 香港台麻 HK ToiMA — online Room WebSocket / HTTP protocol (Phase 2C)
 *
 * Shared with Phase 3 UI. Keep payloads JSON-serializable.
 *
 * ── HTTP ──────────────────────────────────────────────────────────
 * POST /api/rooms
 *   body: { name?: string }
 *   有工作階段 cookie 先在座位記低 playerId；無 cookie 一樣開得房。
 *   → { code, seat, seatToken, wsPath }
 *
 * POST /api/rooms/:code/join
 *   body: { name?: string, seat?: 0|1|2|3, seatToken?: string }
 *   seatToken → reconnect that seat; else claim empty seat (optional preference)
 *   重連唔改緊打嗰席嘅名。出牌權限仍然只對 seatToken。
 *   → { code, seat, seatToken, wsPath }
 *
 * GET  /api/rooms/:code          → lobby snapshot (no private hands)
 * GET  /api/rooms/:code/ws?seat=&token=  → WebSocket upgrade
 * GET  /api/health
 *
 * POST /api/match/join   { mode: 'casual'|'ranked', name, fillAiAfterSec?, rules? }
 * GET  /api/match/status?ticketId=&mode=
 * POST /api/match/leave  { ticketId, mode? }
 *
 * ── Client → Server (WS JSON) ─────────────────────────────────────
 * { type: 'ping' }
 * { type: 'setName', name: string }
 * { type: 'setSeatKind', seat: Seat, kind: 'empty' | 'ai' }   // host; empty↔AI only
 * { type: 'setAiPersona', seat: Seat, persona: 'steady' | 'attack' | 'gamble' }
 * { type: 'fillAi' }                                         // host: empty → AI
 * { type: 'setRules', rules: Partial<TableRules> }           // host: live sync before start
 * { type: 'start', seed?: number, rules?: Partial<TableRules>, fillAi?: boolean }
 * { type: 'action', action: Action }                         // engine Action
 *
 * ── Server → Client (WS JSON) ─────────────────────────────────────
 * { type: 'pong' }
 * { type: 'welcome', code, seat, seatToken, room: RoomSnapshot }
 * { type: 'room', room: RoomSnapshot }
 * { type: 'public', view: PublicGameView, actionDeadlineAt?: number | null }
 * { type: 'private', view: PrivateGameView, actionDeadlineAt?: number | null }
 *     actionDeadlineAt = epoch ms when current turn / claim window expires
 * { type: 'error', message: string, code?: string }
 * { type: 'event', message: string }                         // optional log line
 */

import type {
  Action,
  AiPersona,
  PrivateGameView,
  PublicGameView,
  Seat,
  TableRules,
} from '../src/engine'

export type SeatKind = 'empty' | 'human' | 'ai'

export interface SeatInfo {
  seat: Seat
  name: string
  kind: SeatKind
  connected: boolean
  /** AI 性格。舊房冇呢個欄時客戶端當進攻。 */
  persona: AiPersona
}

export interface RoomSnapshot {
  code: string
  hostSeat: Seat
  started: boolean
  seats: SeatInfo[]
  rules: TableRules
}

/** HTTP create / join response */
export interface JoinResponse {
  code: string
  seat: Seat
  seatToken: string
  wsPath: string
}

export type ClientMessage =
  | { type: 'ping' }
  | { type: 'setName'; name: string }
  | { type: 'setSeatKind'; seat: Seat; kind: 'empty' | 'ai' }
  | { type: 'setAiPersona'; seat: Seat; persona: AiPersona }
  | { type: 'fillAi' }
  | { type: 'setRules'; rules: Partial<TableRules> }
  | {
      type: 'start'
      seed?: number
      rules?: Partial<TableRules>
      /** default true — empty seats become AI */
      fillAi?: boolean
    }
  | { type: 'action'; action: Action }

export type ServerMessage =
  | { type: 'pong' }
  | {
      type: 'welcome'
      code: string
      seat: Seat
      seatToken: string
      room: RoomSnapshot
    }
  | { type: 'room'; room: RoomSnapshot }
  | {
      type: 'public'
      view: PublicGameView
      /** Epoch ms; null when no active turn/claim timer */
      actionDeadlineAt?: number | null
    }
  | {
      type: 'private'
      view: PrivateGameView
      actionDeadlineAt?: number | null
    }
  | { type: 'error'; message: string; code?: string }
  | { type: 'event'; message: string }

export function wsPathFor(code: string, seat: Seat, seatToken: string): string {
  const q = new URLSearchParams({
    seat: String(seat),
    token: seatToken,
  })
  return `/api/rooms/${encodeURIComponent(code)}/ws?${q}`
}
