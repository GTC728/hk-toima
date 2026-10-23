import { calculateFans } from './fan'
import { amountFromFan, diAmount } from './score'
import {
  canAnKong,
  canJiaGang,
  canMingKong,
  canPong,
  findChiOptions,
  hasTile,
} from './hand'
import { applyWinToLa, canChopLa, chopLa, settleAllLa } from './la'
import { createRng } from './rng'
import { buildWinResult } from './score'
import { FLOWER_SETS, isFlower, removeMany, removeOne, sortTiles } from './tiles'
import type {
  Action,
  Claim,
  GameConfig,
  GameState,
  PlayerState,
  PrivateGameView,
  PublicGameView,
  Seat,
  TileId,
  WinResult,
} from './types'
import { DEFAULT_RULES, DEFAULT_STARTING_CASH } from './types'

/** 東南西北標籤（圈／局） */
export const WIND_LABELS = ['東', '南', '西', '北'] as const

/** 東圈／南圈／… */
export function windRoundLabel(windRound: number): string {
  const name = WIND_LABELS[windRound % 4] ?? '?'
  return `${name}圈`
}

/** 東局／南局／…（莊家座位） */
export function dealerRoundLabel(dealer: Seat): string {
  return `${WIND_LABELS[dealer]}局`
}

/** UI：東圈·南局 */
export function matchRoundLabel(windRound: number, dealer: Seat): string {
  return `${windRoundLabel(windRound)}·${dealerRoundLabel(dealer)}`
}

function appendActionLog(
  state: GameState,
  seat: Seat | null,
  action: Action,
  note?: string,
): void {
  state.actionLog.push({ t: Date.now(), seat, action, note })
}

/** 莊位由 3→0 轉完一圈 */
function dealershipCircleComplete(prevDealer: Seat, nextDealer: Seat): boolean {
  return nextDealer !== prevDealer && nextDealer < prevDealer
}
import { dealWall, drawFromDead, drawFromLive, wallRemaining } from './wall'
import { canWin, isReady, waitingTiles } from './win-check'

/** 正花：東家春／梅、南夏／蘭、西秋／菊、北冬／竹 */
export const ZHENG_HUA: Record<Seat, TileId[]> = {
  0: ['flower-spring', 'flower-plum'],
  1: ['flower-summer', 'flower-orchid'],
  2: ['flower-autumn', 'flower-chrysanthemum'],
  3: ['flower-winter', 'flower-bamboo'],
}

export function zhengHuaForSeat(seat: Seat): TileId[] {
  return ZHENG_HUA[seat] ?? []
}

function applyCashTransfer(
  state: GameState,
  from: Seat,
  to: Seat,
  amount: number,
): void {
  if (from === to || amount <= 0) return
  state.players[from]!.cash -= amount
  state.players[to]!.cash += amount
}

function payInstant(
  state: GameState,
  from: Seat,
  to: Seat,
  amount: number,
  reason: string,
): void {
  if (from === to || amount <= 0) return
  applyCashTransfer(state, from, to, amount)
  state.instantPayouts.push({ from, to, amount, reason })
  log(state, `即付 ${reason}: seat ${from} → ${to} $${amount}`)
}

/** 拉帳結清／斬拉等：入金池 */
function applySettledPayouts(
  state: GameState,
  settled: { from: Seat; to: Seat; amount: number; reason: string }[],
): void {
  for (const s of settled) {
    applyCashTransfer(state, s.from, s.to, s.amount)
  }
}

function payOthersBase(state: GameState, to: Seat, reason: string, amount?: number): void {
  const amt = amount ?? diAmount(state.rules)
  for (let s = 0; s < 4; s++) {
    if (s === to) continue
    payInstant(state, s as Seat, to, amt, reason)
  }
}

function applyDiceBonuses(state: GameState): void {
  const [a, b, c] = state.dice
  const sorted = [a, b, c].sort((x, y) => x - y)
  if (a === b && b === c) {
    payOthersBase(state, state.dealer, '圍骰')
  } else if (sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3) {
    for (let s = 0; s < 4; s++) {
      if (s === state.dealer) continue
      payInstant(state, state.dealer, s as Seat, diAmount(state.rules), '一二三')
    }
  }
}

/** 即時賞罰：純番數 × 番值（唔再另加底） */
function fanAmount(state: GameState, fan: number): number {
  return amountFromFan(state.rules, fan)
}

/** 補花／摸花後檢查一台花／草、七搶一、八仙 */
function checkFlowerInstantBonuses(state: GameState, seat: Seat): void {
  const flowers = state.players[seat].flowers
  const hasSeason = FLOWER_SETS.season.every((f) => flowers.includes(f))
  const hasPlant = FLOWER_SETS.plant.every((f) => flowers.includes(f))

  if (hasSeason && !state.claimedYitaihua) {
    state.claimedYitaihua = true
    const amt = fanAmount(state, 5)
    payOthersBase(state, seat, '一台花', amt)
  }
  if (hasPlant && !state.claimedYitaicao) {
    state.claimedYitaicao = true
    const amt = fanAmount(state, 3)
    payOthersBase(state, seat, '一台草', amt)
  }

  if (flowers.length === 8 && !state.claimedFlowerSpecial) {
    state.claimedFlowerSpecial = true
    const amt = fanAmount(state, 100)
    payOthersBase(state, seat, '八仙過海', amt)
  }

  // 七搶一／一搶七：總共 8 花，有人 7 隻、另一人摸到第 8
  if (flowers.length >= 1 && !state.claimedFlowerSpecial) {
    const counts = state.players.map((p) => p.flowers.length)
    const total = counts.reduce((s, n) => s + n, 0)
    if (total === 8) {
      const seven = counts.findIndex((n) => n === 7)
      const one = counts.findIndex((n) => n === 1)
      if (seven >= 0 && one >= 0 && seven !== one) {
        state.claimedFlowerSpecial = true
        const amt = fanAmount(state, 30)
        if (seat === one && counts[seven] === 7) {
          payInstant(state, seat, seven as Seat, amt, '七搶一')
        } else if (seat === seven && counts[one] === 1) {
          payInstant(state, one as Seat, seat, amt, '一搶七')
        }
      }
    }
  }
}

function emptyPlayer(cash = DEFAULT_STARTING_CASH): PlayerState {
  return {
    hand: [],
    melds: [],
    flowers: [],
    discards: [],
    ding: null,
    passedPong: [],
    passedWinThisLap: false,
    cash,
  }
}

function cloneState(state: GameState): GameState {
  return structuredClone(state)
}

function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat
}

function log(state: GameState, msg: string): void {
  state.history.push(msg)
}

/** 手牌維持萬筒索／字／花順位 */
function normalizeHands(state: GameState): void {
  for (const p of state.players) {
    p.hand = sortTiles(p.hand)
  }
}

function declareWallExhausted(state: GameState): void {
  state.phase = 'round_over'
  state.pendingDiscard = null
  state.chankan = false
  state.justDrawn = null
  state.mustDiscard = false
  state.lastResult = {
    kind: 'draw',
    wins: [],
    nextDealer: state.dealer,
    nextConsecutiveWins: state.consecutiveWins,
  }
  log(state, '流局')
}

function supplementFromDead(state: GameState, seat: Seat): void {
  const p = state.players[seat]
  let guard = 24
  while (guard-- > 0) {
    if (state.phase === 'round_over') return
    const flower = p.hand.find(isFlower)
    if (!flower) break
    p.hand = removeOne(p.hand, flower)
    p.flowers.push(flower)
    if (wallRemaining(state.liveIndex, state.deadWallIndex) <= 0) {
      declareWallExhausted(state)
      return
    }
    const { tile, deadIndex } = drawFromDead(
      state.wall,
      state.deadWallIndex,
      state.liveIndex,
    )
    state.deadWallIndex = deadIndex
    p.hand.push(tile)
    state.flowerDrawChain += 1
    state.lastSupplement = 'flower'
    log(state, `seat ${seat} 補花 ${flower} → ${tile}`)
  }
  checkFlowerInstantBonuses(state, seat)
}

function drawSupplementTile(state: GameState, seat: Seat): void {
  if (wallRemaining(state.liveIndex, state.deadWallIndex) <= 0) {
    declareWallExhausted(state)
    return
  }
  const p = state.players[seat]
  const { tile, deadIndex } = drawFromDead(
    state.wall,
    state.deadWallIndex,
    state.liveIndex,
  )
  state.deadWallIndex = deadIndex
  p.hand.push(tile)
  state.justDrawn = tile
  state.kongDrawChain += 1
  state.lastSupplement = 'kong'
  if (isFlower(tile)) {
    supplementFromDead(state, seat)
    if (state.phase === 'round_over') return
    const last = [...p.hand].reverse().find((t) => !isFlower(t))
    state.justDrawn = last ?? tile
  }
}

function dealFlowers(state: GameState): void {
  for (let pass = 0; pass < 8; pass++) {
    let any = false
    for (let i = 0; i < 4; i++) {
      const seat = ((state.dealer + i) % 4) as Seat
      const p = state.players[seat]
      const flowers = p.hand.filter(isFlower)
      if (flowers.length === 0) continue
      any = true
      for (const f of [...flowers]) {
        if (!p.hand.includes(f)) continue
        p.hand = removeOne(p.hand, f)
        p.flowers.push(f)
        const { tile, deadIndex } = drawFromDead(
          state.wall,
          state.deadWallIndex,
          state.liveIndex,
        )
        state.deadWallIndex = deadIndex
        p.hand.push(tile)
        log(state, `派牌補花 seat ${seat}: ${f} → ${tile}`)
      }
      checkFlowerInstantBonuses(state, seat)
    }
    if (!any) break
  }
}

function drawForCurrent(state: GameState): void {
  if (wallRemaining(state.liveIndex, state.deadWallIndex) <= 0) {
    declareWallExhausted(state)
    return
  }
  const { tile, liveIndex } = drawFromLive(state.wall, state.liveIndex)
  state.liveIndex = liveIndex
  const seat = state.currentSeat
  const p = state.players[seat]
  // 普通摸牌重置補牌鏈（除非摸到花會再開鏈）
  state.flowerDrawChain = 0
  state.kongDrawChain = 0
  state.lastSupplement = null
  p.hand.push(tile)
  state.justDrawn = tile
  log(state, `seat ${seat} 摸 ${tile}`)
  if (isFlower(tile)) {
    supplementFromDead(state, seat)
    if (state.phase === 'round_over') return
    const last = [...p.hand].reverse().find((t) => !isFlower(t))
    state.justDrawn = last ?? tile
  }
  checkFlowerInstantBonuses(state, seat)
  p.passedWinThisLap = false
  state.mustDiscard = false
}

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

function interruptIppatsu(state: GameState): void {
  for (const p of state.players) {
    if (p.ding) p.ding.ippatsuActive = false
  }
  state.lastInterruptIppatsu = true
}

function applyWins(
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
  applySettledPayouts(state, la.settled)
  state.instantPayouts.push(...la.settled)

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
  p.melds.push({
    kind: 'chi',
    tiles: sortTiles([...chiTiles, tile]),
    fromSeat: from,
    claimedTile: tile,
  })
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
  p.melds.push({
    kind: 'pong',
    tiles: [tile, tile, tile],
    fromSeat: from,
    claimedTile: tile,
  })
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
  p.melds.push({
    kind: 'mingkong',
    tiles: [tile, tile, tile, tile],
    fromSeat: from,
    claimedTile: tile,
  })
  state.pendingDiscard = null
  state.chankan = false
  state.currentSeat = seat
  state.phase = 'playing'
  interruptIppatsu(state)
  drawSupplementTile(state, seat)
  log(state, `seat ${seat} 明槓 ${tile}`)
}

function resolveClaims(state: GameState): void {
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

function submitClaim(state: GameState, seat: Seat, claim: Claim): void {
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

function openClaimWindow(state: GameState, seat: Seat, tile: TileId): void {
  state.pendingDiscard = {
    seat,
    tile,
    awaiting: ([0, 1, 2, 3] as Seat[]).filter((s) => s !== seat),
    claims: [],
  }
  state.phase = 'claim_window'
  state.chankan = false
  state.justDrawn = null
}

export function createGame(config: GameConfig = {}): GameState {
  const seed = config.seed ?? (Date.now() >>> 0)
  const dealer = config.dealerSeat ?? 0
  const rules = { ...DEFAULT_RULES, ...config.rules }
  const dealt = dealWall(seed, dealer)

  const players: GameState['players'] = [
    emptyPlayer(),
    emptyPlayer(),
    emptyPlayer(),
    emptyPlayer(),
  ]
  for (let s = 0; s < 4; s++) {
    players[s as Seat].hand = sortTiles(dealt.hands[s as Seat])
  }

  const state: GameState = {
    rules,
    seed,
    wall: dealt.wall,
    liveIndex: dealt.liveIndex,
    deadWallIndex: dealt.deadIndex,
    dice: dealt.dice,
    openSeat: dealt.openSeat,
    dealer,
    consecutiveWins: config.consecutiveDealerWins ?? 0,
    players,
    currentSeat: dealer,
    phase: 'playing',
    justDrawn: null,
    mustDiscard: false,
    pendingDiscard: null,
    chankan: false,
    lastInterruptIppatsu: false,
    claimedYitaihua: false,
    claimedYitaicao: false,
    claimedFlowerSpecial: false,
    discardsThisRound: 0,
    flowerDrawChain: 0,
    kongDrawChain: 0,
    lastSupplement: null,
    chaseTile: null,
    chaseSeats: [],
    round: 1,
    windRound: 0,
    laLedger: [],
    lastResult: null,
    instantPayouts: [],
    history: [
      `createGame seed=${seed} dealer=${dealer} dice=${dealt.dice.join(',')}`,
    ],
    actionLog: [],
  }

  appendActionLog(state, null, { type: 'start' }, 'createGame')
  applyDiceBonuses(state)
  dealFlowers(state)
  drawForCurrent(state)
  normalizeHands(state)
  return state
}

export function applyAction(
  state: GameState,
  action: Action,
  actor?: Seat,
): GameState {
  const next = cloneState(state)
  const seat = actor ?? next.currentSeat

  switch (action.type) {
    case 'draw': {
      if (next.phase !== 'playing') throw new Error('cannot draw')
      if (next.mustDiscard) throw new Error('上／碰後要打牌，唔好摸')
      if (next.justDrawn) throw new Error('already drawn')
      if (seat !== next.currentSeat) throw new Error('not your turn')
      drawForCurrent(next)
      break
    }
    case 'discard': {
      if (next.phase !== 'playing') throw new Error('cannot discard')
      if (seat !== next.currentSeat) throw new Error('not your turn')
      if (!next.justDrawn && !next.mustDiscard) {
        throw new Error('要先摸牌')
      }
      const p = next.players[seat]
      if (p.ding) {
        const must = next.justDrawn
        if (must && action.tile !== must) throw new Error('叮：摸乜打乜')
      }
      if (!hasTile(p.hand, action.tile)) throw new Error('tile not in hand')
      p.hand = removeOne(p.hand, action.tile)
      next.justDrawn = null
      next.mustDiscard = false
      next.discardsThisRound += 1
      // 打牌後補牌鏈結束（花摸／槓摸只喺補牌即食）
      next.flowerDrawChain = 0
      next.kongDrawChain = 0
      next.lastSupplement = null

      // 追：四家連續打同一隻，第一家賠其他三家各一底
      if (next.chaseTile === action.tile) {
        if (!next.chaseSeats.includes(seat)) next.chaseSeats.push(seat)
      } else {
        next.chaseTile = action.tile
        next.chaseSeats = [seat]
      }
      if (next.chaseSeats.length >= 4) {
        const first = next.chaseSeats[0]!
        for (const s of next.chaseSeats.slice(1)) {
          payInstant(next, first, s, diAmount(next.rules), '追')
        }
        next.chaseTile = null
        next.chaseSeats = []
      }

      if (action.declareDing) {
        if (p.ding) throw new Error('already ding')
        if (!isReady(p.hand, p.melds)) throw new Error('未叫糊唔可以叮')
        p.ding = {
          kind: 'normal',
          markerDiscard: action.tile,
          ippatsuActive: true,
          guoshuiLocked: false,
        }
      } else if (p.ding && !p.ding.markerDiscard) {
        p.ding.markerDiscard = action.tile
      }

      openClaimWindow(next, seat, action.tile)
      break
    }
    case 'chi': {
      if (next.phase !== 'claim_window' || !next.pendingDiscard) {
        throw new Error('cannot chi')
      }
      if (next.players[seat].ding) throw new Error('叮後不可上')
      if (seat !== nextSeat(next.pendingDiscard.seat)) {
        throw new Error('上只能上上家')
      }
      submitClaim(next, seat, { seat, kind: 'chi', chiTiles: action.tiles })
      break
    }
    case 'pong': {
      if (next.phase !== 'claim_window' || !next.pendingDiscard) {
        throw new Error('cannot pong')
      }
      if (next.players[seat].ding) throw new Error('叮後不可碰')
      const tile = next.pendingDiscard.tile
      if (next.players[seat].passedPong.includes(tile)) throw new Error('過碰')
      submitClaim(next, seat, { seat, kind: 'pong' })
      break
    }
    case 'mingkong': {
      if (next.phase !== 'claim_window' || !next.pendingDiscard) {
        throw new Error('cannot mingkong')
      }
      if (next.players[seat].ding) throw new Error('叮後不可槓')
      submitClaim(next, seat, { seat, kind: 'kong' })
      break
    }
    case 'ankong': {
      if (next.phase !== 'playing' || seat !== next.currentSeat) {
        throw new Error('cannot ankong')
      }
      if (next.players[seat].ding) throw new Error('叮後不可暗槓')
      const p = next.players[seat]
      if (!hasTile(p.hand, action.tile, 4)) throw new Error('need 4 tiles')
      p.hand = removeMany(p.hand, [
        action.tile,
        action.tile,
        action.tile,
        action.tile,
      ])
      p.melds.push({
        kind: 'ankong',
        tiles: [action.tile, action.tile, action.tile, action.tile],
      })
      interruptIppatsu(next)
      drawSupplementTile(next, seat)
      // 暗槓收底：即時入金池（先前只記帳唔扣錢，跨局金池唔會變）
      payOthersBase(next, seat, '暗槓收底')
      log(next, `seat ${seat} 暗槓 ${action.tile}`)
      break
    }
    case 'jiagang': {
      if (next.phase !== 'playing' || seat !== next.currentSeat) {
        throw new Error('cannot jiagang')
      }
      if (next.players[seat].ding) throw new Error('叮後不可加槓')
      const p = next.players[seat]
      const meldIdx = p.melds.findIndex(
        (m) => m.kind === 'pong' && m.tiles[0] === action.tile,
      )
      if (meldIdx < 0 || !hasTile(p.hand, action.tile)) {
        throw new Error('cannot jiagang')
      }
      p.hand = removeOne(p.hand, action.tile)
      const prev = p.melds[meldIdx]!
      p.melds[meldIdx] = {
        kind: 'jiagang',
        tiles: [action.tile, action.tile, action.tile, action.tile],
        fromSeat: prev.fromSeat,
        claimedTile: action.tile,
      }
      next.pendingDiscard = {
        seat,
        tile: action.tile,
        awaiting: ([0, 1, 2, 3] as Seat[]).filter((s) => s !== seat),
        claims: [],
      }
      next.phase = 'claim_window'
      next.chankan = true
      next.justDrawn = null
      log(next, `seat ${seat} 加槓宣言 ${action.tile}`)
      break
    }
    case 'win': {
      if (next.phase === 'claim_window' && next.pendingDiscard) {
        const pending = next.pendingDiscard
        const p = next.players[seat]
        if (p.ding?.guoshuiLocked) throw new Error('叮後過水不可食')
        if (p.passedWinThisLap && !p.ding) throw new Error('過水')
        if (!canWin(p.hand, p.melds, pending.tile)) throw new Error('未叫糊')
        submitClaim(next, seat, { seat, kind: 'win' })
      } else if (next.phase === 'playing' && seat === next.currentSeat) {
        const p = next.players[seat]
        const tile = next.justDrawn
        if (!tile) throw new Error('no drawn tile')
        const handWithout = removeOne(p.hand, tile)
        if (!canWin(handWithout, p.melds, tile)) throw new Error('未叫糊')
        applyWins(next, [seat], 'tsumo', tile)
      } else {
        throw new Error('cannot win now')
      }
      break
    }
    case 'pass': {
      if (next.phase !== 'claim_window' || !next.pendingDiscard) {
        throw new Error('cannot pass')
      }
      const pending = next.pendingDiscard
      const p = next.players[seat]
      if (!next.chankan) {
        if (canPong(p.hand, pending.tile)) p.passedPong.push(pending.tile)
        if (canWin(p.hand, p.melds, pending.tile)) {
          p.passedWinThisLap = true
          if (p.ding) p.ding.guoshuiLocked = true
        }
      }
      submitClaim(next, seat, { seat, kind: 'pass' })
      break
    }
    case 'declareDing': {
      const p = next.players[seat]
      if (p.ding) throw new Error('already ding')
      // 手牌喺摸牌狀態要撳咗打出先叮；未摸可用手牌判斷
      const hand =
        next.justDrawn && seat === next.currentSeat
          ? removeOne(p.hand, next.justDrawn)
          : p.hand
      if (!isReady(hand, p.melds)) throw new Error('未叫糊')
      const draws = next.history.filter((h) => h.includes('摸')).length
      const kind =
        draws <= 1 && seat === next.dealer
          ? 'tian'
          : draws <= 2 && seat !== next.dealer
            ? 'di'
            : 'normal'
      p.ding = {
        kind,
        ippatsuActive: true,
        guoshuiLocked: false,
      }
      log(next, `seat ${seat} 叮 ${kind}`)
      break
    }
    case 'chopLa': {
      const entry = next.laLedger.find(
        (e) => e.creditor === action.creditor && e.debtor === action.debtor,
      )
      if (!entry || !canChopLa(entry, next.rules.maxLaKou)) {
        throw new Error('不可斬拉')
      }
      const r = chopLa(next.laLedger, action.creditor, action.debtor)
      next.laLedger = r.ledger
      applySettledPayouts(next, r.settled)
      next.instantPayouts.push(...r.settled)
      break
    }
    case 'settleAll': {
      const r = settleAllLa(next.laLedger)
      next.laLedger = r.ledger
      applySettledPayouts(next, r.settled)
      next.instantPayouts.push(...r.settled)
      break
    }
    case 'nextRound': {
      if (next.phase !== 'round_over') throw new Error('round not over')
      const res = next.lastResult
      const newDealer = (res?.nextDealer ?? nextSeat(next.dealer)) as Seat
      const newConsecutive = res?.nextConsecutiveWins ?? 0
      const circleDone = dealershipCircleComplete(next.dealer, newDealer)
      let nextWind = next.windRound
      if (circleDone) {
        nextWind = next.windRound + 1
        if (nextWind > next.rules.matchCircles - 1) {
          next.phase = 'match_over'
          appendActionLog(next, actor ?? null, action, 'match_over')
          return next
        }
      }
      const newSeed =
        action.seed ?? ((createRng(next.seed)() * 0xffffffff) >>> 0)
      const fresh = createGame({
        rules: next.rules,
        seed: newSeed,
        dealerSeat: newDealer,
        consecutiveDealerWins: newConsecutive,
      })
      // 帶過拉帳＋金池；清走上鋪顯示用嘅 lastHand／prev
      fresh.laLedger = next.laLedger.map((e) => ({
        creditor: e.creditor,
        debtor: e.debtor,
        amount: e.amount,
        kou: e.kou,
      }))
      for (let i = 0; i < 4; i++) {
        fresh.players[i]!.cash = next.players[i]!.cash
      }
      fresh.round = next.round + 1
      fresh.windRound = circleDone ? nextWind : next.windRound
      // 延續整場 actionLog；唔保留 createGame 嘅 start
      fresh.actionLog = [
        ...next.actionLog,
        { t: Date.now(), seat: actor ?? null, action },
      ]
      return fresh
    }
    case 'start':
      throw new Error('start is log-only')
    default:
      throw new Error('unknown action')
  }

  normalizeHands(next)
  appendActionLog(next, seat, action)
  return next
}

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
      p.ding && state.justDrawn
        ? [state.justDrawn]
        : [...new Set(p.hand)]
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

/** 對無法鳴牌／已被更高優先搶去嘅座位自動 pass */
export function autoPassImpossibleClaims(state: GameState): GameState {
  let s = state
  let guard = 12
  while (s.phase === 'claim_window' && s.pendingDiscard && guard-- > 0) {
    const pending = s.pendingDiscard
    if (pending.awaiting.length === 0) break
    let progressed = false
    for (const seat of [...pending.awaiting]) {
      const legal = getLegalActions(s, seat)
      const canClaim = legal.some(
        (a) =>
          a.type === 'win' ||
          a.type === 'pong' ||
          a.type === 'mingkong' ||
          a.type === 'chi',
      )
      if (!canClaim) {
        s = applyAction(s, { type: 'pass' }, seat)
        progressed = true
        break
      }
    }
    if (!progressed) break
  }
  return s
}

export function discardAndResolve(
  state: GameState,
  tile: TileId,
  actor?: Seat,
  declareDing?: boolean,
): GameState {
  let s = applyAction(state, { type: 'discard', tile, declareDing }, actor)
  s = autoPassImpossibleClaims(s)
  return s
}

export function getPublicView(
  state: GameState,
  names: string[] = ['東', '南', '西', '北'],
): PublicGameView {
  const terminal =
    state.phase === 'round_over' ||
    state.phase === 'match_over' ||
    state.phase === 'wall_exhausted'
  return {
    rules: state.rules,
    dice: state.dice,
    dealer: state.dealer,
    consecutiveWins: state.consecutiveWins,
    currentSeat: state.currentSeat,
    phase: state.phase,
    wallRemaining: wallRemaining(state.liveIndex, state.deadWallIndex),
    players: state.players.map((p, i) => ({
      seat: i as Seat,
      name: names[i] ?? `P${i}`,
      handCount: p.hand.length,
      melds: p.melds,
      flowers: p.flowers,
      discards: p.discards,
      ding: p.ding,
      isDealer: i === state.dealer,
      cash: p.cash,
    })),
    pendingDiscard: state.pendingDiscard,
    justDrawnVisible: state.justDrawn !== null,
    mustDiscard: state.mustDiscard,
    laLedger: state.laLedger,
    lastResult: state.lastResult,
    instantPayouts: state.instantPayouts,
    round: state.round,
    windRound: state.windRound,
    seed: state.seed,
    actionLog: state.actionLog,
    revealedHands: terminal
      ? state.players.map((p) => [...p.hand])
      : undefined,
  }
}

export function getPrivateView(
  state: GameState,
  seat: Seat,
  names?: string[],
): PrivateGameView {
  return {
    ...getPublicView(state, names),
    you: seat,
    hand: sortTiles([...state.players[seat].hand]),
    justDrawn: state.currentSeat === seat ? state.justDrawn : null,
    legalActions: getLegalActions(state, seat),
  }
}

export { waitingTiles, isReady, canWin, calculateFans }
