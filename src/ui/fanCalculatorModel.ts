import type { FanHit, TileId } from '../engine'
import { concealedForWin } from './settlementHighlight'

export type CalcWinType = 'tsumo' | 'ron' | 'chankan'

/**
 * 設／換糊：手牌唔變（唔准偷走手牌入面同一張）。
 * 回傳新嘅 winTile；caller 只 setWinTile。
 */
export function pickCalcWinTile(nextWin: TileId): TileId {
  return nextWin
}

/**
 * 清糊：唔把手牌改動、唔「放回」（因為設糊時從來冇抽出）。
 */
export function clearCalcWinTile(): null {
  return null
}

/**
 * 計番用暗牌。
 * - 正常計番機用法：手 16 + 糊 1 → 直接用 hand（就算手牌有同款都唔抽）
 * - 只有手牌已經 17 張（自摸摸入後）而且含糊牌 → 抽出一隻避免 18 張假糊
 */
export function calcScoreHand(
  hand: TileId[],
  winTile: TileId,
  winType: CalcWinType,
): TileId[] {
  if (
    winType === 'tsumo' &&
    hand.length === 17 &&
    hand.includes(winTile)
  ) {
    return concealedForWin(hand, winTile, 'tsumo')
  }
  return hand
}

/** 有冇牌型番（唔計底）。未成糊時應顯示「未成糊」，唔好當 底=成功。 */
export function calcHasWinningPattern(patternFans: FanHit[]): boolean {
  return patternFans.some((f) => f.id !== 'di')
}

/** 合計顯示用：有成糊先加底；否則空（UI 顯示未成糊） */
export function calcDisplayFans(
  patternFans: FanHit[],
  base: number,
): FanHit[] | null {
  if (!calcHasWinningPattern(patternFans)) return null
  return [
    { id: 'di', name: '底', value: Math.max(0, base) },
    ...patternFans,
  ]
}

/** 張數文案：同畫面手／糊位一致；唔暗示未成型都算糊 */
export function calcTileCountLabel(
  handLen: number,
  hasWin: boolean,
  exposedMeldCount: number,
): string {
  if (!hasWin) {
    return exposedMeldCount > 0
      ? `手 ${handLen} 張 · 鳴 ${exposedMeldCount} 組`
      : `手 ${handLen} 張（未設糊）`
  }
  const total = handLen + 1
  const need = Math.max(0, 5 - exposedMeldCount) * 3 + 2
  if (exposedMeldCount > 0) {
    return `手 ${handLen} + 糊 1 ＝ ${total}（連副露暗牌要 ${need}）`
  }
  if (total === 17) return `手 ${handLen} + 糊 1 ＝ 17`
  return `手 ${handLen} + 糊 1 ＝ ${total}（門清要 17，而家未夠／多咗）`
}
