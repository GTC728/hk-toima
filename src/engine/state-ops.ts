import { amountFromFan, diAmount } from './score'
import { sortTiles } from './tiles'
import type { Action, GameState, PlayerState, Seat, TileId } from './types'
import { DEFAULT_STARTING_CASH } from './types'

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

export function appendActionLog(
  state: GameState,
  seat: Seat | null,
  action: Action,
  note?: string,
): void {
  state.actionLog.push({ t: Date.now(), seat, action, note })
}

export function applyCashTransfer(
  state: GameState,
  from: Seat,
  to: Seat,
  amount: number,
): void {
  if (from === to || amount <= 0) return
  state.players[from]!.cash -= amount
  state.players[to]!.cash += amount
}

export function log(state: GameState, msg: string): void {
  state.history.push(msg)
}

export function payInstant(
  state: GameState,
  from: Seat,
  to: Seat,
  amount: number,
  reason: string,
): void {
  if (from === to || amount <= 0) return
  applyCashTransfer(state, from, to, amount)
  state.instantPayouts.push({ from, to, amount, reason, kind: 'instant' })
  log(state, `即付 ${reason}: seat ${from} → ${to} $${amount}`)
}

type SettledPay = { from: Seat; to: Seat; amount: number; reason: string }

/** 拉帳結清入金池，並標 kind 方便結算分類。reason 字串保留。 */
export function pushLaSettled(state: GameState, settled: SettledPay[]): void {
  for (const s of settled) {
    applyCashTransfer(state, s.from, s.to, s.amount)
    state.instantPayouts.push({ ...s, kind: 'la_settle' })
  }
}

export function payOthersBase(
  state: GameState,
  to: Seat,
  reason: string,
  amount?: number,
): void {
  const amt = amount ?? diAmount(state.rules)
  for (let s = 0; s < 4; s++) {
    if (s === to) continue
    payInstant(state, s as Seat, to, amt, reason)
  }
}

/** 即時賞罰：純番數 × 番值（唔再另加底） */
export function fanAmount(state: GameState, fan: number): number {
  return amountFromFan(state.rules, fan)
}

export function emptyPlayer(cash = DEFAULT_STARTING_CASH): PlayerState {
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

export function cloneState(state: GameState): GameState {
  return structuredClone(state)
}

export function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat
}

/** 手牌維持萬筒索／字／花順位 */
export function normalizeHands(state: GameState): void {
  for (const p of state.players) {
    p.hand = sortTiles(p.hand)
  }
}

export function interruptIppatsu(state: GameState): void {
  for (const p of state.players) {
    if (p.ding) p.ding.ippatsuActive = false
  }
  state.lastInterruptIppatsu = true
}
