import { applyWins, openClaimWindow, submitClaim } from './claims'
import { dealFlowers, drawForCurrent, drawSupplementTile } from './draw-flow'
import { canPong, hasTile } from './hand'
import { getLegalActions } from './legal-actions'
import { canChopLa, chopLa, settleAllLa } from './la'
import { makeMeld } from './meld'
import { createRng } from './rng'
import { diAmount } from './score'
import {
  appendActionLog,
  cloneState,
  emptyPlayer,
  interruptIppatsu,
  log,
  nextSeat,
  normalizeHands,
  payInstant,
  payOthersBase,
  pushLaSettled,
} from './state-ops'
import { removeMany, removeOne, sortTiles } from './tiles'
import type {
  Action,
  GameConfig,
  GameState,
  PrivateGameView,
  PublicGameView,
  Seat,
  TileId,
} from './types'
import { DEFAULT_RULES } from './types'
import { dealWall, wallRemaining } from './wall'
import { canWin, isReady } from './win-check'

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

/** 莊位由 3→0 轉完一圈 */
function dealershipCircleComplete(prevDealer: Seat, nextDealer: Seat): boolean {
  return nextDealer !== prevDealer && nextDealer < prevDealer
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
  /** 牌譜用：補齊 claimTile／from／winTile 等顯示欄 */
  let logged: Action = action

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
      logged = {
        type: 'chi',
        tiles: action.tiles,
        claimTile: next.pendingDiscard.tile,
        from: next.pendingDiscard.seat,
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
      logged = {
        type: 'pong',
        claimTile: tile,
        from: next.pendingDiscard.seat,
      }
      submitClaim(next, seat, { seat, kind: 'pong' })
      break
    }
    case 'mingkong': {
      if (next.phase !== 'claim_window' || !next.pendingDiscard) {
        throw new Error('cannot mingkong')
      }
      if (next.players[seat].ding) throw new Error('叮後不可槓')
      logged = {
        type: 'mingkong',
        claimTile: next.pendingDiscard.tile,
        from: next.pendingDiscard.seat,
      }
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
      p.melds.push(
        makeMeld('ankong', [action.tile, action.tile, action.tile, action.tile]),
      )
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
      p.melds[meldIdx] = makeMeld(
        'jiagang',
        [action.tile, action.tile, action.tile, action.tile],
        prev.fromSeat,
        action.tile,
      )
      openClaimWindow(next, seat, action.tile, true)
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
        logged = {
          type: 'win',
          winTile: pending.tile,
          winType: next.chankan ? 'chankan' : 'ron',
          from: pending.seat,
        }
        submitClaim(next, seat, { seat, kind: 'win' })
      } else if (next.phase === 'playing' && seat === next.currentSeat) {
        const p = next.players[seat]
        const tile = next.justDrawn
        if (!tile) throw new Error('no drawn tile')
        const handWithout = removeOne(p.hand, tile)
        if (!canWin(handWithout, p.melds, tile)) throw new Error('未叫糊')
        logged = { type: 'win', winTile: tile, winType: 'tsumo' }
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
      // 被更高優先搶去後強制 pass：唔記過碰／過水（玩家冇主動放棄）
      if (!next.chankan && !action.forced) {
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
      pushLaSettled(next, r.settled)
      break
    }
    case 'settleAll': {
      const r = settleAllLa(next.laLedger)
      next.laLedger = r.ledger
      pushLaSettled(next, r.settled)
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
  // 系統自動過／內部摸牌：唔重複／唔刷操作欄
  if (
    !(
      logged.type === 'pass' &&
      (logged.reason === 'auto' ||
        (logged.forced === true && logged.reason !== 'timeout'))
    ) &&
    logged.type !== 'draw'
  ) {
    appendActionLog(next, seat, logged)
  }
  return next
}

/** 對無法鳴牌嘅座位自動 pass（唔入操作 log） */
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
        s = applyAction(
          s,
          { type: 'pass', forced: true, reason: 'auto' },
          seat,
        )
        progressed = true
        break
      }
    }
    if (!progressed) break
  }
  return s
}

/**
 * 玩家動作之後：打出／鳴牌都走同一條，自動 pass 無法鳴嘅家。
 * 本機 LocalGame 同 worker 都叫呢個，唔好各寫一套。
 */
export function afterPlayerAction(
  state: GameState,
  action: Action,
  actor?: Seat,
): GameState {
  const next = applyAction(state, action, actor)
  return autoPassImpossibleClaims(next)
}

export function discardAndResolve(
  state: GameState,
  tile: TileId,
  actor?: Seat,
  declareDing?: boolean,
): GameState {
  return afterPlayerAction(
    state,
    { type: 'discard', tile, declareDing },
    actor,
  )
}

export function getPublicView(
  state: GameState,
  names: string[] = ['東', '南', '西', '北'],
): PublicGameView {
  const terminal = state.phase === 'round_over' || state.phase === 'match_over'
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
    passedPong: [...state.players[seat].passedPong],
  }
}

export { getLegalActions } from './legal-actions'
export { ZHENG_HUA, zhengHuaForSeat } from './state-ops'
export { waitingTiles, isReady, canWin } from './win-check'
export { calculateFans } from './fan'
