import { useEffect, useMemo, useRef, useState } from 'react'
import {
  formatPly,
  type GameRecord,
  type PrivateGameView,
  type Seat,
  visiblePlies,
} from '../engine'
import {
  buildReplayFrames,
  replaySourceFromRecord,
  type ReplayFrame,
} from './replaySource'
import { TableView } from './TableView'
import { bumpReplayView } from './stats-s10'

const WIND = ['東', '南', '西', '北'] as const

const KEY_TYPES = new Set([
  'start',
  'chi',
  'pong',
  'mingkong',
  'ankong',
  'jiagang',
  'win',
  'declareDing',
])

function viewFromFrame(
  frame: ReplayFrame,
  you: Seat,
  names: string[],
): PrivateGameView {
  const pub = frame.public
  const players = pub.players.map((p, i) => {
    const seat = i as Seat
    const hand = frame.hands[seat] ?? []
    const melds = frame.melds[seat] ?? p.melds
    return {
      ...p,
      name: names[seat] ?? p.name,
      handCount: hand.length,
      melds,
    }
  })
  return {
    ...pub,
    players,
    you,
    hand: frame.hands[you] ?? [],
    justDrawn: null,
    legalActions: [],
    passedPong: [],
  }
}

interface ReplayDeskProps {
  record: GameRecord
  onLeave: () => void
}

/** 獨立重溫：正式牌桌 + 右側記步（Chess.com archive → game） */
export function ReplayDesk({ record, onLeave }: ReplayDeskProps) {
  const names = useMemo(
    () =>
      record.header.players.map(
        (p, i) => p.displayName || WIND[i]!,
      ),
    [record],
  )
  const you = (record.youSeat ?? 0) as Seat
  const source = useMemo(() => replaySourceFromRecord(record), [record])
  const frames = useMemo(
    () => buildReplayFrames(source, names),
    [source, names],
  )
  const [idx, setIdx] = useState(0)
  const [keyOnly, setKeyOnly] = useState(false)
  const plyRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    bumpReplayView(record.header.seed)
  }, [record.header.seed])

  const displayIndices = useMemo(() => {
    if (!keyOnly || frames.length === 0) return frames.map((_, i) => i)
    const last = frames.length - 1
    const picked: number[] = []
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i]!
      if (KEY_TYPES.has(f.actionType) || i === 0 || i === last) picked.push(i)
    }
    return picked.length > 0 ? picked : [0]
  }, [frames, keyOnly])

  const pos = Math.max(0, displayIndices.findIndex((i) => i === idx))
  const safePos =
    pos >= 0
      ? pos
      : Math.min(
          displayIndices.length - 1,
          Math.max(0, displayIndices.findIndex((i) => i >= idx)),
        )
  const safeIdx =
    displayIndices[safePos] ??
    Math.min(idx, Math.max(0, frames.length - 1))
  const frame = frames[safeIdx]

  useEffect(() => {
    plyRef.current
      ?.querySelector(`[data-ply="${safeIdx}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [safeIdx])

  if (!frame) {
    return (
      <div className="replay-desk">
        <p className="lobby__hint">呢份牌譜無法重放</p>
        <button type="button" className="settings-account__btn" onClick={onLeave}>
          返檔案
        </button>
      </div>
    )
  }

  const view = viewFromFrame(frame, you, names)
  const atStart = safePos <= 0
  const atEnd = safePos >= displayIndices.length - 1

  function go(delta: number) {
    const next = Math.min(
      displayIndices.length - 1,
      Math.max(0, safePos + delta),
    )
    setIdx(displayIndices[next]!)
  }

  const panel = (
    <aside className="replay-desk__side" aria-label="牌譜記步">
      <header className="replay-desk__side-head">
        <h2>記步</h2>
        <p>
          {safePos + 1}／{displayIndices.length}
          {frame.note ? ` · ${frame.note}` : ''}
        </p>
      </header>
      <ul className="replay-desk__plies" ref={plyRef}>
        {frames.map((f, i) => {
          if (keyOnly && !displayIndices.includes(i)) return null
          const row =
            f.ply != null
              ? formatPly(f.ply, names)
              : {
                  who: f.seat != null ? WIND[f.seat]! : '檯',
                  text: f.note ?? f.actionType,
                }
          return (
            <li key={i}>
              <button
                type="button"
                data-ply={i}
                className={
                  i === safeIdx
                    ? 'replay-desk__ply is-on'
                    : 'replay-desk__ply'
                }
                onClick={() => setIdx(i)}
              >
                <span>{row.who}</span>
                <em>{row.text}</em>
              </button>
            </li>
          )
        })}
      </ul>
      {visiblePlies(record.plies).length === 0 && (
        <p className="lobby__hint">未有記步</p>
      )}
      <div className="replay-desk__controls">
        <button type="button" disabled={atStart} onClick={() => setIdx(displayIndices[0]!)}>
          開頭
        </button>
        <button type="button" disabled={atStart} onClick={() => go(-1)}>
          上一步
        </button>
        <button type="button" disabled={atEnd} onClick={() => go(1)}>
          下一步
        </button>
        <button
          type="button"
          disabled={atEnd}
          onClick={() => setIdx(displayIndices[displayIndices.length - 1]!)}
        >
          跳到尾
        </button>
        <button
          type="button"
          className={keyOnly ? 'is-on' : ''}
          aria-pressed={keyOnly}
          onClick={() => setKeyOnly((k) => !k)}
        >
          {keyOnly ? '關鍵' : '只睇鳴／食'}
        </button>
        <button type="button" className="is-leave" onClick={onLeave}>
          返檔案
        </button>
      </div>
    </aside>
  )

  return (
    <div className="replay-desk desk__ingame">
      <div className="table-wrap">
        <div className="table-wrap__main">
          <TableView
            view={view}
            isHuman={[true, false, false, false]}
            selectedTile={null}
            declareDing={false}
            onSelectTile={() => {}}
            onToggleDing={() => {}}
            onAction={() => {}}
            reviewHands={frame.hands}
          />
        </div>
        {panel}
      </div>
    </div>
  )
}
