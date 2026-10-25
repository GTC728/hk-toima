import { useLayoutEffect, useRef, useState } from 'react'
import type { PublicPlayerView, TileId } from '../../engine'
import { TileRow } from '../tiles'
import { WIND, type Slot } from './parts'

/**
 * 四家牌河同一套排法：五行、左至右、上到下。
 * 上／左／右把整條河轉過去，唔再逐張轉。
 * 左右轉 90° 之後佔位同版面寬高對調，要用未轉前的高度撐開外框。
 */
export function RiverStrip({
  p,
  slot,
  selectedTile,
  isFocus,
  pendingTile = null,
}: {
  p: PublicPlayerView
  slot: Slot
  selectedTile: TileId | null
  isFocus: boolean
  /** 呢家剛打出、仲喺鳴牌窗嘅牌 → 顯示喺牌河並高亮 */
  pendingTile?: TileId | null
}) {
  const side = slot === 'left' || slot === 'right'
  const showPending = isFocus && pendingTile != null
  const tiles = showPending ? [...p.discards, pendingTile] : p.discards
  const highlightLast =
    typeof document !== 'undefined' &&
    document.documentElement.dataset.highlightLast !== '0'
  const showLegal =
    typeof document !== 'undefined' &&
    document.documentElement.dataset.showLegal !== '0'
  // 鳴牌窗目標（合法操作點）／上一手棄牌外框
  const highlightFlags =
    tiles.length === 0
      ? null
      : tiles.map((_, i) => {
          const last = i === tiles.length - 1
          if (showPending && last) return showLegal
          if (!showPending && highlightLast && last && p.discards.length > 0) return true
          return false
        })
  const focusFlags =
    highlightFlags && highlightFlags.some(Boolean) ? highlightFlags : null
  const rotRef = useRef<HTMLDivElement>(null)
  const [depth, setDepth] = useState(0)

  useLayoutEffect(() => {
    if (!side) return
    const el = rotRef.current
    if (!el) return
    const measure = () => {
      // offsetHeight 唔受 transform 影響，先至係未轉前的厚度
      const next = el.offsetHeight
      setDepth((prev) => (prev === next ? prev : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [side, tiles.length])

  return (
    <div
      className={`table__river-strip table__river-strip--${slot}`}
      style={side && depth > 0 ? { width: depth } : undefined}
      aria-label={`${WIND[p.seat]}牌河`}
    >
      <div
        ref={rotRef}
        className={`table__river-rot table__river-rot--${slot}${
          tiles.length > 0 ? ' is-filled' : ''
        }${isFocus ? ' is-focus' : ''}`}
        style={
          slot === 'left' && depth > 0
            ? { transform: `translateX(${depth}px) rotate(90deg)` }
            : undefined
        }
      >
        {tiles.length === 0 ? (
          <span className="table__river-empty">—</span>
        ) : (
          <TileRow
            tiles={tiles}
            size="sm"
            layout="row"
            className="table__river-tiles"
            selected={selectedTile}
            selectedFlags={focusFlags}
          />
        )}
      </div>
    </div>
  )
}
