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
  afterPlayerAction,
  discardAndResolve,
  WIND_LABELS,
  windRoundLabel,
  dealerRoundLabel,
  matchRoundLabel,
  ZHENG_HUA,
  zhengHuaForSeat,
} from './game'
export {
  chooseAiAction,
  chooseDiscardTile,
  discardKeepScore,
  visibleTileCounts,
  AI_PERSONA_LABEL,
  AI_PERSONA_ORDER,
  defaultAiPersonas,
  displayPersonas,
  isAiPersona,
  nextAiPersona,
} from './ai'
export type { AiPersona } from './ai'
export { hintDiscard, getWaitingTiles, timeoutPlayAction } from './hints'
export {
  deadlineFromOpened,
  isExpired,
  remainingSec,
} from './turn-timer'
export { AI_DELAY_MS, aiThinkMs } from './timing'
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
export type { FanHit, FanShop } from './fan'
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
export {
  formatActionText,
  formatPly,
  gameRecordFromState,
  isHiddenPly,
  parseRecordKey,
  recordKey,
  tileLabel as recordTileLabel,
  visiblePlies,
  whoName as recordWhoName,
} from './game-record'
export type {
  FormatPlyOpts,
  GameRecord,
  GameRecordHeader,
  GameRecordPlayer,
  GameRecordSummary,
} from './game-record'
export { DEFAULT_RULES, DEFAULT_STARTING_CASH } from './types'
export {
  RANKED_AI_RATING,
  RANKED_DEFAULT,
  RANK_TIERS,
  applyRankedMatch,
  clampRating,
  emptyRanked,
  expectedScore,
  kFactor,
  placeScore,
  placesByCash,
  ratingDelta,
  ratingWindowMs,
  tierForRating,
} from './ranked'
export type { RankTier, RankTierId, RankedState } from './ranked'
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
