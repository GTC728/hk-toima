import { useMemo, useState } from 'react'
import type { Seat, TileId } from '../engine'
import { Tile } from './tiles'
import {
  buildReplayFrames,
  type ReplayFrame,
  type ReplaySource,
} from './replaySource'

export type { ReplaySource } from './replaySource'

const WIND = ['東', '南', '西', '北'] as const

const KEY_ACTION_TYPES = new Set([
  'start',
  'chi',
  'pong',
  'mingkong',
  'ankong',
  'jiagang',
  'win',
  'declareDing',
])

interface ReplayProps {
  source: ReplaySource
  names: string[]
  onClose: () => void
}

export function Replay({ source, names, onClose }: ReplayProps) {
  const frames = useMemo(
    () => buildReplayFrames(source, names),
    [source, names],
  )
  const [idx, setIdx] = useState(0)
  const [keyOnly, setKeyOnly] = useState(false)

  const displayIndices = useMemo(() => {
    if (!keyOnly || frames.length === 0) {
      return frames.map((_, i) => i)
    }
    const last = frames.length - 1
    const picked: number[] = []
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i]!
      if (KEY_ACTION_TYPES.has(f.actionType) || i === 0 || i === last) {
        picked.push(i)
      }
    }
    return picked.length > 0 ? picked : [0]
  }, [frames, keyOnly])

  const posInDisplay = Math.max(
    0,
    displayIndices.findIndex((i) => i === idx),
  )
  const safeDisplayPos =
    posInDisplay >= 0
      ? posInDisplay
      : Math.min(
          displayIndices.length - 1,
          Math.max(
            0,
            displayIndices.findIndex((i) => i >= idx),
          ),
        )
  const safeIdx =
    displayIndices[safeDisplayPos] ??
    Math.min(idx, Math.max(0, frames.length - 1))
  const frame: ReplayFrame | undefined = frames[safeIdx]

  if (!frame) {
    return (
      <div className="replay" role="dialog" aria-label="重溫本局">
        <div className="replay__panel">
          <p>無動作可重溫</p>
          <button type="button" className="replay__btn" onClick={onClose}>
            關閉
          </button>
        </div>
      </div>
    )
  }

  const atStart = safeDisplayPos <= 0
  const atEnd = safeDisplayPos >= displayIndices.length - 1
  const last = safeIdx >= frames.length - 1
  const pub = frame.public

  function goRelative(delta: number) {
    const nextPos = Math.min(
      displayIndices.length - 1,
      Math.max(0, safeDisplayPos + delta),
    )
    setIdx(displayIndices[nextPos]!)
  }

  return (
    <div className="replay" role="dialog" aria-label="重溫本局">
      <div className="replay__panel">
        <header className="replay__header">
          <h2>重溫</h2>
          <p>
            {keyOnly ? '關鍵 ' : '步驟 '}
            {safeDisplayPos + 1}／{displayIndices.length}
            {!keyOnly ? `（全 ${frames.length}）` : ''}
            {frame.note ? ` · ${frame.note}` : ''}
            {frame.seat != null ? ` · ${WIND[frame.seat]}` : ''}
          </p>
        </header>

        <div className="replay__table">
          {pub.players.map((p) => (
            <div key={p.seat} className="replay__seat">
              <div className="replay__seat-head">
                <strong>
                  {WIND[p.seat as Seat]} · {names[p.seat] ?? p.name}
                </strong>
                <span>
                  {p.isDealer ? '莊 · ' : ''}
                  {last && frame.revealHands
                    ? `${frame.revealHands[p.seat]?.length ?? 0} 張`
                    : `手牌 ${p.handCount}`}
                </span>
              </div>
              {last && frame.revealHands ? (
                <div className="replay__hand">
                  {(frame.revealHands[p.seat] as TileId[] | undefined)?.map(
                    (t, i) => (
                      <Tile key={`${t}-${i}`} id={t} size="sm" />
                    ),
                  )}
                </div>
              ) : (
                <div className="replay__backs" aria-hidden>
                  {Array.from({ length: Math.min(p.handCount, 16) }, (_, i) => (
                    <span key={i} className="replay__back" />
                  ))}
                </div>
              )}
              {p.discards.length > 0 && (
                <div className="replay__discards">
                  {p.discards.slice(-8).map((t, i) => (
                    <Tile key={`${t}-${i}`} id={t} size="sm" dimmed />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="replay__meta">
          牆剩 {pub.wallRemaining} ·{' '}
          {pub.phase === 'claim_window'
            ? '鳴牌中'
            : pub.phase === 'round_over' || pub.phase === 'match_over'
              ? '結算'
              : `${WIND[pub.currentSeat]}家`}
        </p>

        <div className="replay__controls">
          <button
            type="button"
            className="replay__btn"
            disabled={atStart}
            onClick={() => goRelative(-1)}
          >
            上一步
          </button>
          <button
            type="button"
            className="replay__btn"
            disabled={atEnd}
            onClick={() => goRelative(1)}
          >
            下一步
          </button>
          <button
            type="button"
            className="replay__btn"
            disabled={atEnd}
            onClick={() => setIdx(displayIndices[displayIndices.length - 1]!)}
          >
            跳到尾
          </button>
          <button
            type="button"
            className={`replay__btn ${keyOnly ? 'replay__btn--armed' : 'replay__btn--ghost'}`}
            aria-pressed={keyOnly}
            onClick={() => {
              setKeyOnly((k) => {
                const next = !k
                if (next) {
                  // 切到關鍵模式時對齊到最近關鍵幀
                  const lastI = frames.length - 1
                  let best = 0
                  for (let i = 0; i < frames.length; i++) {
                    const f = frames[i]!
                    if (
                      KEY_ACTION_TYPES.has(f.actionType) ||
                      i === 0 ||
                      i === lastI
                    ) {
                      if (i <= idx) best = i
                    }
                  }
                  setIdx(best)
                }
                return next
              })
            }}
          >
            {keyOnly ? '關鍵節點' : '只睇鳴／食'}
          </button>
          <button
            type="button"
            className="replay__btn replay__btn--ghost"
            onClick={onClose}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}
