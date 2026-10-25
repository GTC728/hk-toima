/**
 * S9：決策用時／低時操作（每位一局累積）。
 */
import type { Seat } from '../engine'

export interface DecisionSnap {
  decisionMsSum: number
  decisionN: number
  lowTimeMoves: number
}

export function emptyDecision(): DecisionSnap {
  return { decisionMsSum: 0, decisionN: 0, lowTimeMoves: 0 }
}

export type DecisionBySeat = Partial<Record<Seat, DecisionSnap>>

/** 回合開始：記住 deadline／openedAt */
export class SeatDecisionTracker {
  snap: DecisionSnap = emptyDecision()
  private openedAt: number | null = null
  private lowAtOpen = false

  reset(): void {
    this.snap = emptyDecision()
    this.openedAt = null
    this.lowAtOpen = false
  }

  /** 倒數開始或換到你嗰手 */
  openTurn(now = Date.now(), remainSec: number | null = null): void {
    this.openedAt = now
    this.lowAtOpen = remainSec != null && remainSec <= 5
  }

  /** 你出咗一手（打牌／鳴／過／糊） */
  noteAction(now = Date.now(), remainSec: number | null = null): void {
    if (this.openedAt == null) return
    const ms = Math.max(0, now - this.openedAt)
    this.snap.decisionMsSum += ms
    this.snap.decisionN += 1
    if (remainSec != null && remainSec <= 5) this.snap.lowTimeMoves += 1
    else if (this.lowAtOpen) this.snap.lowTimeMoves += 1
    this.openedAt = null
    this.lowAtOpen = false
  }

  snapshot(): DecisionSnap {
    return { ...this.snap }
  }
}

export function getDecisionTracker(
  map: Map<Seat, SeatDecisionTracker>,
  seat: Seat,
): SeatDecisionTracker {
  let t = map.get(seat)
  if (!t) {
    t = new SeatDecisionTracker()
    map.set(seat, t)
  }
  return t
}

export function resetDecisionTrackers(
  map: Map<Seat, SeatDecisionTracker>,
): void {
  for (const t of map.values()) t.reset()
}
