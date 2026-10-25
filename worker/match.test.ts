import { describe, expect, it } from 'vitest'
import {
  bucketPosition,
  clampFillMs,
  enqueueDeduped,
  MATCH_GRACE_MS,
  pickAllMatches,
  pickNextMatch,
  rulesKey,
  type QueuedPlayer,
} from './match-algo'

function p(
  partial: Partial<QueuedPlayer> & Pick<QueuedPlayer, 'ticketId' | 'joinedAt'>,
): QueuedPlayer {
  return {
    name: partial.name ?? partial.ticketId,
    playerId: partial.playerId ?? null,
    fillAiAfterMs: partial.fillAiAfterMs ?? 15_000,
    rules: partial.rules ?? { base: 3, fanValue: 1 },
    rating: partial.rating ?? 1000,
    ticketId: partial.ticketId,
    joinedAt: partial.joinedAt,
  }
}

describe('clampFillMs', () => {
  it('defaults by mode', () => {
    expect(clampFillMs(undefined, 'casual')).toBe(15_000)
    expect(clampFillMs(undefined, 'ranked')).toBe(0)
  })

  it('allows never-fill', () => {
    expect(clampFillMs(0, 'casual')).toBe(0)
  })

  it('clamps range', () => {
    expect(clampFillMs(15, 'casual')).toBe(15_000)
    expect(clampFillMs(3, 'casual')).toBe(5_000)
    expect(clampFillMs(999, 'ranked')).toBe(300_000)
  })
})

describe('rulesKey', () => {
  it('splits different base', () => {
    expect(rulesKey({ base: 3 })).not.toBe(rulesKey({ base: 5 }))
  })

  it('same relevant fields collide', () => {
    expect(
      rulesKey({ base: 3, fanValue: 1, turnTimeoutSec: 30 }),
    ).toBe(rulesKey({ base: 3, fanValue: 1, turnTimeoutSec: 30 }))
  })
})

describe('pickNextMatch', () => {
  const t0 = 1_000_000

  it('forms full table of 4 same rules', () => {
    const queue = [0, 1, 2, 3].map((i) =>
      p({ ticketId: `a${i}`, joinedAt: t0 + i * 100, fillAiAfterMs: 0 }),
    )
    const pick = pickNextMatch(queue, { now: t0 + 50_000 })
    expect(pick?.fillAi).toBe(false)
    expect(pick?.group).toHaveLength(4)
  })

  it('does not mix different rules into one table', () => {
    const queue = [
      p({ ticketId: 'a', joinedAt: t0, rules: { base: 3 } }),
      p({ ticketId: 'b', joinedAt: t0 + 1, rules: { base: 5 } }),
      p({ ticketId: 'c', joinedAt: t0 + 2, rules: { base: 3 } }),
      p({ ticketId: 'd', joinedAt: t0 + 3, rules: { base: 3 } }),
      p({ ticketId: 'e', joinedAt: t0 + 4, rules: { base: 3 } }),
    ]
    const pick = pickNextMatch(queue, { now: t0 + 100 })
    expect(pick?.group.map((g) => g.ticketId).sort()).toEqual([
      'a',
      'c',
      'd',
      'e',
    ])
    expect(pick?.group.some((g) => g.ticketId === 'b')).toBe(false)
  })

  it('ranked refuses far ratings until window expands', () => {
    const queue = [
      p({ ticketId: 'low', joinedAt: t0, rating: 1000, fillAiAfterMs: 0 }),
      p({ ticketId: 'hi', joinedAt: t0 + 1, rating: 1600, fillAiAfterMs: 0 }),
      p({ ticketId: 'a', joinedAt: t0 + 2, rating: 1010, fillAiAfterMs: 0 }),
      p({ ticketId: 'b', joinedAt: t0 + 3, rating: 990, fillAiAfterMs: 0 }),
    ]
    const early = pickNextMatch(queue, {
      now: t0 + 1_000,
      mode: 'ranked',
    })
    expect(early).toBeNull()

    const late = pickNextMatch(queue, {
      now: t0 + 120_000,
      mode: 'ranked',
    })
    // window expanded enough for 1000 vs 1600 eventually (max 520 — still not enough!)
    // 600 gap > 520 max → still null; add closer fourth instead
    expect(late).toBeNull()

    const close = [
      ...queue.slice(0, 1),
      p({ ticketId: 'mid', joinedAt: t0 + 1, rating: 1080, fillAiAfterMs: 0 }),
      p({ ticketId: 'a', joinedAt: t0 + 2, rating: 1010, fillAiAfterMs: 0 }),
      p({ ticketId: 'b', joinedAt: t0 + 3, rating: 990, fillAiAfterMs: 0 }),
    ]
    const ok = pickNextMatch(close, { now: t0 + 1_000, mode: 'ranked' })
    expect(ok?.group).toHaveLength(4)
    expect(ok?.group.some((g) => g.ticketId === 'hi')).toBe(false)
  })

  it('never pulls humans-only into AI fill', () => {
    const queue = [
      p({
        ticketId: 'solo',
        joinedAt: t0,
        fillAiAfterMs: 15_000,
        rules: { base: 3 },
      }),
      p({
        ticketId: 'humanOnly',
        joinedAt: t0 + 100,
        fillAiAfterMs: 0,
        rules: { base: 3 },
      }),
    ]
    const pick = pickNextMatch(queue, { now: t0 + 20_000 })
    expect(pick?.group.map((g) => g.ticketId)).toEqual(['solo'])
    expect(pick?.fillAi).toBe(true)
  })

  it('packs multiple AI-willing players on timeout', () => {
    const queue = [
      p({ ticketId: 'a', joinedAt: t0, fillAiAfterMs: 15_000 }),
      p({ ticketId: 'b', joinedAt: t0 + 1_000, fillAiAfterMs: 15_000 }),
      p({ ticketId: 'c', joinedAt: t0 + 2_000, fillAiAfterMs: 15_000 }),
    ]
    const pick = pickNextMatch(queue, { now: t0 + 20_000, graceMs: 0 })
    expect(pick?.group).toHaveLength(3)
    expect(pick?.fillAi).toBe(true)
  })

  it('waits grace when a fresh teammate just joined', () => {
    const queue = [
      p({ ticketId: 'old', joinedAt: t0, fillAiAfterMs: 15_000 }),
      p({
        ticketId: 'fresh',
        joinedAt: t0 + 15_000 + 1_000,
        fillAiAfterMs: 15_000,
      }),
    ]
    const now = t0 + 15_000 + 2_000
    const pick = pickNextMatch(queue, { now, graceMs: MATCH_GRACE_MS })
    expect(pick).toBeNull()
  })

  it('forces AI group after grace expires', () => {
    const queue = [
      p({ ticketId: 'old', joinedAt: t0, fillAiAfterMs: 15_000 }),
      p({
        ticketId: 'fresh',
        joinedAt: t0 + 15_000 + 1_000,
        fillAiAfterMs: 30_000,
      }),
    ]
    const now = t0 + 15_000 + MATCH_GRACE_MS + 1
    const pick = pickNextMatch(queue, { now, graceMs: MATCH_GRACE_MS })
    expect(pick?.group.map((g) => g.ticketId)).toEqual(['old', 'fresh'])
  })

  it('prefers oldest overdue seed across buckets', () => {
    const queue = [
      p({
        ticketId: 'newBucket',
        joinedAt: t0 + 10_000,
        fillAiAfterMs: 5_000,
        rules: { base: 5 },
      }),
      p({
        ticketId: 'oldBucket',
        joinedAt: t0,
        fillAiAfterMs: 5_000,
        rules: { base: 3 },
      }),
    ]
    const pick = pickNextMatch(queue, { now: t0 + 20_000, graceMs: 0 })
    expect(pick?.group[0]?.ticketId).toBe('oldBucket')
  })
})

describe('pickAllMatches', () => {
  it('can form multiple tables', () => {
    const t0 = 0
    const queue = [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
      p({ ticketId: `p${i}`, joinedAt: t0 + i, fillAiAfterMs: 0 }),
    )
    const { picks, rest } = pickAllMatches(queue, { now: 100 })
    expect(picks).toHaveLength(2)
    expect(rest).toHaveLength(0)
  })
})

describe('enqueueDeduped', () => {
  it('replaces same playerId', () => {
    const q = [p({ ticketId: 'old', joinedAt: 1, playerId: 'u1' })]
    const { queue, replacedTicketIds } = enqueueDeduped(
      q,
      p({ ticketId: 'new', joinedAt: 2, playerId: 'u1' }),
    )
    expect(replacedTicketIds).toEqual(['old'])
    expect(queue.map((x) => x.ticketId)).toEqual(['new'])
  })

  it('keeps anonymous duplicates', () => {
    const q = [p({ ticketId: 'a', joinedAt: 1, playerId: null })]
    const { queue, replacedTicketIds } = enqueueDeduped(
      q,
      p({ ticketId: 'b', joinedAt: 2, playerId: null }),
    )
    expect(replacedTicketIds).toEqual([])
    expect(queue).toHaveLength(2)
  })
})

describe('bucketPosition', () => {
  it('counts within rules bucket', () => {
    const queue = [
      p({ ticketId: 'x', joinedAt: 1, rules: { base: 5 } }),
      p({ ticketId: 'a', joinedAt: 2, rules: { base: 3 } }),
      p({ ticketId: 'b', joinedAt: 3, rules: { base: 3 } }),
    ]
    expect(bucketPosition(queue, 'b')).toEqual({ position: 2, bucketSize: 2 })
  })
})
