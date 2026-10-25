import type { PublicPlayerView, Seat, TileId } from '../../engine'
import { FaceDownHand, Tile } from '../tiles'
import { MeldsBlock, SeatMeta } from './parts'

function OpenColHand({
  tiles,
  face,
}: {
  tiles: TileId[]
  face: 'left' | 'right'
}) {
  return (
    <div
      className={`table__side-open table__side-open--${face}`}
      aria-label="手牌"
    >
      {tiles.map((t, i) => (
        <Tile key={`${t}-${i}`} id={t} size="sm" />
      ))}
    </div>
  )
}

export function SideSeat({
  slot,
  seat,
  p,
  isHuman,
  isTurn,
  selectedTile,
  onSelectTile,
  personaLabel,
  openHand,
}: {
  slot: 'left' | 'right'
  seat: Seat
  p: PublicPlayerView
  isHuman: boolean
  isTurn: boolean
  selectedTile: TileId | null
  onSelectTile: (t: TileId | null) => void
  personaLabel?: string | null
  /** 重溫：攤開手牌 */
  openHand?: TileId[] | null
}) {
  const hand =
    openHand != null ? (
      <OpenColHand tiles={openHand} face={slot} />
    ) : (
      <FaceDownHand
        count={p.handCount}
        size="sm"
        layout="col"
        face={slot}
      />
    )

  return (
    <section
      className={`table__edge table__edge--${slot}${isTurn ? ' is-turn' : ''}`}
    >
      <SeatMeta seat={seat} p={p} isHuman={isHuman} personaLabel={personaLabel} />
      <div className="table__side-fit">
        <div
          className={`table__side-stack${
            slot === 'right' ? ' table__side-stack--right' : ''
          }`}
        >
          {slot === 'left' ? (
            <>
              <div className="table__side-hand">{hand}</div>
              <MeldsBlock
                p={p}
                slot="left"
                isYou={false}
                selectedTile={selectedTile}
                onSelectTile={onSelectTile}
              />
            </>
          ) : (
            <>
              <MeldsBlock
                p={p}
                slot="right"
                isYou={false}
                selectedTile={selectedTile}
                onSelectTile={onSelectTile}
              />
              <div className="table__side-hand">{hand}</div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
