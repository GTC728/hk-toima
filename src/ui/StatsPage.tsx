import { useEffect, useMemo, useState } from 'react'
import {
  aggregateMatches,
  aggregatePace,
  aggregatePrefs,
  aggregateResults,
  aggregateTactics,
  clearCareerStats,
  filterMatches,
  filterRounds,
  formatAvgNum,
  formatAvgPlace,
  formatDuration,
  formatGrasp,
  formatWinRate,
  loadCareerStats,
  phaseLabel,
  placeLabel,
  playKindLabel,
  SUIT_BIAS_LABEL,
  TOD_BUCKETS,
  WEEKDAY_LABELS,
  WIND_LABELS,
  type CareerStats,
  type GamePhase,
  type StatsDateRange,
  type StatsPlayFilter,
  type StatsPlayKind,
  type SuitBias,
} from './stats'
import { aggregateExtras9, searchMatches, searchRounds } from './stats-extras9'
import {
  isFavoriteMatch,
  toggleFavoriteMatch,
} from './stats-s10'
import {
  aggregateRulesCombos,
  aggregateTimeoutOutcomes,
  formatComboRate,
  firstPlayAt,
  formatFirstPlay,
} from './stats-s11'
import {
  accuracyByTurnBand,
  aggregateDanger,
  aggregateLeaves,
  aggregateOpenings,
  brilliantRate,
  flowerTimingByPhase,
  formatRate,
  frequentOpponents,
  moveQualityTimeline,
  TURN_BANDS,
} from './stats-s12'
import { pullRankedFromServer, rankedSummary } from './rankedPrefs'

interface StatsPageProps {
  onBack?: () => void
  embedded?: boolean
  onOpenArchive?: () => void
  onOpenInsights?: () => void
}

type StatsTab = 'overview' | 'games' | 'stats'

const PLAY_FILTERS: { id: StatsPlayFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'ranked', label: '排位' },
  { id: 'casual', label: '普通' },
  { id: 'private', label: '私人' },
  { id: 'ai', label: 'AI' },
]

const RANGE_FILTERS: { id: StatsDateRange; label: string }[] = [
  { id: '7', label: '7 日' },
  { id: '30', label: '30 日' },
  { id: '90', label: '90 日' },
  { id: 'all', label: '全部' },
]

export function StatsPage({
  onBack,
  embedded,
  onOpenArchive,
  onOpenInsights,
}: StatsPageProps) {
  const [stats, setStats] = useState<CareerStats>(() => loadCareerStats())
  const [ranked, setRanked] = useState(() => rankedSummary())
  const [tab, setTab] = useState<StatsTab>('overview')
  const [play, setPlay] = useState<StatsPlayFilter>('all')
  const [range, setRange] = useState<StatsDateRange>('30')
  const [query, setQuery] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [favTick, setFavTick] = useState(0)

  useEffect(() => {
    void pullRankedFromServer().then((s) => {
      if (s) setRanked(rankedSummary(s))
    })
  }, [])

  const filteredMatches = useMemo(
    () => filterMatches(stats.matches, { play, range }),
    [stats.matches, play, range],
  )
  const filteredRounds = useMemo(
    () => filterRounds(stats.recent, { play, range }),
    [stats.recent, play, range],
  )
  const agg = useMemo(
    () => aggregateMatches(filteredMatches),
    [filteredMatches],
  )
  const results = useMemo(
    () => aggregateResults(filteredMatches, filteredRounds),
    [filteredMatches, filteredRounds],
  )
  const pace = useMemo(
    () => aggregatePace(filteredMatches, filteredRounds),
    [filteredMatches, filteredRounds],
  )
  const tactics = useMemo(
    () => aggregateTactics(filteredRounds),
    [filteredRounds],
  )
  const prefs = useMemo(
    () => aggregatePrefs(filteredRounds),
    [filteredRounds],
  )
  const extras9 = useMemo(
    () => aggregateExtras9(filteredMatches, filteredRounds),
    [filteredMatches, filteredRounds],
  )
  const timeoutOut = useMemo(
    () => aggregateTimeoutOutcomes(filteredMatches),
    [filteredMatches],
  )
  const rulesCombos = useMemo(
    () => aggregateRulesCombos(filteredMatches),
    [filteredMatches],
  )
  const firstPlay = useMemo(() => firstPlayAt(stats), [stats])
  const openings = useMemo(
    () => aggregateOpenings(filteredRounds),
    [filteredRounds],
  )
  const turnAcc = useMemo(
    () => accuracyByTurnBand(filteredRounds),
    [filteredRounds],
  )
  const danger = useMemo(
    () => aggregateDanger(filteredRounds),
    [filteredRounds],
  )
  const qualityDays = useMemo(
    () => moveQualityTimeline(filteredRounds),
    [filteredRounds],
  )
  const leaves = useMemo(
    () => aggregateLeaves(filteredMatches),
    [filteredMatches],
  )
  const flowerTiming = useMemo(
    () => flowerTimingByPhase(filteredRounds),
    [filteredRounds],
  )
  const brilliant = useMemo(
    () => brilliantRate(filteredRounds),
    [filteredRounds],
  )
  const oppFreq = useMemo(
    () => frequentOpponents(filteredMatches),
    [filteredMatches],
  )
  const gamesList = useMemo(() => {
    void favTick
    let list = searchMatches(filteredMatches, query)
    if (favOnly) list = list.filter((m) => isFavoriteMatch(m))
    return list
  }, [filteredMatches, query, favOnly, favTick])
  const roundsList = useMemo(
    () => searchRounds(filteredRounds, query),
    [filteredRounds, query],
  )

  function handleClear() {
    if (!confirm('清除本機戰績？')) return
    clearCareerStats()
    setStats(loadCareerStats())
  }

  function refresh() {
    setStats(loadCareerStats())
    setRanked(rankedSummary())
  }

  const streakText =
    agg.currentStreak.kind === 'none'
      ? '—'
      : agg.currentStreak.kind === 'win'
        ? `連勝 ${agg.currentStreak.n}`
        : `連衰 ${agg.currentStreak.n}`

  return (
    <div className={embedded ? 'you-pane stats-page stats-page--embedded' : 'stats-page'}>
      {!embedded && (
        <header className="fan-page__header">
          <button type="button" className="fan-page__back" onClick={onBack}>
            ← 返大廳
          </button>
          <p className="fan-page__eyebrow">HK ToiMA</p>
          <h1 className="fan-page__title">戰績</h1>
          <p className="fan-page__sub">本機紀錄 · 排位可同步帳戶</p>
          {onOpenInsights && (
            <button
              type="button"
              className="stats-page__refresh"
              onClick={onOpenInsights}
            >
              作戰分析 →
            </button>
          )}
        </header>
      )}

      {embedded && onOpenInsights && (
        <p className="fan-page__note">
          <button type="button" className="you-inline" onClick={onOpenInsights}>
            打開作戰分析
          </button>
          （時間線、準確率、對手分差）
        </p>
      )}

      <nav className="stats-page__tabs" aria-label="戰績分類">
        {(
          [
            ['overview', '綜述'],
            ['games', '牌局'],
            ['stats', '統計'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'is-on' : undefined}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="stats-page__filters" role="group" aria-label="篩選">
        <label>
          <span>玩法</span>
          <select
            value={play}
            onChange={(e) => setPlay(e.target.value as StatsPlayFilter)}
          >
            {PLAY_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>日期</span>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as StatsDateRange)}
          >
            {RANGE_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="stats-page__refresh" onClick={refresh}>
          更新
        </button>
      </div>

      {tab === 'overview' && (
        <>
          <section className="stats-page__grid" aria-label="排位">
            <StatCell label="段位" value={ranked.tierName} />
            <StatCell label="分數" value={ranked.rating} />
            <StatCell label="排位場" value={ranked.games} />
            <StatCell label="最高分" value={ranked.peak} />
          </section>

          <section className="stats-page__grid" aria-label="場次（篩選後）">
            <StatCell label="場數" value={agg.matches} />
            <StatCell label="勝場" value={agg.wins} />
            <StatCell label="勝率" value={formatWinRate(agg.winRate)} />
            <StatCell
              label="平均名次"
              value={formatAvgPlace(results.avgPlace)}
            />
            <StatCell label="首局日" value={formatFirstPlay(firstPlay)} />
            <StatCell label="而家" value={streakText} />
            <StatCell label="最長連勝" value={agg.bestWinStreak || '—'} />
            <StatCell label="最長連衰" value={agg.bestLossStreak || '—'} />
            <StatCell
              label="對 AI"
              value={`${formatWinRate(results.vsAi.rate)}（${results.vsAi.n}）`}
            />
            <StatCell
              label="平均時長"
              value={
                pace.avgDurationSec != null
                  ? formatDuration(Math.round(pace.avgDurationSec))
                  : '—'
              }
            />
          </section>

          <section className="stats-page__grid" aria-label="各玩法場數">
            {(Object.keys(agg.byKind) as StatsPlayKind[]).map((k) => (
              <StatCell
                key={k}
                label={playKindLabel(k)}
                value={`${agg.byKind[k]}·${formatWinRate(extras9.winRateByKind[k].rate)}`}
              />
            ))}
          </section>

          <section className="stats-page__activity" aria-label="最近活動">
            <h2>活動</h2>
            {filteredMatches[0] ? (
              <p className="stats-page__activity-line">
                {new Date(filteredMatches[0].t).toLocaleString('zh-HK', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' · '}
                {playKindLabel(filteredMatches[0].playKind)}
                {' · '}
                {placeLabel(filteredMatches[0].place)}軍
                {filteredMatches[0].durationSec != null
                  ? ` · ${formatDuration(filteredMatches[0].durationSec)}`
                  : ''}
              </p>
            ) : (
              <p className="stats-page__empty">未有完場紀錄 — 打完四圈會寫入</p>
            )}
          </section>
        </>
      )}

      {tab === 'games' && (
        <section className="stats-page__recent" aria-label="牌局紀錄">
          <label className="stats-page__search">
            <span>搜尋</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="玩法／名次／番種／備註"
            />
          </label>
          <label className="stats-page__fav-filter">
            <input
              type="checkbox"
              checked={favOnly}
              onChange={(e) => setFavOnly(e.target.checked)}
            />
            只看收藏
          </label>
          <h2>完場紀錄</h2>
          {gamesList.length === 0 ? (
            <p className="stats-page__empty">呢個篩選未有場次</p>
          ) : (
            <ul className="stats-page__list">
              {gamesList.map((m, i) => {
                const fav = isFavoriteMatch(m)
                return (
                  <li key={`${m.t}-${i}`}>
                    <button
                      type="button"
                      className={`stats-page__fav${fav ? ' is-on' : ''}`}
                      aria-pressed={fav}
                      aria-label={fav ? '取消收藏' : '收藏'}
                      onClick={() => {
                        toggleFavoriteMatch(m)
                        setFavTick((n) => n + 1)
                      }}
                    >
                      {fav ? '★' : '☆'}
                    </button>
                    <span className="stats-page__when">
                      {new Date(m.t).toLocaleString('zh-HK', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="stats-page__mode">
                      {playKindLabel(m.playKind)}
                    </span>
                    <span className="stats-page__note">
                      {placeLabel(m.place)} · ${m.cash}
                      {m.durationSec != null
                        ? ` · ${formatDuration(m.durationSec)}`
                        : ''}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          <h2>近期局</h2>
          {roundsList.length === 0 ? (
            <p className="stats-page__empty">未有局紀錄</p>
          ) : (
            <ul className="stats-page__list">
              {roundsList.map((r, i) => (
                <li key={`${r.t}-r-${i}`}>
                  <span className="stats-page__when">
                    {new Date(r.t).toLocaleString('zh-HK', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="stats-page__mode">
                    {r.playKind
                      ? playKindLabel(r.playKind)
                      : r.mode === 'online'
                        ? '網上'
                        : '本機'}
                  </span>
                  <span className="stats-page__note">{r.note ?? r.outcome}</span>
                  {r.amount != null && (
                    <span className="stats-page__amt">
                      {r.amount >= 0
                        ? `+$${r.amount}`
                        : `-$${Math.abs(r.amount)}`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'stats' && (
        <>
          <section className="stats-page__grid" aria-label="生涯局數">
            <StatCell label="局數" value={stats.rounds} />
            <StatCell label="食糊" value={stats.wins} />
            <StatCell label="自摸" value={stats.tsumo} />
            <StatCell label="出銃食" value={stats.ron} />
            <StatCell label="出銃" value={stats.dealIns} />
            <StatCell label="流局" value={stats.draws} />
            <StatCell label="總番" value={stats.totalFan} />
            <StatCell
              label="淨銀"
              value={
                stats.netAmount >= 0
                  ? `+$${stats.netAmount}`
                  : `-$${Math.abs(stats.netAmount)}`
              }
            />
          </section>

          <h2 className="stats-page__section-title">名次（篩選後場次）</h2>
          <section className="stats-page__grid" aria-label="名次分布">
            <StatCell label="冠" value={results.placeCounts[1]} />
            <StatCell label="亞" value={results.placeCounts[2]} />
            <StatCell label="季" value={results.placeCounts[3]} />
            <StatCell label="殿" value={results.placeCounts[4]} />
            <StatCell
              label="平均名次"
              value={formatAvgPlace(results.avgPlace)}
            />
          </section>

          <h2 className="stats-page__section-title">莊閑／門風（局）</h2>
          <section className="stats-page__grid" aria-label="莊閑門風">
            <StatCell
              label="坐莊食糊率"
              value={`${formatWinRate(results.dealer.rate)}（${results.dealer.n}）`}
            />
            <StatCell
              label="閑家食糊率"
              value={`${formatWinRate(results.nonDealer.rate)}（${results.nonDealer.n}）`}
            />
            {results.byWind.map((b, i) => (
              <StatCell
                key={WIND_LABELS[i]}
                label={`${WIND_LABELS[i]}風`}
                value={`${formatWinRate(b.rate)}（${b.n}）`}
              />
            ))}
          </section>

          <h2 className="stats-page__section-title">逾時／對手</h2>
          <p className="fan-page__note">
            對手逾時勝／自己逾時輸係本機代理：有自動操作且名次對應先計；網上房靠時限事件。
          </p>
          <section className="stats-page__grid" aria-label="逾時對手">
            <StatCell label="自動操作次數" value={results.timeoutsSelf} />
            <StatCell
              label="對手自動操作"
              value={timeoutOut.timeoutsOppSum}
            />
            <StatCell
              label="有逾時嘅場"
              value={results.matchesWithTimeout}
            />
            <StatCell
              label="對手逾時勝"
              value={timeoutOut.wonByOppTimeout}
            />
            <StatCell
              label="自己逾時輸"
              value={timeoutOut.lostBySelfTimeout}
            />
            <StatCell label="你中離場" value={leaves.youLeft} />
            <StatCell label="對手中離勝" value={leaves.oppLeftWins} />
            <StatCell
              label="對 AI 勝率"
              value={`${formatWinRate(results.vsAi.rate)}（${results.vsAi.n}）`}
            />
            <StatCell
              label="對人勝率"
              value={`${formatWinRate(results.vsHuman.rate)}（${results.vsHuman.n}）`}
            />
            <StatCell
              label="穩陣 AI"
              value={`${formatWinRate(results.byPersona.steady.rate)}（${results.byPersona.steady.n}）`}
            />
            <StatCell
              label="進攻 AI"
              value={`${formatWinRate(results.byPersona.attack.rate)}（${results.byPersona.attack.n}）`}
            />
            <StatCell
              label="搏糊 AI"
              value={`${formatWinRate(results.byPersona.gamble.rate)}（${results.byPersona.gamble.n}）`}
            />
          </section>

          <h2 className="stats-page__section-title">枱規組合</h2>
          {rulesCombos.length === 0 ? (
            <p className="stats-page__empty">
              未有寫入底／$/番嘅場（打完新場會開始累積）
            </p>
          ) : (
            <ul className="stats-page__fan-list" aria-label="枱規表現">
              {rulesCombos.map((r) => (
                <li key={r.key}>
                  <span>{r.label}</span>
                  <span>
                    {formatComboRate(r.rate)}（{r.n}）
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="stats-page__section-title">階段／節奏（局）</h2>
          <section className="stats-page__grid" aria-label="階段節奏">
            {(['early', 'mid', 'late'] as GamePhase[]).map((p) => (
              <StatCell
                key={p}
                label={`${phaseLabel(p)}段完·食糊率`}
                value={`${formatWinRate(pace.byEndPhase[p].rate)}（${pace.byEndPhase[p].n}）`}
              />
            ))}
            <StatCell
              label="食糊牆剩"
              value={formatAvgNum(pace.avgWallAtWin)}
            />
            <StatCell
              label="聽牌率"
              value={`${formatWinRate(pace.tenpaiRate)}（${pace.tenpaiN}）`}
            />
            <StatCell
              label="首聽巡"
              value={formatAvgNum(pace.avgFirstTenpaiTurn)}
            />
            <StatCell
              label="首副露巡"
              value={formatAvgNum(pace.avgFirstMeldTurn)}
            />
          </section>

          <h2 className="stats-page__section-title">短／長場</h2>
          <section className="stats-page__grid" aria-label="短長場">
            <StatCell
              label="平均時長"
              value={
                pace.avgDurationSec != null
                  ? formatDuration(Math.round(pace.avgDurationSec))
                  : '—'
              }
            />
            <StatCell
              label="短場勝率"
              value={`${formatWinRate(pace.short.rate)}（${pace.short.n}）`}
            />
            <StatCell
              label="長場勝率"
              value={`${formatWinRate(pace.long.rate)}（${pace.long.n}）`}
            />
          </section>

          <h2 className="stats-page__section-title">時段／星期</h2>
          <section className="stats-page__grid" aria-label="時段星期">
            {TOD_BUCKETS.map((b) => (
              <StatCell
                key={b.id}
                label={b.label}
                value={`${formatWinRate(pace.byTod[b.id].rate)}（${pace.byTod[b.id].n}）`}
              />
            ))}
            {WEEKDAY_LABELS.map((label, i) => (
              <StatCell
                key={label}
                label={`週${label}`}
                value={`${formatWinRate(pace.byWeekday[i]!.rate)}（${pace.byWeekday[i]!.n}）`}
              />
            ))}
          </section>

          <h2 className="stats-page__section-title">戰術（把握／錯過）</h2>
          <section className="stats-page__grid" aria-label="戰術把握">
            <StatCell
              label="可糊"
              value={formatGrasp(tactics.win, tactics.winRate)}
            />
            <StatCell
              label="可碰"
              value={formatGrasp(tactics.pong, tactics.pongRate)}
            />
            <StatCell
              label="可上"
              value={formatGrasp(tactics.chi, tactics.chiRate)}
            />
            <StatCell
              label="可槓"
              value={formatGrasp(tactics.kong, tactics.kongRate)}
            />
            <StatCell label="對手打畀你" value={tactics.feedFromOpp} />
            <StatCell label="搶槓" value={tactics.chankan} />
          </section>

          <h2 className="stats-page__section-title">門清／副露／提示</h2>
          <section className="stats-page__grid" aria-label="門清副露提示">
            <StatCell
              label="門清食糊率"
              value={`${formatWinRate(tactics.closed.rate)}（${tactics.closed.n}）`}
            />
            <StatCell
              label="副露食糊率"
              value={`${formatWinRate(tactics.open.rate)}（${tactics.open.n}）`}
            />
            <StatCell label="上" value={tactics.meldChi} />
            <StatCell label="碰" value={tactics.meldPong} />
            <StatCell label="槓" value={tactics.meldKong} />
            <StatCell
              label="跟提示"
              value={
                tactics.hintShown === 0
                  ? '—'
                  : `${formatWinRate(tactics.hintFollowRate)}（${tactics.hintShown}）`
              }
            />
            <StatCell label="自動摸" value={tactics.autoDraw} />
            <StatCell label="自動過" value={tactics.autoPass} />
          </section>

          <h2 className="stats-page__section-title">棄牌偏好</h2>
          <section className="stats-page__grid" aria-label="棄牌偏好">
            <StatCell
              label="主攻門"
              value={
                prefs.mainSuit
                  ? SUIT_BIAS_LABEL[prefs.mainSuit]
                  : '—'
              }
            />
            {(['man', 'pin', 'sou', 'honor'] as SuitBias[]).map((s) => (
              <StatCell
                key={s}
                label={`首棄${SUIT_BIAS_LABEL[s]}`}
                value={`${prefs.firstDiscard[s]}·${formatWinRate(prefs.firstDiscardWin[s].rate)}`}
              />
            ))}
            {(['man', 'pin', 'sou', 'honor'] as SuitBias[]).map((s) => (
              <StatCell
                key={`d-${s}`}
                label={`棄${SUIT_BIAS_LABEL[s]}`}
                value={
                  prefs.discardAll === 0
                    ? '—'
                    : `${prefs.discardTotals[s]}（${Math.round((prefs.discardTotals[s] / prefs.discardAll) * 100)}%）`
                }
              />
            ))}
            <StatCell
              label="棄幺九"
              value={
                prefs.discardAll === 0
                  ? '—'
                  : `${prefs.discardTerminal}（${Math.round((prefs.discardTerminal / prefs.discardAll) * 100)}%）`
              }
            />
            <StatCell
              label="跟標準起手"
              value={formatRate(openings.bookFollowRate)}
            />
            <StatCell
              label="偏離標準起手"
              value={formatRate(openings.leftBookRate)}
            />
          </section>

          <h2 className="stats-page__section-title">起手牌 Top</h2>
          <p className="fan-page__note">莊／閑首棄具體牌（新局先累積）。</p>
          {openings.dealerTop.length === 0 &&
          openings.nonDealerTop.length === 0 ? (
            <p className="stats-page__empty">未有首棄牌紀錄</p>
          ) : (
            <>
              {openings.dealerTop.length > 0 && (
                <ul className="stats-page__fan-list" aria-label="莊起手">
                  {openings.dealerTop.map((r) => (
                    <li key={`d-${r.tile}`}>
                      <span>莊·{r.tile}</span>
                      <span>
                        {formatRate(r.rate)}（{r.n}）
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {openings.nonDealerTop.length > 0 && (
                <ul className="stats-page__fan-list" aria-label="閑起手">
                  {openings.nonDealerTop.map((r) => (
                    <li key={`n-${r.tile}`}>
                      <span>閑·{r.tile}</span>
                      <span>
                        {formatRate(r.rate)}（{r.n}）
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <h2 className="stats-page__section-title">按巡準確／險棄</h2>
          <section className="stats-page__grid" aria-label="巡與險">
            {TURN_BANDS.map((b) => (
              <StatCell
                key={b}
                label={`巡${b}把握`}
                value={formatRate(turnAcc[b])}
              />
            ))}
            <StatCell
              label="聽牌出銃率"
              value={formatRate(danger.tenpaiDealInRate)}
            />
            <StatCell label="過牌後悔" value={danger.passRegrets} />
            <StatCell
              label="神棄（跟提示）"
              value={formatRate(brilliant)}
            />
            <StatCell label="花·早段局" value={flowerTiming.early} />
            <StatCell label="花·中段局" value={flowerTiming.mid} />
            <StatCell label="花·晚段局" value={flowerTiming.late} />
          </section>

          <h2 className="stats-page__section-title">著法品質時間線</h2>
          {qualityDays.length === 0 ? (
            <p className="stats-page__empty">未有提示／漏糊樣本</p>
          ) : (
            <ul className="insights-timeline" aria-label="品質日線">
              {qualityDays.map((d) => (
                <li key={d.day}>
                  <span className="insights-timeline__day">{d.label}</span>
                  <span className="insights-timeline__bar-wrap">
                    <span
                      className="insights-timeline__bar"
                      style={{
                        width: `${Math.round((d.score ?? 0) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="insights-timeline__meta">
                    {formatRate(d.score)} · ✓{d.best}/±{d.good}/✗{d.miss}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {oppFreq.length > 0 && (
            <>
              <h2 className="stats-page__section-title">常遇對手</h2>
              <ul className="stats-page__fan-list" aria-label="常遇">
                {oppFreq.map((o) => (
                  <li key={o.name}>
                    <span>{o.name}</span>
                    <span>
                      {formatRate(o.rate)}（{o.n}）
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2 className="stats-page__section-title">叮／花／番</h2>
          <section className="stats-page__grid" aria-label="叮花番">
            <StatCell
              label="宣布叮"
              value={`${formatWinRate(prefs.dingRate)}（${prefs.dingN}）`}
            />
            <StatCell
              label="叮平均巡"
              value={formatAvgNum(prefs.avgDingTurn)}
            />
            <StatCell
              label="平均花數"
              value={formatAvgNum(prefs.avgFlowers)}
            />
            <StatCell label="有花局" value={prefs.roundsWithFlower} />
            <StatCell label="平均番" value={formatAvgNum(prefs.avgFan)} />
            <StatCell
              label="最高番"
              value={prefs.maxFan == null ? '—' : prefs.maxFan}
            />
          </section>
          {prefs.fanTop.length > 0 && (
            <section className="stats-page__fan-top" aria-label="番種 Top">
              <h3 className="stats-page__section-title">番種 Top</h3>
              <ul className="stats-page__fan-list">
                {prefs.fanTop.map((f) => (
                  <li key={f.name}>
                    <span>{f.name}</span>
                    <span>{f.n}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="fan-page__note">
            局數係逐鋪累積；場數係四圈完先計。勝率以完場前二名為勝；莊閑／門風用食糊局。性格勝率：場內有該性格 AI
            且你入前二。階段：牆剩&gt;40 早、≤16 晚、其餘中。短場&lt;12 分。巡＝自己棄牌次數。把握＝出現機會時有做；跟提示僅練習局。首棄後數字係該局食糊率。
          </p>
        </>
      )}

      {embedded ? (
        <p className="fan-page__note">
          匯出、上傳同清除喺
          <button type="button" className="you-inline" onClick={onOpenArchive}>
            檔案
          </button>
          。
        </p>
      ) : (
        <button type="button" className="stats-page__clear" onClick={handleClear}>
          清除戰績
        </button>
      )}
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stats-page__cell">
      <span className="stats-page__cell-label">{label}</span>
      <strong className="stats-page__cell-value">{value}</strong>
    </div>
  )
}
