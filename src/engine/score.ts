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
  flowerDrawChain?: number
  kongDrawChain?: number
  visibleWinTileCount?: number
  fanxue?: boolean
  /** 圈風：0東 1南 2西 3北 */
  windRound?: number
}

/** 銀碼＝總番 × 番值（底已計入總番，唔另加） */
export function amountFromFan(rules: TableRules, fan: number): number {
  return fan * rules.fanValue
}

/** 即時「一個底」銀碼＝底番 × 番值 */
export function diAmount(rules: TableRules): number {
  return Math.max(0, rules.base) * rules.fanValue
}

/** 莊番：做莊 1；連 N 莊共 2N+1（含莊，永遠奇數） */
export function dealerExtraFan(consecutiveWins: number): number {
  return 1 + 2 * consecutiveWins
}

function baseFanHit(rules: TableRules): FanHit {
  return { id: 'di', name: '底', value: Math.max(0, rules.base) }
}

/**
 * 牌型番（含底；唔包莊／連莊）。莊番按付款方另計。
 */
export function handFansWithoutDealer(input: BuildWinInput): FanHit[] {
  const pattern = calculateFans({
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
    flowerDrawChain: input.flowerDrawChain ?? 0,
    kongDrawChain: input.kongDrawChain ?? 0,
    visibleWinTileCount: input.visibleWinTileCount ?? 0,
    fanxue: input.fanxue ?? false,
    windRound: input.windRound ?? 0,
  })
  return [baseFanHit(input.rules), ...pattern]
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
    // 自摸：三家同一額。莊家自摸先一齊加莊／連莊；閒家自摸唔再另收莊多付。
    const payFan = winnerIsDealer ? handFan + dExtra : handFan
    const amount = amountFromFan(input.rules, payFan)
    paymentPerPayer = amount
    for (let s = 0; s < 4; s++) {
      const from = s as Seat
      if (from === input.seat) continue
      payments.push({ from, to: input.seat, amount })
    }
    if (winnerIsDealer) {
      // Ting：做莊+1；連 N＝2N+1（含莊），唔拆成莊1+連莊雙數
      if (input.consecutiveWins > 0) {
        fans.push({
          id: 'lianzhuang',
          name: '連莊',
          value: dExtra,
        })
      } else {
        fans.push({ id: 'dealer', name: '莊', value: 1 })
      }
    }
  } else {
    const from = input.discarder!
    let fan = handFan
    // 贏家係莊，或莊家出銃：付款含莊／連莊，番表要一齊寫，否則結算會番數同銀碼對唔上。
    if (winnerIsDealer || from === input.dealer) {
      fan += dExtra
      if (input.consecutiveWins > 0) {
        fans.push({
          id: 'lianzhuang',
          name: '連莊',
          value: dExtra,
        })
      } else {
        fans.push({ id: 'dealer', name: '莊', value: 1 })
      }
    }
    // 反雪：一炮多響時，出銃者相關番×2（番表）。銀碼＝番×番值，所以付款倍計。
    const payFan = input.fanxue ? fan * 2 : fan
    const amount = amountFromFan(input.rules, payFan)
    payments.push({ from, to: input.seat, amount })
    paymentPerPayer = amount
  }

  const totalFanValue = fans.reduce((s, f) => s + f.value, 0)

  return {
    seat: input.seat,
    winType: input.winType,
    winTile: input.winTile,
    discarder: input.discarder,
    fans,
    totalFan: totalFanValue,
    handFan,
    paymentPerPayer,
    payments,
  }
}

/** 底5 + 平胡5 + 無字1 + 自摸1 = 12 番 × $1 = $12（偏高檔） */
export function examplePinghuWuziZimo(
  rules: TableRules = { ...DEFAULT_RULES, base: 5, fanValue: 1 },
): number {
  const fan = rules.base + 5 + 1 + 1
  return amountFromFan(rules, fan)
}
