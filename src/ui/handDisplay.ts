import { sortTiles, type TileId } from '../engine'

/**
 * 顯示用手牌：其餘順位，最新摸入置最右（唔跟排序入中間）。
 */
export function handForDisplay(
  hand: TileId[],
  justDrawn: TileId | null | undefined,
): TileId[] {
  if (!justDrawn) return sortTiles(hand)
  const rest = [...hand]
  const idx = rest.lastIndexOf(justDrawn)
  if (idx >= 0) rest.splice(idx, 1)
  return [...sortTiles(rest), justDrawn]
}
