import { FLOWER_SETS, isFlower, removeOne } from './tiles'
import type { GameState, Seat } from './types'
import {
  appendActionLog,
  fanAmount,
  log,
  payInstant,
  payOthersBase,
} from './state-ops'
import { drawFromDead, drawFromLive, wallRemaining } from './wall'

/** 流局：牌牆摸完。終局相仍然係 round_over。 */
export function declareWallExhausted(state: GameState): void {
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

/** 補花／摸花後檢查一台花／草、七搶一、八仙 */
export function checkFlowerInstantBonuses(state: GameState, seat: Seat): void {
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

export function drawSupplementTile(state: GameState, seat: Seat): void {
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
  log(state, `seat ${seat} 槓摸 ${tile}`)
  appendActionLog(state, seat, {
    type: 'draw',
    tile,
    kind: isFlower(tile) ? 'flower' : 'kong',
  })
  if (isFlower(tile)) {
    supplementFromDead(state, seat)
    if (state.phase === 'round_over') return
    const last = [...p.hand].reverse().find((t) => !isFlower(t))
    state.justDrawn = last ?? tile
  }
}

export function dealFlowers(state: GameState): void {
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

export function drawForCurrent(state: GameState): void {
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
  appendActionLog(state, seat, {
    type: 'draw',
    tile,
    kind: isFlower(tile) ? 'flower' : 'live',
  })
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
