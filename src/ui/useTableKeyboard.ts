import { useEffect } from 'react'
import type { Action, TileId } from '../engine'

/** 牌局熱鍵；輸入框聚焦時唔攔截 */
export function useTableKeyboard(opts: {
  enabled: boolean
  selectedTile: TileId | null
  legal: Action[]
  declareDing: boolean
  onSelectTile: (tile: TileId | null) => void
  onToggleDing: () => void
  onAction: (action: Action) => void
}) {
  const {
    enabled,
    selectedTile,
    legal,
    declareDing,
    onSelectTile,
    onToggleDing,
    onAction,
  } = opts

  useEffect(() => {
    if (!enabled) return

    function onKey(e: KeyboardEvent) {
      const t = e.target
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      ) {
        return
      }

      const key = e.key
      if (key === 'Escape') {
        if (selectedTile != null) {
          e.preventDefault()
          onSelectTile(null)
        }
        return
      }

      if (key === 'Enter') {
        if (selectedTile == null) return
        const discard = legal.find(
          (a) => a.type === 'discard' && a.tile === selectedTile,
        )
        if (!discard || discard.type !== 'discard') return
        e.preventDefault()
        onAction({
          type: 'discard',
          tile: selectedTile,
          declareDing: declareDing || undefined,
        })
        return
      }

      if (key === ' ' || key === 'Spacebar') {
        const pass = legal.find((a) => a.type === 'pass')
        const draw = legal.find((a) => a.type === 'draw')
        if (pass) {
          e.preventDefault()
          onAction(pass)
          return
        }
        if (draw) {
          e.preventDefault()
          onAction(draw)
        }
        return
      }

      const lower = key.length === 1 ? key.toLowerCase() : key
      if (lower === 'd') {
        if (legal.some((a) => a.type === 'declareDing' || a.type === 'discard')) {
          e.preventDefault()
          onToggleDing()
        }
        return
      }
      if (lower === 'p') {
        const pong = legal.find((a) => a.type === 'pong')
        if (pong) {
          e.preventDefault()
          onAction(pong)
        }
        return
      }
      if (lower === 'c') {
        const chi = legal.find((a) => a.type === 'chi')
        if (chi) {
          e.preventDefault()
          onAction(chi)
        }
        return
      }
      if (lower === 'k') {
        const kong =
          legal.find((a) => a.type === 'mingkong') ??
          legal.find((a) => a.type === 'ankong') ??
          legal.find((a) => a.type === 'jiagang')
        if (kong) {
          e.preventDefault()
          onAction(kong)
        }
        return
      }
      if (lower === 'h') {
        const win = legal.find((a) => a.type === 'win')
        if (win) {
          e.preventDefault()
          onAction(win)
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    enabled,
    selectedTile,
    legal,
    declareDing,
    onSelectTile,
    onToggleDing,
    onAction,
  ])
}
