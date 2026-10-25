import type { PublicPlayerView, Seat, TileId } from '../../engine'
import { loadAiLabels, loadNameDensity, loadWindLabelStyle } from '../leftoverPrefs'
import { MeldGroup, TileRow } from '../tiles'

export const WIND = ['東', '南', '西', '北'] as const
const WIND_SHORT = ['東', '南', '西', '北'] as const

export type Slot = 'bottom' | 'right' | 'top' | 'left'

export function SeatMeta({
  seat,
  p,
  isHuman,
  personaLabel,
}: {
  seat: Seat
  p: PublicPlayerView
  isHuman: boolean
  personaLabel?: string | null
}) {
  const windStyle = loadWindLabelStyle()
  const dens = loadNameDensity()
  const wind =
    windStyle === 'off' ? '' : windStyle === 'short' ? WIND_SHORT[seat] : WIND[seat]
  const name =
    dens === 'compact' && p.name.length > 4 ? `${p.name.slice(0, 4)}…` : p.name
  const showPersona = loadAiLabels() && personaLabel
  return (
    <div className="table__seat-meta">
      <strong>
        {wind ? `${wind} · ` : ''}
        {name}
        {showPersona ? ` · ${personaLabel}` : ''}
      </strong>
      <span className="table__seat-tags">
        {p.isDealer && <em>莊</em>}
        {p.ding && <em className="tag-ding">叮</em>}
        {!isHuman && <em className="tag-ai">AI</em>}
        <em className="tag-cash">${p.cash}</em>
      </span>
    </div>
  )
}

export function MeldsBlock({
  p,
  slot,
  isYou,
  selectedTile,
  onSelectTile,
}: {
  p: PublicPlayerView
  slot: Slot
  isYou: boolean
  selectedTile: TileId | null
  onSelectTile: (t: TileId | null) => void
}) {
  if (p.melds.length === 0 && p.flowers.length === 0) return null
  const side = slot === 'left' || slot === 'right'
  const face = side ? slot : undefined
  return (
    <div
      className={
        side
          ? 'table__melds table__melds--side'
          : `table__melds table__orient table__orient--${slot}`
      }
    >
      <MeldGroup
        melds={p.melds}
        size="sm"
        face={face}
        selected={selectedTile}
        onSelect={
          isYou
            ? (t) => onSelectTile(selectedTile === t ? null : t)
            : undefined
        }
      />
      {p.flowers.length > 0 && (
        <TileRow
          tiles={p.flowers}
          size="sm"
          layout={side ? 'col' : 'row'}
          face={face}
          className="table__flowers table__flowers--pref"
          selected={selectedTile}
          selectable={isYou}
          onClearSelect={isYou ? () => onSelectTile(null) : undefined}
          onSelect={
            isYou
              ? (t) => onSelectTile(selectedTile === t ? null : t)
              : undefined
          }
        />
      )}
    </div>
  )
}
