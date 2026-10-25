import { useEffect, useMemo, useState } from 'react'
import {
  amountFromFan,
  calculateFans,
  DEFAULT_RULES,
  findStandardWins,
  isLiguligu,
  makeMeld,
  parseTile,
  totalFan,
  zhengHuaForSeat,
  type DingState,
  type FanHit,
  type FanShop,
  type Meld,
  type MeldKind,
  type Seat,
  type TileId,
} from '../engine'
import {
  calcDisplayFans,
  calcScoreHand,
  calcTileCountLabel,
  clearCalcWinTile,
  pickCalcWinTile,
} from './fanCalculatorModel'
import {
  clearCalcSession,
  loadCalcBase,
  loadCalcFanValue,
  loadCalcSession,
  loadCalcWinType,
  saveCalcBase,
  saveCalcFanValue,
  saveCalcSession,
  saveCalcWinType,
  type CalcSessionV1,
} from './leftoverPrefs'
import {
  assignMeldHighlightFlags,
  fanHighlightSkipsChiMelds,
  fanRepeatTimes,
  fanShopLabel,
  tilesForFanHighlight,
} from './settlementHighlight'
import { MeldGroup, Tile, TileRow } from './tiles'

type ActiveFan = { id: string; shop?: FanShop; instance?: string }

function fanKey(f: Pick<ActiveFan, 'id' | 'shop' | 'instance'>): string {
  const base = f.shop ? `${f.shop}:${f.id}` : f.id
  return f.instance ? `${base}:${f.instance}` : base
}

function sameFan(
  a: ActiveFan | null,
  id: string,
  shop?: FanShop,
  instance?: string,
): boolean {
  if (!a) return false
  return a.id === id && a.shop === shop && a.instance === instance
}

/** 高亮說明：滿庭芳類寫明帶邊個數 */
function highlightHint(
  active: ActiveFan,
  result: {
    fans: FanHit[] | null
    shared: FanHit[]
    liguliguShop: FanHit[]
    standardShop: FanHit[]
  } | null,
): string {
  const shop = fanShopLabel(active.shop)
  const shopBit = shop ? `（${shop}）` : ''
  const pool = [
    ...(result?.fans ?? []),
    ...(result?.shared ?? []),
    ...(result?.liguliguShop ?? []),
    ...(result?.standardShop ?? []),
  ]
  const hit = pool.find((f) =>
    sameFan(active, f.id, f.shop, f.instance),
  )
  if (
    hit &&
    (hit.id === 'hunmantingfang' ||
      hit.id === 'mantingfang' ||
      hit.id === 'hundaixyz')
  ) {
    const dig = hit.name.replace(/^(混)?滿庭芳/, '')
    const hun = hit.id === 'hunmantingfang' || hit.id === 'hundaixyz'
    return `${shopBit}${dig || ''}（帶數${hun ? '＋字組' : ''}）`
  }
  return shopBit
}

const MAN: TileId[] = ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map(
  (r) => `man-${r}` as TileId,
)
const PIN: TileId[] = ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map(
  (r) => `pin-${r}` as TileId,
)
const SOU: TileId[] = ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map(
  (r) => `sou-${r}` as TileId,
)
const HONOR: TileId[] = [
  'wind-east',
  'wind-south',
  'wind-west',
  'wind-north',
  'dragon-zhong',
  'dragon-fa',
  'dragon-bai',
]
const FLOWERS: TileId[] = [
  'flower-spring',
  'flower-summer',
  'flower-autumn',
  'flower-winter',
  'flower-plum',
  'flower-orchid',
  'flower-chrysanthemum',
  'flower-bamboo',
]

/** 單一牌庫：萬→筒→索→字→花 */
const TILE_BANK: TileId[] = [...MAN, ...PIN, ...SOU, ...HONOR, ...FLOWERS]

type Mode = 'meld' | 'hand' | 'win'
type WinType = 'tsumo' | 'ron'

const MODE_ORDER: Mode[] = ['meld', 'hand', 'win']
const MODE_LABEL: Record<Mode, string> = {
  meld: '明牌',
  hand: '手牌',
  win: '胡牌',
}

function countUsed(tiles: TileId[], id: TileId): number {
  return tiles.filter((t) => t === id).length
}

function maxCopies(id: TileId): number {
  return id.startsWith('flower-') ? 1 : 4
}

/** 由草稿自動判斷上／碰／明槓／暗槓 */
function detectMeld(
  draft: TileId[],
  asAnKong: boolean,
): { kind: MeldKind; tiles: TileId[] } | null {
  if (draft.length === 3) {
    const a = draft[0]!
    if (draft.every((t) => t === a)) {
      return { kind: 'pong', tiles: [a, a, a] }
    }
    if (
      draft.some(
        (t) =>
          t.startsWith('wind-') ||
          t.startsWith('dragon-') ||
          t.startsWith('flower-'),
      )
    ) {
      return null
    }
    try {
      const parsed = draft.map((t) => parseTile(t))
      const suit = parsed[0]!.suit
      if (parsed.some((p) => p.suit !== suit)) return null
      const ranks = parsed.map((p) => p.rank).sort((x, y) => x - y)
      if (ranks[1] === ranks[0]! + 1 && ranks[2] === ranks[0]! + 2) {
        const tiles = ranks.map((r) => `${suit}-${r}` as TileId)
        return { kind: 'chi', tiles }
      }
    } catch {
      return null
    }
    return null
  }
  if (draft.length === 4) {
    const a = draft[0]!
    if (!draft.every((t) => t === a)) return null
    return {
      kind: asAnKong ? 'ankong' : 'mingkong',
      tiles: [a, a, a, a],
    }
  }
  return null
}

function meldConfirmLabel(
  detected: { kind: MeldKind } | null,
  draftLen: number,
): string {
  if (!detected) {
    return draftLen === 0 ? '撳牌砌副露' : `未成型（${draftLen}）`
  }
  if (detected.kind === 'chi') return '確認上'
  if (detected.kind === 'pong') return '確認碰'
  if (detected.kind === 'ankong') return '確認暗槓'
  return '確認明槓'
}

function isTileId(v: unknown): v is TileId {
  return typeof v === 'string' && v.length > 0
}

function restoreSession(): {
  hand: TileId[]
  melds: Meld[]
  flowers: TileId[]
  winTile: TileId | null
  winType: WinType
  isDealer: boolean
  consecutiveWins: number
  seat: Seat
  windRound: number
  dingKind: 'off' | 'normal' | 'tian' | 'di'
  ippatsu: boolean
  flowerDrawChain: number
  kongDrawChain: number
  jueKind: 'off' | 'mingjue' | 'bajue'
  ziNeiKind: 'off' | 'si' | 'qi' | 'shi'
  haidi: boolean
  earlyWinKind: 'off' | 'tian' | 'di' | 'ren'
  multiRonKind: 'off' | 'shuang' | 'san'
  fanxue: boolean
  mode: Mode
} | null {
  const s = loadCalcSession()
  if (!s) return null
  const hand = s.hand.filter(isTileId) as TileId[]
  const flowers = (s.flowers ?? []).filter(isTileId) as TileId[]
  const melds: Meld[] = []
  for (const m of s.melds) {
    if (!m || !Array.isArray(m.tiles) || m.tiles.length === 0) continue
    const kind = m.kind as MeldKind
    if (!['chi', 'pong', 'mingkong', 'ankong', 'jiagang'].includes(kind))
      continue
    const tiles = m.tiles.filter(isTileId) as TileId[]
    if (tiles.length === 0) continue
    melds.push({
      kind,
      tiles,
      fromSeat: (m.fromSeat as Seat) ?? 0,
      claimedTile: (m.claimedTile as TileId | undefined) ?? undefined,
    })
  }
  const winTile = isTileId(s.winTile) ? s.winTile : null
  const mode: Mode =
    s.mode === 'meld' || s.mode === 'hand' || s.mode === 'win' ? s.mode : 'hand'
  const dingKind =
    s.dingKind === 'normal' ||
    s.dingKind === 'tian' ||
    s.dingKind === 'di' ||
    s.dingKind === 'off'
      ? s.dingKind
      : 'off'
  return {
    hand,
    melds,
    flowers,
    winTile,
    winType: s.winType === 'ron' ? 'ron' : 'tsumo',
    isDealer: Boolean(s.isDealer),
    consecutiveWins: Math.max(
      0,
      Math.min(8, Math.floor(Number(s.consecutiveWins) || 0)),
    ),
    seat: ([0, 1, 2, 3] as Seat[]).includes(s.seat as Seat)
      ? (s.seat as Seat)
      : 0,
    windRound: [0, 1, 2, 3].includes(s.windRound) ? s.windRound : 0,
    dingKind,
    ippatsu: s.ippatsu !== false,
    flowerDrawChain: Math.max(0, Math.min(8, Number(s.flowerDrawChain) || 0)),
    kongDrawChain: Math.max(0, Math.min(8, Number(s.kongDrawChain) || 0)),
    jueKind:
      s.jueKind === 'mingjue' || s.jueKind === 'bajue' ? s.jueKind : 'off',
    ziNeiKind:
      s.ziNeiKind === 'si' ||
      s.ziNeiKind === 'qi' ||
      s.ziNeiKind === 'shi'
        ? s.ziNeiKind
        : 'off',
    haidi: Boolean(s.haidi),
    earlyWinKind:
      s.earlyWinKind === 'tian' ||
      s.earlyWinKind === 'di' ||
      s.earlyWinKind === 'ren'
        ? s.earlyWinKind
        : 'off',
    multiRonKind:
      s.multiRonKind === 'shuang' || s.multiRonKind === 'san'
        ? s.multiRonKind
        : 'off',
    fanxue: Boolean(s.fanxue),
    mode,
  }
}

/** 子內／天胡档 → discardsThisRound */
function discardsForTiming(
  early: 'off' | 'tian' | 'di' | 'ren',
  ziNei: 'off' | 'si' | 'qi' | 'shi',
): number {
  if (early === 'tian') return 0
  if (early === 'di' || early === 'ren') return 1
  if (ziNei === 'si') return 4
  if (ziNei === 'qi') return 7
  if (ziNei === 'shi') return 10
  return 99
}

interface FanCalculatorProps {
  onBack: () => void
}

export function FanCalculator({ onBack }: FanCalculatorProps) {
  const saved = useMemo(() => restoreSession(), [])
  const [hand, setHand] = useState<TileId[]>(() => saved?.hand ?? [])
  const [melds, setMelds] = useState<Meld[]>(() => saved?.melds ?? [])
  const [flowers, setFlowers] = useState<TileId[]>(() => saved?.flowers ?? [])
  const [winTile, setWinTile] = useState<TileId | null>(
    () => saved?.winTile ?? null,
  )
  const [winType, setWinType] = useState<WinType>(() => {
    if (saved?.winType) return saved.winType
    return loadCalcWinType() === 'discard' ? 'ron' : 'tsumo'
  })
  const [isDealer, setIsDealer] = useState(() => saved?.isDealer ?? false)
  const [consecutiveWins, setConsecutiveWins] = useState(
    () => saved?.consecutiveWins ?? 0,
  )
  const [seat, setSeat] = useState<Seat>(() => saved?.seat ?? 0)
  const [windRound, setWindRound] = useState(() => saved?.windRound ?? 0)
  const [dingKind, setDingKind] = useState<'off' | 'normal' | 'tian' | 'di'>(
    () => saved?.dingKind ?? 'off',
  )
  const [ippatsu, setIppatsu] = useState(() => saved?.ippatsu ?? true)
  const [flowerDrawChain, setFlowerDrawChain] = useState(
    () => saved?.flowerDrawChain ?? 0,
  )
  const [kongDrawChain, setKongDrawChain] = useState(
    () => saved?.kongDrawChain ?? 0,
  )
  const [jueKind, setJueKind] = useState<'off' | 'mingjue' | 'bajue'>(
    () => saved?.jueKind ?? 'off',
  )
  const [ziNeiKind, setZiNeiKind] = useState<'off' | 'si' | 'qi' | 'shi'>(
    () => saved?.ziNeiKind ?? 'off',
  )
  const [haidi, setHaidi] = useState(() => saved?.haidi ?? false)
  const [earlyWinKind, setEarlyWinKind] = useState<
    'off' | 'tian' | 'di' | 'ren'
  >(() => saved?.earlyWinKind ?? 'off')
  const [multiRonKind, setMultiRonKind] = useState<'off' | 'shuang' | 'san'>(
    () => saved?.multiRonKind ?? 'off',
  )
  const [fanxue, setFanxue] = useState(() => saved?.fanxue ?? false)
  const [base, setBase] = useState(loadCalcBase)
  const [fanValue, setFanValue] = useState(loadCalcFanValue)
  const [mode, setMode] = useState<Mode>(() => saved?.mode ?? 'hand')
  const [meldDraft, setMeldDraft] = useState<TileId[]>([])
  /** 四張相同時可剔：暗槓 */
  const [meldAsAnKong, setMeldAsAnKong] = useState(false)
  const [activeFan, setActiveFan] = useState<ActiveFan | null>(null)

  const detectedMeld = useMemo(
    () => detectMeld(meldDraft, meldAsAnKong),
    [meldDraft, meldAsAnKong],
  )
  const draftIsQuad =
    meldDraft.length === 4 && meldDraft.every((t) => t === meldDraft[0])

  useEffect(() => {
    if (!draftIsQuad && meldAsAnKong) setMeldAsAnKong(false)
  }, [draftIsQuad, meldAsAnKong])

  useEffect(() => {
    const session: CalcSessionV1 = {
      v: 1,
      hand,
      melds: melds.map((m) => ({
        kind: m.kind,
        tiles: m.tiles,
        fromSeat: m.fromSeat ?? 0,
        claimedTile: m.claimedTile ?? null,
      })),
      flowers,
      winTile,
      winType,
      isDealer,
      consecutiveWins,
      seat,
      windRound,
      dingKind,
      ippatsu,
      flowerDrawChain,
      kongDrawChain,
      jueKind,
      ziNeiKind,
      haidi,
      earlyWinKind,
      multiRonKind,
      fanxue,
      mode,
    }
    saveCalcSession(session)
  }, [
    hand,
    melds,
    flowers,
    winTile,
    winType,
    isDealer,
    consecutiveWins,
    seat,
    windRound,
    dingKind,
    ippatsu,
    flowerDrawChain,
    kongDrawChain,
    jueKind,
    ziNeiKind,
    haidi,
    earlyWinKind,
    multiRonKind,
    fanxue,
    mode,
  ])

  const allPlaced = useMemo(
    () => [
      ...hand,
      ...melds.flatMap((m) => m.tiles),
      ...flowers,
      ...(winTile ? [winTile] : []),
      ...meldDraft,
    ],
    [hand, melds, flowers, winTile, meldDraft],
  )

  function canAdd(id: TileId): boolean {
    return countUsed(allPlaced, id) < maxCopies(id)
  }

  function addTile(id: TileId) {
    if (id.startsWith('flower-')) {
      if (!canAdd(id)) return
      setFlowers((f) => [...f, id])
      return
    }
    if (mode === 'win') {
      const pool = [
        ...hand,
        ...melds.flatMap((m) => m.tiles),
        ...flowers,
        ...meldDraft,
      ]
      if (pool.filter((t) => t === id).length + 1 > maxCopies(id)) return
      setWinTile(pickCalcWinTile(id))
      return
    }
    if (!canAdd(id)) return
    if (mode === 'hand') {
      setHand((h) => [...h, id])
      return
    }
    // 明牌草稿最多 4 張
    setMeldDraft((d) => {
      if (d.length >= 4) return d
      return [...d, id]
    })
  }

  function removeFromHand(index: number) {
    setHand((h) => h.filter((_, i) => i !== index))
  }

  function clearWin() {
    setWinTile(clearCalcWinTile())
  }

  function removeFlower(index: number) {
    setFlowers((f) => f.filter((_, i) => i !== index))
  }

  function removeMeld(index: number) {
    setMelds((m) => m.filter((_, i) => i !== index))
  }

  function commitMeld() {
    const det = detectMeld(meldDraft, meldAsAnKong)
    if (!det) return
    const claimed =
      det.kind === 'ankong' ? undefined : det.tiles[det.tiles.length - 1]
    setMelds((m) => [...m, makeMeld(det.kind, det.tiles, 0, claimed)])
    setMeldDraft([])
    setMeldAsAnKong(false)
    // 留喺明牌，方便連續加副露
  }

  function resetAll() {
    setHand([])
    setMelds([])
    setFlowers([])
    setWinTile(null)
    setMeldDraft([])
    setMeldAsAnKong(false)
    setMode('hand')
    setActiveFan(null)
    clearCalcSession()
  }

  function switchMode(next: Mode) {
    setMode(next)
    if (next !== 'meld') {
      setMeldDraft([])
      setMeldAsAnKong(false)
    }
  }

  const result = useMemo(() => {
    if (!winTile || hand.length === 0) return null
    try {
      const scoreHand = calcScoreHand(hand, winTile, winType)
      const ding: DingState | null =
        dingKind === 'off'
          ? null
          : {
              kind: dingKind,
              ippatsuActive: ippatsu,
              guoshuiLocked: false,
            }
      const scoreWinType =
        earlyWinKind === 'tian'
          ? 'tsumo'
          : earlyWinKind === 'di' || earlyWinKind === 'ren'
            ? 'ron'
            : winType
      const pattern = calculateFans({
        hand: scoreHand,
        melds,
        flowers,
        winTile,
        winType: scoreWinType,
        ding,
        isDealer: earlyWinKind === 'tian' ? true : isDealer,
        consecutiveWins:
          isDealer || earlyWinKind === 'tian' ? consecutiveWins : 0,
        seat,
        windRound,
        zhengHuaTiles: zhengHuaForSeat(seat),
        flowerDrawChain,
        kongDrawChain,
        visibleWinTileCount:
          jueKind === 'bajue' ? 3 : jueKind === 'mingjue' ? 2 : 0,
        discardsThisRound: discardsForTiming(earlyWinKind, ziNeiKind),
        wallRemaining: haidi ? 0 : 99,
        discarderIsDealer: earlyWinKind === 'di',
        multiRonCount:
          multiRonKind === 'san' ? 3 : multiRonKind === 'shuang' ? 2 : 1,
        fanxue: fanxue && multiRonKind !== 'off',
      })
      const fans = calcDisplayFans(pattern, base)
      if (!fans) {
        return {
          fans: null as FanHit[] | null,
          fan: 0,
          amount: 0,
          shuangshi: false,
          shared: [] as FanHit[],
          liguliguShop: [] as FanHit[],
          standardShop: [] as FanHit[],
          incomplete: true as const,
        }
      }
      const fan = totalFan(fans)
      const amount =
        amountFromFan({ ...DEFAULT_RULES, base, fanValue }, fan) *
        (fanxue && multiRonKind !== 'off' ? 2 : 1)
      const shuangshi =
        melds.length === 0 &&
        isLiguligu(scoreHand, winTile) &&
        findStandardWins(scoreHand, melds, winTile).length > 0
      return {
        fans,
        fan,
        amount,
        shuangshi,
        shared: fans.filter((f) => !f.shop),
        liguliguShop: fans.filter((f) => f.shop === 'liguligu'),
        standardShop: fans.filter((f) => f.shop === 'standard'),
        incomplete: false as const,
      }
    } catch {
      return null
    }
  }, [
    hand,
    melds,
    flowers,
    winTile,
    winType,
    isDealer,
    consecutiveWins,
    seat,
    windRound,
    dingKind,
    ippatsu,
    flowerDrawChain,
    kongDrawChain,
    jueKind,
    ziNeiKind,
    haidi,
    earlyWinKind,
    multiRonKind,
    fanxue,
    base,
    fanValue,
  ])

  const highlight = useMemo(() => {
    if (!winTile || !activeFan) {
      return {
        mainFlags: null as boolean[] | null,
        flowerFlags: null as boolean[] | null,
        meldFlags: null as boolean[][] | null,
        winSelected: false,
      }
    }
    const counts = tilesForFanHighlight(activeFan.id, {
      hand,
      melds,
      flowers,
      winTile,
      winType,
      shop: activeFan.shop,
      instance: activeFan.instance,
      zhengHuaTiles: zhengHuaForSeat(seat),
    })
    const { meldFlags, left } = assignMeldHighlightFlags(melds, counts, {
      skipChi: fanHighlightSkipsChiMelds(activeFan.id),
    })
    let winSelected = false
    if ((left.get(winTile) ?? 0) > 0) {
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
      mainFlags: take(hand),
      flowerFlags: take(flowers),
      meldFlags,
      winSelected,
    }
  }, [activeFan, hand, melds, flowers, winTile, winType, seat])

  function toggleFan(id: string, shop?: FanShop, instance?: string) {
    setActiveFan((cur) =>
      sameFan(cur, id, shop, instance) ? null : { id, shop, instance },
    )
  }

  function renderFanBtn(f: FanHit) {
    const times = fanRepeatTimes(f.id, f.value)
    const on = sameFan(activeFan, f.id, f.shop, f.instance)
    return (
      <li key={fanKey(f)}>
        <button
          type="button"
          className={`calc-page__fan-btn${on ? ' is-active' : ''}${
            f.shop === 'liguligu' ? ' is-shop-liguligu' : ''
          }${f.shop === 'standard' ? ' is-shop-standard' : ''}`}
          onClick={() => toggleFan(f.id, f.shop, f.instance)}
        >
          {f.name}
          {times > 1 ? `×${times}` : ''} {f.value}
        </button>
      </li>
    )
  }

  const statusLine = !winTile
    ? '揀胡牌先計'
    : hand.length === 0
      ? '加幾張手牌'
      : result && !result.incomplete && result.fans
        ? null
        : `未成糊（${parseTile(winTile).label}）`

  return (
    <main className="fan-page calc-page">
      <header className="calc-page__top">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返大廳
        </button>
        <h1 className="fan-page__title">計番機</h1>
        <button type="button" className="lobby__link" onClick={resetAll}>
          清空
        </button>
      </header>

      <section className="calc-page__summary" aria-live="polite">
        {statusLine ? (
          <p className="calc-page__summary-idle">{statusLine}</p>
        ) : (
          <>
            <p className="calc-page__summary-total">
              <strong>{result!.fan}</strong>
              <span>番</span>
              <em>${result!.amount}</em>
            </p>
            {result!.shuangshi && (
              <p className="calc-page__summary-badge">
                雙食 · 嚦咕＋標準兩舖加埋
              </p>
            )}
            <ul className="calc-page__summary-fans" aria-label="番種（撳可高亮）">
              {result!.shuangshi ? (
                <>
                  {result!.shared.map(renderFanBtn)}
                  {result!.liguliguShop.length > 0 && (
                    <li className="calc-page__fan-shop" aria-hidden>
                      嚦咕舖
                    </li>
                  )}
                  {result!.liguliguShop.map(renderFanBtn)}
                  {result!.standardShop.length > 0 && (
                    <li className="calc-page__fan-shop" aria-hidden>
                      標準舖
                    </li>
                  )}
                  {result!.standardShop.map(renderFanBtn)}
                </>
              ) : (
                result!.fans!.map(renderFanBtn)
              )}
            </ul>
            <p className="calc-page__summary-meta">
              {winType === 'tsumo' ? '自摸每家付' : '出銃者付'} · 底 {base} · $
              {fanValue}/番
              {isDealer
                ? consecutiveWins > 0
                  ? ` · 連莊×${consecutiveWins}`
                  : ' · 莊'
                : ''}{' '}
              · 圈
              {['東', '南', '西', '北'][windRound]} · 門
              {['東', '南', '西', '北'][seat]}
              {dingKind === 'normal'
                ? ' · 叮'
                : dingKind === 'tian'
                  ? ' · 天聽'
                  : dingKind === 'di'
                    ? ' · 地聽'
                    : ''}
              {dingKind !== 'off' && ippatsu ? ' · 即食' : ''}
              {flowerDrawChain > 0 ? ` · 花摸×${flowerDrawChain}` : ''}
              {kongDrawChain > 0 ? ` · 槓摸×${kongDrawChain}` : ''}
              {jueKind === 'mingjue'
                ? ' · 明絕'
                : jueKind === 'bajue'
                  ? ' · 八絕'
                  : ''}
              {earlyWinKind === 'tian'
                ? ' · 天胡'
                : earlyWinKind === 'di'
                  ? ' · 地胡'
                  : earlyWinKind === 'ren'
                    ? ' · 人胡'
                    : ziNeiKind === 'si'
                      ? ' · 四子內'
                      : ziNeiKind === 'qi'
                        ? ' · 七子內'
                        : ziNeiKind === 'shi'
                          ? ' · 十子內'
                          : ''}
              {haidi
                ? winType === 'tsumo' || earlyWinKind === 'tian'
                  ? ' · 海底'
                  : ' · 河底'
                : ''}
              {multiRonKind === 'shuang'
                ? ' · 一炮雙響'
                : multiRonKind === 'san'
                  ? ' · 一炮三響'
                  : ''}
              {fanxue && multiRonKind !== 'off' ? ' · 反雪' : ''}
              {activeFan
                ? ` · 高亮${highlightHint(activeFan, result)}`
                : ' · 撳番種高亮牌'}
            </p>
          </>
        )}
      </section>

      <section className="calc-page__table" aria-label="牌面">
        <div className="calc-page__row">
          <span className="calc-page__row-label">明</span>
          <div className="calc-page__row-body">
            {melds.length > 0 ? (
              <>
                <MeldGroup
                  melds={melds}
                  size="sm"
                  selectedFlagsByMeld={activeFan ? highlight.meldFlags : null}
                />
                <div className="calc-page__meld-del">
                  {melds.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className="lobby__link"
                      onClick={() => removeMeld(i)}
                    >
                      刪{i + 1}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="calc-page__empty">
                {mode === 'meld' ? '撳牌庫砌副露' : '無明牌'}
              </p>
            )}
          </div>
        </div>

        <div className="calc-page__row">
          <span className="calc-page__row-label">手</span>
          <div className="calc-page__row-body">
            {hand.length === 0 ? (
              <p className="calc-page__empty">撳下面加牌 · 撳牌可刪</p>
            ) : (
              <div
                className="tile-row"
                data-hl-shop={activeFan?.shop ?? undefined}
              >
                {hand.map((id, i) => (
                  <Tile
                    key={`h-${id}-${i}`}
                    id={id}
                    size="md"
                    selected={Boolean(activeFan && highlight.mainFlags?.[i])}
                    onClick={() => removeFromHand(i)}
                  />
                ))}
              </div>
            )}
            <p className="calc-page__count">
              {calcTileCountLabel(hand.length, Boolean(winTile), melds.length)}
            </p>
          </div>
        </div>

        <div className="calc-page__row">
          <span className="calc-page__row-label">胡</span>
          <div className="calc-page__row-body">
            {winTile ? (
              <div
                className={`calc-page__win-slot${
                  highlight.winSelected ? ' is-hl' : ''
                }`}
              >
                <Tile
                  id={winTile}
                  size="md"
                  selected={highlight.winSelected}
                  onClick={clearWin}
                />
              </div>
            ) : (
              <p className="calc-page__empty">切「胡牌」設糊</p>
            )}
            <div className="calc-page__win-type" role="group" aria-label="糊法">
              {(
                [
                  ['tsumo', '自摸'],
                  ['ron', '出銃'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`lobby__chip ${winType === id ? 'is-active' : ''}`}
                  onClick={() => {
                    setWinType(id)
                    saveCalcWinType(id === 'ron' ? 'discard' : 'self')
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {flowers.length > 0 && (
          <div className="calc-page__row">
            <span className="calc-page__row-label">花</span>
            <div className="calc-page__row-body">
              <div className="tile-row">
                {flowers.map((id, i) => (
                  <Tile
                    key={`f-${id}-${i}`}
                    id={id}
                    size="sm"
                    selected={Boolean(activeFan && highlight.flowerFlags?.[i])}
                    onClick={() => removeFlower(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="calc-page__dock">
        <nav className="calc-page__modes" aria-label="加入目標">
          {MODE_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              className={`calc-page__mode ${mode === id ? 'is-active' : ''}`}
              onClick={() => switchMode(id)}
            >
              {MODE_LABEL[id]}
            </button>
          ))}
        </nav>

        {mode === 'meld' && (
          <div className="calc-page__meld-bar">
            {meldDraft.length === 0 ? (
              <p className="calc-page__meld-hint">
                撳牌庫加副露：三張會自動辨上／碰；四張相同可剔暗槓
              </p>
            ) : (
              <TileRow tiles={meldDraft} size="sm" />
            )}
            {draftIsQuad && (
              <label className="lobby__toggle">
                <input
                  type="checkbox"
                  checked={meldAsAnKong}
                  onChange={(e) => setMeldAsAnKong(e.target.checked)}
                />
                <span>暗槓</span>
              </label>
            )}
            <div className="calc-page__meld-actions">
              <button
                type="button"
                className="action-btn action-btn--primary"
                disabled={!detectedMeld}
                onClick={commitMeld}
              >
                {meldConfirmLabel(detectedMeld, meldDraft.length)}
              </button>
              <button
                type="button"
                className="action-btn action-btn--ghost"
                disabled={meldDraft.length === 0}
                onClick={() => {
                  setMeldDraft((d) => d.slice(0, -1))
                  setMeldAsAnKong(false)
                }}
              >
                退一張
              </button>
            </div>
          </div>
        )}

        <section className="calc-page__palette" aria-label="牌庫">
          <div className="calc-page__palette-grid">
            {TILE_BANK.map((id) => (
              <Tile
                key={id}
                id={id}
                size="sm"
                dimmed={!canAdd(id)}
                onClick={canAdd(id) ? () => addTile(id) : undefined}
              />
            ))}
          </div>
        </section>
      </div>

      <details className="calc-page__more">
        <summary>枱規（底、$／番、莊、連莊、圈、門、叮、絕章、子內、一炮、海底、花摸）</summary>
        <div className="calc-page__more-body">
          <label className="lobby__toggle">
            <input
              type="checkbox"
              checked={isDealer}
              onChange={(e) => {
                const on = e.target.checked
                setIsDealer(on)
                if (!on) setConsecutiveWins(0)
              }}
            />
            <span>莊家</span>
          </label>
          <label className="calc-page__num">
            <span>連莊（次）</span>
            <input
              type="number"
              min={0}
              max={8}
              value={isDealer ? consecutiveWins : 0}
              disabled={!isDealer}
              onChange={(e) => {
                const n = Math.max(
                  0,
                  Math.min(8, Math.floor(Number(e.target.value) || 0)),
                )
                setConsecutiveWins(n)
                if (n > 0) setIsDealer(true)
              }}
              aria-label="連莊次數"
            />
          </label>
          <p className="calc-page__wind-hint">
            連莊 N＝2N+1 番（含莊；連一 3、連二 5…）；0 只計莊 1。
          </p>
          <div className="calc-page__wind-row" role="group" aria-label="圈風">
            <span className="calc-page__wind-label">圈風</span>
            {(['東', '南', '西', '北'] as const).map((label, i) => (
              <button
                key={`circle-${label}`}
                type="button"
                className={`lobby__chip ${windRound === i ? 'is-active' : ''}`}
                onClick={() => setWindRound(i)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="calc-page__wind-row" role="group" aria-label="門風">
            <span className="calc-page__wind-label">門風</span>
            {(['東', '南', '西', '北'] as const).map((label, i) => (
              <button
                key={`seat-${label}`}
                type="button"
                className={`lobby__chip ${seat === i ? 'is-active' : ''}`}
                onClick={() => setSeat(i as Seat)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="calc-page__wind-hint">
            正花跟門風（東春梅／南夏蘭／西秋菊／北冬竹）；風牌跟圈風＋門風。
          </p>
          <div className="calc-page__wind-row" role="group" aria-label="叮">
            <span className="calc-page__wind-label">叮</span>
            {(
              [
                ['off', '唔叮'],
                ['normal', '叮'],
                ['tian', '天聽'],
                ['di', '地聽'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`lobby__chip ${dingKind === id ? 'is-active' : ''}`}
                onClick={() => setDingKind(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {dingKind !== 'off' && (
            <label className="lobby__toggle">
              <input
                type="checkbox"
                checked={ippatsu}
                onChange={(e) => setIppatsu(e.target.checked)}
              />
              <span>即食（叮後一巡內；叮＋自摸另計叮摸）</span>
            </label>
          )}
          <div className="calc-page__wind-row" role="group" aria-label="絕章">
            <span className="calc-page__wind-label">絕章</span>
            {(
              [
                ['off', '唔絕'],
                ['mingjue', '明絕'],
                ['bajue', '八絕'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`lobby__chip ${jueKind === id ? 'is-active' : ''}`}
                onClick={() => setJueKind(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="calc-page__wind-row" role="group" aria-label="子內">
            <span className="calc-page__wind-label">子內</span>
            {(
              [
                ['off', '唔計'],
                ['si', '四子內'],
                ['qi', '七子內'],
                ['shi', '十子內'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`lobby__chip ${ziNeiKind === id ? 'is-active' : ''}`}
                onClick={() => {
                  setZiNeiKind(id)
                  if (id !== 'off') setEarlyWinKind('off')
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="calc-page__wind-row"
            role="group"
            aria-label="天胡地胡人胡"
          >
            <span className="calc-page__wind-label">天／地／人</span>
            {(
              [
                ['off', '唔計'],
                ['tian', '天胡'],
                ['di', '地胡'],
                ['ren', '人胡'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`lobby__chip ${earlyWinKind === id ? 'is-active' : ''}`}
                onClick={() => {
                  setEarlyWinKind(id)
                  if (id !== 'off') {
                    setZiNeiKind('off')
                    if (id === 'tian') {
                      setIsDealer(true)
                      setWinType('tsumo')
                    } else {
                      setWinType('ron')
                    }
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="calc-page__wind-row" role="group" aria-label="一炮多響">
            <span className="calc-page__wind-label">一炮</span>
            {(
              [
                ['off', '唔計'],
                ['shuang', '雙響'],
                ['san', '三響'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`lobby__chip ${multiRonKind === id ? 'is-active' : ''}`}
                onClick={() => {
                  setMultiRonKind(id)
                  if (id !== 'off') setWinType('ron')
                  else setFanxue(false)
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {multiRonKind !== 'off' && (
            <label className="lobby__toggle">
              <input
                type="checkbox"
                checked={fanxue}
                onChange={(e) => setFanxue(e.target.checked)}
              />
              <span>反雪（出銃者付款×2；銀碼顯示已倍）</span>
            </label>
          )}
          <label className="lobby__toggle">
            <input
              type="checkbox"
              checked={haidi}
              onChange={(e) => setHaidi(e.target.checked)}
            />
            <span>海底／河底（牆剩 0；自摸撈月、出銃撈魚）</span>
          </label>
          <label className="calc-page__num">
            <span>花摸（次）</span>
            <input
              type="number"
              min={0}
              max={8}
              value={flowerDrawChain}
              onChange={(e) =>
                setFlowerDrawChain(Math.max(0, Number(e.target.value) || 0))
              }
              aria-label="花摸次數"
            />
          </label>
          <label className="calc-page__num">
            <span>槓摸（次）</span>
            <input
              type="number"
              min={0}
              max={8}
              value={kongDrawChain}
              onChange={(e) =>
                setKongDrawChain(Math.max(0, Number(e.target.value) || 0))
              }
              aria-label="槓摸次數"
            />
          </label>
          <p className="calc-page__wind-hint">
            絕章：明絕／八絕。槓摸＝連續槓補後自摸（槓上槓摸）。門清：上／碰先破；槓唔破。缺一門同缺五可並計。
          </p>
          <label className="calc-page__num">
            <span>底（番）</span>
            <input
              type="number"
              min={0}
              value={base}
              onChange={(e) => {
                const n = Number(e.target.value) || 0
                setBase(n)
                saveCalcBase(n)
              }}
              aria-label="底番數"
            />
          </label>
          <label className="calc-page__num">
            <span>$／番</span>
            <input
              type="number"
              min={0}
              value={fanValue}
              onChange={(e) => {
                const n = Number(e.target.value) || 0
                setFanValue(n)
                saveCalcFanValue(n)
              }}
              aria-label="番值"
            />
          </label>
        </div>
      </details>
    </main>
  )
}
