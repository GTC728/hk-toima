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
} from './game'
export { chooseAiAction, discardKeepScore, visibleTileCounts } from './ai'
export { hintDiscard, getWaitingTiles } from './hints'
export {
  deadlineFromOpened,
  isExpired,
  remainingSec,
} from './turn-timer'
export { canWin, isReady, waitingTiles, findStandardWins, isLiguligu, isThirteenOrphans } from './win-check'
export { calculateFans, totalFan, checkMenqing, fansTable } from './fan'
export { amountFromFan, buildWinResult, dealerExtraFan, examplePinghuWuziZimo } from './score'
export { applyWinToLa, chopLa, settleAllLa, canChopLa } from './la'
export { createFullWall, parseTile, sortTiles, tileId, isFlower, isHonor } from './tiles'
export { dealWall, wallRemaining } from './wall'
export { makeMeld } from './meld'
export { DEFAULT_RULES } from './types'
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
  RoundResult,
  Seat,
  TableRules,
  TileId,
  WinResult,
} from './types'
