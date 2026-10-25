import { applyWinToLa } from './la'
import { makeMeld } from './meld'
import { buildWinResult } from './score'
import {
  interruptIppatsu,
  log,
  nextSeat,
  pushLaSettled,
  ZHENG_HUA,
} from './state-ops'
import { removeMany, removeOne } from './tiles'
import type { Claim, GameState, Seat, TileId, WinResult } from './types'
import { wallRemaining } from './wall'
import { drawForCurrent, drawSupplementTile } from './draw-flow'

/** 河＋各家副露可見嘅某隻牌張數 */
function countVisibleTile(state: GameState, tile: TileId, exceptSeat: Seat): number {
  let n = 0
  for (let s = 0; s < 4; s++) {
    const p = state.players[s as Seat]
    n += p.discards.filter((t) => t === tile).length
    for (const m of p.melds) {
      // 暗槓對其他人唔見；計絕張時暗槓仍占張
      n += m.tiles.filter((t) => t === tile).length
    }
    if (s !== exceptSeat) {
      // 唔計對手手牌
    }
  }
  return n
}

export function applyWins(
  state: GameState,
  winners: Seat[],
  winType: 'tsumo' | 'ron' | 'chankan',
  winTile: TileId,
  discarder?: Seat,
): void {
  const results: WinResult[] = []
  for (const seat of winners) {
    const p = state.players[seat]
    const hand =
      winType === 'tsumo' ? removeOne(p.hand, winTile) : [...p.hand]
    let visible = countVisibleTile(state, winTile, seat)
    // 出銃嗰張唔計入「已見」（先有 N 張再開呢張）
    if (
      (winType === 'ron' || winType === 'chankan') &&
      discarder != null
    ) {
      const d = state.players[discarder].discards
      if (d[d.length - 1] === winTile) visible = Math.max(0, visible - 1)
    }
    results.push(
      buildWinResult({
        seat,
        hand,
        melds: p.melds,
        flowers: p.flowers,
        winTile,
        winType,
        ding: p.ding,
        dealer: state.dealer,
        consecutiveWins: state.consecutiveWins,
        discarder,
        rules: state.rules,
        wallRemaining: wallRemaining(state.liveIndex, state.deadWallIndex),
        discardsThisRound: state.discardsThisRound,
        multiRonCount: winners.length,
        discarderIsDealer: discarder === state.dealer,
        zhengHuaTiles: ZHENG_HUA[seat],
        flowerDrawChain:
          winType === 'tsumo' && seat === state.currentSeat
            ? state.flowerDrawChain
            : 0,
        kongDrawChain:
          winType === 'tsumo' && seat === state.currentSeat
            ? state.kongDrawChain
            : 0,
        visibleWinTileCount: visible,
        fanxue: winners.length >= 2,
        windRound: state.windRound,
      }),
    )
  }

  const la = applyWinToLa(state.laLedger, results, state.rules.maxLaKou)
  state.laLedger = la.ledger
  pushLaSettled(state, la.settled)

  const dealerWon = winners.includes(state.dealer)
  state.lastResult = {
    kind: 'win',
    wins: results,
    nextDealer: dealerWon ? state.dealer : nextSeat(state.dealer),
    nextConsecutiveWins: dealerWon ? state.consecutiveWins + 1 : 0,
  }
  state.phase = 'round_over'
  state.pendingDiscard = null
  state.chankan = false
  log(state, `食糊 seats=${winners.join(',')} type=${winType}`)
}

function doChi(
  state: GameState,
  seat: Seat,
  tile: TileId,
  from: Seat,
  chiTiles: TileId[],
): void {
  const p = state.players[seat]
  p.hand = removeMany(p.hand, chiTiles)
  p.melds.push(makeMeld('chi', [...chiTiles, tile], from, tile))
  state.pendingDiscard = null
  state.chankan = false
  state.currentSeat = seat
  state.phase = 'playing'
  state.justDrawn = null
  state.mustDiscard = true
  interruptIppatsu(state)
  log(state, `seat ${seat} 上 ${tile}`)
}

function doPong(state: GameState, seat: Seat, tile: TileId, from: Seat): void {
  const p = state.players[seat]
  p.hand = removeMany(p.hand, [tile, tile])
  p.melds.push(makeMeld('pong', [tile, tile, tile], from, tile))
  state.pendingDiscard = null
  state.chankan = false
  state.currentSeat = seat
  state.phase = 'playing'
  state.justDrawn = null
  state.mustDiscard = true
  interruptIppatsu(state)
  log(state, `seat ${seat} 碰 ${tile}`)
}

function doMingKong(
  state: GameState,
  seat: Seat,
  tile: TileId,
  from: Seat,
): void {
  const p = state.players[seat]
  p.hand = removeMany(p.hand, [tile, tile, tile])
  p.melds.push(makeMeld('mingkong', [tile, tile, tile, tile], from, tile))
  state.pendingDiscard = null
  state.chankan = false
  state.currentSeat = seat
  state.phase = 'playing'
  interruptIppatsu(state)
  drawSupplementTile(state, seat)
  log(state, `seat ${seat} 明槓 ${tile}`)
}

export function resolveClaims(state: GameState): void {
  const pending = state.pendingDiscard
  if (!pending) return
  const claims = pending.claims.filter((c) => c.kind !== 'pass')
  const wins = claims.filter((c) => c.kind === 'win')

  if (wins.length > 0) {
    applyWins(
      state,
      wins.map((c) => c.seat),
      state.chankan ? 'chankan' : 'ron',
      pending.tile,
      pending.seat,
    )
    return
  }

  if (state.chankan) {
    // 無人搶槓 → 補牌繼續
    state.pendingDiscard = null
    state.chankan = false
    state.phase = 'playing'
    state.currentSeat = pending.seat
    interruptIppatsu(state)
    drawSupplementTile(state, pending.seat)
    log(state, `seat ${pending.seat} 加槓成功 ${pending.tile}`)
    return
  }

  const kong = claims.find((c) => c.kind === 'kong')
  if (kong) {
    doMingKong(state, kong.seat, pending.tile, pending.seat)
    return
  }
  const pong = claims.find((c) => c.kind === 'pong')
  if (pong) {
    doPong(state, pong.seat, pending.tile, pending.seat)
    return
  }
  const chi = claims.find((c) => c.kind === 'chi')
  if (chi) {
    doChi(state, chi.seat, pending.tile, pending.seat, chi.chiTiles ?? [])
    return
  }

  state.players[pending.seat].discards.push(pending.tile)
  state.pendingDiscard = null
  state.phase = 'playing'
  state.currentSeat = nextSeat(pending.seat)
  for (const p of state.players) {
    p.passedPong = []
  }
  drawForCurrent(state)
}

export function submitClaim(state: GameState, seat: Seat, claim: Claim): void {
  const pending = state.pendingDiscard
  if (!pending || state.phase !== 'claim_window') {
    throw new Error('not in claim window')
  }
  if (!pending.awaiting.includes(seat)) {
    throw new Error('seat not awaiting claim')
  }
  pending.claims.push(claim)
  pending.awaiting = pending.awaiting.filter((s) => s !== seat)
  if (pending.awaiting.length === 0) resolveClaims(state)
}

export function openClaimWindow(
  state: GameState,
  seat: Seat,
  tile: TileId,
  chankan = false,
): void {
  state.pendingDiscard = {
    seat,
    tile,
    awaiting: ([0, 1, 2, 3] as Seat[]).filter((s) => s !== seat),
    claims: [],
  }
  state.phase = 'claim_window'
  state.chankan = chankan
  state.justDrawn = null
}
