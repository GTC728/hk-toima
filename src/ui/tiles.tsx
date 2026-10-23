import type { ReactNode } from 'react'
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
  const flowerTone =
    info?.suit === 'flower'
      ? info.rank < 4
        ? 'tile--flower-green'
        : 'tile--flower-red'
      : ''
  const dragonTone =
    info?.suit === 'dragon'
      ? info.rank === 0
        ? 'tile--dragon-zhong'
        : info.rank === 1
          ? 'tile--dragon-fa'
          : 'tile--dragon-bai'
      : ''
  const interactive = Boolean(onClick || onDoubleClick)
  const classNames = [
    'tile',
    `tile--${size}`,
    suitClass,
    flowerTone,
    dragonTone,
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
  /** 多張高亮（同款全亮）；優先於 selected */
  selectedSet?: ReadonlySet<TileId> | null
  /** 帶張數高亮（結算番種）；優先於 selectedSet */
  selectedFlags?: boolean[] | null
  justDrawn?: TileId | null
  /** 高亮建議棄牌（只標第一張匹配） */
  hinted?: TileId | null
  selectable?: boolean
  onSelect?: (tile: TileId) => void
  /** 雙擊即打牌（由 TableView 決定是否合法） */
  onDoubleSelect?: (tile: TileId) => void
  faceDown?: boolean
  /** 左右座位用直排 */
  layout?: 'row' | 'col'
  /**
   * 牌底指向座位、牌頂向中控：
   * left → rotate(90°)；right → rotate(-90°)
   */
  face?: 'left' | 'right'
  className?: string
}

export function TileRow({
  tiles,
  size = 'md',
  selected,
  selectedSet,
  selectedFlags,
  justDrawn,
  hinted,
  selectable,
  onSelect,
  onDoubleSelect,
  faceDown,
  layout = 'row',
  face,
  className = '',
}: TileRowProps) {
  const hintIndex =
    hinted != null ? tiles.findIndex((t) => t === hinted) : -1
  const drawnIndex =
    justDrawn != null ? tiles.lastIndexOf(justDrawn) : -1
  const faceClass = face
    ? ` tile-face tile-face--${face} tile-face--${size}`
    : ''
  return (
    <div
      className={`tile-row${layout === 'col' ? ' tile-row--col' : ''} ${className}`}
    >
      {tiles.map((id, i) => {
        const isDrawn = drawnIndex === i
        const isSelected = selectedFlags
          ? Boolean(selectedFlags[i])
          : selectedSet
            ? selectedSet.has(id)
            : selected != null && selected === id
        const dimOthers =
          selectable &&
          selected != null &&
          !selectedSet &&
          !selectedFlags &&
          selected !== id
        const tileProps = {
          id,
          size,
          selected: isSelected,
          dimmed: dimOthers,
          justDrawn: isDrawn,
          hinted: hintIndex === i,
          faceDown,
          className: isDrawn ? 'tile--drawn-slot' : '',
          onClick: selectable && onSelect ? () => onSelect(id) : undefined,
          onDoubleClick:
            selectable && onDoubleSelect
              ? () => onDoubleSelect(id)
              : undefined,
        }
        if (!face) return <Tile key={`${id}-${i}`} {...tileProps} />
        return (
          <span key={`${id}-${i}`} className={faceClass.trim()}>
            <Tile {...tileProps} />
          </span>
        )
      })}
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

function faceWrap(
  face: 'left' | 'right' | undefined,
  size: TileSize,
  key: string | number,
  node: ReactNode,
) {
  if (!face) return <span key={key}>{node}</span>
  return (
    <span
      key={key}
      className={`tile-face tile-face--${face} tile-face--${size}`}
    >
      {node}
    </span>
  )
}

export function MeldGroup({
  melds,
  size = 'sm',
  selected,
  selectedFlagsByMeld,
  onSelect,
  face,
}: {
  melds: Meld[]
  size?: TileSize
  /** 同款全亮（牌桌選牌） */
  selected?: TileId | null
  /** 結算番種：每組副露嘅逐張 flags */
  selectedFlagsByMeld?: boolean[][] | null
  /** 撳副露牌 → 全枱同款高亮 */
  onSelect?: (tile: TileId) => void
  face?: 'left' | 'right'
}) {
  if (melds.length === 0) return null
  return (
    <div className={`meld-group${face ? ` meld-group--face-${face}` : ''}`}>
      {melds.map((m, i) => (
        <div key={i} className="meld" title={MELD_LABEL[m.kind] ?? m.kind}>
          {m.kind === 'ankong'
            ? m.tiles.map((t, j) =>
                faceWrap(
                  face,
                  size,
                  j,
                  <Tile
                    id={t}
                    size={size}
                    faceDown={j < 3}
                    selected={
                      selectedFlagsByMeld
                        ? Boolean(selectedFlagsByMeld[i]?.[j])
                        : selected != null && selected === t
                    }
                    onClick={
                      onSelect && j === 3 ? () => onSelect(t) : undefined
                    }
                  />,
                ),
              )
            : m.tiles.map((t, j) =>
                faceWrap(
                  face,
                  size,
                  j,
                  <Tile
                    id={t}
                    size={size}
                    selected={
                      selectedFlagsByMeld
                        ? Boolean(selectedFlagsByMeld[i]?.[j])
                        : selected != null && selected === t
                    }
                    onClick={onSelect ? () => onSelect(t) : undefined}
                  />,
                ),
              )}
        </div>
      ))}
    </div>
  )
}

export function FaceDownHand({
  count,
  size = 'sm',
  layout = 'row',
  face,
}: {
  count: number
  size?: TileSize
  layout?: 'row' | 'col'
  face?: 'left' | 'right'
}) {
  return (
    <div
      className={`tile-row tile-row--compact${
        layout === 'col' ? ' tile-row--col' : ''
      }`}
      aria-label={`對手手牌 ${count} 張`}
    >
      {Array.from({ length: count }, (_, i) =>
        faceWrap(
          face,
          size,
          i,
          <Tile id={'man-1' as TileId} size={size} faceDown />,
        ),
      )}
    </div>
  )
}
