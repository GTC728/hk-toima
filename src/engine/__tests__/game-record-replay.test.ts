import { describe, expect, it } from 'vitest'
import {
  afterPlayerAction,
  createGame,
  formatPly,
  gameRecordFromState,
  visiblePlies,
} from '../index'
import { buildReplayFrames, replaySourceFromRecord } from '../../ui/replaySource'

describe('game record + replay', () => {
  it('formatPly 顯示碰／摸牌面；redact 對手摸牌', () => {
    const pong = formatPly(
      {
        t: 1,
        seat: 0,
        action: { type: 'pong', claimTile: 'pin-9', from: 1 },
      },
      ['玩家', 'AI-1', 'AI-2', 'AI-3'],
    )
    expect(pong.text).toContain('碰')
    expect(pong.text).toContain('9筒')
    expect(pong.text).toContain('南')

    const draw = {
      t: 2,
      seat: 1 as const,
      action: { type: 'draw' as const, tile: 'dragon-fa' as const, kind: 'live' as const },
    }
    expect(formatPly(draw, ['A', 'B', 'C', 'D']).text).toBe('摸 發')
    expect(
      formatPly(draw, ['A', 'B', 'C', 'D'], { redactDrawsExcept: 0 }).text,
    ).toBe('摸牌')
    expect(
      formatPly(draw, ['A', 'B', 'C', 'D'], { redactDrawsExcept: 1 }).text,
    ).toBe('摸 發')
  })

  it('visiblePlies 隱藏 auto pass', () => {
    const list = visiblePlies([
      { t: 1, seat: 0, action: { type: 'discard', tile: 'man-1' } },
      { t: 2, seat: 1, action: { type: 'pass', forced: true, reason: 'auto' } },
      { t: 3, seat: 2, action: { type: 'pass', reason: 'timeout' } },
    ])
    expect(list).toHaveLength(2)
    expect(list[1]!.action).toMatchObject({ reason: 'timeout' })
  })

  it('牌譜重放到終局：手牌同 revealed 一致', () => {
    let g = createGame({ seed: 20261025, dealerSeat: 0 })
    // 打幾手：跟住摸打，有人就過
    for (let n = 0; n < 24; n++) {
      if (g.phase === 'round_over' || g.phase === 'match_over') break
      if (g.phase === 'claim_window' && g.pendingDiscard) {
        const seat = g.pendingDiscard.awaiting[0]
        if (seat == null) break
        g = afterPlayerAction(g, { type: 'pass' }, seat)
        continue
      }
      if (g.phase === 'playing') {
        const seat = g.currentSeat
        const tile = g.justDrawn ?? g.players[seat]!.hand[0]
        if (!tile) break
        try {
          g = afterPlayerAction(g, { type: 'discard', tile }, seat)
        } catch {
          break
        }
      }
    }

    const record = gameRecordFromState(g)
    expect(record.plies.length).toBeGreaterThan(2)
    expect(
      record.plies.some((p) => p.action.type === 'pass' && p.action.reason === 'auto'),
    ).toBe(false)

    const source = replaySourceFromRecord(record)
    const names = record.header.players.map((p) => p.displayName)
    const frames = buildReplayFrames(source, names)
    expect(frames.length).toBeGreaterThan(1)

    const last = frames[frames.length - 1]!
    // 重放唔要求同未完局 state 完全一致（中途斷），但唔好 throw；完局先對手牌
    if (g.phase === 'round_over' || g.phase === 'match_over') {
      for (let s = 0; s < 4; s++) {
        expect([...last.hands[s]!].sort()).toEqual(
          [...(record.revealedHands?.[s] ?? [])].sort(),
        )
      }
    } else {
      expect(last.hands[0]!.length).toBeGreaterThan(0)
    }
  })
})
