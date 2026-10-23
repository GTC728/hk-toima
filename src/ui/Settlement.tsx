import { useEffect, useMemo, useRef, useState } from 'react'
import {
  amountFromFan,
  canChopLa,
  formatLaFanDebt,
  laDeltaForSeat,
  matchRoundLabel,
  zhengHuaForSeat,
  type Action,
  type LaEntry,
  type Meld,
  type PublicGameView,
  type PublicPlayerView,
  type RoundResult,
  type Seat,
  type TileId,
  type WinResult,
} from '../engine'
import { Replay, type ReplaySource } from './Replay'
import {
  assignMeldHighlightFlags,
  displayHandForWin,
  fanRepeatTimes,
  tilesForFanHighlight,
} from './settlementHighlight'
import { recordMatchEnd, recordRoundForSeat } from './stats'
import { FanHoverTip } from './FanHoverTip'
import { MeldGroup, Tile, TileRow } from './tiles'

const WIND = ['東', '南', '西', '北']

export type SettlementModel = PublicGameView & {
  settlementPlayers?: SettlementPlayer[]
}

export interface SettlementPlayer {
  seat: Seat
  name: string
  hand: TileId[]
  melds: Meld[]
  flowers: TileId[]
  discards: TileId[]
}

interface SettlementProps {
  view: SettlementModel
  names: string[]
  onAction: (action: Action, seat?: Seat) => void
  onLeave: () => void
  trackSeats?: Seat[]
  statsMode?: 'local' | 'online'
  showLaInline?: boolean
}

type InstantLine = {
  from: Seat
  to: Seat
  amount: number
  reason: string
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

function winNetForSeat(result: RoundResult | null, seat: Seat): number {
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

function instantNetForSeat(payouts: InstantLine[], seat: Seat): number {
  let net = 0
  for (const p of payouts) {
    if (p.to === seat) net += p.amount
    if (p.from === seat) net -= p.amount
  }
  return net
}

function formatMoney(n: number): string {
  if (n > 0) return `+$${n}`
  if (n < 0) return `-$${Math.abs(n)}`
  return '$0'
}

/** 未結清（拉帳／本鋪）用番，唔寫 $ */
function formatFanDelta(amount: number, fanValue: number): string {
  const fan = Math.round(amount / Math.max(1, fanValue))
  if (fan > 0) return `+${fan}番`
  if (fan < 0) return `−${Math.abs(fan)}番`
  return '0番'
}

function buildPlayers(
  view: SettlementModel,
  names: string[],
): SettlementPlayer[] {
  if (view.settlementPlayers?.length) return view.settlementPlayers
  return ([0, 1, 2, 3] as Seat[]).map((seat) => {
    const p: PublicPlayerView | undefined = view.players[seat]
    return {
      seat,
      name: names[seat] ?? p?.name ?? WIND[seat]!,
      hand: view.revealedHands?.[seat] ?? [],
      melds: p?.melds ?? [],
      flowers: p?.flowers ?? [],
      discards: p?.discards ?? [],
    }
  })
}

function laLinesForSeat(
  ledger: LaEntry[],
  seat: Seat,
  names: string[],
  fanValue: number,
): { text: string; entry: LaEntry; role: 'owe' | 'owed' }[] {
  const lines: { text: string; entry: LaEntry; role: 'owe' | 'owed' }[] = []
  for (const e of ledger) {
    const formula = formatLaFanDebt(e, fanValue)
    if (e.debtor === seat) {
      lines.push({
        text: `欠${names[e.creditor] ?? WIND[e.creditor]} ${formula}`,
        entry: e,
        role: 'owe',
      })
    } else if (e.creditor === seat) {
      lines.push({
        text: `${names[e.debtor] ?? WIND[e.debtor]}欠你 ${formula}`,
        entry: e,
        role: 'owed',
      })
    }
  }
  return lines
}

/** 即時銀合併同 reason（例如圍骰三家 → 一行） */
function instantSummaryForSeat(
  payouts: InstantLine[],
  seat: Seat,
  names: string[],
): string[] {
  type Agg = {
    reason: string
    amount: number
    asTo: boolean
    others: Seat[]
  }
  const map = new Map<string, Agg>()
  for (const p of payouts) {
    if (p.to !== seat && p.from !== seat) continue
    const asTo = p.to === seat
    const other = asTo ? p.from : p.to
    const key = `${p.reason}|${asTo}|${p.amount}`
    const cur = map.get(key)
    if (cur) cur.others.push(other)
    else {
      map.set(key, {
        reason: p.reason,
        amount: p.amount,
        asTo,
        others: [other],
      })
    }
  }
  const lines: string[] = []
  for (const a of map.values()) {
    const sign = a.asTo ? '+' : '−'
    const verb = a.asTo ? '收' : '付'
    if (a.others.length >= 2 && a.reason) {
      lines.push(
        `${sign}$${a.amount * a.others.length} ${a.reason} · ${a.others.length}家各$${a.amount}`,
      )
    } else {
      const o = a.others[0]!
      lines.push(
        `${sign}$${a.amount} ${verb}${names[o] ?? WIND[o]}${
          a.reason ? `（${a.reason}）` : ''
        }`,
      )
    }
  }
  return lines
}

function winTypeLabel(
  w: WinResult,
  names: string[],
): string {
  if (w.winType === 'tsumo') return '自摸'
  if (w.winType === 'chankan') return '搶槓'
  if (w.discarder != null) {
    return `出銃（${WIND[w.discarder]}·${names[w.discarder] ?? ''}）`
  }
  return '出銃'
}

function SeatHand({
  player,
  win,
  open,
  activeFanId,
}: {
  player: SettlementPlayer
  win: WinResult | null
  open: boolean
  activeFanId: string | null
}) {
  const shown = useMemo(() => {
    if (!win?.winTile) return { tiles: player.hand, winIndex: -1 }
    return displayHandForWin(player.hand, win.winTile, win.winType)
  }, [player.hand, win])

  const mainTiles = useMemo(() => {
    if (shown.winIndex < 0) return shown.tiles
    return shown.tiles.filter((_, i) => i !== shown.winIndex)
  }, [shown])

  const winTile =
    shown.winIndex >= 0 ? shown.tiles[shown.winIndex]! : null

  const counts = useMemo(() => {
    if (!open || !activeFanId || !win?.winTile) return null
    return tilesForFanHighlight(activeFanId, {
      hand: player.hand,
      melds: player.melds,
      flowers: player.flowers,
      winTile: win.winTile,
      winType: win.winType,
      zhengHuaTiles: zhengHuaForSeat(player.seat),
    })
  }, [open, activeFanId, win, player])

  /** 糊位優先；副露整坎匹配（避免碰吞相逢順而亮錯坎） */
  const hl = useMemo(() => {
    if (!counts) {
      return {
        mainFlags: mainTiles.map(() => false),
        flowerFlags: player.flowers.map(() => false),
        meldFlags: null as boolean[][] | null,
        winSelected: false,
      }
    }
    const { meldFlags, left } = assignMeldHighlightFlags(player.melds, counts)
    let winSelected = false
    if (winTile && (left.get(winTile) ?? 0) > 0) {
      left.set(winTile, (left.get(winTile) ?? 0) - 1)
      winSelected = true
    }
    const take = (tiles: TileId[]) =>
      tiles.map((t) => {
        const n = left.get(t) ?? 0
        if (n > 0) {
          left.set(t, n - 1)
          return true
        }
        return false
      })
    return {
      winSelected,
      meldFlags,
      flowerFlags: take(player.flowers),
      mainFlags: take(mainTiles),
    }
  }, [counts, winTile, mainTiles, player.melds, player.flowers])

  const { mainFlags, flowerFlags, meldFlags, winSelected } = hl

  // 結算牌：四家／展開前後統一 md，唔跟手牌／牌桌 size
  const size = 'md' as const

  return (
    <div className="settlement__seat-tiles">
      <MeldGroup
        melds={player.melds}
        size={size}
        selectedFlagsByMeld={open && activeFanId ? meldFlags : null}
      />
      {player.flowers.length > 0 && (
        <TileRow
          tiles={player.flowers}
          size={size}
          selectedFlags={open && activeFanId ? flowerFlags : null}
        />
      )}
      <div className="settlement__hand-row">
        <div className="settlement__hand-main">
          {mainTiles.map((t, ti) => (
            <Tile
              key={`${t}-${ti}`}
              id={t}
              size={size}
              selected={Boolean(mainFlags[ti])}
            />
          ))}
        </div>
        {winTile && (
          <div className="settlement__win-slot" title="糊牌">
            <span className="settlement__win-slot-label">糊</span>
            <Tile id={winTile} size={size} selected={winSelected} />
          </div>
        )}
      </div>
    </div>
  )
}

export function Settlement({
  view,
  names,
  onAction,
  onLeave,
  trackSeats = [],
  statsMode = 'local',
  showLaInline = true,
}: SettlementProps) {
  const result = view.lastResult
  const matchOver = view.phase === 'match_over'
  const legal = view.phase === 'round_over' || matchOver
  const roundLabel = matchRoundLabel(view.windRound, view.dealer)
  const [showReplay, setShowReplay] = useState(false)
  /** 預設收起番表，方便睇齊四家 */
  const [expandedWin, setExpandedWin] = useState<number | null>(null)
  const [activeFanId, setActiveFanId] = useState<string | null>(null)
  const recordedKey = useRef<string | null>(null)

  const replaySource = toReplaySource(view)
  const youSeat = trackSeats[0]

  const players = useMemo(() => buildPlayers(view, names), [view, names])

  const instantOnly = useMemo(() => {
    return view.instantPayouts.filter(
      (p) => p.reason !== '埋單' && !p.reason.includes('食糊'),
    )
  }, [view.instantPayouts])

  useEffect(() => {
    if (trackSeats.length === 0) return
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
          {roundLabel} · 第 {view.round} 局 · 底 {view.rules.base} 番 · 一番 $
          {view.rules.fanValue}
          {view.rules.maxLaKou ? ` · 拉${view.rules.maxLaKou}口` : ''}
        </p>

        <div className="settlement__stack" aria-label="四家結算">
          {players.map((p) => {
            const winIdx =
              result?.wins.findIndex((w) => w.seat === p.seat) ?? -1
            const win = winIdx >= 0 ? result!.wins[winIdx]! : null
            const open = expandedWin === winIdx
            const isYou = youSeat === p.seat
            const winNet = winNetForSeat(result, p.seat)
            const instNet = instantNetForSeat(instantOnly, p.seat)
            // 拉帳制：本鋪入拉（未結清＝番）；即時結清先入金池（$）
            const laNet = showLaInline
              ? laDeltaForSeat(view.laLedger, p.seat)
              : 0
            const fv = view.rules.fanValue
            const roundNetLabel = showLaInline
              ? [
                  laNet !== 0 ? formatFanDelta(laNet, fv) : null,
                  instNet !== 0 ? formatMoney(instNet) : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '0番'
              : formatMoney(winNet + instNet)
            const roundNetSign = showLaInline
              ? laNet !== 0
                ? laNet
                : instNet
              : winNet + instNet
            const handPayLabel = showLaInline
              ? formatFanDelta(winNet, fv)
              : formatMoney(winNet)
            const las = showLaInline
              ? laLinesForSeat(
                  view.laLedger,
                  p.seat,
                  names,
                  view.rules.fanValue,
                )
              : []
            const instLines = instantSummaryForSeat(
              instantOnly,
              p.seat,
              names,
            )

            return (
              <article
                key={p.seat}
                className={`settlement__seat${win ? ' is-winner' : ''}${
                  open ? ' is-open' : ''
                }${isYou ? ' is-you' : ''}`}
              >
                <header className="settlement__seat-head">
                  <div className="settlement__seat-who">
                    <strong>
                      {WIND[p.seat]} · {p.name}
                    </strong>
                    {isYou && <em className="tag-you">你</em>}
                    {view.dealer === p.seat && <em>莊</em>}
                    {win && <em className="tag-win">食糊</em>}
                  </div>
                  <div className="settlement__seat-nets">
                    <div
                      className={`settlement__seat-net${
                        roundNetSign > 0
                          ? ' is-plus'
                          : roundNetSign < 0
                            ? ' is-minus'
                            : ''
                      }`}
                    >
                      <span className="settlement__net-label">本局</span>
                      {roundNetLabel}
                    </div>
                    <div className="settlement__seat-net settlement__seat-net--pool">
                      <span className="settlement__net-label">金池</span>
                      $
                      {view.players[p.seat]?.cash ?? 0}
                    </div>
                  </div>
                </header>

                <div className="settlement__seat-stats">
                  {win ? (
                    <button
                      type="button"
                      className="settlement__fan-chip"
                      onClick={() => {
                        setExpandedWin((cur) =>
                          cur === winIdx ? null : winIdx,
                        )
                        setActiveFanId(null)
                      }}
                      aria-expanded={open}
                    >
                      <span>
                        {win.totalFan}番 · {winTypeLabel(win, names)} · 本鋪{' '}
                        {handPayLabel}
                        {instNet !== 0
                          ? ` · 即時 ${formatMoney(instNet)}`
                          : ''}
                      </span>
                      <span className="settlement__fan-chip-hint">
                        {open ? '收起' : '睇計法'}
                      </span>
                    </button>
                  ) : result?.kind === 'win' ? (
                    <span className="settlement__seat-sub">
                      本鋪 {handPayLabel}
                      {instNet !== 0 ? ` · 即時 ${formatMoney(instNet)}` : ''}
                    </span>
                  ) : (
                    <span className="settlement__seat-sub">流局</span>
                  )}

                  {instLines.length > 0 && (
                    <ul className="settlement__seat-instant">
                      {instLines.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  )}

                  {las.length > 0 && (
                    <ul className="settlement__seat-la">
                      {las.map((line, i) => (
                        <li
                          key={i}
                          className={
                            line.role === 'owe' ? 'is-owe' : 'is-owed'
                          }
                        >
                          <span>
                            <em className="settlement__la-tag">拉帳</em>
                            {line.text}
                          </span>
                          {legal &&
                            canChopLa(line.entry, view.rules.maxLaKou) &&
                            line.role === 'owe' && (
                              <button
                                type="button"
                                className="settlement__mini"
                                onClick={() =>
                                  onAction(
                                    {
                                      type: 'chopLa',
                                      creditor: line.entry.creditor,
                                      debtor: line.entry.debtor,
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
                </div>

                <SeatHand
                  player={p}
                  win={win}
                  open={open}
                  activeFanId={activeFanId}
                />

                {open && win && (
                  <div className="settlement__win-detail">
                    <p className="settlement__hl-hint">
                      撳番種高亮相關牌 · {win.totalFan}番 × $
                      {view.rules.fanValue}＝$
                      {amountFromFan(view.rules, win.totalFan)}
                    </p>
                    <ul className="settlement__fans">
                      {win.fans.map((f) => {
                        const times = fanRepeatTimes(f.id, f.value)
                        return (
                          <li key={`${f.id}-${f.value}`}>
                            <FanHoverTip fanId={f.id}>
                              <button
                                type="button"
                                className={`settlement__fan-btn${
                                  activeFanId === f.id ? ' is-active' : ''
                                }`}
                                onClick={() =>
                                  setActiveFanId((id) =>
                                    id === f.id ? null : f.id,
                                  )
                                }
                              >
                                <span className="settlement__fan-label">
                                  <span className="settlement__fan-name">
                                    {f.name}
                                  </span>
                                  {times >= 2 && (
                                    <em className="settlement__fan-times">
                                      {times}次
                                    </em>
                                  )}
                                </span>
                                <span className="settlement__fan-value">
                                  {f.value}番
                                </span>
                              </button>
                            </FanHoverTip>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </article>
            )
          })}
        </div>

        {showLaInline && view.laLedger.length > 0 && (
          <div className="settlement__la-actions">
            <p className="settlement__empty">
              拉帳≠現金 · 完整簿喺大廳「拉數簿」
            </p>
            {legal && (
              <button
                type="button"
                className="settlement__mini"
                onClick={() => onAction({ type: 'settleAll' }, 0)}
              >
                埋單清拉
              </button>
            )}
          </div>
        )}

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
