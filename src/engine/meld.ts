import type { Meld, MeldKind, Seat, TileId } from './types'
import { sortTiles } from './tiles'

export function makeMeld(
  kind: MeldKind,
  tiles: TileId[],
  fromSeat?: Seat,
  claimedTile?: TileId,
): Meld {
  return {
    kind,
    tiles: kind === 'chi' ? sortTiles(tiles) : tiles,
    fromSeat,
    claimedTile,
  }
}

export function isExposedMeld(m: Meld): boolean {
  return m.kind !== 'ankong'
}

export function breaksMenqing(m: Meld): boolean {
  return m.kind === 'chi' || m.kind === 'pong' || m.kind === 'mingkong' || m.kind === 'jiagang'
}
