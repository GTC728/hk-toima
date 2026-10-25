/**
 * S4／S7：局內戰術事件追蹤（可糊／鳴／提示；按階段）。
 */
import type { Action, Meld, Seat, TileId } from '../engine'

/** 同 stats.GamePhase；避免同 stats 循環 import */
export type TacticsPhase = 'early' | 'mid' | 'late'

export type TacticsKind = 'win' | 'pong' | 'chi' | 'kong'

export interface OppCounts {
  offered: number
  taken: number
  missed: number
}

export interface PhaseOppBundle {
  win: OppCounts
  pong: OppCounts
  chi: OppCounts
  kong: OppCounts
}

export interface TacticsSnapshot {
  win: OppCounts
  pong: OppCounts
  chi: OppCounts
  kong: OppCounts
  /** 對手棄牌而你有得鳴／糊嘅次數 */
  feedFromOpp: number
  hintShown: number
  hintFollowed: number
  autoDraw: number
  autoPass: number
  handClosed?: boolean
  meldChi?: number
  meldPong?: number
  meldKong?: number
  chankan?: boolean
  /** S7：機會發生喺邊段牆 */
  byPhase?: Partial<Record<TacticsPhase, PhaseOppBundle>>
  /** S12：按自己棄牌巡數帶嘅機會把握 */
  byTurnBand?: Partial<
    Record<'0-3' | '4-7' | '8-11' | '12+', OppCounts>
  >
}

export function emptyOpp(): OppCounts {
  return { offered: 0, taken: 0, missed: 0 }
}

export function emptyTactics(): TacticsSnapshot {
  return {
    win: emptyOpp(),
    pong: emptyOpp(),
    chi: emptyOpp(),
    kong: emptyOpp(),
    feedFromOpp: 0,
    hintShown: 0,
    hintFollowed: 0,
    autoDraw: 0,
    autoPass: 0,
  }
}

function actionKind(a: Action): TacticsKind | null {
  switch (a.type) {
    case 'win':
      return 'win'
    case 'pong':
      return 'pong'
    case 'chi':
      return 'chi'
    case 'mingkong':
    case 'ankong':
    case 'jiagang':
      return 'kong'
    default:
      return null
  }
}

function kindsFromLegal(legal: readonly Action[]): TacticsKind[] {
  const set = new Set<TacticsKind>()
  for (const a of legal) {
    const k = actionKind(a)
    if (k) set.add(k)
  }
  return [...set]
}

function emptyPhaseBundle(): PhaseOppBundle {
  return {
    win: emptyOpp(),
    pong: emptyOpp(),
    chi: emptyOpp(),
    kong: emptyOpp(),
  }
}

function turnBand(n: number): '0-3' | '4-7' | '8-11' | '12+' {
  if (n <= 3) return '0-3'
  if (n <= 7) return '4-7'
  if (n <= 11) return '8-11'
  return '12+'
}

export class SeatTacticsTracker {
  snap: TacticsSnapshot = emptyTactics()
  private open = new Set<TacticsKind>()
  private openPhase: TacticsPhase | null = null
  private openBand: '0-3' | '4-7' | '8-11' | '12+' | null = null
  private windowKey = ''
  private fedThisWindow = false

  reset(): void {
    this.snap = emptyTactics()
    this.open.clear()
    this.openPhase = null
    this.openBand = null
    this.windowKey = ''
    this.fedThisWindow = false
  }

  private phaseBucket(phase: TacticsPhase): PhaseOppBundle {
    if (!this.snap.byPhase) this.snap.byPhase = {}
    let b = this.snap.byPhase[phase]
    if (!b) {
      b = emptyPhaseBundle()
      this.snap.byPhase[phase] = b
    }
    return b
  }

  private bandBucket(
    band: '0-3' | '4-7' | '8-11' | '12+',
  ): OppCounts {
    if (!this.snap.byTurnBand) this.snap.byTurnBand = {}
    let b = this.snap.byTurnBand[band]
    if (!b) {
      b = emptyOpp()
      this.snap.byTurnBand[band] = b
    }
    return b
  }

  /** windowKey：區分唔同鳴牌窗／自己回合機會；myDiscards＝自己已棄巡 */
  observe(
    legal: readonly Action[],
    windowKey: string,
    phase?: TacticsPhase,
    myDiscards?: number,
  ): void {
    if (windowKey !== this.windowKey) {
      this.flushMisses()
      this.windowKey = windowKey
      this.fedThisWindow = false
      this.openPhase = phase ?? null
      this.openBand =
        myDiscards != null ? turnBand(myDiscards) : null
    } else {
      if (phase && this.openPhase == null) this.openPhase = phase
      if (myDiscards != null && this.openBand == null) {
        this.openBand = turnBand(myDiscards)
      }
    }
    const kinds = kindsFromLegal(legal)
    if (kinds.length === 0) return
    if (windowKey.startsWith('claim:') && !this.fedThisWindow) {
      this.snap.feedFromOpp += 1
      this.fedThisWindow = true
    }
    for (const k of kinds) {
      if (!this.open.has(k)) {
        this.open.add(k)
        this.snap[k].offered += 1
        if (phase) this.phaseBucket(phase)[k].offered += 1
        if (this.openBand) this.bandBucket(this.openBand).offered += 1
      }
    }
  }

  onAction(action: Action): void {
    const k = actionKind(action)
    if (k && this.open.has(k)) {
      this.snap[k].taken += 1
      if (this.openPhase) this.phaseBucket(this.openPhase)[k].taken += 1
      if (this.openBand) this.bandBucket(this.openBand).taken += 1
      this.open.delete(k)
    }
    if (
      action.type === 'pass' ||
      action.type === 'discard' ||
      action.type === 'draw' ||
      k != null
    ) {
      this.flushMisses()
    }
    if (action.type === 'pass' || k != null) {
      this.windowKey = ''
      this.openPhase = null
      this.openBand = null
    }
  }

  noteHint(shown: TileId | null, discarded: TileId): void {
    if (shown == null) return
    this.snap.hintShown += 1
    if (shown === discarded) this.snap.hintFollowed += 1
  }

  noteAutoDraw(): void {
    this.snap.autoDraw += 1
  }

  noteAutoPass(): void {
    this.snap.autoPass += 1
  }

  finalize(melds: readonly Meld[], chankan: boolean): TacticsSnapshot {
    this.flushMisses()
    const byPhase = this.snap.byPhase
      ? (Object.fromEntries(
          Object.entries(this.snap.byPhase).map(([ph, b]) => [
            ph,
            {
              win: { ...b.win },
              pong: { ...b.pong },
              chi: { ...b.chi },
              kong: { ...b.kong },
            },
          ]),
        ) as TacticsSnapshot['byPhase'])
      : undefined
    const byTurnBand = this.snap.byTurnBand
      ? (Object.fromEntries(
          Object.entries(this.snap.byTurnBand).map(([band, o]) => [
            band,
            { ...o },
          ]),
        ) as TacticsSnapshot['byTurnBand'])
      : undefined
    return {
      ...this.snap,
      win: { ...this.snap.win },
      pong: { ...this.snap.pong },
      chi: { ...this.snap.chi },
      kong: { ...this.snap.kong },
      byPhase,
      byTurnBand,
      handClosed: melds.length === 0,
      meldChi: melds.filter((m) => m.kind === 'chi').length,
      meldPong: melds.filter((m) => m.kind === 'pong').length,
      meldKong: melds.filter(
        (m) =>
          m.kind === 'mingkong' || m.kind === 'ankong' || m.kind === 'jiagang',
      ).length,
      chankan,
    }
  }

  private flushMisses(): void {
    for (const k of this.open) {
      this.snap[k].missed += 1
      if (this.openPhase) this.phaseBucket(this.openPhase)[k].missed += 1
      if (this.openBand) this.bandBucket(this.openBand).missed += 1
    }
    this.open.clear()
    this.openPhase = null
    this.openBand = null
  }
}

export type TacticsBySeat = Partial<Record<Seat, TacticsSnapshot>>

export function getSeatTracker(
  map: Map<Seat, SeatTacticsTracker>,
  seat: Seat,
): SeatTacticsTracker {
  let t = map.get(seat)
  if (!t) {
    t = new SeatTacticsTracker()
    map.set(seat, t)
  }
  return t
}

export function resetAllTrackers(map: Map<Seat, SeatTacticsTracker>): void {
  for (const t of map.values()) t.reset()
}

export function claimWindowKey(
  tile: string,
  awaiting: readonly Seat[],
): string {
  return `claim:${tile}:${[...awaiting].sort().join(',')}`
}

export function playWindowKey(
  round: number,
  phase: string,
  currentSeat: Seat,
  justDrawn: string | null,
): string {
  return `play:${round}|${phase}|${currentSeat}|${justDrawn ?? ''}`
}
