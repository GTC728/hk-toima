import { useEffect, useMemo, useState } from 'react'
import type { PrivateGameView, TileId } from '../engine'
import {
  arrangeHand,
  loadArrangeMode,
  moveTile,
  reconcileOrder,
  saveArrangeMode,
  type ArrangeInput,
  type ArrangeMode,
} from './handArrange'

export function useHandArrange(view: PrivateGameView) {
  const [mode, setMode] = useState<ArrangeMode>(loadArrangeMode)
  const [manual, setManual] = useState<TileId[] | null>(null)

  const tiles = useMemo(() => {
    if (manual) return reconcileOrder(manual, view.hand, view.justDrawn)
    return arrangeHand(mode, inputFrom(view))
  }, [manual, mode, view])

  useEffect(() => {
    if (!manual) return
    const next = reconcileOrder(manual, view.hand, view.justDrawn)
    if (sameOrder(next, manual)) return
    setManual(next)
  }, [manual, view])

  function choose(next: ArrangeMode) {
    setMode(next)
    setManual(null)
    saveArrangeMode(next)
  }

  function reorder(from: number, to: number) {
    setManual(moveTile(tiles, from, to))
  }

  return { mode, manual: manual != null, tiles, choose, reorder }
}

function sameOrder(a: TileId[], b: TileId[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i])
}

function inputFrom(view: PrivateGameView): ArrangeInput {
  const discards: TileId[] = []
  const seen: TileId[] = []
  for (const player of view.players) {
    discards.push(...player.discards)
    seen.push(...player.discards)
    for (const meld of player.melds) seen.push(...meld.tiles)
  }
  if (view.pendingDiscard) {
    discards.push(view.pendingDiscard.tile)
    seen.push(view.pendingDiscard.tile)
  }
  return {
    hand: view.hand,
    justDrawn: view.justDrawn,
    discards,
    seen,
    passedPong: view.passedPong,
    melds: view.players[view.you]?.melds,
  }
}
