import { useEffect, useMemo, useRef, useState } from 'react'
import {
  amountFromFan,
  canChopLa,
  formatLaFanDebt,
  laDeltaForSeat,
  matchRoundLabel,
  zhengHuaForSeat,
  type Action,
  type FanHit,
  type FanShop,
  type GameRecord,
  type GameRecordSummary,
  type LaEntry,
  type Meld,
  type PublicGameView,
  type PublicPlayerView,
  type RoundResult,
  type Seat,
  type TileId,
  type WinResult,
} from '../engine'
import { saveGameRecord } from './gameRecordStore'
import {
  assignMeldHighlightFlags,
  displayHandForWin,
  fanHighlightSkipsChiMelds,
  fanRepeatTimes,
  fanShopLabel,
  tilesForFanHighlight,
} from './settlementHighlight'

type ActiveFan = { id: string; shop?: FanShop; instance?: string }

function sameActiveFan(
  a: ActiveFan | null,
  id: string,
  shop?: FanShop,
  instance?: string,
): boolean {
  if (!a) return false
  return a.id === id && a.shop === shop && a.instance === instance
}

function fanListKey(f: FanHit): string {
  const base = f.shop ? `${f.shop}:${f.id}` : f.id
  const inst = f.instance ? `:${f.instance}` : ''
  return `${base}${inst}:${f.value}`
}
import {
  loadRecordStats,
  loadSettlementAutoNext,
  requestNextRound,
} from './extraPrefs'
import { loadWinCelebrate } from './leftoverPrefs'
import {
  loadRankedState,
  rankedSummary,
  recordRankedMatchEnd,
} from './rankedPrefs'
import { RANKED_AI_RATING, RANKED_DEFAULT, type AiPersona } from '../engine'
import {
  classifyMatchShape,
  midSnapshotIndex,
  performanceRating,
  placeFromCashSnapshot,
} from './stats-shape'
import { syncAchievements } from './stats-achievements'
import { loadRoundSummary } from './matchPrefs'
import {
  firstMeldTurnFromLog,
  lastDiscardSuitFromLog,
  phaseFromWall,
  recordMatchEnd,
  recordRoundForSeat,
  type StatsPlayKind,
  type TenpaiPaceMap,
  type TenpaiPhaseMap,
} from './stats'
import { countPassRegrets } from './stats-s12'
import type { DecisionBySeat } from './stats-decision'
import type { TacticsBySeat } from './stats-tactics'
import { derivePrefsSnapshot } from './stats-prefs'
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
  /** @deprecated 用 playKind */
  matchMode?: 'casual' | 'ranked'
  playKind?: StatsPlayKind
  /** 四席是否 AI（排位結算用） */
  seatIsAi?: boolean[]
  /** 四席 AI 性格（真人位可無視） */
  aiPersonas?: (AiPersona | null | undefined)[]
  /** 開場時間（算時長） */
  matchStartedAt?: number
  /** 你被倒數自動操作次數 */
  timeoutsSelf?: number
  /** 對手被倒數自動操作次數 */
  timeoutsOpp?: number
  /** 本圈首次聽牌巡（棄牌數） */
  tenpaiPace?: TenpaiPaceMap
  /** S4 戰術快照（各位） */
  tacticsBySeat?: TacticsBySeat
  /** 每局完後四席現金（S7 形狀） */
  cashHistory?: number[][]
  tenpaiPhase?: TenpaiPhaseMap
  decisionBySeat?: DecisionBySeat
  /** 網上房對手朋友碼（登入席）；結算一鍵加友 */
  oppFriendCodes?: Partial<Record<Seat, string>>
  onAddFriend?: (friendCode: string) => void
}

type InstantLine = {
  from: Seat
  to: Seat
  amount: number
  reason: string
  kind?: 'instant' | 'la_settle'
}

function summaryFromView(
  view: SettlementModel,
  names: string[],
): GameRecordSummary {
  const result = view.lastResult
  if (!result || result.kind === 'draw') {
    return { kind: 'draw', winnerSeats: [], label: '流局' }
  }
  const wins = result.wins
  const winnerSeats = wins.map((w) => w.seat)
  const fanTotal = wins.reduce((s, w) => s + (w.totalFan ?? 0), 0)
  const first = wins[0]
  const who =
    first != null
      ? `${['東', '南', '西', '北'][first.seat]} · ${names[first.seat] ?? ''}`
      : '—'
  const wt =
    first?.winType === 'tsumo'
      ? '自摸'
      : first?.winType === 'chankan'
        ? '搶槓'
        : '出銃'
  return {
    kind: 'win',
    winnerSeats,
    fanTotal,
    winType: first?.winType,
    label: `${who} ${wt} ${fanTotal}番`,
  }
}

function toGameRecord(
  view: SettlementModel,
  names: string[],
  youSeat: Seat,
): GameRecord | null {
  if (!view.actionLog || view.seed == null || view.dealer == null) return null
  return {
    version: 1,
    header: {
      seed: view.seed,
      dealer: view.dealer,
      consecutiveWins: view.consecutiveWins ?? 0,
      rules: view.rules,
      round: view.round,
      windRound: view.windRound,
      players: names.map((displayName, seat) => ({
        seat: seat as 0 | 1 | 2 | 3,
        displayName,
      })),
    },
    plies: view.actionLog,
    revealedHands: view.revealedHands,
    phase: view.phase,
    savedAt: Date.now(),
    youSeat,
    summary: summaryFromView(view, names),
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

/** 拉帳即時結清（斷拉／踢半／斬拉等）。舊牌局冇 kind 時先睇 reason。 */
function isLaSettleReason(reason: string): boolean {
  return (
    reason === '踢半' ||
    reason === '斬拉' ||
    reason === '埋單' ||
    reason.includes('斷拉') ||
    reason.endsWith('結清')
  )
}

function isLaSettledLine(p: InstantLine): boolean {
  if (p.kind === 'la_settle') return true
  if (p.kind === 'instant') return false
  return isLaSettleReason(p.reason)
}

function shortSettleReason(reason: string): string {
  if (reason.includes('踢半')) return '踢半'
  if (reason.includes('斬拉')) return '斬拉'
  if (reason.includes('斷拉')) return '斷拉'
  if (reason.includes('其他人')) return '外人食糊'
  if (reason === '埋單') return '埋單'
  return reason.replace(/結清$/, '') || reason
}

type InstantAgg = {
  reason: string
  amount: number
  asTo: boolean
  others: Seat[]
}

function aggregateInstantForSeat(
  payouts: InstantLine[],
  seat: Seat,
): InstantAgg[] {
  const map = new Map<string, InstantAgg>()
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
  return [...map.values()]
}

/** 即時賞罰（暗槓／花等）：仍用 $ */
function instantSummaryForSeat(
  payouts: InstantLine[],
  seat: Seat,
  names: string[],
): string[] {
  const lines: string[] = []
  for (const a of aggregateInstantForSeat(payouts, seat)) {
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

/** 斷拉／踢半等：標籤「結清」，直接寫付咗幾多銀 */
function settleSummaryForSeat(
  payouts: InstantLine[],
  seat: Seat,
  names: string[],
): { text: string; role: 'owe' | 'owed' }[] {
  const lines: { text: string; role: 'owe' | 'owed' }[] = []
  for (const a of aggregateInstantForSeat(payouts, seat)) {
    const short = shortSettleReason(a.reason)
    const role: 'owe' | 'owed' = a.asTo ? 'owed' : 'owe'
    if (a.others.length >= 2) {
      const who = a.others.map((o) => names[o] ?? WIND[o]).join('、')
      const total = a.amount * a.others.length
      lines.push({
        text: a.asTo
          ? `${who}付你 $${total}（${short}）`
          : `付${who} $${total}（${short}）`,
        role,
      })
    } else {
      const o = a.others[0]!
      const name = names[o] ?? WIND[o]
      lines.push({
        text: a.asTo
          ? `${name}付你 $${a.amount}（${short}）`
          : `付${name} $${a.amount}（${short}）`,
        role,
      })
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
  activeFan,
}: {
  player: SettlementPlayer
  win: WinResult | null
  open: boolean
  activeFan: ActiveFan | null
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
    if (!open || !activeFan || !win?.winTile) return null
    return tilesForFanHighlight(activeFan.id, {
      hand: player.hand,
      melds: player.melds,
      flowers: player.flowers,
      winTile: win.winTile,
      winType: win.winType,
      zhengHuaTiles: zhengHuaForSeat(player.seat),
      shop: activeFan.shop,
      instance: activeFan.instance,
    })
  }, [open, activeFan, win, player])

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
    const { meldFlags, left } = assignMeldHighlightFlags(player.melds, counts, {
      skipChi: fanHighlightSkipsChiMelds(activeFan!.id),
    })
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
    <div
      className={`settlement__seat-tiles${
        player.melds.length > 0 ? ' has-melds' : ''
      }`}
    >
      {player.flowers.length > 0 && (
        <TileRow
          tiles={player.flowers}
          size={size}
          selectedFlags={open && activeFan ? flowerFlags : null}
          className="settlement__flowers"
        />
      )}
      <MeldGroup
        melds={player.melds}
        size={size}
        caption
        selectedFlagsByMeld={open && activeFan ? meldFlags : null}
      />
      <div
        className="settlement__hand-main"
        data-hl-shop={activeFan?.shop ?? undefined}
      >
        {mainTiles.map((t, ti) => (
          <Tile
            key={`${t}-${ti}`}
            id={t}
            size={size}
            selected={Boolean(open && activeFan && mainFlags[ti])}
          />
        ))}
      </div>
      {winTile && (
        <div className="settlement__win-slot" title="糊牌">
          <span className="settlement__win-slot-label">糊</span>
          <Tile
            id={winTile}
            size={size}
            selected={Boolean(open && activeFan && winSelected)}
          />
        </div>
      )}
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
  matchMode = 'casual',
  playKind: playKindProp,
  seatIsAi = [false, false, false, false],
  aiPersonas = [],
  matchStartedAt,
  timeoutsSelf = 0,
  timeoutsOpp = 0,
  tenpaiPace = {},
  tacticsBySeat = {},
  cashHistory = [],
  tenpaiPhase = {},
  decisionBySeat = {},
  oppFriendCodes,
  onAddFriend,
}: SettlementProps) {
  const [addedCodes, setAddedCodes] = useState<Set<string>>(() => new Set())
  const playKind: StatsPlayKind =
    playKindProp ?? (matchMode === 'ranked' ? 'ranked' : 'casual')
  const result = view.lastResult
  const matchOver = view.phase === 'match_over'
  const legal = view.phase === 'round_over' || matchOver
  const showSummary = loadRoundSummary()
  const roundLabel = matchRoundLabel(view.windRound, view.dealer)
  /** 預設收起番表，方便睇齊四家 */
  const [expandedWin, setExpandedWin] = useState<number | null>(null)
  const [activeFan, setActiveFan] = useState<ActiveFan | null>(null)
  const recordedKey = useRef<string | null>(null)
  const autoNextKey = useRef<string | null>(null)
  const [rankedLine, setRankedLine] = useState<string | null>(null)

  const youSeat = trackSeats[0]

  const players = useMemo(() => buildPlayers(view, names), [view, names])

  useEffect(() => {
    if (view.phase !== 'round_over' && view.phase !== 'match_over') return
    const rec = toGameRecord(view, names, youSeat)
    if (rec) saveGameRecord(rec)
  }, [view, names, youSeat])

  useEffect(() => {
    const sec = loadSettlementAutoNext()
    if (!sec || view.phase !== 'round_over') return
    const key = `auto:${view.round}`
    if (autoNextKey.current === key) return
    autoNextKey.current = key
    // 自動下一局唔再問確認（手動掣先問）
    const t = window.setTimeout(() => {
      onAction({ type: 'nextRound' }, 0)
    }, sec * 1000)
    return () => window.clearTimeout(t)
  }, [view.phase, view.round, onAction])

  /** 本鋪即時：賞罰 vs 拉帳結清（斷拉等）分開顯示 */
  const { instantBonus, laSettled } = useMemo(() => {
    const bonus: InstantLine[] = []
    const settled: InstantLine[] = []
    for (const p of view.instantPayouts) {
      if (p.reason === '埋單') continue
      if (isLaSettledLine(p)) settled.push(p)
      else bonus.push(p)
    }
    return { instantBonus: bonus, laSettled: settled }
  }, [view.instantPayouts])

  useEffect(() => {
    if (!loadRecordStats()) return
    if (trackSeats.length === 0) return
    if (view.phase === 'round_over') {
      const key = `round:${view.round}|${result?.kind ?? 'x'}|${trackSeats.join(',')}`
      if (recordedKey.current !== key) {
        recordedKey.current = key
        for (const seat of trackSeats) {
          const wallRemaining = view.wallRemaining
          const firstTenpaiTurn = tenpaiPace[seat]
          const firstMeldTurn = firstMeldTurnFromLog(view.actionLog, seat)
          const won =
            result?.kind === 'win' &&
            result.wins.some((w) => w.seat === seat)
          const pl = view.players[seat]
          const prefs = derivePrefsSnapshot(view.actionLog, seat, {
            flowerCount: pl?.flowers.length ?? 0,
            dingActive: pl?.ding != null,
          })
          const discards = pl?.discards.length ?? 0
          const tenpaiToWinTurns =
            won && firstTenpaiTurn != null
              ? Math.max(0, discards - firstTenpaiTurn)
              : undefined
          const dealt =
            result?.kind === 'win' &&
            result.wins.some(
              (w) =>
                w.winType !== 'tsumo' &&
                w.payments.some((p) => p.from === seat && p.to === w.seat),
            )
          let instantBonusNet = 0
          for (const p of view.instantPayouts) {
            if (p.reason === '埋單') continue
            if (p.to === seat) instantBonusNet += p.amount
            if (p.from === seat) instantBonusNet -= p.amount
          }
          const dec = decisionBySeat[seat]
          recordRoundForSeat(result, seat, statsMode, playKind, {
            wasDealer: view.dealer === seat,
            wallRemaining,
            endPhase: phaseFromWall(wallRemaining),
            firstTenpaiTurn,
            firstMeldTurn,
            reachedTenpai: firstTenpaiTurn != null || won,
            tactics: tacticsBySeat[seat],
            prefs,
            firstTenpaiPhase: tenpaiPhase[seat],
            tenpaiToWinTurns,
            decisionMsSum: dec?.decisionMsSum,
            decisionN: dec?.decisionN,
            lowTimeMoves: dec?.lowTimeMoves,
            laNet: laDeltaForSeat(view.laLedger, seat),
            instantBonusNet,
            dealInSuit: dealt
              ? lastDiscardSuitFromLog(view.actionLog, seat)
              : undefined,
            passRegret: countPassRegrets(view.actionLog, seat),
          })
        }
        syncAchievements()
      }
    } else if (matchOver) {
      const key = `match:${view.round}`
      if (recordedKey.current !== key) {
        recordedKey.current = key
        if (youSeat != null) {
          const cash = view.players.map((p) => p.cash)
          const durationSec =
            matchStartedAt != null
              ? Math.max(0, Math.round((Date.now() - matchStartedAt) / 1000))
              : undefined
          const oppAi = ([0, 1, 2, 3] as const).filter(
            (s) => s !== youSeat && seatIsAi[s],
          )
          const humanOpponents = ([0, 1, 2, 3] as const).filter(
            (s) => s !== youSeat && !seatIsAi[s],
          ).length
          const personas = oppAi
            .map((s) => aiPersonas[s])
            .filter((p): p is AiPersona => p === 'steady' || p === 'attack' || p === 'gamble')
          const oppRatings: number[] = []
          for (let s = 0; s < 4; s++) {
            if (s === youSeat) continue
            oppRatings.push(seatIsAi[s] ? RANKED_AI_RATING : RANKED_DEFAULT)
          }
          const oppRatingAvg =
            oppRatings.length === 0
              ? undefined
              : Math.round(
                  oppRatings.reduce((a, b) => a + b, 0) / oppRatings.length,
                )
          let myRatingBefore: number | undefined
          let ratingAfter: number | undefined
          let ratingDelta: number | undefined
          if (playKind === 'ranked') {
            myRatingBefore = loadRankedState().rating
            const { delta, place, state } = recordRankedMatchEnd({
              mySeat: youSeat,
              cash,
              seatIsAi,
            })
            ratingDelta = delta
            ratingAfter = state.rating
            const sum = rankedSummary(state)
            const sign = delta >= 0 ? `+${delta}` : `${delta}`
            setRankedLine(
              `排位 ${sum.tierName} ${sum.rating}（${sign}）· 第${place}名`,
            )
          } else if (playKind === 'ai') {
            myRatingBefore = RANKED_DEFAULT
          }
          const hist =
            cashHistory.length > 0
              ? cashHistory
              : [cash]
          const midIdx = midSnapshotIndex(hist.length)
          const midPlace = placeFromCashSnapshot(
            hist[midIdx] ?? cash,
            youSeat,
          )
          const places = view.players.map((p) => p.cash)
          const finalPlace = placeFromCashSnapshot(places, youSeat)
          const shape = classifyMatchShape(midPlace, finalPlace)
          const ratingForPerf =
            myRatingBefore ??
            (playKind === 'ai' ? RANKED_DEFAULT : undefined)
          const perfRating =
            ratingForPerf != null && oppRatingAvg != null
              ? performanceRating({
                  myRating: ratingForPerf,
                  oppRatingAvg,
                  place: finalPlace,
                })
              : undefined
          recordMatchEnd({
            playKind,
            channel: statsMode,
            mySeat: youSeat,
            cash,
            durationSec,
            vsAi: oppAi.length > 0,
            humanOpponents,
            aiPersonas: personas,
            timeoutsSelf,
            timeoutsOpp,
            rulesBase: view.rules.base,
            rulesFanValue: view.rules.fanValue,
            myRatingBefore,
            ratingAfter,
            ratingDelta,
            oppRatingAvg:
              playKind === 'ranked' || playKind === 'ai'
                ? oppRatingAvg
                : undefined,
            midPlace,
            shape,
            perfRating,
            turnTimeoutSec: view.rules.turnTimeoutSec,
            oppNames: names.filter((_, i) => i !== youSeat),
            endReason: 'normal',
          })
          syncAchievements()
        }
      }
    }
  }, [
    view.phase,
    view.round,
    result,
    trackSeats,
    statsMode,
    matchOver,
    playKind,
    youSeat,
    seatIsAi,
    aiPersonas,
    view.players,
    view.dealer,
    matchStartedAt,
    timeoutsSelf,
    timeoutsOpp,
    tenpaiPace,
    tacticsBySeat,
    cashHistory,
    tenpaiPhase,
    decisionBySeat,
    view.wallRemaining,
    view.actionLog,
    view.laLedger,
    view.instantPayouts,
  ])

  const celebrate =
    loadWinCelebrate() &&
    result?.kind === 'win' &&
    youSeat != null &&
    result.wins.some((w) => w.seat === youSeat)

  return (
    <div
      className={`settlement${showSummary ? '' : ' settlement--compact'}${
        celebrate ? ' settlement--celebrate' : ''
      }`}
    >
      <div className="settlement__panel">
        <header className="settlement__header">
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
            {playKind === 'ranked'
              ? ' · 排位'
              : playKind === 'ai'
                ? ' · AI'
                : playKind === 'private'
                  ? ' · 私人'
                  : ' · 普通'}
          </p>
          {rankedLine && (
            <p className="settlement__ranked" role="status">
              {rankedLine}
            </p>
          )}
        </header>

        <div className="settlement__stack" aria-label="四家結算">
          {players.map((p) => {
            const winIdx =
              result?.wins.findIndex((w) => w.seat === p.seat) ?? -1
            const win = winIdx >= 0 ? result!.wins[winIdx]! : null
            const open = expandedWin === winIdx
            const isYou = youSeat === p.seat
            const winNet = winNetForSeat(result, p.seat)
            const bonusNet = instantNetForSeat(instantBonus, p.seat)
            const settleNet = instantNetForSeat(laSettled, p.seat)
            const cashNet = bonusNet + settleNet
            // 拉帳制：本局只顯示未結清番；銀碼放金池左邊
            const laNet = showLaInline
              ? laDeltaForSeat(view.laLedger, p.seat)
              : 0
            const fv = view.rules.fanValue
            const roundFanLabel = showLaInline
              ? formatFanDelta(laNet, fv)
              : null
            const roundFanSign = showLaInline ? laNet : 0
            const cashLabel = showLaInline
              ? cashNet !== 0
                ? formatMoney(cashNet)
                : null
              : formatMoney(winNet + cashNet)
            const cashSign = showLaInline ? cashNet : winNet + cashNet
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
            const settleLines = settleSummaryForSeat(
              laSettled,
              p.seat,
              names,
            )
            const instLines = instantSummaryForSeat(
              instantBonus,
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
                    {!isYou &&
                      onAddFriend &&
                      oppFriendCodes?.[p.seat] &&
                      (() => {
                        const fc = oppFriendCodes[p.seat]!
                        const done = addedCodes.has(fc)
                        return (
                          <button
                            type="button"
                            className="settlement__add-friend"
                            disabled={done}
                            onClick={() => {
                              onAddFriend(fc)
                              setAddedCodes((prev) => new Set(prev).add(fc))
                            }}
                          >
                            {done ? '已請求' : '加友'}
                          </button>
                        )
                      })()}
                  </div>
                  <div className="settlement__seat-nets">
                    {showLaInline && (
                      <div
                        className={`settlement__seat-net${
                          roundFanSign > 0
                            ? ' is-plus'
                            : roundFanSign < 0
                              ? ' is-minus'
                              : ''
                        }`}
                      >
                        <span className="settlement__net-label">本局</span>
                        {roundFanLabel}
                      </div>
                    )}
                    <div className="settlement__seat-cash-row">
                      {cashLabel != null && (
                        <div
                          className={`settlement__seat-net settlement__seat-net--cash${
                            cashSign > 0
                              ? ' is-plus'
                              : cashSign < 0
                                ? ' is-minus'
                                : ''
                          }`}
                        >
                          {cashLabel}
                        </div>
                      )}
                      <div className="settlement__seat-net settlement__seat-net--pool">
                        <span className="settlement__net-label">金池</span>
                        $
                        {view.players[p.seat]?.cash ?? 0}
                      </div>
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
                        setActiveFan(null)
                      }}
                      aria-expanded={open}
                    >
                      <span>
                        {win.totalFan}番 · {winTypeLabel(win, names)} · 本鋪{' '}
                        {handPayLabel}
                      </span>
                      <span className="settlement__fan-chip-hint">
                        {open ? '收起' : '睇計法'}
                      </span>
                    </button>
                  ) : result?.kind === 'draw' ? (
                    <span className="settlement__seat-sub">流局</span>
                  ) : null}

                  {instLines.length > 0 && (
                    <ul className="settlement__seat-instant">
                      {instLines.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  )}

                  {settleLines.length > 0 && (
                    <ul className="settlement__seat-la">
                      {settleLines.map((line, i) => (
                        <li
                          key={`settle-${i}`}
                          className={
                            line.role === 'owe' ? 'is-owe' : 'is-owed'
                          }
                        >
                          <span>
                            <em className="settlement__la-tag settlement__la-tag--settle">
                              結清
                            </em>
                            {line.text}
                          </span>
                        </li>
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
                  activeFan={open ? activeFan : null}
                />

                {open && win && (
                  <div className="settlement__win-detail">
                    <p className="settlement__hl-hint">
                      撳番種高亮相關牌
                      {activeFan &&
                      (activeFan.id === 'hunmantingfang' ||
                        activeFan.id === 'mantingfang')
                        ? '（帶數＋字組；可分開撳）'
                        : fanShopLabel(activeFan?.shop)
                          ? `（${fanShopLabel(activeFan?.shop)}）`
                          : ''}{' '}
                      · {win.totalFan}番 × ${view.rules.fanValue}＝$
                      {amountFromFan(view.rules, win.totalFan)}
                    </p>
                    <ul className="settlement__fans">
                      {(() => {
                        const hasShops = win.fans.some((f) => f.shop)
                        const renderFan = (f: FanHit) => {
                          const times = fanRepeatTimes(f.id, f.value)
                          const on = sameActiveFan(
                            activeFan,
                            f.id,
                            f.shop,
                            f.instance,
                          )
                          return (
                            <li key={fanListKey(f)}>
                              <FanHoverTip fanId={f.id}>
                                <button
                                  type="button"
                                  className={`settlement__fan-btn${
                                    on ? ' is-active' : ''
                                  }${
                                    f.shop === 'liguligu'
                                      ? ' is-shop-liguligu'
                                      : ''
                                  }${
                                    f.shop === 'standard'
                                      ? ' is-shop-standard'
                                      : ''
                                  }`}
                                  onClick={() =>
                                    setActiveFan((cur) =>
                                      sameActiveFan(
                                        cur,
                                        f.id,
                                        f.shop,
                                        f.instance,
                                      )
                                        ? null
                                        : {
                                            id: f.id,
                                            shop: f.shop,
                                            instance: f.instance,
                                          },
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
                        }
                        if (!hasShops) return win.fans.map(renderFan)
                        const shared = win.fans.filter((f) => !f.shop)
                        const nico = win.fans.filter(
                          (f) => f.shop === 'liguligu',
                        )
                        const std = win.fans.filter(
                          (f) => f.shop === 'standard',
                        )
                        return (
                          <>
                            {shared.map(renderFan)}
                            {nico.length > 0 && (
                              <>
                                <li className="settlement__fan-shop">
                                  {fanShopLabel('liguligu')}
                                </li>
                                {nico.map(renderFan)}
                              </>
                            )}
                            {std.length > 0 && (
                              <>
                                <li className="settlement__fan-shop">
                                  {fanShopLabel('standard')}
                                </li>
                                {std.map(renderFan)}
                              </>
                            )}
                          </>
                        )
                      })()}
                    </ul>
                  </div>
                )}
              </article>
            )
          })}
        </div>

        <div className="settlement__actions">
          {showLaInline && legal && view.laLedger.length > 0 && (
            <button
              type="button"
              className="settlement__replay"
              onClick={() => onAction({ type: 'settleAll' }, 0)}
            >
              埋單清拉
            </button>
          )}
          {view.phase === 'round_over' && (
            <button
              type="button"
              className="settlement__next"
              onClick={() =>
                requestNextRound(() => onAction({ type: 'nextRound' }, 0))
              }
            >
              下一局
            </button>
          )}
          <button type="button" className="settlement__leave" onClick={onLeave}>
            返大廳
          </button>
        </div>
      </div>
    </div>
  )
}
