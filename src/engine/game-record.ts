/**
 * Chess 式牌譜：Header + plies（actionLog）。
 * 對局中操作欄同賽後重溫共用 formatPly。
 */
import { parseTile } from './tiles'
import type {
  Action,
  ActionLogEntry,
  GameState,
  Phase,
  Seat,
  TableRules,
  TileId,
} from './types'

const WIND = ['東', '南', '西', '北'] as const

export interface GameRecordPlayer {
  seat: Seat
  displayName: string
  kind?: 'human' | 'ai' | 'empty'
  persona?: string
}

export interface GameRecordHeader {
  seed: number
  dealer: Seat
  consecutiveWins: number
  rules: TableRules
  round: number
  windRound: number
  players: GameRecordPlayer[]
  matchId?: string
  roomCode?: string
  playKind?: string
}

export interface GameRecordSummary {
  kind: 'win' | 'draw'
  winnerSeats: Seat[]
  fanTotal?: number
  winType?: 'tsumo' | 'ron' | 'chankan'
  label: string
}

/** 一局／一圈可重放嘅牌譜 */
export interface GameRecord {
  version: 1
  header: GameRecordHeader
  /** 同 actionLog；auto pass 唔會出現 */
  plies: ActionLogEntry[]
  revealedHands?: TileId[][]
  phase?: Phase
  savedAt?: number
  youSeat?: Seat
  summary?: GameRecordSummary
}

export function recordKey(record: GameRecord): string {
  return `${record.header.seed}-${record.header.round}`
}

export function parseRecordKey(
  key: string,
): { seed: number; round: number } | null {
  const m = /^(\d+)-(\d+)$/.exec(key.trim())
  if (!m) return null
  return { seed: Number(m[1]), round: Number(m[2]) }
}

export type FormatPlyOpts = {
  /** 對局中：只顯示呢席摸到嘅牌面；唔傳＝全開（賽後） */
  redactDrawsExcept?: Seat | null
}

export function tileLabel(id: TileId): string {
  try {
    return parseTile(id).label
  } catch {
    return id
  }
}

export function whoName(
  names: string[],
  seat: Seat | null,
): string {
  if (seat == null) return '檯'
  return `${WIND[seat]} · ${names[seat] || WIND[seat]}`
}

/** 系統自動過／舊 forced：唔顯示 */
export function isHiddenPly(entry: ActionLogEntry): boolean {
  const a = entry.action
  if (a.type !== 'pass') return false
  if (a.reason === 'auto') return true
  if (a.forced && a.reason !== 'timeout') return true
  return false
}

export function visiblePlies(plies: ActionLogEntry[]): ActionLogEntry[] {
  return plies.filter((e) => !isHiddenPly(e))
}

export function formatActionText(
  action: Action,
  opts: FormatPlyOpts = {},
  seat: Seat | null = null,
): string {
  switch (action.type) {
    case 'start':
      return '開局'
    case 'discard':
      return `打出 ${tileLabel(action.tile)}${action.declareDing ? '，並叮' : ''}`
    case 'draw': {
      const redact =
        opts.redactDrawsExcept != null &&
        seat != null &&
        seat !== opts.redactDrawsExcept
      if (redact || !action.tile) {
        if (action.kind === 'kong') return '槓摸'
        if (action.kind === 'flower') return '補花'
        return '摸牌'
      }
      const verb =
        action.kind === 'kong' ? '槓摸' : action.kind === 'flower' ? '補花' : '摸'
      return `${verb} ${tileLabel(action.tile)}`
    }
    case 'chi': {
      const hand = action.tiles.map(tileLabel).join('')
      const claim = action.claimTile ? tileLabel(action.claimTile) : null
      const from =
        action.from != null ? `${WIND[action.from]}家` : null
      if (claim && from) return `上 ${hand}（吃${claim}·${from}）`
      if (claim) return `上 ${hand}（吃${claim}）`
      return `上 ${hand}`
    }
    case 'pong': {
      const t = action.claimTile ? tileLabel(action.claimTile) : null
      const from =
        action.from != null ? `${WIND[action.from]}家` : null
      if (t && from) return `碰 ${t}（${from}）`
      if (t) return `碰 ${t}`
      return '碰'
    }
    case 'mingkong': {
      const t = action.claimTile ? tileLabel(action.claimTile) : null
      const from =
        action.from != null ? `${WIND[action.from]}家` : null
      if (t && from) return `明槓 ${t}（${from}）`
      if (t) return `明槓 ${t}`
      return '明槓'
    }
    case 'ankong':
      return `暗槓 ${tileLabel(action.tile)}`
    case 'jiagang':
      return `加槓 ${tileLabel(action.tile)}`
    case 'win': {
      const t = action.winTile ? tileLabel(action.winTile) : null
      const kind =
        action.winType === 'tsumo'
          ? '自摸'
          : action.winType === 'chankan'
            ? '搶槓'
            : action.winType === 'ron'
              ? '出銃'
              : null
      const from =
        action.from != null ? `${WIND[action.from]}家` : null
      if (t && kind === '自摸') return `食糊 ${t} · 自摸`
      if (t && kind && from) return `食糊 ${t} · ${kind}${from}`
      if (t && kind) return `食糊 ${t} · ${kind}`
      if (t) return `食糊 ${t}`
      return '食糊'
    }
    case 'pass':
      return action.reason === 'timeout' ? '超時過' : '過'
    case 'declareDing':
      return '叮'
    case 'chopLa':
      return '斬拉'
    case 'settleAll':
      return '埋單清拉'
    case 'nextRound':
      return '下一局'
    default:
      return '動作'
  }
}

export function formatPly(
  entry: ActionLogEntry,
  names: string[],
  opts: FormatPlyOpts = {},
): { who: string; text: string } {
  return {
    who: whoName(names, entry.seat),
    text: formatActionText(entry.action, opts, entry.seat),
  }
}

export function gameRecordFromState(
  state: GameState,
  opts?: {
    players?: GameRecordPlayer[]
    matchId?: string
    roomCode?: string
    playKind?: string
  },
): GameRecord {
  const players =
    opts?.players ??
    state.players.map((p, i) => ({
      seat: i as Seat,
      displayName: p.name,
      kind: 'human' as const,
    }))
  return {
    version: 1,
    header: {
      seed: state.seed,
      dealer: state.dealer,
      consecutiveWins: state.consecutiveWins,
      rules: state.rules,
      round: state.round,
      windRound: state.windRound,
      players,
      matchId: opts?.matchId,
      roomCode: opts?.roomCode,
      playKind: opts?.playKind,
    },
    plies: [...state.actionLog],
    revealedHands: state.players.map((p) => [...p.hand]),
    phase: state.phase,
  }
}
