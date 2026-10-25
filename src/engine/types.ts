/** 座位：0=東家起，逆時針 0→1→2→3 */
export type Seat = 0 | 1 | 2 | 3

export type Suit = 'man' | 'pin' | 'sou' | 'wind' | 'dragon' | 'flower'

export type WindKind = 'east' | 'south' | 'west' | 'north'
export type DragonKind = 'zhong' | 'fa' | 'bai'
export type FlowerKind =
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter'
  | 'plum'
  | 'orchid'
  | 'chrysanthemum'
  | 'bamboo'

/** Canonical tile id, e.g. man-3, wind-east, flower-spring */
export type TileId = string

export type MeldKind = 'chi' | 'pong' | 'mingkong' | 'ankong' | 'jiagang'

export interface Meld {
  kind: MeldKind
  tiles: TileId[]
  /** 誰打出／被鳴 */
  fromSeat?: Seat
  claimedTile?: TileId
}

export interface DingState {
  /** 天叮／地叮／普通叮 */
  kind: 'normal' | 'tian' | 'di'
  /** 叮後打橫記認嘅第一張 */
  markerDiscard?: TileId
  /** 叮後是否仍在可即食嘅一巡內 */
  ippatsuActive: boolean
  /** 叮後過水則整局不可再食 */
  guoshuiLocked: boolean
}

/** 開局／AI 預設金池（跨局繼承） */
export const DEFAULT_STARTING_CASH = 2000

export interface PlayerState {
  hand: TileId[]
  melds: Meld[]
  flowers: TileId[]
  discards: TileId[]
  ding: DingState | null
  /** 本巡見過可碰而未碰嘅牌（過碰） */
  passedPong: TileId[]
  /** 本巡過水食糊 */
  passedWinThisLap: boolean
  /** 現金池（即時賞罰／斷拉／踢半／斬拉／埋單入帳；拉帳未結唔扣） */
  cash: number
}

export type Phase = 'playing' | 'claim_window' | 'round_over' | 'match_over'

export type ClaimKind = 'win' | 'kong' | 'pong' | 'chi' | 'pass'

export interface Claim {
  seat: Seat
  kind: ClaimKind
  /** 上：手上兩張 */
  chiTiles?: TileId[]
}

export interface PendingDiscard {
  seat: Seat
  tile: TileId
  /** 尚未回應嘅座位 */
  awaiting: Seat[]
  claims: Claim[]
}

export interface TableRules {
  /**
   * 底（番數）。食糊時計入總番，銀碼＝總番×番值，唔再另外加一筆底銀。
   * 即時「一個底」＝ base × fanValue。
   */
  base: number
  /** 一番幾多銀 */
  fanValue: number
  /** 幾口可斬拉 */
  maxLaKou: number
  /** 五同順番數（常見 40） */
  fiveTongShunFan: number
  /** true＝計四五同順後唔再計般高／相逢（舊坊間）；預設 false 仍另計 */
  excludeBanGaoXiangFengAfterWuTong: boolean
  /** 出牌限時（秒） */
  turnTimeoutSec: number
  /** 鳴牌窗限時（秒） */
  claimTimeoutSec: number
  /** 打幾圈（1＝只東圈；4＝東南西北） */
  matchCircles: number
}

/**
 * 預設枱規＝坊間眾數番表（見 fans.json／design/fan-survey.md）。
 * 底 5 番；一番 $2 → 一個底等值 $10；五同順 40；同順後仍計般高／相逢。
 */
export const DEFAULT_RULES: TableRules = {
  base: 5,
  fanValue: 2,
  maxLaKou: 3,
  fiveTongShunFan: 40,
  excludeBanGaoXiangFengAfterWuTong: false,
  turnTimeoutSec: 20,
  claimTimeoutSec: 12,
  matchCircles: 4,
}

export interface WinResult {
  seat: Seat
  /** 自摸／出銃／搶槓 */
  winType: 'tsumo' | 'ron' | 'chankan'
  /** 糊牌（出銃時唔喺贏家手牌內） */
  winTile: TileId
  discarder?: Seat
  fans: { id: string; name: string; value: number }[]
  totalFan: number
  /** 未計莊番前嘅牌型番 */
  handFan: number
  /** 每家應付（自摸）或出銃者應付 */
  paymentPerPayer: number
  payments: { from: Seat; to: Seat; amount: number }[]
}

export interface RoundResult {
  kind: 'win' | 'draw'
  wins: WinResult[]
  /** 下一局莊家 */
  nextDealer: Seat
  /** 下一局連莊數 */
  nextConsecutiveWins: number
}

/** 拉數欠款：debtor 欠 creditor */
export interface LaEntry {
  creditor: Seat
  debtor: Seat
  amount: number
  /** 已拉口數（再食一次 +1） */
  kou: number
  /** 本鋪計入拉帳嘅銀碼（結算顯示用；未喺本鋪郁過則無） */
  lastHandAmount?: number
  /** 再食前舊帳（結算顯示：本局 + 上局×1.5 = 新） */
  prevAmount?: number
}

export interface GameConfig {
  rules?: Partial<TableRules>
  /** 可重現洗牌 */
  seed?: number
  dealerSeat?: Seat
  consecutiveDealerWins?: number
  playerNames?: string[]
}

export interface GameState {
  rules: TableRules
  seed: number
  wall: TileId[]
  /** 牆頭下一張索引 */
  liveIndex: number
  /** 槓尾指針：由牆尾向前補（下一張係 deadWallIndex-1） */
  deadWallIndex: number
  dice: [number, number, number]
  /** 開門座位（相對莊） */
  openSeat: Seat
  dealer: Seat
  /** 連莊次數 N（連 0 = 未連） */
  consecutiveWins: number
  players: [PlayerState, PlayerState, PlayerState, PlayerState]
  currentSeat: Seat
  phase: Phase
  /** 剛摸到、尚未打出 */
  justDrawn: TileId | null
  /** 上／碰後唔摸牌，必須打一張 */
  mustDiscard: boolean
  pendingDiscard: PendingDiscard | null
  /** 加槓搶槓窗口 */
  chankan: boolean
  /** 上一次動作是否開槓／鳴牌（打斷即食） */
  lastInterruptIppatsu: boolean
  /** 本局已收過一台花／一台草（每局各一次） */
  claimedYitaihua: boolean
  claimedYitaicao: boolean
  /** 七搶一／八仙等已結算（避免重複） */
  claimedFlowerSpecial: boolean
  /** 本局已打出幾張（天地人胡／子內） */
  discardsThisRound: number
  /** 當前座位連續補花次數（花摸） */
  flowerDrawChain: number
  /** 當前座位連續槓補次數（槓摸） */
  kongDrawChain: number
  /** 上一手補牌來源 */
  lastSupplement: 'flower' | 'kong' | null
  /** 追：連續打出同一隻嘅座位（清空於換牌） */
  chaseTile: TileId | null
  chaseSeats: Seat[]
  round: number
  windRound: number
  laLedger: LaEntry[]
  lastResult: RoundResult | null
  /** 即時賞罰紀錄（唔入拉） */
  instantPayouts: {
    from: Seat
    to: Seat
    amount: number
    reason: string
    /** 即時賞罰 vs 拉帳結清。舊牌局可以冇呢個欄。 */
    kind?: 'instant' | 'la_settle'
  }[]
  history: string[]
  actionLog: ActionLogEntry[]
}

export type Action =
  | { type: 'start' }
  | { type: 'discard'; tile: TileId; declareDing?: boolean }
  /** tile／kind 牌譜顯示用；重放時引擎可忽略（牆已決定） */
  | { type: 'draw'; tile?: TileId; kind?: 'live' | 'flower' | 'kong' }
  | { type: 'chi'; tiles: TileId[]; claimTile?: TileId; from?: Seat }
  | { type: 'pong'; claimTile?: TileId; from?: Seat }
  | { type: 'mingkong'; claimTile?: TileId; from?: Seat }
  | { type: 'ankong'; tile: TileId }
  | { type: 'jiagang'; tile: TileId }
  | {
      type: 'win'
      winTile?: TileId
      winType?: 'tsumo' | 'ron' | 'chankan'
      from?: Seat
    }
  /** forced：唔記過碰／過水。reason：auto=系統跳過（唔入操作 log）；timeout=時限到 */
  | { type: 'pass'; forced?: boolean; reason?: 'auto' | 'timeout' }
  | { type: 'declareDing' }
  | { type: 'chopLa'; creditor: Seat; debtor: Seat }
  | { type: 'settleAll' }
  | { type: 'nextRound'; seed?: number }

/** 結構化動作紀錄（覆盤用）；保留 history 字串 */
export interface ActionLogEntry {
  t: number
  seat: Seat | null
  action: Action
  note?: string
}

export interface PublicPlayerView {
  seat: Seat
  name: string
  handCount: number
  melds: Meld[]
  flowers: TileId[]
  discards: TileId[]
  ding: DingState | null
  isDealer: boolean
  cash: number
}

export interface PublicGameView {
  rules: TableRules
  dice: [number, number, number]
  dealer: Seat
  consecutiveWins: number
  currentSeat: Seat
  phase: Phase
  wallRemaining: number
  players: PublicPlayerView[]
  pendingDiscard: PendingDiscard | null
  justDrawnVisible: boolean
  /** 上／碰後只打牌（未摸） */
  mustDiscard: boolean
  laLedger: LaEntry[]
  lastResult: RoundResult | null
  instantPayouts: GameState['instantPayouts']
  round: number
  windRound: number
  /** 覆盤／音效用 */
  seed: number
  actionLog: ActionLogEntry[]
  /** 終局攤牌（round_over / match_over） */
  revealedHands?: TileId[][]
}

export interface PrivateGameView extends PublicGameView {
  you: Seat
  hand: TileId[]
  justDrawn: TileId | null
  legalActions: Action[]
  /** 自己過碰的牌，只用於排牌，唔會傳去其他座位 */
  passedPong: TileId[]
}
