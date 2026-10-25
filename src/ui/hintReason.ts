import { parseTile, type TileId } from '../engine'
import { tileKeepSafetyAdjust } from '../engine/ai/safety'
import { tileShapeKeep } from '../engine/ai/shape'
import { loadHintDetail } from './leftoverPrefs'

function copies(hand: TileId[], tile: TileId): number {
  return hand.filter((id) => id === tile).length
}

/** 練習提示為什麼建議打這張。留低分愈低愈適合打。 */
export function hintReasons(
  hand: TileId[],
  tile: TileId,
  visible: Map<TileId, number>,
): string[] {
  const info = parseTile(tile)
  const n = copies(hand, tile)
  const lines = [`建議打 ${info.label}`]
  if (n >= 3) lines.push('手上有三張或以上')
  else if (n === 2) lines.push('手上有一對')
  else lines.push('手上只得一張')

  if (info.suit === 'man' || info.suit === 'pin' || info.suit === 'sou') {
    const has = (rank: number) =>
      rank >= 1 && rank <= 9 && copies(hand, `${info.suit}-${rank}`) > 0
    const side = has(info.rank - 1) || has(info.rank + 1)
    const gap = has(info.rank - 2) || has(info.rank + 2)
    if (has(info.rank - 1) && has(info.rank + 1)) lines.push('左右都有鄰張')
    else if (side) lines.push('有一側鄰張')
    else if (gap) lines.push('只有隔張')
    else lines.push('無鄰張，搭子少')
    if (info.rank === 1 || info.rank === 9) lines.push('邊張')
  } else if (info.suit === 'wind' || info.suit === 'dragon') {
    lines.push(n >= 2 ? '字牌有對' : '單張字牌')
  }

  const seen = visible.get(tile) ?? 0
  lines.push(seen > 0 ? `外面已見過 ${seen} 張` : '外面未見過')
  const keep = tileShapeKeep(tile, hand) + tileKeepSafetyAdjust(tile, hand, visible)
  lines.push(`留低分 ${keep}。可打的牌裡面，愈低愈建議打`)
  const detail = loadHintDetail()
  if (detail === 'low') return lines.slice(0, 2)
  if (detail === 'med') return lines.slice(0, 4)
  return lines
}
