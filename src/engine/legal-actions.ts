import {
  canAnKong,
  canJiaGang,
  canMingKong,
  canPong,
  findChiOptions,
} from './hand'
import { canChopLa } from './la'
import { nextSeat } from './state-ops'
import type { Action, GameState, Seat } from './types'
import { canWin, isReady } from './win-check'
import { removeOne } from './tiles'

export function getLegalActions(state: GameState, seat: Seat): Action[] {
  const actions: Action[] = []
  const p = state.players[seat]

  if (
    state.phase === 'claim_window' &&
    state.pendingDiscard?.awaiting.includes(seat)
  ) {
    const tile = state.pendingDiscard.tile
    const submitted = state.pendingDiscard.claims.filter((c) => c.kind !== 'pass')
    const claimedWin = submitted.some((c) => c.kind === 'win')
    const claimedKong = submitted.some((c) => c.kind === 'kong')
    const claimedPong = submitted.some((c) => c.kind === 'pong')
    actions.push({ type: 'pass' })
    if (!p.ding?.guoshuiLocked && !(p.passedWinThisLap && !p.ding)) {
      if (canWin(p.hand, p.melds, tile)) actions.push({ type: 'win' })
    }
    // 已有更高優先鳴牌 → 唔再顯示可上／可碰（避免「俾人搶咗仲顯示可攞」）
    if (!state.chankan && !p.ding && !claimedWin) {
      if (!claimedKong && canMingKong(p.hand, tile)) {
        actions.push({ type: 'mingkong' })
      }
      if (
        !claimedKong &&
        !claimedPong &&
        canPong(p.hand, tile) &&
        !p.passedPong.includes(tile)
      ) {
        actions.push({ type: 'pong' })
      }
      if (
        !claimedKong &&
        !claimedPong &&
        seat === nextSeat(state.pendingDiscard.seat)
      ) {
        for (const tiles of findChiOptions(p.hand, tile)) {
          actions.push({ type: 'chi', tiles })
        }
      }
    }
    return actions
  }

  if (state.phase === 'playing' && seat === state.currentSeat) {
    // 上／碰後：唔摸，只打牌（規則：當下唔可以即開槓）
    if (state.mustDiscard) {
      for (const tile of new Set(p.hand)) {
        actions.push({ type: 'discard', tile })
      }
      return actions
    }
    if (!state.justDrawn) {
      actions.push({ type: 'draw' })
      return actions
    }
    const handWithout = removeOne(p.hand, state.justDrawn)
    if (canWin(handWithout, p.melds, state.justDrawn)) {
      actions.push({ type: 'win' })
    }
    if (!p.ding) {
      for (const t of canAnKong(p.hand)) {
        actions.push({ type: 'ankong', tile: t })
      }
      for (const t of canJiaGang(p.hand, p.melds)) {
        actions.push({ type: 'jiagang', tile: t })
      }
      if (isReady(handWithout, p.melds)) {
        actions.push({ type: 'declareDing' })
      }
    }
    const discardTiles =
      p.ding && state.justDrawn ? [state.justDrawn] : [...new Set(p.hand)]
    for (const tile of discardTiles) {
      actions.push({ type: 'discard', tile })
    }
  }

  if (state.phase === 'round_over' || state.phase === 'match_over') {
    if (state.phase === 'round_over') {
      actions.push({ type: 'nextRound' })
    }
    actions.push({ type: 'settleAll' })
    for (const e of state.laLedger) {
      if (canChopLa(e, state.rules.maxLaKou)) {
        actions.push({
          type: 'chopLa',
          creditor: e.creditor,
          debtor: e.debtor,
        })
      }
    }
  }

  return actions
}
