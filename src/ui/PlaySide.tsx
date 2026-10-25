import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  formatPly,
  visiblePlies,
  type ActionLogEntry,
  type LaEntry,
  type RoundResult,
  type Seat,
} from '../engine'
import {
  loadPlaySideTab,
  requestNextRound,
  savePlaySideTab,
  type PlaySideTabId,
} from './extraPrefs'
import { loadLogTimestamps, loadTimeFormat } from './leftoverPrefs'

const WIND = ['東', '南', '西', '北'] as const

type Tab = PlaySideTabId

export interface PlaySeatRow {
  seat: Seat
  name: string
  detail: string
}

export interface PlaySideProps {
  names: string[]
  actionLog: ActionLogEntry[]
  /** 對局中遮對手摸牌；唔傳＝全開 */
  viewSeat?: Seat | null
  rules: {
    base: number
    fanValue: number
    maxLaKou: number
    turnTimeoutSec: number
    claimTimeoutSec: number
    matchCircles: number
  }
  instantPayouts: {
    from: Seat
    to: Seat
    amount: number
    reason: string
  }[]
  laLedger: LaEntry[]
  lastResult: RoundResult | null
  phase: string
  seats: PlaySeatRow[]
  roomCode?: string | null
  hintLines: string[] | null
  hintNote: string
  onNextRound?: () => void
  onSettleLa?: () => void
  onLeave: () => void
  /** 開房、入房、再發一局。放在資訊頁頂。 */
  setup?: ReactNode
}

function formatLogTime(t: number): string {
  const d = new Date(t)
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  if (loadTimeFormat() === '12') {
    const ap = h >= 12 ? 'pm' : 'am'
    const h12 = h % 12 || 12
    return `${h12}:${m}:${s}${ap}`
  }
  return `${String(h).padStart(2, '0')}:${m}:${s}`
}

function Icon({ name }: { name: Tab }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {name === 'log' && <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />}
      {name === 'info' && (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 11v5M12 8h.01" />
        </>
      )}
      {name === 'books' && <path d="M6 4.5h11a2 2 0 0 1 2 2V19H8a2 2 0 0 0-2 2V4.5z" />}
      {name === 'hint' && (
        <>
          <path d="M9 18h6M10 21h4" />
          <path d="M12 3a6 6 0 0 0-3 11c.4.4.7 1 .8 1.6h4.4c.1-.6.4-1.2.8-1.6A6 6 0 0 0 12 3z" />
        </>
      )}
    </svg>
  )
}

export function PlaySide({
  names,
  actionLog,
  viewSeat = null,
  rules,
  instantPayouts,
  laLedger,
  lastResult,
  phase,
  seats,
  roomCode,
  hintLines,
  hintNote,
  onNextRound,
  onSettleLa,
  onLeave,
  setup,
}: PlaySideProps) {
  const [tab, setTab] = useState<Tab>(loadPlaySideTab)
  const logRef = useRef<HTMLDivElement>(null)
  const over = phase === 'round_over' || phase === 'match_over'
  const logRows = visiblePlies(actionLog)
  const redact =
    over || viewSeat == null
      ? undefined
      : { redactDrawsExcept: viewSeat }

  useEffect(() => {
    if (tab !== 'log' || !logRef.current) return
    logRef.current.scrollTop = logRef.current.scrollHeight
  }, [tab, logRows.length])

  function goTab(id: Tab) {
    setTab(id)
    savePlaySideTab(id)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'log', label: '操作' },
    { id: 'info', label: '資訊' },
    { id: 'books', label: '帳目' },
    { id: 'hint', label: '提示' },
  ]

  return (
    <aside className="side" aria-label="這一局">
      <div className="side__tabs" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'is-on' : ''}
            onClick={() => goTab(item.id)}
          >
            <Icon name={item.id} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <div className="side__body" ref={logRef}>
          {logRows.length === 0 && <p className="side__empty">未有動作</p>}
          <ul className="side__rows">
            {logRows.map((entry, i) => {
              const { who, text } = formatPly(entry, names, redact)
              return (
                <li key={`${entry.t}-${i}`}>
                  <span>
                    {loadLogTimestamps()
                      ? `${formatLogTime(entry.t)} · ${who}`
                      : who}
                  </span>
                  <em>{text}</em>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {tab === 'info' && (
        <div className="side__body">
          {setup && <div className="side__setup">{setup}</div>}
          <h2>房</h2>
          <ul className="side__rows">
            <li>
              <span>房碼</span>
              <em>{roomCode || '這部機'}</em>
            </li>
          </ul>
          <h2>四家</h2>
          <ul className="side__rows">
            {seats.map((row) => (
              <li key={row.seat}>
                <span>
                  {WIND[row.seat]} · {row.name}
                </span>
                <em>{row.detail}</em>
              </li>
            ))}
          </ul>
          <h2>枱規</h2>
          <ul className="side__rows">
            <li>
              <span>底</span>
              <em>{rules.base} 番</em>
            </li>
            <li>
              <span>番值</span>
              <em>${rules.fanValue} / 番</em>
            </li>
            <li>
              <span>拉</span>
              <em>{rules.maxLaKou} 口可斬</em>
            </li>
            <li>
              <span>出牌</span>
              <em>{rules.turnTimeoutSec} 秒</em>
            </li>
            <li>
              <span>鳴牌</span>
              <em>{rules.claimTimeoutSec} 秒</em>
            </li>
            <li>
              <span>局制</span>
              <em>{rules.matchCircles} 圈</em>
            </li>
          </ul>
        </div>
      )}

      {tab === 'books' && (
        <div className="side__body">
          <h2>即時拉數</h2>
          {instantPayouts.length === 0 && laLedger.length === 0 && (
            <p className="side__empty">未有即時賞罰</p>
          )}
          <ul className="side__rows">
            {instantPayouts.map((row, i) => (
              <li key={`p-${i}`}>
                <span>
                  {WIND[row.from]} → {WIND[row.to]} {row.reason}
                </span>
                <em>${row.amount}</em>
              </li>
            ))}
            {laLedger.map((row, i) => (
              <li key={`l-${i}`}>
                <span>
                  {WIND[row.debtor]} 欠 {WIND[row.creditor]}
                </span>
                <em>
                  ${row.amount} · {row.kou} 口
                </em>
              </li>
            ))}
          </ul>
          <h2>本局番數</h2>
          {lastResult?.kind !== 'win' && <p className="side__empty">未食糊</p>}
          {lastResult?.kind === 'win' &&
            lastResult.wins.map((win) => (
              <ul className="side__rows" key={win.seat}>
                <li>
                  <span>
                    {WIND[win.seat]} · {win.winType === 'tsumo' ? '自摸' : win.winType === 'chankan' ? '搶槓' : '出銃'}
                  </span>
                  <em>{win.totalFan} 番</em>
                </li>
                {win.fans.map((fan) => (
                  <li key={fan.id}>
                    <span>{fan.name}</span>
                    <em>{fan.value} 番</em>
                  </li>
                ))}
              </ul>
            ))}
          <h2>結算</h2>
          {!over && <p className="side__empty">這一鋪未完</p>}
          {over && lastResult?.kind === 'draw' && <p className="side__empty">流局</p>}
          {over && lastResult?.kind === 'win' && (
            <ul className="side__rows">
              {lastResult.wins.flatMap((win) =>
                win.payments.map((pay, i) => (
                  <li key={`${win.seat}-${i}`}>
                    <span>
                      {names[pay.from] || WIND[pay.from]} 付 {names[pay.to] || WIND[pay.to]}
                    </span>
                    <em>${pay.amount}</em>
                  </li>
                )),
              )}
            </ul>
          )}
          {over && (
            <div className="side__actions">
              {onSettleLa && laLedger.length > 0 && (
                <button type="button" onClick={onSettleLa}>
                  埋單清拉
                </button>
              )}
              {phase === 'round_over' && onNextRound && (
                <button
                  type="button"
                  className="is-go"
                  onClick={() => requestNextRound(onNextRound)}
                >
                  下一局
                </button>
              )}
              <button type="button" onClick={onLeave}>
                返大廳
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'hint' && (
        <div className="side__body">
          <h2>練習提示</h2>
          {hintLines == null && <p className="side__empty">{hintNote}</p>}
          {hintLines && (
            <ul className="side__rows">
              {hintLines.map((line) => (
                <li key={line}>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  )
}
