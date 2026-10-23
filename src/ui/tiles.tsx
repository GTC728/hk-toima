import { parseTile, type Meld, type TileId } from '../engine'

const PIN_DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[50, 28], [50, 72]],
  3: [[50, 22], [50, 50], [50, 78]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
  7: [[28, 18], [72, 18], [50, 38], [28, 55], [72, 55], [28, 80], [72, 80]],
  8: [
    [28, 18], [72, 18], [28, 40], [72, 40],
    [28, 60], [72, 60], [28, 82], [72, 82],
  ],
  9: [
    [25, 18], [50, 18], [75, 18],
    [25, 50], [50, 50], [75, 50],
    [25, 82], [50, 82], [75, 82],
  ],
}

export type TileSize = 'sm' | 'md' | 'lg'

interface TileProps {
  id: TileId
  size?: TileSize
  selected?: boolean
  dimmed?: boolean
  justDrawn?: boolean
  /** 練習模式建議棄牌高亮 */
  hinted?: boolean
  onClick?: () => void
  onDoubleClick?: () => void
  faceDown?: boolean
  className?: string
}

function tileFace(id: TileId, faceDown?: boolean) {
  const info = faceDown ? null : parseTile(id)
  if (faceDown || !info) {
    return <span className="tile__back-pattern" />
  }
  if (info.suit === 'pin') {
    return (
      <span className="tile__pin" aria-hidden>
        {(PIN_DOTS[info.rank] ?? []).map(([x, y], i) => (
          <span
            key={i}
            className={`tile__dot ${info.rank === 1 ? 'tile__dot--big' : ''} ${
              info.rank === 5 && i === 2 ? 'tile__dot--red' : ''
            }`}
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        ))}
      </span>
    )
  }
  if (info.suit === 'sou') {
    return (
      <span className="tile__sou">
        <span className="tile__sou-rank">{info.rank}</span>
        <span className="tile__sou-glyph">〆</span>
      </span>
    )
  }
  return <span className="tile__label">{info.label}</span>
}

export function Tile({
  id,
  size = 'md',
  selected,
  dimmed,
  justDrawn,
  hinted,
  onClick,
  onDoubleClick,
  faceDown,
  className = '',
}: TileProps) {
  const info = faceDown ? null : parseTile(id)
  const suitClass = info ? `tile--${info.suit}` : 'tile--back'
  const interactive = Boolean(onClick || onDoubleClick)
  const classNames = [
    'tile',
    `tile--${size}`,
    suitClass,
    selected ? 'tile--selected' : '',
    dimmed ? 'tile--dimmed' : '',
    justDrawn ? 'tile--drawn' : '',
    hinted ? 'tile--hint' : '',
    interactive ? 'tile--clickable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // 對手牌背用 span，避免几十個 disabled button 塞爆無障礙樹
  if (faceDown && !interactive) {
    return (
      <span className={classNames} aria-hidden>
        {tileFace(id, true)}
      </span>
    )
  }

  return (
    <button
      type="button"
      className={classNames}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      disabled={!interactive}
      aria-label={faceDown ? '牌背' : (info?.label ?? id)}
    >
      {tileFace(id, faceDown)}
    </button>
  )
}

interface TileRowProps {
  tiles: TileId[]
  size?: TileSize
  selected?: TileId | null
  justDrawn?: TileId | null
  /** 高亮建議棄牌（只標第一張匹配） */
  hinted?: TileId | null
  selectable?: boolean
  onSelect?: (tile: TileId) => void
  /** 雙擊即打牌（由 TableView 決定是否合法） */
  onDoubleSelect?: (tile: TileId) => void
  faceDown?: boolean
  className?: string
}

export function TileRow({
  tiles,
  size = 'md',
  selected,
  justDrawn,
  hinted,
  selectable,
  onSelect,
  onDoubleSelect,
  faceDown,
  className = '',
}: TileRowProps) {
  const hintIndex =
    hinted != null ? tiles.findIndex((t) => t === hinted) : -1
  return (
    <div className={`tile-row ${className}`}>
      {tiles.map((id, i) => (
        <Tile
          key={`${id}-${i}`}
          id={id}
          size={size}
          selected={selected === id}
          justDrawn={justDrawn === id && i === tiles.lastIndexOf(id)}
          hinted={hintIndex === i}
          faceDown={faceDown}
          onClick={selectable && onSelect ? () => onSelect(id) : undefined}
          onDoubleClick={
            selectable && onDoubleSelect
              ? () => onDoubleSelect(id)
              : undefined
          }
        />
      ))}
    </div>
  )
}

const MELD_LABEL: Record<string, string> = {
  chi: '上',
  pong: '碰',
  mingkong: '明槓',
  ankong: '暗槓',
  jiagang: '加槓',
}

export function MeldGroup({ melds, size = 'sm' }: { melds: Meld[]; size?: TileSize }) {
  if (melds.length === 0) return null
  return (
    <div className="meld-group">
      {melds.map((m, i) => (
        <div key={i} className="meld" title={MELD_LABEL[m.kind] ?? m.kind}>
          {m.kind === 'ankong'
            ? m.tiles.map((t, j) => (
                <Tile key={j} id={t} size={size} faceDown={j < 3} />
              ))
            : m.tiles.map((t, j) => <Tile key={j} id={t} size={size} />)}
        </div>
      ))}
    </div>
  )
}

export function FaceDownHand({ count, size = 'sm' }: { count: number; size?: TileSize }) {
  return (
    <div
      className="tile-row tile-row--compact"
      aria-label={`對手手牌 ${count} 張`}
    >
      {Array.from({ length: count }, (_, i) => (
        <Tile key={i} id={'man-1' as TileId} size={size} faceDown />
      ))}
    </div>
  )
}
