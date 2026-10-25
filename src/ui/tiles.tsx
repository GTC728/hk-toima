import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { parseTile, type Meld, type TileId } from '../engine'
import { loadLongPressClear } from './leftoverPrefs'
import {
  getTileSkin,
  getTileSkinOption,
  subscribeTileSkin,
  type TileSkinId,
} from './tileSkin'

/** 牌面圖：public/tiles。萬筒索風三元為 CC0；花牌為 CC BY-SA，見 CREDITS.txt */
const TILE_FILE: Record<string, string> = {
  'man-1': 'Man1.png',
  'man-2': 'Man2.png',
  'man-3': 'Man3.png',
  'man-4': 'Man4.png',
  'man-5': 'Man5.png',
  'man-6': 'Man6.png',
  'man-7': 'Man7.png',
  'man-8': 'Man8.png',
  'man-9': 'Man9.png',
  'pin-1': 'Pin1.png',
  'pin-2': 'Pin2.png',
  'pin-3': 'Pin3.png',
  'pin-4': 'Pin4.png',
  'pin-5': 'Pin5.png',
  'pin-6': 'Pin6.png',
  'pin-7': 'Pin7.png',
  'pin-8': 'Pin8.png',
  'pin-9': 'Pin9.png',
  'sou-1': 'Sou1.png',
  'sou-2': 'Sou2.png',
  'sou-3': 'Sou3.png',
  'sou-4': 'Sou4.png',
  'sou-5': 'Sou5.png',
  'sou-6': 'Sou6.png',
  'sou-7': 'Sou7.png',
  'sou-8': 'Sou8.png',
  'sou-9': 'Sou9.png',
  'wind-east': 'Ton.png',
  'wind-south': 'Nan.png',
  'wind-west': 'Shaa.png',
  'wind-north': 'Pei.png',
  'dragon-zhong': 'Chun.png',
  'dragon-fa': 'Hatsu.png',
  'dragon-bai': 'Haku.png',
  'flower-spring': 'spring.svg',
  'flower-summer': 'summer.svg',
  'flower-autumn': 'autumn.svg',
  'flower-winter': 'winter.svg',
  'flower-plum': 'plum.svg',
  'flower-orchid': 'orchid.svg',
  'flower-chrysanthemum': 'chrysanthemum.svg',
  'flower-bamboo': 'bamboo.png',
}

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

function tileArt(folder: string, file: string) {
  return `${import.meta.env.BASE_URL}tiles/${folder}/${file}`
}

function useTileSkin() {
  return useSyncExternalStore(subscribeTileSkin, getTileSkin)
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
  /** 長按（約 450ms）取消揀牌 */
  onLongPress?: () => void
  faceDown?: boolean
  /** 設定頁預覽用；唔傳就跟已揀嘅牌面 */
  skin?: TileSkinId
  className?: string
}

function lineFace(id: TileId, faceDown?: boolean) {
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

function artFile(id: TileId, faceExt: 'svg' | 'png') {
  const file = TILE_FILE[id]
  if (!file) return null
  if (faceExt === 'svg') return file.replace(/\.(png|svg)$/, '.svg')
  return file
}

function tileFace(id: TileId, skin: TileSkinId, faceDown?: boolean) {
  const opt = getTileSkinOption(skin)
  const render = opt.render
  if (render.mode === 'line') return lineFace(id, faceDown)

  const bodyFile = `Front.${render.bodyExt}`
  const backFile = `Back.${render.bodyExt}`
  const filterStyle = render.filter
    ? ({ filter: render.filter } as const)
    : undefined

  if (faceDown) {
    const backFolder =
      render.singleImage && render.body === 'relief'
        ? 'relief'
        : render.body
    return (
      <img
        className="tile__img"
        src={tileArt(backFolder, backFile)}
        alt=""
        draggable={false}
        style={filterStyle}
      />
    )
  }

  const file = artFile(id, render.faceExt)
  if (!file) return null

  const svgRegional =
    render.faceExt === 'svg' &&
    (render.faces === 'hk' ||
      render.faces === 'taiwan' ||
      render.faces === 'malaysia' ||
      render.faces === 'vietnam')

  if (
    render.singleImage ||
    (id.startsWith('flower-') && !svgRegional)
  ) {
    const folder = id.startsWith('flower-') ? 'flowers' : render.faces
    return (
      <img
        className="tile__img"
        src={tileArt(folder, file)}
        alt=""
        draggable={false}
        style={filterStyle}
      />
    )
  }

  return (
    <span className="tile__stack" style={filterStyle}>
      <img
        className="tile__img tile__img--body"
        src={tileArt(render.body, bodyFile)}
        alt=""
        draggable={false}
      />
      <img
        className="tile__img tile__img--face"
        src={tileArt(render.faces, file)}
        alt=""
        draggable={false}
      />
    </span>
  )
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
  onLongPress,
  faceDown,
  skin,
  className = '',
}: TileProps) {
  const storedSkin = useTileSkin()
  const activeSkin = skin ?? storedSkin
  const holdRef = useRef<number | null>(null)
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
  const interactive = Boolean(onClick || onDoubleClick || onLongPress)
  function clearHold() {
    if (holdRef.current != null) {
      window.clearTimeout(holdRef.current)
      holdRef.current = null
    }
  }
  function startHold() {
    if (!onLongPress) return
    clearHold()
    holdRef.current = window.setTimeout(() => {
      holdRef.current = null
      onLongPress()
    }, 450)
  }
  const numbered =
    info &&
    (info.suit === 'man' || info.suit === 'pin' || info.suit === 'sou')
      ? info.rank
      : undefined
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
    getTileSkinOption(activeSkin).render.mode === 'line'
      ? 'tile--line'
      : '',
    `tile-skin--${activeSkin}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const rankAttr =
    numbered != null ? ({ 'data-rank': String(numbered) } as const) : {}

  // 展示用／牌背用 span，避免几十個 disabled button 塞爆無障礙樹
  if (!interactive) {
    return (
      <span className={classNames} aria-hidden {...rankAttr}>
        {tileFace(id, activeSkin, faceDown)}
      </span>
    )
  }

  return (
    <button
      type="button"
      className={classNames}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onPointerDown={onLongPress ? startHold : undefined}
      onPointerUp={onLongPress ? clearHold : undefined}
      onPointerLeave={onLongPress ? clearHold : undefined}
      onPointerCancel={onLongPress ? clearHold : undefined}
      aria-label={
        faceDown
          ? '牌背'
          : typeof document !== 'undefined' &&
              document.documentElement.dataset.ariaTile === 'suit-rank'
            ? id
            : (info?.label ?? id)
      }
      {...rankAttr}
    >
      {tileFace(id, activeSkin, faceDown)}
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
  /** 長按取消揀牌 */
  onClearSelect?: () => void
  /** 拖曳改顯示次序。from、to 都係而家呢排的位置。 */
  onReorder?: (from: number, to: number) => void
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
  onClearSelect,
  onReorder,
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
  const rowRef = useRef<HTMLDivElement>(null)
  const stopDrag = useRef<(() => void) | null>(null)
  const suppressClick = useRef(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const sortable = Boolean(onReorder) && layout === 'row' && !face

  useEffect(() => () => stopDrag.current?.(), [])

  function indexAt(clientX: number): number {
    const row = rowRef.current
    if (!row) return 0
    const slots = [...row.querySelectorAll<HTMLElement>(':scope > .tile-slot')]
    let best = 0
    let bestDist = Infinity
    slots.forEach((el, k) => {
      const rect = el.getBoundingClientRect()
      const dist = Math.abs(clientX - (rect.left + rect.width / 2))
      if (dist < bestDist) {
        bestDist = dist
        best = k
      }
    })
    return best
  }

  function onSlotPointerDown(event: ReactPointerEvent, index: number) {
    if (!onReorder || event.button !== 0) return
    stopDrag.current?.()
    const startX = event.clientX
    const startY = event.clientY
    let active = false
    let over = index
    const move = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 8) return
      if (!active) {
        active = true
        suppressClick.current = true
        setDragIndex(index)
      }
      over = indexAt(ev.clientX)
      setOverIndex(over)
    }
    const up = () => {
      stop()
      if (active && over !== index) onReorder(index, over)
      setDragIndex(null)
      setOverIndex(null)
      window.setTimeout(() => {
        suppressClick.current = false
      }, 0)
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      stopDrag.current = null
    }
    stopDrag.current = stop
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  return (
    <div
      ref={rowRef}
      className={`tile-row${layout === 'col' ? ' tile-row--col' : ''}${
        sortable ? ' tile-row--sortable' : ''
      } ${className}`}
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
          justDrawn: isDrawn && i === tiles.length - 1,
          hinted: hintIndex === i,
          faceDown,
          className: [
            isDrawn && i === tiles.length - 1 ? 'tile--drawn-slot' : '',
            selectedFlags?.[i] ? 'tile--focus' : '',
          ]
            .filter(Boolean)
            .join(' '),
          onClick:
            selectable && onSelect
              ? () => {
                  if (suppressClick.current) return
                  onSelect(id)
                }
              : undefined,
          onDoubleClick:
            selectable && onDoubleSelect
              ? () => {
                  if (suppressClick.current) return
                  onDoubleSelect(id)
                }
              : undefined,
          onLongPress:
            selectable && onClearSelect && loadLongPressClear()
              ? onClearSelect
              : undefined,
        }
        if (!face && !sortable) return <Tile key={`${id}-${i}`} {...tileProps} />
        const tile = <Tile {...tileProps} />
        if (!face && sortable) {
          const slotClass = [
            'tile-slot',
            dragIndex === i ? 'tile-slot--lift' : '',
            overIndex === i && dragIndex !== i ? 'tile-slot--target' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <span
              key={`${id}-${i}`}
              className={slotClass}
              onPointerDown={(event) => onSlotPointerDown(event, i)}
            >
              {tile}
            </span>
          )
        }
        return (
          <span key={`${id}-${i}`} className={faceClass.trim()}>
            {tile}
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
  caption = false,
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
  /** 結算：牌底標上／碰／槓，唔好用色塊墊高 */
  caption?: boolean
}) {
  if (melds.length === 0) return null
  return (
    <div className={`meld-group${face ? ` meld-group--face-${face}` : ''}`}>
      {melds.map((m, i) => {
        const nodes =
          m.kind === 'ankong'
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
              )
        const label = MELD_LABEL[m.kind] ?? m.kind
        return (
          <div
            key={i}
            className={`meld${caption ? ' meld--cap' : ''}`}
            title={label}
          >
            {caption ? <div className="meld__tiles">{nodes}</div> : nodes}
            {caption ? <span className="meld__caption">{label}</span> : null}
          </div>
        )
      })}
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
