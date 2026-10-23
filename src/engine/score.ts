import { calculateFans, totalFan, type FanHit } from './fan'
import type {
  DingState,
  Meld,
  Seat,
  TableRules,
  TileId,
  WinResult,
} from './types'
import { DEFAULT_RULES } from './types'

export interface BuildWinInput {
  seat: Seat
  hand: TileId[]
  melds: Meld[]
  flowers: TileId[]
  winTile: TileId
  winType: 'tsumo' | 'ron' | 'chankan'
  ding: DingState | null
  dealer: Seat
  consecutiveWins: number
  discarder?: Seat
  rules: TableRules
  wallRemaining?: number
  discardsThisRound?: number
  multiRonCount?: number
  discarderIsDealer?: boolean
  zhengHuaTiles?: TileId[]
}

/** 金額 = 底 + 番 × 番值 */
export function amountFromFan(rules: TableRules, fan: number): number {
  return rules.base + fan * rules.fanValue
}

/** 莊番：做莊 1 + 連 N 莊 2N */
export function dealerExtraFan(consecutiveWins: number): number {
  return 1 + 2 * consecutiveWins
}

/**
 * 牌型番（唔包莊／連莊）。莊番按付款方另計。
 */
export function handFansWithoutDealer(input: BuildWinInput): FanHit[] {
  return calculateFans({
    hand: input.hand,
    melds: input.melds,
    flowers: input.flowers,
    winTile: input.winTile,
    winType: input.winType,
    ding: input.ding,
    isDealer: false,
    consecutiveWins: 0,
    seat: input.seat,
    wallRemaining: input.wallRemaining ?? 99,
    discardsThisRound: input.discardsThisRound ?? 99,
    multiRonCount: input.multiRonCount ?? 1,
    discarderIsDealer: input.discarderIsDealer ?? false,
    zhengHuaTiles: input.zhengHuaTiles ?? [],
    fiveTongShunFan: input.rules.fiveTongShunFan,
    excludeBanGaoXiangFengAfterWuTong:
      input.rules.excludeBanGaoXiangFengAfterWuTong,
  })
}

export function buildWinResult(input: BuildWinInput): WinResult {
  const handFans = handFansWithoutDealer(input)
  const handFan = totalFan(handFans)
  const winnerIsDealer = input.seat === input.dealer
  const dExtra = dealerExtraFan(input.consecutiveWins)

  const payments: WinResult['payments'] = []
  let paymentPerPayer = 0
  const fans: FanHit[] = [...handFans]

  if (input.winType === 'tsumo') {
    // 三家各付：閒家付 底+牌型番；莊家（若非贏家）另加莊番
    for (let s = 0; s < 4; s++) {
      const from = s as Seat
      if (from === input.seat) continue
      let fan = handFan
      if (winnerIsDealer) {
        // 莊家自摸：三家都要付牌型+莊番
        fan = handFan + dExtra
      } else if (from === input.dealer) {
        // 閒家自摸：莊家多付莊番
        fan = handFan + dExtra
      }
      const amount = amountFromFan(input.rules, fan)
      payments.push({ from, to: input.seat, amount })
      paymentPerPayer = amountFromFan(input.rules, handFan + (winnerIsDealer ? dExtra : 0))
    }
    if (winnerIsDealer) {
      fans.push({ id: 'dealer', name: '莊', value: 1 })
      if (input.consecutiveWins > 0) {
        fans.push({
          id: 'lianzhuang',
          name: '連莊',
          value: 2 * input.consecutiveWins,
        })
      }
    }
  } else {
    // 出銃／搶槓：一人付
    const from = input.discarder!
    let fan = handFan
    if (winnerIsDealer) {
      fan += dExtra
      fans.push({ id: 'dealer', name: '莊', value: 1 })
      if (input.consecutiveWins > 0) {
        fans.push({
          id: 'lianzhuang',
          name: '連莊',
          value: 2 * input.consecutiveWins,
        })
      }
    } else if (from === input.dealer) {
      fan += dExtra
    }
    const amount = amountFromFan(input.rules, fan)
    payments.push({ from, to: input.seat, amount })
    paymentPerPayer = amount
  }

  const totalFanValue = fans.reduce((s, f) => s + f.value, 0)

  return {
    seat: input.seat,
    winType: input.winType,
    discarder: input.discarder,
    fans,
    totalFan: totalFanValue,
    handFan,
    paymentPerPayer,
    payments,
  }
}

/** 計劃例子：$5 底 $1 番，平胡+無字+自摸 = 8 番，每家 $13 */
export function examplePinghuWuziZimo(
  rules: TableRules = { ...DEFAULT_RULES, base: 5, fanValue: 1 },
): number {
  const fan = 5 + 2 + 1
  return amountFromFan(rules, fan)
}
