import { useEffect, useRef, useState } from 'react'
import {
  canChopLa,
  matchRoundLabel,
  type Action,
  type ActionLogEntry,
  type LaEntry,
  type Phase,
  type RoundResult,
  type Seat,
  type TableRules,
  type TileId,
} from '../engine'
import { Replay, type ReplaySource } from './Replay'
import { recordMatchEnd, recordRoundForSeat } from './stats'

const WIND = ['東', '南', '西', '北']

/** Shared shape for local GameState + online PrivateGameView */
export interface SettlementModel {
  round: number
  rules: TableRules
  phase: Phase
  lastResult: RoundResult | null
  instantPayouts: { from: Seat; to: Seat; amount: number; reason: string }[]
  laLedger: LaEntry[]
  seed?: number
  dealer?: Seat
  consecutiveWins?: number
  actionLog?: ActionLogEntry[]
  revealedHands?: TileId[][]
  windRound?: number
}

interface SettlementProps {
  view: SettlementModel
  names: string[]
  onAction: (action: Action, seat?: Seat) => void
  onLeave: () => void
  /** Seats to record career stats for (local humans / online you) */
  trackSeats?: Seat[]
  statsMode?: 'local' | 'online'
}

function toReplaySource(view: SettlementModel): ReplaySource | null {
  if (!view.actionLog || view.seed == null || view.dealer == null) return null
  return {
    seed: view.seed,
    dealer: view.dealer,
    consecutiveWins: view.consecutiveWins ?? 0,
    rules: view.rules,
    phase: view.phase,
    actionLog: view.actionLog,
    revealedHands: view.revealedHands,
  }
}

/** 你呢鋪淨銀（含即時銀碼入數中屬於你嘅部分唔計，只計 lastResult） */
function netForSeat(result: RoundResult | null, seat: Seat): number {
  if (!result || result.kind === 'draw') return 0
  let net = 0
  for (const w of result.wins) {
    for (const p of w.payments) {
      if (p.to === seat) net += p.amount
      if (p.from === seat) net -= p.amount
    }
  }
  return net
}

function formatMoney(n: number): string {
  if (n > 0) return `+$${n}`
  if (n < 0) return `-$${Math.abs(n)}`
  return '$0'
}

export function Settlement({
  view,
  names,
  onAction,
  onLeave,
  trackSeats = [],
  statsMode = 'local',
}: SettlementProps) {
  const result = view.lastResult
  const matchOver = view.phase === 'match_over'
  const legal = view.phase === 'round_over' || matchOver
  const roundLabel =
    view.windRound != null && view.dealer != null
      ? matchRoundLabel(view.windRound, view.dealer)
      : null
  const [showReplay, setShowReplay] = useState(false)
  const recordedKey = useRef<string | null>(null)

  const replaySource = toReplaySource(view)
  const youSeat = trackSeats[0]
  const youNet =
    youSeat != null && result ? netForSeat(result, youSeat) : null

  useEffect(() => {
    if (trackSeats.length === 0) return
    // 只喺 round_over 記一局；match_over 只加「一場完」標記，避免重複計同一局
    if (view.phase === 'round_over') {
      const key = `round:${view.round}|${result?.kind ?? 'x'}|${trackSeats.join(',')}`
      if (recordedKey.current !== key) {
        recordedKey.current = key
        for (const seat of trackSeats) {
          recordRoundForSeat(result, seat, statsMode)
        }
      }
    } else if (matchOver) {
      const key = `match:${view.round}`
      if (recordedKey.current !== key) {
        recordedKey.current = key
        recordMatchEnd()
      }
    }
  }, [view.phase, view.round, result, trackSeats, statsMode, matchOver])

  return (
    <div className="settlement">
      <div className="settlement__panel">
        <h2 className="settlement__title">
          {matchOver
            ? `${view.rules.matchCircles ?? 4}圈完 · 總結算`
            : result?.kind === 'draw'
              ? '流局'
              : '食糊結算'}
        </h2>
        <p className="settlement__meta">
          {roundLabel ? `${roundLabel} · ` : ''}第 {view.round} 局 · 底 $
          {view.rules.base} · 一番 ${view.rules.fanValue}
          {view.rules.maxLaKou ? ` · 拉${view.rules.maxLaKou}口` : ''}
          {matchOver ? ` · ${view.rules.matchCircles}圈完` : ''}
        </p>

        {youSeat != null && youNet != null && !matchOver && (
          <p className="settlement__you" role="status">
            你呢鋪（{WIND[youSeat]}
            {names[youSeat] ? ` · ${names[youSeat]}` : ''}）：
            <strong>{formatMoney(youNet)}</strong>
            {result?.kind === 'draw'
              ? ' · 流局'
              : result?.wins.some((w) => w.seat === youSeat)
                ? ' · 食糊'
                : result?.wins.some(
                      (w) =>
                        w.winType !== 'tsumo' &&
                        w.payments.some((p) => p.from === youSeat),
                    )
                  ? ' · 出銃'
                  : ' · 坐枱'}
          </p>
        )}

        {result?.wins.map((w, i) => (
          <div key={i} className="settlement__win">
            <h3>
              {WIND[w.seat]} · {names[w.seat]}{' '}
              <span className="settlement__win-type">
                {w.winType === 'tsumo'
                  ? '自摸'
                  : w.winType === 'chankan'
                    ? '搶槓'
                    : '出銃'}
              </span>
            </h3>
            <p className="settlement__fan-total">
              {w.totalFan} 番 · ${w.paymentPerPayer}
            </p>
            <ul className="settlement__fans">
              {w.fans.map((f) => (
                <li key={f.id}>
                  {f.name} <span>{f.value}番</span>
                </li>
              ))}
            </ul>
            <ul className="settlement__pays">
              {w.payments.map((p, j) => (
                <li key={j}>
                  {names[p.from]} → {names[p.to]}：${p.amount}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {view.instantPayouts.length > 0 && (
          <div className="settlement__block">
            <h3>即時銀碼</h3>
            <ul>
              {view.instantPayouts.slice(-8).map((p, i) => (
                <li key={i}>
                  {names[p.from]} → {names[p.to]}：${p.amount}
                  {p.reason ? `（${p.reason}）` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="settlement__block">
          <h3>拉數簿</h3>
          {view.laLedger.length === 0 ? (
            <p className="settlement__empty">暫無拉數</p>
          ) : (
            <ul className="settlement__la">
              {view.laLedger.map((e, i) => (
                <li key={i}>
                  <span>
                    {names[e.debtor]} 欠 {names[e.creditor]} ${e.amount}
                    <em> · {e.kou} 口</em>
                  </span>
                  {legal && canChopLa(e, view.rules.maxLaKou) && (
                    <button
                      type="button"
                      className="settlement__mini"
                      onClick={() =>
                        onAction(
                          {
                            type: 'chopLa',
                            creditor: e.creditor,
                            debtor: e.debtor,
                          },
                          0,
                        )
                      }
                    >
                      斬拉
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {legal && view.laLedger.length > 0 && (
            <button
              type="button"
              className="settlement__mini"
              onClick={() => onAction({ type: 'settleAll' }, 0)}
            >
              埋單清拉
            </button>
          )}
        </div>

        <div className="settlement__actions">
          {replaySource && (
            <button
              type="button"
              className="settlement__replay"
              onClick={() => setShowReplay(true)}
            >
              重溫
            </button>
          )}
          {view.phase === 'round_over' && (
            <button
              type="button"
              className="settlement__next"
              onClick={() => onAction({ type: 'nextRound' }, 0)}
            >
              下一局
            </button>
          )}
          <button type="button" className="settlement__leave" onClick={onLeave}>
            返大廳
          </button>
        </div>
      </div>

      {showReplay && replaySource && (
        <Replay
          source={replaySource}
          names={names}
          onClose={() => setShowReplay(false)}
        />
      )}
    </div>
  )
}
