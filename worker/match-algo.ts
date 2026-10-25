/**
 * 匹配組隊純函式（可單測）。
 *
 * 優先序：
 * 1. 同枱規桶內湊齊 4 真人（排位另限分數窗）
 * 2. 逾時可補 AI 時，同桶盡量帶多啲願意補 AI 嘅人一齊開
 * 3. 唔拉「只等人」入 AI 局
 * 4. 新隊友剛入隊有短寬限，避免一個人率先開 AI 局
 */
import type { TableRules } from '../src/engine'
import { RANKED_DEFAULT, ratingWindowMs } from '../src/engine/ranked'

export type MatchMode = 'casual' | 'ranked'

export function clampFillMs(sec: unknown, mode: MatchMode): number {
  if (sec === 0 || sec === '0') return 0
  const n = typeof sec === 'number' ? sec : Number(sec)
  if (!Number.isFinite(n) || n < 0) {
    // 排位預設只等人；普通 15 秒後可補 AI
    return mode === 'ranked' ? 0 : 15_000
  }
  if (n === 0) return 0
  return Math.min(300, Math.max(5, Math.floor(n))) * 1000
}

export interface QueuedPlayer {
  ticketId: string
  name: string
  playerId: string | null
  joinedAt: number
  /** 0 = 只等人，唔入 AI 局 */
  fillAiAfterMs: number
  rules: Partial<TableRules>
  /** 排位分數；普通匹配可忽略 */
  rating: number
}

export interface MatchPick {
  group: QueuedPlayer[]
  fillAi: boolean
  /** 開局用嘅枱規（桶內多數／隊頭） */
  rules: Partial<TableRules>
}

/** 影響對局體驗嘅枱規欄；唔同桶唔一齊配 */
const RULE_FIELDS = [
  'base',
  'fanValue',
  'maxLaKou',
  'fiveTongShunFan',
  'turnTimeoutSec',
  'claimTimeoutSec',
  'matchCircles',
] as const satisfies readonly (keyof TableRules)[]

export function rulesKey(rules: Partial<TableRules> | undefined): string {
  const r = rules ?? {}
  return RULE_FIELDS.map((k) => {
    const v = r[k]
    return v == null || Number.isNaN(Number(v)) ? '_' : String(v)
  }).join('|')
}

export function allowsAiFill(p: QueuedPlayer): boolean {
  return p.fillAiAfterMs > 0
}

export function isAiReady(p: QueuedPlayer, now: number): boolean {
  return allowsAiFill(p) && now - p.joinedAt >= p.fillAiAfterMs
}

export function clampQueueRating(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return RANKED_DEFAULT
  return Math.max(100, Math.min(3000, Math.round(v)))
}

/** 寬限期：逾時後若桶內有剛入嘅願意補 AI 隊友，再等多一陣 */
export const MATCH_GRACE_MS = 8_000

export interface PickOptions {
  now: number
  /** 預設 MATCH_GRACE_MS */
  graceMs?: number
  /** casual = 唔睇分數；ranked = 分數窗 */
  mode?: MatchMode
}

/**
 * 從隊列揀下一組；回傳 null 表示而家唔開。
 * 唔 mutate 入參；呼叫端自行由 queue 移除 group。
 */
export function pickNextMatch(
  queue: readonly QueuedPlayer[],
  opts: PickOptions,
): MatchPick | null {
  if (queue.length === 0) return null
  const now = opts.now
  const graceMs = opts.graceMs ?? MATCH_GRACE_MS
  const mode = opts.mode ?? 'casual'
  const ranked = mode === 'ranked'

  const buckets = groupByRules(queue)

  // 1) 同枱規湊齊 4 真人（排位要喺分數窗內）
  const fullCandidates = buckets
    .map((b) => ({
      players: b.players,
      oldest: b.players[0]!.joinedAt,
    }))
    .sort((a, b) => a.oldest - b.oldest)

  for (const b of fullCandidates) {
    const group = pickFullHumanGroup(b.players, now, ranked)
    if (group) {
      return { group, fillAi: false, rules: mergeRules(group) }
    }
  }

  // 2) AI 補位：搵有人已逾時嘅桶，揀等得最耐嗰個種子
  type Seed = { bucket: QueuedPlayer[]; seed: QueuedPlayer }
  const seeds: Seed[] = []
  for (const b of buckets) {
    for (const p of b.players) {
      if (isAiReady(p, now)) seeds.push({ bucket: b.players, seed: p })
    }
  }
  if (seeds.length === 0) return null

  seeds.sort((a, b) => {
    const aw = now - a.seed.joinedAt - a.seed.fillAiAfterMs
    const bw = now - b.seed.joinedAt - b.seed.fillAiAfterMs
    if (bw !== aw) return bw - aw
    return a.seed.joinedAt - b.seed.joinedAt
  })

  const { bucket, seed } = seeds[0]!
  const window = ranked ? ratingWindowMs(now - seed.joinedAt) : 9999
  const willing = bucket.filter(
    (p) =>
      allowsAiFill(p) &&
      Math.abs(p.rating - seed.rating) <= window,
  )
  if (willing.length === 0 || !willing.some((p) => p.ticketId === seed.ticketId)) {
    return null
  }

  const others = willing
    .filter((p) => p.ticketId !== seed.ticketId)
    .sort(
      (a, b) =>
        Math.abs(a.rating - seed.rating) - Math.abs(b.rating - seed.rating) ||
        a.joinedAt - b.joinedAt,
    )

  const group: QueuedPlayer[] = [seed, ...others].slice(0, 4)

  if (group.length < 4) {
    const freshNotReady = willing.some(
      (p) => !isAiReady(p, now) && now - p.joinedAt < graceMs,
    )
    const overdue = now - seed.joinedAt - seed.fillAiAfterMs
    if (freshNotReady && overdue < graceMs) {
      return null
    }
  }

  return {
    group,
    fillAi: group.length < 4,
    rules: mergeRules(group),
  }
}

function pickFullHumanGroup(
  bucket: QueuedPlayer[],
  now: number,
  ranked: boolean,
): QueuedPlayer[] | null {
  if (bucket.length < 4) return null
  if (!ranked) return bucket.slice(0, 4)

  for (let i = 0; i < bucket.length; i++) {
    const seed = bucket[i]!
    const window = ratingWindowMs(now - seed.joinedAt)
    const inRange = bucket.filter(
      (p) => Math.abs(p.rating - seed.rating) <= window,
    )
    if (inRange.length < 4) continue
    if (!inRange.some((p) => p.ticketId === seed.ticketId)) continue
    const others = inRange
      .filter((p) => p.ticketId !== seed.ticketId)
      .sort(
        (a, b) =>
          Math.abs(a.rating - seed.rating) - Math.abs(b.rating - seed.rating) ||
          a.joinedAt - b.joinedAt,
      )
    return [seed, ...others.slice(0, 3)]
  }
  return null
}

/** 連續揀到隊列清空或唔再開 */
export function pickAllMatches(
  queue: readonly QueuedPlayer[],
  opts: PickOptions,
): { picks: MatchPick[]; rest: QueuedPlayer[] } {
  let rest = [...queue]
  const picks: MatchPick[] = []
  for (;;) {
    const pick = pickNextMatch(rest, opts)
    if (!pick) break
    const ids = new Set(pick.group.map((p) => p.ticketId))
    rest = rest.filter((p) => !ids.has(p.ticketId))
    picks.push(pick)
  }
  return { picks, rest }
}

function groupByRules(queue: readonly QueuedPlayer[]): {
  key: string
  players: QueuedPlayer[]
}[] {
  const map = new Map<string, QueuedPlayer[]>()
  for (const p of queue) {
    const key = rulesKey(p.rules)
    const list = map.get(key)
    if (list) list.push(p)
    else map.set(key, [p])
  }
  return [...map.entries()].map(([key, players]) => ({ key, players }))
}

/** 隊頭規則為主，其餘只 overlay 隊頭冇嘅欄 */
export function mergeRules(group: QueuedPlayer[]): Partial<TableRules> {
  if (group.length === 0) return {}
  const out: Partial<TableRules> = { ...group[0]!.rules }
  return out
}

/**
 * 入隊去重：同一 playerId 只留最新一張票（匿名 null 唔去重）。
 * 回傳新隊列同被踢走嘅 ticketId。
 */
export function enqueueDeduped(
  queue: readonly QueuedPlayer[],
  next: QueuedPlayer,
): { queue: QueuedPlayer[]; replacedTicketIds: string[] } {
  if (!next.playerId) {
    return { queue: [...queue, next], replacedTicketIds: [] }
  }
  const replacedTicketIds: string[] = []
  const kept = queue.filter((p) => {
    if (p.playerId === next.playerId) {
      replacedTicketIds.push(p.ticketId)
      return false
    }
    return true
  })
  return { queue: [...kept, next], replacedTicketIds }
}

/** 狀態顯示：喺同枱規桶內嘅位次（對玩家更有意義） */
export function bucketPosition(
  queue: readonly QueuedPlayer[],
  ticketId: string,
): { position: number; bucketSize: number } | null {
  const me = queue.find((p) => p.ticketId === ticketId)
  if (!me) return null
  const key = rulesKey(me.rules)
  const bucket = queue.filter((p) => rulesKey(p.rules) === key)
  const idx = bucket.findIndex((p) => p.ticketId === ticketId)
  return { position: idx + 1, bucketSize: bucket.length }
}
