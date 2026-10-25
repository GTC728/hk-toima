import { useEffect, useMemo, useRef, useState } from 'react'
import { formatPly, type Seat, visiblePlies } from '../engine'
import {
  buildReplayFrames,
  type ReplayFrame,
  type ReplaySource,
} from './replaySource'
import { ReplayTable } from './ReplayTable'
import { bumpReplayView } from './stats-s10'

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
  /** 視角座位（放喺牌桌下方） */
  you?: Seat
  onClose: () => void
}

export function Replay({ source, names, you = 0, onClose }: ReplayProps) {
  const frames = useMemo(
    () => buildReplayFrames(source, names),
    [source, names],
  )
  const [idx, setIdx] = useState(0)
  const [keyOnly, setKeyOnly] = useState(false)
  const [views, setViews] = useState(0)
  const plyListRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    setViews(bumpReplayView(source.seed))
  }, [source.seed])

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

  useEffect(() => {
    const el = plyListRef.current?.querySelector(`[data-ply="${safeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [safeIdx])

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
  const pub = frame.public
  const plyRows = visiblePlies(source.actionLog)

  function goRelative(delta: number) {
    const nextPos = Math.min(
      displayIndices.length - 1,
      Math.max(0, safeDisplayPos + delta),
    )
    setIdx(displayIndices[nextPos]!)
  }

  return (
    <div className="replay" role="dialog" aria-label="重溫本局">
      <div className="replay__panel replay__panel--table">
        <header className="replay__header">
          <h2>重溫 · 牌譜</h2>
          <p>
            {keyOnly ? '關鍵 ' : '步驟 '}
            {safeDisplayPos + 1}／{displayIndices.length}
            {!keyOnly ? `（全 ${frames.length}）` : ''}
            {frame.note ? ` · ${frame.note}` : ''}
            {frame.seat != null ? ` · ${WIND[frame.seat]}` : ''}
            {views > 0 ? ` · 本機重播 ${views} 次` : ''}
          </p>
        </header>

        <div className="replay__body replay__body--table">
          <div className="replay__felt-wrap">
            <ReplayTable frame={frame} names={names} you={you} />
          </div>

          <aside className="replay__plies" aria-label="記步">
            <h3>記步</h3>
            <ul className="replay__ply-list" ref={plyListRef}>
              {frames.map((f, i) => {
                if (keyOnly && !displayIndices.includes(i)) return null
                const label =
                  f.ply != null
                    ? formatPly(f.ply, names).text
                    : (f.note ?? f.actionType)
                const who =
                  f.ply != null
                    ? formatPly(f.ply, names).who
                    : f.seat != null
                      ? `${WIND[f.seat]}`
                      : '檯'
                return (
                  <li key={i}>
                    <button
                      type="button"
                      data-ply={i}
                      className={
                        i === safeIdx
                          ? 'replay__ply is-on'
                          : 'replay__ply'
                      }
                      onClick={() => setIdx(i)}
                    >
                      <span>{who}</span>
                      <em>{label}</em>
                    </button>
                  </li>
                )
              })}
            </ul>
            {plyRows.length === 0 && (
              <p className="replay__meta">未有記步</p>
            )}
          </aside>
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
            onClick={() => setIdx(displayIndices[0]!)}
          >
            開頭
          </button>
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
