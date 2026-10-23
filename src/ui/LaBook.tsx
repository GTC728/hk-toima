import { Fragment, useMemo, useState } from 'react'
import {
  applyWinToLa,
  canChopLa,
  chopLa,
  DEFAULT_RULES,
  formatLaFanDebt,
  settleAllLa,
  type LaEntry,
  type Seat,
  type WinResult,
} from '../engine'

const WIND = ['東', '南', '西', '北'] as const
const STORAGE_KEY = 'hktoima-labook-v1'

interface LaBookPersist {
  names: string[]
  maxLaKou: number
  ledger: LaEntry[]
  history: { text: string; at: number }[]
}

function loadPersist(): LaBookPersist {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) throw new Error('empty')
    const parsed = JSON.parse(raw) as LaBookPersist
    return {
      names: parsed.names?.length === 4 ? parsed.names : [...WIND],
      maxLaKou: Math.min(9, Math.max(1, parsed.maxLaKou || 3)),
      ledger: Array.isArray(parsed.ledger) ? parsed.ledger : [],
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 40) : [],
    }
  } catch {
    return {
      names: [...WIND],
      maxLaKou: 3,
      ledger: [],
      history: [],
    }
  }
}

function savePersist(data: LaBookPersist) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function netMatrix(ledger: LaEntry[]): number[][] {
  const m = Array.from({ length: 4 }, () => [0, 0, 0, 0])
  for (const e of ledger) {
    m[e.debtor]![e.creditor]! += e.amount
  }
  return m
}

function seatNet(ledger: LaEntry[], seat: Seat): number {
  let n = 0
  for (const e of ledger) {
    if (e.creditor === seat) n += e.amount
    if (e.debtor === seat) n -= e.amount
  }
  return n
}

interface LaBookProps {
  onBack: () => void
}

export function LaBook({ onBack }: LaBookProps) {
  const initial = loadPersist()
  const [names, setNames] = useState(initial.names)
  const [maxLaKou, setMaxLaKou] = useState(initial.maxLaKou)
  const [ledger, setLedger] = useState<LaEntry[]>(initial.ledger)
  const [history, setHistory] = useState(initial.history)
  const [winner, setWinner] = useState<Seat>(0)
  const [loser, setLoser] = useState<Seat>(1)
  const [amount, setAmount] = useState(10)
  const [mode, setMode] = useState<'ron' | 'tsumo'>('ron')

  function persist(
    next: Partial<LaBookPersist> & {
      ledger?: LaEntry[]
      history?: { text: string; at: number }[]
    },
  ) {
    const data: LaBookPersist = {
      names: next.names ?? names,
      maxLaKou: next.maxLaKou ?? maxLaKou,
      ledger: next.ledger ?? ledger,
      history: next.history ?? history,
    }
    savePersist(data)
  }

  function pushHistory(text: string, nextLedger: LaEntry[]) {
    const entry = { text, at: Date.now() }
    const nextHistory = [entry, ...history].slice(0, 40)
    setHistory(nextHistory)
    setLedger(nextLedger)
    persist({ ledger: nextLedger, history: nextHistory })
  }

  function recordRon() {
    if (winner === loser || amount <= 0) return
    const win: WinResult = {
      seat: winner,
      winType: 'ron',
      winTile: 'man-1',
      discarder: loser,
      fans: [],
      totalFan: 0,
      handFan: 0,
      paymentPerPayer: amount,
      payments: [{ from: loser, to: winner, amount }],
    }
    const r = applyWinToLa(ledger, [win], maxLaKou)
    const settledNote =
      r.settled.length > 0
        ? `；另結清 ${r.settled.map((s) => `$${s.amount}${s.reason}`).join('、')}`
        : ''
    pushHistory(
      `${names[loser]} → ${names[winner]} $${amount}（出銃）${settledNote}`,
      r.ledger,
    )
  }

  function recordTsumo() {
    if (amount <= 0) return
    const payments = ([0, 1, 2, 3] as Seat[])
      .filter((s) => s !== winner)
      .map((from) => ({ from, to: winner, amount }))
    const win: WinResult = {
      seat: winner,
      winType: 'tsumo',
      winTile: 'man-1',
      fans: [],
      totalFan: 0,
      handFan: 0,
      paymentPerPayer: amount,
      payments,
    }
    const r = applyWinToLa(ledger, [win], maxLaKou)
    pushHistory(
      `${names[winner]} 自摸 每家 $${amount}${
        r.settled.length
          ? `；結清 ${r.settled.map((s) => `$${s.amount}`).join('、')}`
          : ''
      }`,
      r.ledger,
    )
  }

  function doChop(e: LaEntry) {
    const r = chopLa(ledger, e.creditor, e.debtor)
    pushHistory(
      `斬拉：${names[e.debtor]} 欠 ${names[e.creditor]} 清 $${e.amount}`,
      r.ledger,
    )
  }

  function doSettleAll() {
    const r = settleAllLa(ledger)
    pushHistory(
      `埋單：清晒 ${r.settled.length} 條帳`,
      r.ledger,
    )
  }

  function resetAll() {
    setLedger([])
    setHistory([])
    persist({ ledger: [], history: [] })
  }

  const matrix = useMemo(() => netMatrix(ledger), [ledger])
  const nets = useMemo(
    () => ([0, 1, 2, 3] as Seat[]).map((s) => seatNet(ledger, s)),
    [ledger],
  )

  return (
    <main className="labook">
      <header className="labook__header">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返大廳
        </button>
        <p className="fan-page__eyebrow">HK ToiMa</p>
        <h1 className="fan-page__title">拉數簿</h1>
        <p className="fan-page__sub">
          唔打牌都可以記帳 · 再食×1.5 · 反食踢半 · {maxLaKou}口可斬
        </p>
      </header>

      <section className="labook__setup" aria-label="設定">
        <label className="labook__kou">
          <span>拉口上限</span>
          <input
            type="number"
            min={1}
            max={9}
            value={maxLaKou}
            onChange={(e) => {
              const v = Math.min(9, Math.max(1, Number(e.target.value) || 3))
              setMaxLaKou(v)
              persist({ maxLaKou: v })
            }}
          />
        </label>
        <div className="labook__names">
          {([0, 1, 2, 3] as Seat[]).map((s) => (
            <label key={s} className="labook__name">
              <span>{WIND[s]}</span>
              <input
                value={names[s]}
                maxLength={8}
                onChange={(e) => {
                  const next = [...names]
                  next[s] = e.target.value
                  setNames(next)
                  persist({ names: next })
                }}
              />
              <em className={nets[s]! >= 0 ? 'is-plus' : 'is-minus'}>
                {nets[s]! > 0
                  ? `+${Math.round(nets[s]! / Math.max(1, DEFAULT_RULES.fanValue))}番`
                  : nets[s]! < 0
                    ? `−${Math.round(Math.abs(nets[s]!) / Math.max(1, DEFAULT_RULES.fanValue))}番`
                    : '0番'}
              </em>
            </label>
          ))}
        </div>
      </section>

      <section className="labook__matrix" aria-label="欠款矩陣">
        <h2>邊個欠邊個</h2>
        <div className="labook__grid" role="table">
          <div className="labook__grid-corner" />
          {WIND.map((w) => (
            <div key={`h-${w}`} className="labook__grid-head">
              收·{w}
            </div>
          ))}
          {([0, 1, 2, 3] as Seat[]).map((from) => (
            <Fragment key={`row-${from}`}>
              <div className="labook__grid-head">付·{WIND[from]}</div>
              {([0, 1, 2, 3] as Seat[]).map((to) => {
                const v = from === to ? null : matrix[from]![to]!
                return (
                  <div
                    key={`${from}-${to}`}
                    className={`labook__cell${v && v > 0 ? ' has-debt' : ''}`}
                  >
                    {v && v > 0
                      ? `${Math.round(v / Math.max(1, DEFAULT_RULES.fanValue))}番`
                      : '—'}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
        <p className="labook__matrix-hint">格內＝左欄「付」欠上欄「收」</p>
      </section>

      <section className="labook__ledger" aria-label="帳目">
        <div className="labook__ledger-head">
          <h2>拉帳明細</h2>
          {ledger.length > 0 && (
            <button type="button" className="lobby__secondary" onClick={doSettleAll}>
              埋單清晒
            </button>
          )}
        </div>
        {ledger.length === 0 ? (
          <p className="labook__empty">暫無拉數 · 下面記一鋪先</p>
        ) : (
          <ul className="labook__list">
            {ledger.map((e, i) => (
              <li key={`${e.creditor}-${e.debtor}-${i}`}>
                <div>
                  <strong>
                    {names[e.debtor]} 欠 {names[e.creditor]}
                  </strong>
                  <span className="labook__amt">
                    {formatLaFanDebt(e, DEFAULT_RULES.fanValue).replace(
                      /（\d+口）$/,
                      '',
                    )}
                  </span>
                  <em>{e.kou}口</em>
                </div>
                {canChopLa(e, maxLaKou) && (
                  <button
                    type="button"
                    className="labook__chop"
                    onClick={() => doChop(e)}
                  >
                    斬拉
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="labook__record" aria-label="記一鋪">
        <h2>記一鋪</h2>
        <div className="labook__mode" role="group">
          <button
            type="button"
            className={`lobby__chip ${mode === 'ron' ? 'is-active' : ''}`}
            onClick={() => setMode('ron')}
          >
            出銃
          </button>
          <button
            type="button"
            className={`lobby__chip ${mode === 'tsumo' ? 'is-active' : ''}`}
            onClick={() => setMode('tsumo')}
          >
            自摸
          </button>
        </div>
        <div className="labook__form">
          <label>
            <span>贏家</span>
            <select
              value={winner}
              onChange={(e) => setWinner(Number(e.target.value) as Seat)}
            >
              {([0, 1, 2, 3] as Seat[]).map((s) => (
                <option key={s} value={s}>
                  {WIND[s]} · {names[s]}
                </option>
              ))}
            </select>
          </label>
          {mode === 'ron' && (
            <label>
              <span>出銃</span>
              <select
                value={loser}
                onChange={(e) => setLoser(Number(e.target.value) as Seat)}
              >
                {([0, 1, 2, 3] as Seat[])
                  .filter((s) => s !== winner)
                  .map((s) => (
                    <option key={s} value={s}>
                      {WIND[s]} · {names[s]}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            <span>{mode === 'tsumo' ? '每家付' : '銀碼'}</span>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
          <button
            type="button"
            className="lobby__start"
            onClick={() => (mode === 'ron' ? recordRon() : recordTsumo())}
          >
            記入
          </button>
        </div>
      </section>

      <section className="labook__history" aria-label="紀錄">
        <div className="labook__ledger-head">
          <h2>操作紀錄</h2>
          <button type="button" className="lobby__link" onClick={resetAll}>
            清空簿
          </button>
        </div>
        {history.length === 0 ? (
          <p className="labook__empty">未有紀錄</p>
        ) : (
          <ul className="labook__history-list">
            {history.map((h, i) => (
              <li key={`${h.at}-${i}`}>
                <time dateTime={new Date(h.at).toISOString()}>
                  {new Date(h.at).toLocaleTimeString('zh-HK', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                <span>{h.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
