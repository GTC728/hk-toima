import { useMemo, useState } from 'react'
import {
  recordKey,
  type GameRecord,
  type Seat,
} from '../engine'
import { listGameRecords, deleteGameRecord } from './gameRecordStore'

const WIND = ['東', '南', '西', '北'] as const

function formatWhen(ts?: number): string {
  if (!ts) return '—'
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function playersLine(r: GameRecord): string {
  return r.header.players
    .map((p, i) => p.displayName || WIND[i])
    .join(' · ')
}

interface GamesArchiveProps {
  onOpen: (record: GameRecord) => void
}

/** Chess.com 式對局檔案：列表 → 獨立牌桌重溫 */
export function GamesArchive({ onOpen }: GamesArchiveProps) {
  const [tick, setTick] = useState(0)
  const records = useMemo(() => listGameRecords(), [tick])

  function remove(r: GameRecord) {
    if (!confirm('刪除呢份本機牌譜？')) return
    deleteGameRecord(r.header.seed, r.header.round)
    setTick((n) => n + 1)
  }

  return (
    <section className="games-archive" aria-label="對局檔案">
      <header className="games-archive__head">
        <h2>對局檔案</h2>
        <p className="fan-page__note">
          完局後自動存本機。揀一局用牌桌重溫（唔會喺結算即時彈出）。
        </p>
      </header>

      {records.length === 0 ? (
        <p className="stats-page__empty">未有牌譜。打完一局就會出現喺度。</p>
      ) : (
        <ul className="games-archive__list">
          {records.map((r) => {
            const key = recordKey(r)
            const you = (r.youSeat ?? 0) as Seat
            const summary =
              r.summary?.label ??
              (r.phase === 'match_over' ? '終場' : `第 ${r.header.round} 局`)
            return (
              <li key={key} className="games-archive__row">
                <button
                  type="button"
                  className="games-archive__main"
                  onClick={() => onOpen(r)}
                >
                  <span className="games-archive__when">
                    {formatWhen(r.savedAt)}
                  </span>
                  <span className="games-archive__result">{summary}</span>
                  <span className="games-archive__players">
                    {playersLine(r)}
                    {r.header.players[you] ? (
                      <small> · 你係{WIND[you]}</small>
                    ) : null}
                  </span>
                  <span className="games-archive__meta">
                    第 {r.header.round} 局 · seed {r.header.seed}
                  </span>
                </button>
                <button
                  type="button"
                  className="games-archive__del"
                  onClick={() => remove(r)}
                >
                  刪
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
