/**
 * 香港台麻 HK ToiMA — 共用牌局引擎
 * 本機 UI 同 Cloudflare Room DO 都經呢個 API。
 */
export {
  createGame,
  applyAction,
  getPublicView,
  getPrivateView,
  getLegalActions,
  autoPassImpossibleClaims,
  discardAndResolve,
  WIND_LABELS,
  windRoundLabel,
  dealerRoundLabel,
  matchRoundLabel,
  ZHENG_HUA,
  zhengHuaForSeat,
} from './game'
export { chooseAiAction, discardKeepScore, visibleTileCounts } from './ai'
export { hintDiscard, getWaitingTiles, timeoutPlayAction } from './hints'
export {
  deadlineFromOpened,
  isExpired,
  remainingSec,
} from './turn-timer'
export { canWin, isReady, waitingTiles, findStandardWins, isLiguligu, isThirteenOrphans } from './win-check'
export {
  calculateFans,
  pickBestWinPartition,
  totalFan,
  checkMenqing,
  fansTable,
  allFanMetas,
  getFanMeta,
  fanDescription,
  fanDisplayName,
  FAN_TABLE_META,
} from './fan'
export type { FanMeta } from './fan-catalog'
export {
  amountFromFan,
  buildWinResult,
  dealerExtraFan,
  diAmount,
  examplePinghuWuziZimo,
} from './score'
export {
  applyWinToLa,
  chopLa,
  settleAllLa,
  canChopLa,
  formatLaFanDebt,
  laDeltaForSeat,
} from './la'
export {
  createFullWall,
  parseTile,
  sortTiles,
  tileId,
  isFlower,
  isHonor,
  isSuitTile,
} from './tiles'
export { dealWall, wallRemaining } from './wall'
export { makeMeld } from './meld'
export { DEFAULT_RULES, DEFAULT_STARTING_CASH } from './types'
export type {
  Action,
  ActionLogEntry,
  Claim,
  DingState,
  GameConfig,
  GameState,
  LaEntry,
  Meld,
  MeldKind,
  Phase,
  PlayerState,
  PrivateGameView,
  PublicGameView,
  PublicPlayerView,
  RoundResult,
  Seat,
  TableRules,
  TileId,
  WinResult,
} from './types'
