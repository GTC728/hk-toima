import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ClientMessage,
  JoinResponse,
  RoomSnapshot,
  ServerMessage,
} from '../../../worker/protocol'
import {
  type Action,
  type PrivateGameView,
  type Seat,
  type TableRules,
  AI_PERSONA_LABEL,
  DEFAULT_RULES,
  DEFAULT_STARTING_CASH,
  isReady,
  type AiPersona,
} from '../../engine'
import {
  noteFirstTenpai,
  phaseFromWall,
  type TenpaiPaceMap,
  type TenpaiPhaseMap,
} from '../stats'
import {
  getDecisionTracker,
  resetDecisionTrackers,
  SeatDecisionTracker,
  type DecisionBySeat,
} from '../stats-decision'
import {
  claimWindowKey,
  getSeatTracker,
  playWindowKey,
  resetAllTrackers,
  SeatTacticsTracker,
  type TacticsBySeat,
} from '../stats-tactics'
import { announceCall, playBeep } from '../audio'
import { useTableChrome } from '../useTableChrome'
import { InstantToast } from '../InstantToast'
import { Settlement } from '../Settlement'
import { recordMatchEnd } from '../stats'
import { TableView } from '../TableView'
import { PlaySide } from '../PlaySide'
import { DEFAULT_RULES_DRAFT, type RulesDraft } from '../TableRulesEditor'
import { loadAutoDraw, loadAutoPass, loadClaimChime } from '../extraPrefs'
import { loadAutoFillAi } from '../leftoverPrefs'
import { requestLeave } from '../matchPrefs'
import { SoundCaptions } from '../SoundCaptions'
import { TableQuickSettings } from '../TableQuickSettings'
import { useWakeLock } from '../useWakeLock'
import { clearRoomSession, saveRoomSession } from './session'
import { useRoomSocket } from './useRoomSocket'
import {
  fetchRoomPeers,
  requestFriendByCode,
  type RoomPeer,
} from '../accountClient'
import { RoomLobby } from './RoomLobby'
import { copyText } from '../friendsUi'

function rulesDraftFrom(rules: TableRules): RulesDraft {
  return {
    base: rules.base,
    fanValue: rules.fanValue,
    maxLaKou: rules.maxLaKou,
    fiveTongShunFan: rules.fiveTongShunFan,
    turnTimeoutSec: rules.turnTimeoutSec ?? DEFAULT_RULES_DRAFT.turnTimeoutSec,
    claimTimeoutSec:
      rules.claimTimeoutSec ?? DEFAULT_RULES_DRAFT.claimTimeoutSec,
    matchCircles: rules.matchCircles ?? DEFAULT_RULES_DRAFT.matchCircles,
  }
}

const WIND = ['東', '南', '西', '北'] as const

/** 等開局時中間顯示嘅靜態枱面 */
function idleRoomTableView(
  names: string[],
  rules: RulesDraft,
  you: Seat,
): PrivateGameView {
  const tableRules = { ...DEFAULT_RULES, ...rules }
  return {
    rules: tableRules,
    dice: [1, 2, 3],
    dealer: 0,
    consecutiveWins: 0,
    currentSeat: 0,
    phase: 'playing',
    wallRemaining: 144,
    players: ([0, 1, 2, 3] as Seat[]).map((s) => ({
      seat: s,
      name: names[s] || WIND[s],
      handCount: 16,
      melds: [],
      flowers: [],
      discards: [],
      ding: null,
      isDealer: s === 0,
      cash: DEFAULT_STARTING_CASH,
    })),
    pendingDiscard: null,
    justDrawnVisible: false,
    mustDiscard: false,
    laLedger: [],
    lastResult: null,
    instantPayouts: [],
    round: 1,
    windRound: 0,
    seed: 0,
    actionLog: [],
    you,
    hand: [],
    justDrawn: null,
    legalActions: [],
    passedPong: [],
  }
}

interface OnlineRoomProps {
  join: JoinResponse
  playerName: string
  /** Host draft rules — sent with start */
  rulesDraft: RulesDraft
  /** 匹配入場：房主自動開局（可補 AI） */
  autoStart?: { fillAi: boolean }
  matchMode?: 'casual' | 'ranked'
  playKind?: 'casual' | 'ranked' | 'private' | 'ai'
  onLeave: () => void
  onOpenSettings?: () => void
}

export function OnlineRoom({
  join,
  playerName,
  rulesDraft,
  autoStart,
  matchMode = 'casual',
  playKind = 'private',
  onLeave,
  onOpenSettings,
}: OnlineRoomProps) {
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [view, setView] = useState<PrivateGameView | null>(null)
  const [seat, setSeat] = useState<Seat>(join.seat)
  const [error, setError] = useState<string | null>(null)
  const [eventLog, setEventLog] = useState<string | null>(null)
  const [peers, setPeers] = useState<RoomPeer[] | null>(null)
  const [rules, setRules] = useState<RulesDraft>(rulesDraft)
  const [actionDeadlineAt, setActionDeadlineAt] = useState<number | null>(null)
  const [qsOpen, setQsOpen] = useState(false)
  const phaseRef = useRef<string>('')
  const logLenRef = useRef(0)
  const claimChimeKey = useRef('')
  const matchStartedAt = useRef<number | null>(null)
  const timeoutsSelf = useRef(0)
  const timeoutsOpp = useRef(0)
  const seatRef = useRef(seat)
  seatRef.current = seat
  const viewRef = useRef(view)
  viewRef.current = view
  const tenpaiPace = useRef<TenpaiPaceMap>({})
  const tenpaiPhase = useRef<TenpaiPhaseMap>({})
  const tenpaiRound = useRef<number | null>(null)
  const tacticsMap = useRef(new Map<Seat, SeatTacticsTracker>())
  const tacticsRound = useRef<number | null>(null)
  const tacticsSnap = useRef<TacticsBySeat>({})
  const cashHistory = useRef<number[][]>([])
  const cashRoundKey = useRef<number | null>(null)
  const decisionMap = useRef(new Map<Seat, SeatDecisionTracker>())
  const decisionSnap = useRef<DecisionBySeat>({})
  const startedEarly = room?.started ?? false
  useWakeLock(startedEarly && view != null && view.phase !== 'match_over')
  useEffect(() => {
    if (startedEarly && view && matchStartedAt.current == null) {
      matchStartedAt.current = Date.now()
    }
  }, [startedEarly, view])
  useEffect(() => {
    if (
      !view ||
      (view.phase !== 'round_over' && view.phase !== 'match_over')
    ) {
      return
    }
    let cancelled = false
    void fetchRoomPeers(join.code).then((list) => {
      if (!cancelled && list) setPeers(list)
    })
    return () => {
      cancelled = true
    }
  }, [view?.phase, view?.round, join.code])
  useEffect(() => {
    if (!view) return
    if (tenpaiRound.current !== view.round) {
      tenpaiRound.current = view.round
      tenpaiPace.current = {}
      tenpaiPhase.current = {}
      resetDecisionTrackers(decisionMap.current)
      decisionSnap.current = {}
    }
    if (tacticsRound.current !== view.round) {
      tacticsRound.current = view.round
      resetAllTrackers(tacticsMap.current)
      tacticsSnap.current = {}
    }
    const melds = view.players[seat]?.melds ?? []
    if (view.phase === 'round_over' || view.phase === 'match_over') {
      if (cashRoundKey.current !== view.round) {
        cashRoundKey.current = view.round
        cashHistory.current.push(view.players.map((p) => p.cash))
      }
      const tr = getSeatTracker(tacticsMap.current, seat)
      const chankan =
        view.lastResult?.kind === 'win' &&
        view.lastResult.wins.some(
          (w) => w.seat === seat && w.winType === 'chankan',
        )
      tacticsSnap.current = {
        [seat]: tr.finalize(melds, Boolean(chankan)),
      }
      decisionSnap.current = {
        [seat]: getDecisionTracker(decisionMap.current, seat).snapshot(),
      }
      return
    }
    const phase = phaseFromWall(view.wallRemaining)
    noteFirstTenpai(
      tenpaiPace.current,
      seat,
      isReady(view.hand, melds),
      view.players[seat]?.discards.length ?? 0,
      tenpaiPhase.current,
      phase,
    )
    const tr = getSeatTracker(tacticsMap.current, seat)
    const legal = view.legalActions
    if (view.phase === 'claim_window' && view.pendingDiscard) {
      if (view.pendingDiscard.awaiting.includes(seat)) {
        tr.observe(
          legal,
          claimWindowKey(
            view.pendingDiscard.tile,
            view.pendingDiscard.awaiting,
          ),
          phase,
          view.players[seat]?.discards.length ?? 0,
        )
      }
    } else if (view.currentSeat === seat) {
      tr.observe(
        legal,
        playWindowKey(
          view.round,
          view.phase,
          seat,
          view.justDrawn,
        ),
        phase,
        view.players[seat]?.discards.length ?? 0,
      )
    }
  }, [view, seat])
  const selectionKey = view
    ? `${view.phase}|${view.justDrawn ?? ''}|${view.hand.join(',')}`
    : 'lobby'
  const {
    selectedTile,
    setSelectedTile,
    declareDing,
    setDeclareDing,
    remainSec,
  } = useTableChrome({
    actionLog: view?.actionLog,
    deadlineAt: actionDeadlineAt,
    selectionKey,
  })

  const onMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'welcome':
        setSeat(msg.seat)
        setRoom(msg.room)
        setRules(rulesDraftFrom(msg.room.rules))
        saveRoomSession({
          code: msg.code,
          seat: msg.seat,
          seatToken: msg.seatToken,
          name: playerName,
        })
        break
      case 'room':
        setRoom(msg.room)
        setRules(rulesDraftFrom(msg.room.rules))
        break
      case 'private':
        setView(msg.view)
        setActionDeadlineAt(
          msg.actionDeadlineAt === undefined
            ? null
            : msg.actionDeadlineAt,
        )
        break
      case 'public':
        if (msg.actionDeadlineAt !== undefined) {
          setActionDeadlineAt(msg.actionDeadlineAt)
        }
        break
      case 'error':
        setError(msg.message)
        break
      case 'event':
        setEventLog(msg.message)
        if (/時限到/.test(msg.message)) {
          const me = seatRef.current
          const v = viewRef.current
          if (/出牌/.test(msg.message)) {
            if (v?.currentSeat === me) timeoutsSelf.current += 1
            else timeoutsOpp.current += 1
          } else if (/鳴牌/.test(msg.message)) {
            const awaiting = v?.pendingDiscard?.awaiting ?? []
            if (awaiting.includes(me)) timeoutsSelf.current += 1
            else {
              const others = awaiting.filter((s) => s !== me).length
              timeoutsOpp.current += Math.max(1, others)
            }
          }
        }
        // Fallback voice cues from event text
        if (/碰/.test(msg.message)) announceCall('pong')
        else if (/上|吃/.test(msg.message)) announceCall('chi')
        else if (/槓/.test(msg.message)) announceCall('kong')
        else if (/食|糊|自摸/.test(msg.message)) announceCall('win')
        else if (/叮/.test(msg.message)) announceCall('ding')
        break
      case 'pong':
        break
    }
  }, [playerName])

  const { status, lastError, send } = useRoomSocket({
    wsPath: join.wsPath,
    onMessage,
  })

  // 舊 worker 無新 actionLog 時，食糊相位變化作後備報牌
  useEffect(() => {
    if (!view) return
    const logLen = view.actionLog?.length ?? 0
    const grew = logLen > logLenRef.current
    if (
      !grew &&
      phaseRef.current &&
      phaseRef.current !== view.phase &&
      view.phase === 'round_over' &&
      view.lastResult?.kind === 'win'
    ) {
      announceCall('win')
    }
    phaseRef.current = view.phase
    logLenRef.current = logLen
  }, [view])

  const isHost = room != null && seat === room.hostSeat
  const started = room?.started ?? false
  const names = useMemo(
    () => room?.seats.map((s) => s.name) ?? ['東', '南', '西', '北'],
    [room],
  )
  const isHuman = useMemo(
    () =>
      room?.seats.map((s) => s.kind === 'human') ?? [true, false, false, false],
    [room],
  )
  const personaLabels = useMemo(() => {
    const labels: (string | null)[] = [null, null, null, null]
    for (const s of room?.seats ?? []) {
      labels[s.seat] =
        s.kind === 'ai' ? AI_PERSONA_LABEL[s.persona ?? 'attack'] : null
    }
    return labels
  }, [room])

  function sendMsg(msg: ClientMessage) {
    setError(null)
    if (!send(msg)) setError('未連上房間，稍後再試')
  }

  function dispatchAction(action: Action) {
    getSeatTracker(tacticsMap.current, seat).onAction(action)
    getDecisionTracker(decisionMap.current, seat).noteAction(
      Date.now(),
      remainSec,
    )
    sendMsg({ type: 'action', action })
  }

  useEffect(() => {
    if (!view || actionDeadlineAt == null) return
    if (view.phase === 'round_over' || view.phase === 'match_over') return
    getDecisionTracker(decisionMap.current, seat).openTurn(
      Date.now(),
      remainSec,
    )
  }, [actionDeadlineAt, view?.phase, view?.round, seat])

  const autoStartSent = useRef(false)
  useEffect(() => {
    if (!autoStart || autoStartSent.current) return
    if (!isHost || started || !room) return
    if (status !== 'open') return
    autoStartSent.current = true
    sendMsg({
      type: 'start',
      fillAi: autoStart.fillAi,
      rules: { ...rules },
    })
  }, [autoStart, isHost, started, room, status, rules])

  const autoSoloKey = useRef('')
  useEffect(() => {
    if (!view || !started) return
    const legal = view.legalActions
    if (legal.length !== 1) return
    const only = legal[0]!
    if (only.type === 'draw' && loadAutoDraw()) {
      const key = `${selectionKey}|draw`
      if (autoSoloKey.current === key) return
      autoSoloKey.current = key
      getSeatTracker(tacticsMap.current, seat).noteAutoDraw()
      dispatchAction(only)
      return
    }
    if (only.type === 'pass' && loadAutoPass()) {
      const key = `${selectionKey}|pass`
      if (autoSoloKey.current === key) return
      autoSoloKey.current = key
      getSeatTracker(tacticsMap.current, seat).noteAutoPass()
      dispatchAction(only)
    }
  }, [view, started, selectionKey])

  useEffect(() => {
    if (!loadClaimChime() || !view) return
    if (view.phase !== 'claim_window') return
    const canClaim = view.legalActions.some(
      (a) =>
        a.type === 'pong' ||
        a.type === 'chi' ||
        a.type === 'mingkong' ||
        a.type === 'win' ||
        a.type === 'pass',
    )
    if (!canClaim) return
    const key = `${view.phase}|${view.pendingDiscard?.tile ?? ''}|${selectionKey}`
    if (claimChimeKey.current === key) return
    claimChimeKey.current = key
    playBeep(720, 75, 'triangle', 0.08)
  }, [view, selectionKey])

  function leave() {
    requestLeave(() => {
      if (
        started &&
        view &&
        view.phase !== 'match_over' &&
        matchStartedAt.current != null
      ) {
        const cash = view.players.map((p) => p.cash)
        recordMatchEnd({
          playKind,
          channel: 'online',
          mySeat: seat,
          cash,
          durationSec: Math.max(
            0,
            Math.round((Date.now() - matchStartedAt.current) / 1000),
          ),
          vsAi: isHuman.some((h) => !h),
          humanOpponents: isHuman.filter((h, i) => h && i !== seat).length,
          timeoutsSelf: timeoutsSelf.current,
          timeoutsOpp: timeoutsOpp.current,
          rulesBase: view.rules.base,
          rulesFanValue: view.rules.fanValue,
          turnTimeoutSec: view.rules.turnTimeoutSec,
          oppNames: names.filter((_, i) => i !== seat),
          endReason: 'you_left',
        })
      }
      clearRoomSession()
      onLeave()
    }, '確定離開房間？')
  }

  const panel = view ? (
    <PlaySide
      names={names}
      actionLog={view.actionLog ?? []}
      viewSeat={seat}
      rules={view.rules}
      instantPayouts={view.instantPayouts}
      laLedger={view.laLedger}
      lastResult={view.lastResult}
      phase={view.phase}
      roomCode={join.code}
      seats={(room?.seats ?? []).map((s) => ({
        seat: s.seat,
        name: s.name,
        detail:
          s.kind === 'human'
            ? s.connected
              ? '真人 · 在線'
              : '真人 · 離線'
            : s.kind === 'ai'
              ? `AI · ${AI_PERSONA_LABEL[s.persona ?? 'attack']}`
              : '空位',
      }))}
      hintLines={null}
      hintNote="網上牌局不顯示練習提示。"
      onNextRound={
        view.phase === 'round_over' ? () => dispatchAction({ type: 'nextRound' }) : undefined
      }
      onSettleLa={
        (view.phase === 'round_over' || view.phase === 'match_over') &&
        view.laLedger.length > 0
          ? () => dispatchAction({ type: 'settleAll' })
          : undefined
      }
      onLeave={leave}
    />
  ) : null

  // —— Settlement ——
  if (
    started &&
    view &&
    (view.phase === 'round_over' || view.phase === 'match_over')
  ) {
    return (
      <div className="table-wrap">
        <div className="table-wrap__main">
          <Settlement
            view={view}
            names={names}
            onAction={(a) => dispatchAction(a)}
            onLeave={leave}
            trackSeats={[seat]}
            statsMode="online"
            matchMode={matchMode}
            playKind={playKind}
            seatIsAi={isHuman.map((h) => !h)}
            aiPersonas={([0, 1, 2, 3] as Seat[]).map((s) => {
              const seatInfo = room?.seats.find((x) => x.seat === s)
              return seatInfo?.kind === 'ai'
                ? (seatInfo.persona ?? 'attack')
                : null
            })}
            matchStartedAt={matchStartedAt.current ?? undefined}
            timeoutsSelf={timeoutsSelf.current}
            timeoutsOpp={timeoutsOpp.current}
            tenpaiPace={tenpaiPace.current}
            tenpaiPhase={tenpaiPhase.current}
            tacticsBySeat={tacticsSnap.current}
            cashHistory={cashHistory.current}
            decisionBySeat={decisionSnap.current}
            oppFriendCodes={
              peers
                ? Object.fromEntries(
                    peers.map((p) => [p.seat as Seat, p.friendCode]),
                  )
                : undefined
            }
            onAddFriend={
              peers
                ? (friendCode) => {
                    void requestFriendByCode(friendCode).then((r) => {
                      if (!r.ok) {
                        setError(r.error)
                        return
                      }
                      setEventLog(`已向 ${friendCode} 送出好友請求`)
                      setError(null)
                    })
                  }
                : undefined
            }
          />
        </div>
        {panel}
      </div>
    )
  }

  // —— In-game table ——
  if (started && view) {
    return (
      <div className="table-wrap">
        <div className="table-wrap__main">
        <InstantToast payouts={view.instantPayouts} names={names} />
        <TableView
          view={view}
          isHuman={isHuman}
          selectedTile={selectedTile}
          declareDing={declareDing}
          onSelectTile={setSelectedTile}
          onToggleDing={() => setDeclareDing((d) => !d)}
          onAction={dispatchAction}
          remainSec={remainSec}
          personaLabels={personaLabels}
        />
        {(error || lastError) && (
          <p className="table__error">{error || lastError}</p>
        )}
        <div className="table__chrome-links">
          <button
            type="button"
            className="table__leave-link"
            onClick={() => setQsOpen(true)}
          >
            設定
          </button>
          <button type="button" className="table__leave-link" onClick={leave}>
            離開房間
          </button>
        </div>
        <SoundCaptions />
        <TableQuickSettings
          open={qsOpen}
          onClose={() => setQsOpen(false)}
          onOpenFull={
            onOpenSettings
              ? () => {
                  setQsOpen(false)
                  onOpenSettings()
                }
              : undefined
          }
        />
        </div>
        {panel}
      </div>
    )
  }

  // —— Online lobby：中間靜態枱 · 右側房間欄 ——
  const statusLabel =
    status === 'open' ? '已連線' : status === 'connecting' ? '連線中…' : '未連線'
  const roomRulesSummary = room
    ? `底 ${room.rules.base}番 · $${room.rules.fanValue}/番 · 拉 ${room.rules.maxLaKou}口 · 五同順 ${room.rules.fiveTongShunFan}番 · 出牌 ${room.rules.turnTimeoutSec}s · 鳴牌 ${room.rules.claimTimeoutSec}s · ${room.rules.matchCircles}圈`
    : null
  const waitNames = (room?.seats ?? []).map(
    (s) => s.name || WIND[s.seat] || playerName,
  )
  while (waitNames.length < 4) waitNames.push(WIND[waitNames.length]!)
  const idleView = idleRoomTableView(waitNames, rules, seat)
  const waitHuman = ([0, 1, 2, 3] as Seat[]).map(
    (s) => room?.seats.find((x) => x.seat === s)?.kind === 'human',
  )

  return (
    <div className="table-wrap">
      <div className="table-wrap__main">
        <TableView
          staticTable
          view={idleView}
          isHuman={waitHuman}
          selectedTile={null}
          declareDing={false}
          onSelectTile={() => {}}
          onToggleDing={() => {}}
          onAction={() => {}}
          personaLabels={([0, 1, 2, 3] as Seat[]).map((s) => {
            const info = room?.seats.find((x) => x.seat === s)
            return info?.kind === 'ai'
              ? AI_PERSONA_LABEL[info.persona ?? 'attack']
              : null
          })}
        />
      </div>
      <RoomLobby
        code={join.code}
        seat={seat}
        isHost={isHost}
        statusLabel={statusLabel}
        seats={room?.seats ?? []}
        hostSeat={room?.hostSeat ?? 0}
        rules={rules}
        roomRulesSummary={roomRulesSummary}
        started={started}
        error={error || lastError}
        eventLog={eventLog}
        onCopyCode={() => {
          void copyText(join.code)
        }}
        onRulesChange={setRules}
        onRulesCommit={(next) => sendMsg({ type: 'setRules', rules: next })}
        onSetPersona={(s, persona) =>
          sendMsg({ type: 'setAiPersona', seat: s, persona })
        }
        onToggleAi={(s, kind) =>
          sendMsg({ type: 'setSeatKind', seat: s, kind })
        }
        onFillAi={() => sendMsg({ type: 'fillAi' })}
        onStart={() =>
          sendMsg({
            type: 'start',
            fillAi: loadAutoFillAi(),
            rules: { ...rules },
          })
        }
        onLeave={leave}
      />
    </div>
  )
}
