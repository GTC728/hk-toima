import { useEffect, useRef, useState } from 'react'
import {
  AI_PERSONA_LABEL,
  AI_PERSONA_ORDER,
  DEFAULT_RULES,
  DEFAULT_STARTING_CASH,
  defaultAiPersonas,
  type AiPersona,
  type PrivateGameView,
  type Seat,
} from '../engine'
import { TableRulesEditor, type RulesDraft } from './TableRulesEditor'
import {
  createRoom,
  joinMatch,
  joinRoom,
  leaveMatch,
  matchStatus,
  type MatchMode,
} from './online/api'
import type { JoinResponse } from '../../worker/protocol'
import {
  clearRoomSession,
  loadRoomSession,
  loadSessionForCode,
  saveRoomSession,
} from './online/session'
import { isMuted, setMuted } from './audio'
import {
  fillAiAfterLabel,
  loadDefaultAiPersona,
  loadDefaultPlayKind,
  loadMatchFillAiAfter,
} from './matchPrefs'
import { loadRankedState, pullRankedFromServer, rankedSummary } from './rankedPrefs'
import { loadDefaultRules, saveDefaultRules } from './rulesPrefs'
import { loadPracticeHints, savePracticeHints } from './playPrefs'
import { buildSeatNames, resolveStartNames } from './playerNames'
import { lobbyDisplayName } from './account'
import { fetchMe, pingFriendsPresence, updateDisplayName } from './accountClient'
import { MagicLinkLogin } from './MagicLinkLogin'
import { TableView } from './TableView'

const SEAT_LABELS = ['東', '南', '西', '北'] as const
const SHOW_HAND = [
  'man-1', 'man-2', 'man-3', 'man-4', 'man-5', 'man-6', 'man-7', 'man-8',
  'pin-1', 'pin-3', 'pin-5', 'pin-7', 'sou-2', 'sou-5', 'sou-8', 'wind-east',
] as const

function idleTableView(names: string[], rules: RulesDraft): PrivateGameView {
  const tableRules = { ...DEFAULT_RULES, ...rules }
  return {
    rules: tableRules,
    dice: [1, 2, 3],
    dealer: 0,
    consecutiveWins: 0,
    currentSeat: 0,
    phase: 'playing',
    wallRemaining: 144,
    players: ([0, 1, 2, 3] as Seat[]).map((seat) => ({
      seat,
      name: names[seat] || SEAT_LABELS[seat],
      handCount: 16,
      melds: [],
      flowers: [],
      discards: [],
      ding: null,
      isDealer: seat === 0,
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
    you: 0,
    hand: [...SHOW_HAND],
    justDrawn: null,
    legalActions: [],
    passedPong: [],
  }
}

function DeskIcon({ name }: { name: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'table' && (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
          <path d="M8 12h8" />
        </>
      )}
      {name === 'fans' && <path d="M5 7h14M5 12h10M5 17h12" />}
      {name === 'calc' && (
        <>
          <rect x="5" y="3.5" width="14" height="17" rx="2" />
          <path d="M8 8h8M8 12h3M13 12h3M8 16h3M13 16h3" />
        </>
      )}
      {name === 'book' && (
        <>
          <path d="M6 4.5h11a2 2 0 0 1 2 2V19H8a2 2 0 0 0-2 2V4.5z" />
          <path d="M6 4.5A2 2 0 0 0 4 6.5V19" />
        </>
      )}
      {name === 'learn' && (
        <>
          <rect x="7" y="4" width="10" height="13" rx="1.5" />
          <path d="M5 7.5v11A1.5 1.5 0 0 0 6.5 20H16" />
        </>
      )}
      {name === 'puzzles' && (
        <>
          <path d="M10 4h4v3.2a2 2 0 1 0 0 3.6V14H7V10.8a2 2 0 1 0 0-3.6V4h3z" />
          <path d="M14 14v3.2a2 2 0 1 1-4 0V14h4z" />
        </>
      )}
      {name === 'stats' && <path d="M4 17l5-6 3.5 3.5L20 6" />}
      {name === 'you' && (
        <>
          <circle cx="12" cy="8" r="3" />
          <path d="M5.5 19.5c1.4-3 11.6-3 13 0" />
        </>
      )}
      {name === 'gear' && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2.2M12 18.3V20.5M3.5 12h2.2M18.3 12H20.5M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
        </>
      )}
      {name === 'sound' && (
        <>
          <path d="M4 10h3l4-3v10l-4-3H4z" />
          <path d="M16 9.5a3.5 3.5 0 0 1 0 5" />
        </>
      )}
      {name === 'mute' && (
        <>
          <path d="M4 10h3l4-3v10l-4-3H4z" />
          <path d="M16 10l4 4M20 10l-4 4" />
        </>
      )}
      {name === 'room' && (
        <>
          <path d="M5 20V8l7-4 7 4v12" />
          <path d="M10 20v-6h4v6" />
        </>
      )}
      {name === 'join' && (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 12h8M12 8v8" />
        </>
      )}
      {name === 'cpu' && (
        <>
          <rect x="4" y="5" width="16" height="11" rx="2" />
          <path d="M8 20h8" />
        </>
      )}
      {name === 'back' && (
        <>
          <path d="M4 12a8 8 0 1 0 2.2-5.5" />
          <path d="M4 5v5h5" />
        </>
      )}
      {name === 'match' && (
        <>
          <circle cx="9" cy="12" r="4" />
          <circle cx="15" cy="12" r="4" />
        </>
      )}
      {name === 'rank' && (
        <>
          <path d="M7 19V10h3v9M14 19V5h3v14M4 19h16" />
        </>
      )}
    </svg>
  )
}

type DeskView = 'home' | 'play' | 'login'

export function DeskRail({
  page,
  current,
  accountOn,
  initial,
  muted,
  onHome,
  onPlay,
  onLogin,
  onOpenYou,
  onOpenFans,
  onOpenCalculator,
  onOpenLaBook,
  onOpenTutorial,
  onOpenPuzzles,
  onOpenStats,
  onOpenSettings,
  onToggleMute,
}: {
  page: 'home' | 'play'
  current?:
    | 'home'
    | 'play'
    | 'fans'
    | 'calc'
    | 'book'
    | 'learn'
    | 'puzzles'
    | 'stats'
    | 'you'
    | 'settings'
  accountOn: boolean
  initial: string
  muted: boolean
  onHome: () => void
  onPlay: () => void
  onLogin: () => void
  onOpenYou?: () => void
  onOpenFans: () => void
  onOpenCalculator?: () => void
  onOpenLaBook?: () => void
  onOpenTutorial?: () => void
  onOpenPuzzles?: () => void
  onOpenStats?: () => void
  onOpenSettings?: () => void
  onToggleMute: () => void
}) {
  /** accountOn = 已用電郵登入；匿名本機 session 唔算登入 */
  const account = () => {
    if (accountOn && onOpenYou) onOpenYou()
    else onLogin()
  }
  const here = current ?? (page === 'play' ? 'play' : 'home')
  return (
    <aside className="desk__nav">
      <button type="button" className="desk__brand" onClick={onHome} aria-label="香港台麻，返回首頁">
        <i>萬</i>
        {page === 'home' && <span>台麻</span>}
      </button>
      <nav aria-label="功能">
        <button type="button" className={here === 'play' ? 'is-on' : ''} onClick={onPlay}>
          <DeskIcon name="table" /><span>開枱</span>
        </button>
        <button type="button" className={here === 'fans' ? 'is-on' : ''} onClick={onOpenFans}><DeskIcon name="fans" /><span>番數表</span></button>
        {onOpenCalculator && (
          <button type="button" className={here === 'calc' ? 'is-on' : ''} onClick={onOpenCalculator}><DeskIcon name="calc" /><span>計番機</span></button>
        )}
        {onOpenLaBook && (
          <button type="button" className={here === 'book' ? 'is-on' : ''} onClick={onOpenLaBook}><DeskIcon name="book" /><span>拉數簿</span></button>
        )}
        {onOpenTutorial && (
          <button type="button" className={here === 'learn' ? 'is-on' : ''} onClick={onOpenTutorial}><DeskIcon name="learn" /><span>學打牌</span></button>
        )}
        {onOpenPuzzles && (
          <button type="button" className={here === 'puzzles' ? 'is-on' : ''} onClick={onOpenPuzzles}><DeskIcon name="puzzles" /><span>題庫</span></button>
        )}
        {onOpenStats && (
          <button type="button" className={here === 'stats' ? 'is-on' : ''} onClick={onOpenStats}><DeskIcon name="stats" /><span>戰績</span></button>
        )}
        {onOpenYou && (
          <button type="button" className={here === 'you' ? 'is-on' : ''} onClick={onOpenYou}><DeskIcon name="you" /><span>個人</span></button>
        )}
        {onOpenSettings && (
          <button type="button" className={here === 'settings' ? 'is-on' : ''} onClick={onOpenSettings}><DeskIcon name="gear" /><span>設定</span></button>
        )}
      </nav>
      <div className="desk__rail-foot">
        {page === 'home' && (
          <button type="button" className="desk__go" onClick={onPlay}>開始打牌</button>
        )}
        <button type="button" className="desk__login-link" onClick={account}>
          {page === 'play' && <span className="desk__avatar">{initial}</span>}
          <span>{accountOn ? '帳戶' : '登入電郵'}</span>
        </button>
        <button type="button" className="desk__mute" aria-pressed={muted} onClick={onToggleMute}>
          <DeskIcon name={muted ? 'mute' : 'sound'} />
          <span>{muted ? '已靜音' : '靜音'}</span>
        </button>
      </div>
    </aside>
  )
}

export interface LobbyStartConfig {
  humanSeats: boolean[]
  names: string[]
  rules: RulesDraft
  /** 練習提示：棄牌高亮；本機預設開 */
  practiceHints: boolean
  /** 每座性格。真人位唔會用；AI 預設按座位順序穩陣、進攻、搏糊。 */
  aiPersonas: AiPersona[]
}

/** 開枱玩法 */
export type PlayKind = 'casual' | 'ranked' | 'private' | 'ai'
type PrivateStep = 'menu' | 'create' | 'join'

const PLAY_KINDS: {
  id: PlayKind
  icon: string
  title: string
  hint: string
}[] = [
  { id: 'casual', icon: 'match', title: '普通', hint: '匹配對手，輕鬆一局' },
  { id: 'ranked', icon: 'rank', title: '排位', hint: '段位分數，近分優先配' },
  { id: 'private', icon: 'room', title: '私人房間', hint: '開房或入朋友的房' },
  { id: 'ai', icon: 'cpu', title: '和 AI 對戰', hint: '你一個人，對三個 AI' },
]

export interface OnlineEnterOpts {
  autoStart?: { fillAi: boolean }
  /** casual／ranked 匹配；私人房用 private */
  matchMode?: MatchMode | 'private'
}

interface LobbyProps {
  onStartLocal: (config: LobbyStartConfig) => void
  onEnterOnline: (
    join: JoinResponse,
    name: string,
    rules: RulesDraft,
    opts?: OnlineEnterOpts,
  ) => void
  onOpenFans: () => void
  onOpenCalculator?: () => void
  onOpenLaBook?: () => void
  onOpenTutorial?: () => void
  onOpenPuzzles?: () => void
  onOpenStats?: () => void
  onOpenInsights?: () => void
  onOpenSettings?: () => void
  onOpenYou?: (tab?: import('./youTab').YouTab) => void
}

export function Lobby({
  onStartLocal,
  onEnterOnline,
  onOpenFans,
  onOpenCalculator,
  onOpenLaBook,
  onOpenTutorial,
  onOpenPuzzles,
  onOpenStats,
  onOpenInsights,
  onOpenSettings,
  onOpenYou,
}: LobbyProps) {
  const saved = loadRoomSession()
  const [playKind, setPlayKind] = useState<PlayKind | null>(() => {
    if (typeof window !== 'undefined' && /^#\/join\//.test(window.location.hash)) {
      return 'private'
    }
    return loadDefaultPlayKind()
  })
  const [privateStep, setPrivateStep] = useState<PrivateStep>(() =>
    typeof window !== 'undefined' && /^#\/join\//.test(window.location.hash)
      ? 'join'
      : 'menu',
  )
  const [human, setHuman] = useState<boolean[]>([true, false, false, false])
  const [names, setNames] = useState(() =>
    buildSeatNames([true, false, false, false]),
  )
  const [personas, setPersonas] = useState<AiPersona[]>(() =>
    defaultAiPersonas([true, false, false, false], loadDefaultAiPersona()),
  )
  const [rules, setRules] = useState<RulesDraft>(() => loadDefaultRules())
  function updateRules(next: RulesDraft) {
    setRules(next)
    saveDefaultRules(next)
  }
  /** 本機跟設定頁；切去網上只係畫面關掉，唔覆寫已存的選擇 */
  const [practiceHints, setPracticeHints] = useState(loadPracticeHints)
  const [muted, setMutedUi] = useState(() => isMuted())
  const [playerName, setPlayerName] = useState(saved?.name || '玩家')
  const [accountName, setAccountName] = useState<string | null>(null)
  const [accountEmail, setAccountEmail] = useState<string | null>(null)
  const nameEdited = useRef(false)
  const [joinCode, setJoinCode] = useState(() => {
    if (typeof window === 'undefined') return saved?.code || ''
    const m = /^#\/join\/([A-Za-z0-9]{6})$/.exec(window.location.hash)
    return m ? m[1]!.toUpperCase() : saved?.code || ''
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matchTicket, setMatchTicket] = useState<string | null>(null)
  const [matchMode, setMatchMode] = useState<MatchMode>('casual')
  const [matchPos, setMatchPos] = useState(1)
  const [matchQueueSize, setMatchQueueSize] = useState(1)
  const [matchWaited, setMatchWaited] = useState(0)
  const [matchFillAfter, setMatchFillAfter] = useState(15)
  const matchTicketRef = useRef<string | null>(null)
  const matchModeRef = useRef<MatchMode>('casual')
  const [view, setView] = useState<DeskView>(() => {
    if (typeof window === 'undefined') return 'play'
    if (window.location.hash === '#/login') return 'login'
    if (window.location.hash === '#/home') return 'home'
    return 'play'
  })

  function go(next: DeskView) {
    setView(next)
    const base = window.location.pathname + window.location.search
    const hash = next === 'play' ? '' : `#/${next}`
    window.history.replaceState(null, '', `${base}${hash}`)
  }

  useEffect(() => {
    const localName = loadRoomSession()?.name || '玩家'
    let cancelled = false
    async function refreshAccount() {
      const me = await fetchMe()
      if (cancelled || !me) return
      // 匿名 session 只係背景；有電郵先算「已登入」
      setAccountName(me.displayName)
      setAccountEmail(me.email)
      if (!nameEdited.current) {
        setPlayerName(lobbyDisplayName(me.displayName, localName))
      }
      if (me.email) void pullRankedFromServer()
      void pingFriendsPresence()
    }
    void refreshAccount()
    const presence = window.setInterval(() => void pingFriendsPresence(), 60_000)
    return () => {
      cancelled = true
      window.clearInterval(presence)
    }
  }, [])

  async function refreshAccountUi() {
    const me = await fetchMe()
    if (!me) return
    setAccountName(me.displayName)
    setAccountEmail(me.email)
  }

  function closeLoginModal() {
    go('home')
  }

  async function commitName() {
    const next = playerName.trim()
    if (!next || next === accountName) return
    const updated = await updateDisplayName(next)
    if (!updated) return
    setAccountName(updated.displayName)
    setPlayerName(updated.displayName)
  }

  /** 和 AI：恆定一人 + 三 AI；只改你坐邊個風位 */
  function setYouSeat(seat: Seat) {
    const next = ([0, 1, 2, 3] as Seat[]).map((i) => i === seat)
    setHuman(next)
    const built = buildSeatNames(next)
    setNames(
      built.map((n, i) => (i === seat ? playerName.trim() || n : n)),
    )
    setPersonas(defaultAiPersonas(next, loadDefaultAiPersona()))
  }

  function cycleAiPersona(seat: Seat) {
    if (human[seat]) return
    setPersonas((prev) => {
      const next = [...prev] as AiPersona[]
      const cur = next[seat] ?? 'attack'
      const i = AI_PERSONA_ORDER.indexOf(cur)
      next[seat] = AI_PERSONA_ORDER[(i + 1) % AI_PERSONA_ORDER.length]!
      return next
    })
  }

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      await commitName()
      const join = await createRoom(playerName.trim() || '東')
      saveRoomSession({
        code: join.code,
        seat: join.seat,
        seatToken: join.seatToken,
        name: playerName.trim() || '東',
      })
      onEnterOnline(join, playerName.trim() || '東', rules, {
        matchMode: 'private',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(reconnect = false) {
    setBusy(true)
    setError(null)
    try {
      const code = joinCode.trim().toUpperCase()
      if (code.length !== 6) throw new Error('請輸入 6 位房碼')
      if (!reconnect) await commitName()
      const session = reconnect ? loadSessionForCode(code) : null
      const join = await joinRoom({
        code,
        name: playerName.trim() || undefined,
        seatToken: session?.seatToken,
      })
      saveRoomSession({
        code: join.code,
        seat: join.seat,
        seatToken: join.seatToken,
        name: playerName.trim() || '玩家',
      })
      onEnterOnline(join, playerName.trim() || '玩家', rules, {
        matchMode: 'private',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleReconnectSaved() {
    if (!saved) return
    setJoinCode(saved.code)
    setPlayerName(saved.name)
    setBusy(true)
    setError(null)
    try {
      const join = await joinRoom({
        code: saved.code,
        name: saved.name,
        seatToken: saved.seatToken,
      })
      saveRoomSession({
        code: join.code,
        seat: join.seat,
        seatToken: join.seatToken,
        name: saved.name,
      })
      onEnterOnline(join, saved.name, rules, { matchMode: 'private' })
    } catch (e) {
      clearRoomSession()
      setError(
        e instanceof Error
          ? `重連失敗：${e.message}`
          : '重連失敗，請重新入房',
      )
    } finally {
      setBusy(false)
    }
  }

  function startAi() {
    onStartLocal({
      humanSeats: human,
      names: resolveStartNames(
        human,
        names.map((n, i) => (human[i] ? playerName.trim() || n : n)),
      ),
      rules,
      practiceHints,
      aiPersonas: personas,
    })
  }

  function enterMatched(
    join: JoinResponse,
    fillAi: boolean,
    name: string,
    mode: MatchMode,
  ) {
    saveRoomSession({
      code: join.code,
      seat: join.seat,
      seatToken: join.seatToken,
      name,
    })
    setMatchTicket(null)
    matchTicketRef.current = null
    onEnterOnline(join, name, rules, {
      autoStart: { fillAi },
      matchMode: mode,
    })
  }

  async function handleStartMatch(mode: MatchMode) {
    setBusy(true)
    setError(null)
    try {
      await commitName()
      const name = playerName.trim() || '玩家'
      const fillAiAfterSec = loadMatchFillAiAfter(mode)
      if (mode === 'ranked') await pullRankedFromServer()
      setMatchMode(mode)
      matchModeRef.current = mode
      const res = await joinMatch({
        mode,
        name,
        fillAiAfterSec,
        rules: { ...rules },
        rating: mode === 'ranked' ? loadRankedState().rating : undefined,
      })
      if (res.status === 'matched') {
        enterMatched(res.join, res.fillAi, name, mode)
        return
      }
      if (res.status !== 'queued') {
        throw new Error('匹配失敗')
      }
      setMatchTicket(res.ticketId)
      matchTicketRef.current = res.ticketId
      setMatchPos(res.position)
      setMatchQueueSize(res.queueSize)
      setMatchWaited(res.waitedSec)
      setMatchFillAfter(res.fillAiAfterSec)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleCancelMatch() {
    const id = matchTicketRef.current
    if (id) {
      try {
        await leaveMatch(id, matchModeRef.current)
      } catch {
        /* ignore */
      }
    }
    matchTicketRef.current = null
    setMatchTicket(null)
    setBusy(false)
  }

  useEffect(() => {
    if (!matchTicket) return
    let cancelled = false
    const tick = async () => {
      try {
        const res = await matchStatus(matchTicket, matchMode)
        if (cancelled) return
        if (res.status === 'matched') {
          const name = playerName.trim() || '玩家'
          enterMatched(res.join, res.fillAi, name, matchModeRef.current)
          return
        }
        if (res.status === 'queued') {
          setMatchPos(res.position)
          setMatchQueueSize(res.queueSize)
          setMatchWaited(res.waitedSec)
          setMatchFillAfter(res.fillAiAfterSec)
          return
        }
        setMatchTicket(null)
        matchTicketRef.current = null
        setError(res.status === 'gone' ? res.error || '匹配已取消' : '匹配已結束')
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
        }
      }
    }
    void tick()
    const t = window.setInterval(() => void tick(), 1500)
    return () => {
      cancelled = true
      window.clearInterval(t)
    }
    // enterMatched / playerName 穩定用 ref；刻意唔跟住變
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchTicket, matchMode])

  useEffect(() => {
    return () => {
      const id = matchTicketRef.current
      if (id) void leaveMatch(id, matchModeRef.current)
    }
  }, [])

  function choosePlay(next: PlayKind) {
    if (matchTicket) void handleCancelMatch()
    setPlayKind(next)
    setPrivateStep('menu')
    setError(null)
    if (next === 'ai') setYouSeat(0)
  }

  function backToKinds() {
    if (matchTicket) void handleCancelMatch()
    setPlayKind(null)
    setPrivateStep('menu')
    setError(null)
  }

  const initial = (accountName || playerName || '登').slice(0, 1)
  const seatNames = resolveStartNames(
    human,
    names.map((n, i) => (human[i] ? playerName.trim() || n : n)),
  )
  const kindMeta = playKind ? PLAY_KINDS.find((k) => k.id === playKind) : null
  const youSeat = (human.findIndex(Boolean) as Seat) >= 0 ? (human.findIndex(Boolean) as Seat) : 0

  const signedIn = Boolean(accountEmail)
  const showHome = view === 'home' || view === 'login'

  return (
    <main className={showHome ? 'desk desk--home' : 'desk desk--ingame'}>
      <DeskRail
        page={view === 'play' ? 'play' : 'home'}
        accountOn={signedIn}
        initial={initial}
        muted={muted}
        onHome={() => go('home')}
        onPlay={() => go('play')}
        onLogin={() => go('login')}
        onOpenYou={onOpenYou}
        onOpenFans={onOpenFans}
        onOpenCalculator={onOpenCalculator}
        onOpenLaBook={onOpenLaBook}
        onOpenTutorial={onOpenTutorial}
        onOpenPuzzles={onOpenPuzzles}
        onOpenStats={onOpenStats}
        onOpenSettings={onOpenSettings}
        onToggleMute={() => {
          const next = !muted
          setMuted(next)
          setMutedUi(next)
        }}
      />
      {showHome ? (
        <div className="desk__scroll">
          <div className="desk__home">
            <div className="desk__stage">
              <div className="desk__felt" aria-label="未開的檯">
                {SEAT_LABELS.map((label, seat) => (
                  <div key={label} className={`desk__seat desk__seat--${seat}`}>
                    <span className="desk__pip">{label}</span>
                  </div>
                ))}
                <div className="desk__wall" aria-hidden="true">
                  {Array.from({ length: 14 }, (_, i) => (
                    <i key={i} />
                  ))}
                </div>
                <p className="desk__round">東圈</p>
              </div>
            </div>
            <div className="desk__pitch">
              <h1>在網上打<br />港式台牌</h1>
              <p>打開瀏覽器就打。唔使下載，唔使登入。</p>
              <button type="button" className="desk__start" onClick={() => go('play')}>
                開始打牌
              </button>
              <ul>
                <li>把房碼給朋友，就能入同一檯</li>
                <li>這部機可以補 AI</li>
                <li>番數同拉數由引擎計</li>
              </ul>
            </div>
          </div>
          <section className="desk__chapter">
            <div>
              <h2>學識點打</h2>
              <p>課程一步步教；題庫練判斷。學完可以跟住打一鋪。</p>
              <div className="desk__act-row">
                {onOpenTutorial && (
                  <button type="button" className="desk__act" onClick={onOpenTutorial}>去學打牌</button>
                )}
                {onOpenPuzzles && (
                  <button type="button" className="desk__act" onClick={onOpenPuzzles}>去做題</button>
                )}
              </div>
            </div>
            <div className="desk__scatter" aria-hidden="true">
              <img src="/tiles/hk/Man5.svg" alt="" />
              <img src="/tiles/hk/Pin1.svg" alt="" />
              <img src="/tiles/hk/Sou9.svg" alt="" />
              <img src="/tiles/hk/Chun.svg" alt="" />
              <img src="/tiles/hk/Hatsu.svg" alt="" />
            </div>
          </section>

          <section className="desk__chapter desk__chapter--flip">
            <div className="desk__fan-show" aria-hidden="true">
              <img src="/tiles/hk/Sou2.svg" alt="" />
              <img src="/tiles/hk/Sou3.svg" alt="" />
              <img src="/tiles/hk/Sou4.svg" alt="" />
              <p><strong>清一色</strong><span>80 番</span></p>
            </div>
            <div>
              <h2>對住番表打</h2>
              <p>坊間眾數番表。打完可以自己計，唔使估。</p>
              <div className="desk__act-row">
                <button type="button" className="desk__act" onClick={onOpenFans}>打開番數表</button>
                {onOpenCalculator && (
                  <button type="button" className="desk__act" onClick={onOpenCalculator}>計番機</button>
                )}
              </div>
            </div>
          </section>

          <section className="desk__chapter">
            <div>
              <h2>邊度都打得</h2>
              <p>唔使下載。這部機開得，把房碼給朋友都入得同一檯。</p>
              <button type="button" className="desk__act" onClick={() => go('play')}>去開枱</button>
            </div>
            <div className="desk__browser" aria-hidden="true">
              <div className="desk__browser-top"><span /><span /><span /></div>
              <div className="desk__browser-felt">
                <img src="/tiles/hk/Back.svg" alt="" />
                <img src="/tiles/hk/Back.svg" alt="" />
                <img src="/tiles/hk/Back.svg" alt="" />
                <img src="/tiles/hk/Back.svg" alt="" />
                <img src="/tiles/hk/Back.svg" alt="" />
              </div>
            </div>
          </section>

          <section className="desk__close">
            <h2>學、打、計番</h2>
            <button type="button" className="desk__start" onClick={() => go('play')}>開始打牌</button>
          </section>

          <footer className="desk__foot">
            <button type="button" onClick={onOpenFans}>番數表</button>
            {onOpenTutorial && <button type="button" onClick={onOpenTutorial}>學打牌</button>}
            {onOpenPuzzles && <button type="button" onClick={onOpenPuzzles}>題庫</button>}
            {onOpenCalculator && <button type="button" onClick={onOpenCalculator}>計番機</button>}
            {onOpenLaBook && <button type="button" onClick={onOpenLaBook}>拉數簿</button>}
            {onOpenStats && <button type="button" onClick={onOpenStats}>戰績</button>}
            {onOpenInsights && (
              <button type="button" onClick={onOpenInsights}>
                作戰分析
              </button>
            )}
            {onOpenSettings && <button type="button" onClick={onOpenSettings}>設定</button>}
            <button type="button" onClick={() => go('login')}>登入</button>
          </footer>
        </div>
      ) : (
      <div className="desk__ingame">
        <div className="table-wrap">
          <div className="table-wrap__main">
            <TableView
              staticTable
              view={idleTableView(seatNames, rules)}
              isHuman={human}
              selectedTile={null}
              declareDing={false}
              onSelectTile={() => {}}
              onToggleDing={() => {}}
              onAction={() => {}}
              personaLabels={personas.map((p, i) => (human[i] ? null : AI_PERSONA_LABEL[p]))}
            />
          </div>
﻿          <aside className="side" aria-label="開枱">
            <header className="side__title">
              {playKind ? (
                <button type="button" className="side__back" onClick={backToKinds} aria-label="返回玩法">
                  <DeskIcon name="back" />
                </button>
              ) : (
                <DeskIcon name="table" />
              )}
              <span>{kindMeta?.title ?? '開枱'}</span>
            </header>
            {!playKind ? (
              <div className="side__body">
                <div className="desk__modes">
                  {PLAY_KINDS.map((card) => (
                    <div className="desk__mode" key={card.id}>
                      <button type="button" disabled={busy} onClick={() => choosePlay(card.id)}>
                        <DeskIcon name={card.icon} />
                        <span>
                          <strong>{card.title}</strong>
                          <small>{card.hint}</small>
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
                {error && <p className="desk__error" role="alert">{error}</p>}
              </div>
            ) : (
              <div className="side__body">
                <div className="side__setup">
                  {(playKind === 'casual' || playKind === 'ranked') && (
                    <>
                      <label className="desk__you">
                        <span>你的名</span>
                        <input
                          value={playerName}
                          maxLength={16}
                          aria-label="你的名"
                          disabled={Boolean(matchTicket)}
                          onChange={(e) => {
                            nameEdited.current = true
                            setPlayerName(e.target.value)
                          }}
                          onBlur={() => {
                            void commitName()
                          }}
                        />
                      </label>
                      <details className="desk__rules">
                        <summary>
                          枱規 · 底 {rules.base} 番 · ${rules.fanValue}/番 · 出牌{' '}
                          {rules.turnTimeoutSec} 秒
                        </summary>
                        <TableRulesEditor
                          value={rules}
                          onChange={updateRules}
                          disabled={busy || Boolean(matchTicket)}
                        />
                      </details>
                      {playKind === 'ranked' && (
                        <p className="desk__quiet">
                          {(() => {
                            const r = rankedSummary()
                            return `段位 ${r.tierName} · ${r.rating} 分 · ${r.games} 場`
                          })()}
                        </p>
                      )}
                      <p className="desk__quiet">
                        {fillAiAfterLabel(
                          loadMatchFillAiAfter(
                            playKind === 'ranked' ? 'ranked' : 'casual',
                          ),
                        )}
                        {' · '}
                        可喺設定改
                      </p>
                      {matchTicket ? (
                        <div className="desk__match-wait" role="status" aria-live="polite">
                          <p>
                            排隊中 · 第 {matchPos}/{matchQueueSize} 位 · 已等{' '}
                            {matchWaited}s
                          </p>
                          <p className="desk__quiet">
                            {matchFillAfter > 0
                              ? `${matchFillAfter}s 後人數不足會補 AI 開枱`
                              : '只等人齊四位先開'}
                          </p>
                          <button
                            type="button"
                            className="desk__start"
                            onClick={() => void handleCancelMatch()}
                          >
                            取消匹配
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="desk__start"
                          disabled={busy}
                          onClick={() =>
                            void handleStartMatch(
                              playKind === 'ranked' ? 'ranked' : 'casual',
                            )
                          }
                        >
                          {playKind === 'ranked' ? '開始排位' : '開始匹配'}
                        </button>
                      )}
                    </>
                  )}

                  {playKind === 'private' && privateStep === 'menu' && (
                    <div className="desk__modes">
                      <div className="desk__mode">
                        <button type="button" disabled={busy} onClick={() => setPrivateStep('create')}>
                          <DeskIcon name="room" />
                          <span>
                            <strong>創建房間</strong>
                            <small>開一間房，把房碼給朋友</small>
                          </span>
                        </button>
                      </div>
                      <div className="desk__mode">
                        <button type="button" disabled={busy} onClick={() => setPrivateStep('join')}>
                          <DeskIcon name="join" />
                          <span>
                            <strong>加入房間</strong>
                            <small>已有六位房碼</small>
                          </span>
                        </button>
                      </div>
                      {onOpenYou && (
                        <div className="desk__mode">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onOpenYou('social')}
                          >
                            <DeskIcon name="join" />
                            <span>
                              <strong>約好友</strong>
                              <small>好友名單 · 送出約局邀請</small>
                            </span>
                          </button>
                        </div>
                      )}
                      {saved && (
                        <div className="desk__mode">
                          <button type="button" disabled={busy} onClick={() => void handleReconnectSaved()}>
                            <DeskIcon name="back" />
                            <span>
                              <strong>返回 {saved.code}</strong>
                              <small>用這部機的記號重連</small>
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {playKind === 'private' && privateStep === 'create' && (
                    <>
                      <button type="button" className="desk__quiet" onClick={() => setPrivateStep('menu')}>
                        ← 私人房間
                      </button>
                      <label className="desk__you">
                        <span>你的名</span>
                        <input
                          value={playerName}
                          maxLength={16}
                          aria-label="你的名"
                          onChange={(e) => {
                            nameEdited.current = true
                            setPlayerName(e.target.value)
                          }}
                          onBlur={() => {
                            void commitName()
                          }}
                        />
                      </label>
                      <details className="desk__rules">
                        <summary>
                          枱規 · 底 {rules.base} 番 · ${rules.fanValue}/番 · 出牌{' '}
                          {rules.turnTimeoutSec} 秒
                        </summary>
                        <TableRulesEditor value={rules} onChange={updateRules} disabled={busy} />
                      </details>
                      <button
                        type="button"
                        className="desk__start"
                        disabled={busy}
                        onClick={() => void handleCreate()}
                      >
                        {busy ? '請稍等…' : '開一間房'}
                      </button>
                    </>
                  )}

                  {playKind === 'private' && privateStep === 'join' && (
                    <>
                      <button type="button" className="desk__quiet" onClick={() => setPrivateStep('menu')}>
                        ← 私人房間
                      </button>
                      <label className="desk__you">
                        <span>你的名</span>
                        <input
                          value={playerName}
                          maxLength={16}
                          aria-label="你的名"
                          onChange={(e) => {
                            nameEdited.current = true
                            setPlayerName(e.target.value)
                          }}
                          onBlur={() => {
                            void commitName()
                          }}
                        />
                      </label>
                      <input
                        className="desk__code"
                        value={joinCode}
                        maxLength={6}
                        placeholder="房碼"
                        aria-label="房碼"
                        onChange={(e) =>
                          setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                        }
                        disabled={busy}
                        autoCapitalize="characters"
                      />
                      {loadSessionForCode(joinCode.trim().toUpperCase()) && (
                        <button
                          type="button"
                          className="desk__quiet"
                          disabled={busy}
                          onClick={() => void handleJoin(true)}
                        >
                          用本機記號重連
                        </button>
                      )}
                      <button
                        type="button"
                        className="desk__start"
                        disabled={busy || joinCode.trim().length !== 6}
                        onClick={() => void handleJoin(false)}
                      >
                        {busy ? '請稍等…' : '入房'}
                      </button>
                    </>
                  )}

                  {playKind === 'ai' && (
                    <>
                      <label className="desk__you">
                        <span>你的名</span>
                        <input
                          value={playerName}
                          maxLength={16}
                          aria-label="你的名"
                          onChange={(e) => {
                            nameEdited.current = true
                            setPlayerName(e.target.value)
                          }}
                          onBlur={() => {
                            void commitName()
                          }}
                        />
                      </label>
                      <p className="side__mode-name">你的座位</p>
                      <div className="desk__quick" role="group" aria-label="你的風位">
                        {([0, 1, 2, 3] as Seat[]).map((seat) => (
                          <button
                            key={SEAT_LABELS[seat]}
                            type="button"
                            className={youSeat === seat ? 'is-on' : ''}
                            onClick={() => setYouSeat(seat)}
                          >
                            {SEAT_LABELS[seat]}
                          </button>
                        ))}
                      </div>
                      <p className="side__mode-name">三家 AI</p>
                      <ul className="side__seats">
                        {([0, 1, 2, 3] as Seat[])
                          .filter((seat) => !human[seat])
                          .map((seat) => (
                            <li key={SEAT_LABELS[seat]}>
                              <span>{SEAT_LABELS[seat]}</span>
                              <button
                                type="button"
                                className="desk__quiet"
                                onClick={() => cycleAiPersona(seat)}
                              >
                                {AI_PERSONA_LABEL[personas[seat]!]}
                              </button>
                            </li>
                          ))}
                      </ul>
                      <button
                        type="button"
                        className="desk__check"
                        aria-pressed={practiceHints}
                        disabled={busy}
                        onClick={() => {
                          const on = !practiceHints
                          setPracticeHints(on)
                          savePracticeHints(on)
                        }}
                      >
                        練習提示 {practiceHints ? '開' : '關'}
                      </button>
                      <details className="desk__rules">
                        <summary>
                          枱規 · 底 {rules.base} 番 · ${rules.fanValue}/番 · 出牌{' '}
                          {rules.turnTimeoutSec} 秒
                        </summary>
                        <TableRulesEditor value={rules} onChange={updateRules} disabled={busy} />
                      </details>
                      <button type="button" className="desk__start" disabled={busy} onClick={startAi}>
                        開始
                      </button>
                    </>
                  )}
                </div>
                {error && <p className="desk__error" role="alert">{error}</p>}
              </div>
            )}
            {!signedIn && (
              <button type="button" className="desk__account-line" onClick={() => go('login')}>
                登入電郵後可在另一部機認回你
              </button>
            )}
          </aside>
        </div>
      </div>
      )}
      {view === 'login' && (
        <div
          className="gate__modal"
          role="dialog"
          aria-modal="true"
          aria-label="電郵登入"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLoginModal()
          }}
        >
          <div className="gate__card gate__card--modal">
            <p className="desk__login-brand">
              <i>萬</i>香港台麻
            </p>
            <p className="gate__note">用電郵登入。冇密碼，寄一條連結認回你。</p>
            <MagicLinkLogin
              verifiedEmail={accountEmail}
              onOpenYou={() => {
                closeLoginModal()
                onOpenYou?.()
              }}
              onLoggedInRefresh={() => void refreshAccountUi()}
            />
            <button type="button" className="gate__play" onClick={closeLoginModal}>
              關閉
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

