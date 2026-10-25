import { useMemo, useState } from 'react'
import {
  filterMatches,
  filterRounds,
  formatAvgNum,
  formatWinRate,
  loadCareerStats,
  phaseLabel,
  type GamePhase,
  type StatsDateRange,
  type StatsPlayFilter,
} from './stats'
import {
  aggregateOppRatingBands,
  aggregateShapes,
  buildMatchTimeline,
  comparePeriods,
  computeAccuracyV1,
  formatAccuracy,
  formatDeltaRate,
  MATCH_SHAPE_LABEL,
  type MatchShape,
} from './stats-insights'
import {
  aggregateExtras9,
  attachTimelineAccuracy,
  formatDecisionMs,
  SUIT_BIAS_LABEL,
} from './stats-extras9'
import {
  accuracyByShape,
  computeSkillScores,
  filterByTimeClass,
  loadInsightsAdvanced,
  ratingDeltaByDay,
  saveInsightsAdvanced,
  TIME_CLASS_LABEL,
  totalReplayViews,
  type TimeClassFilter,
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
  aggregateOpenings,
  brilliantRate,
  formatRate,
  moveQualityTimeline,
  TURN_BANDS,
} from './stats-s12'
import { loadProfilePrefs, privacyLabel } from './profilePrefs'
import type { SuitBias } from './stats'

interface InsightsPageProps {
  onBack?: () => void
  onOpenStats?: () => void
}

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
]

export function InsightsPage({ onBack, onOpenStats }: InsightsPageProps) {
  const [play, setPlay] = useState<StatsPlayFilter>('all')
  const [range, setRange] = useState<StatsDateRange>('30')
  const [timeClass, setTimeClass] = useState<TimeClassFilter>('all')
  const [advanced, setAdvanced] = useState(() => loadInsightsAdvanced())
  const [career, setCareer] = useState(() => loadCareerStats())

  const filteredMatches = useMemo(() => {
    const base = filterMatches(career.matches, { play, range })
    return filterByTimeClass(base, timeClass)
  }, [career.matches, play, range, timeClass])
  const filteredRounds = useMemo(
    () => filterRounds(career.recent, { play, range }),
    [career.recent, play, range],
  )

  const timeline = useMemo(
    () =>
      attachTimelineAccuracy(
        buildMatchTimeline(filteredMatches, 14),
        filteredRounds,
      ),
    [filteredMatches, filteredRounds],
  )
  const maxGames = Math.max(1, ...timeline.map((b) => b.games))
  const accuracy = useMemo(
    () => computeAccuracyV1(filteredRounds),
    [filteredRounds],
  )
  const extras9 = useMemo(
    () => aggregateExtras9(filteredMatches, filteredRounds),
    [filteredMatches, filteredRounds],
  )
  const compare = useMemo(
    () => comparePeriods(career.matches, career.recent, { play, range }),
    [career.matches, career.recent, play, range],
  )
  const bands = useMemo(
    () => aggregateOppRatingBands(filteredMatches),
    [filteredMatches],
  )
  const bandMax = Math.max(1, ...bands.map((b) => b.n))
  const shapes = useMemo(
    () => aggregateShapes(filteredMatches, filteredRounds),
    [filteredMatches, filteredRounds],
  )
  const shapeIds = Object.keys(MATCH_SHAPE_LABEL) as MatchShape[]
  const shapeAcc = useMemo(
    () => accuracyByShape(filteredMatches, filteredRounds),
    [filteredMatches, filteredRounds],
  )
  const skills = useMemo(
    () => computeSkillScores(filteredMatches, filteredRounds),
    [filteredMatches, filteredRounds],
  )
  const ratingDays = useMemo(
    () => ratingDeltaByDay(filteredMatches, 14),
    [filteredMatches],
  )
  const timeoutOut = useMemo(
    () => aggregateTimeoutOutcomes(filteredMatches),
    [filteredMatches],
  )
  const rulesCombos = useMemo(
    () => aggregateRulesCombos(filteredMatches, 5),
    [filteredMatches],
  )
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
    () => moveQualityTimeline(filteredRounds, 10),
    [filteredRounds],
  )
  const brilliant = useMemo(
    () => brilliantRate(filteredRounds),
    [filteredRounds],
  )

  const won = filteredMatches.filter((m) => m.place <= 2).length
  const lost = filteredMatches.filter((m) => m.place > 2).length

  return (
    <div className="stats-page insights-page">
      <header className="fan-page__header">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返大廳
        </button>
        <p className="fan-page__eyebrow">HK ToiMA</p>
        <h1 className="fan-page__title">作戰分析</h1>
        <p className="fan-page__sub">
          Insights · 規則向準確率 · 時間線 ·{' '}
          {privacyLabel(loadProfilePrefs().privacy)}
        </p>
      </header>

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
        <label>
          <span>時限</span>
          <select
            value={timeClass}
            onChange={(e) =>
              setTimeClass(e.target.value as TimeClassFilter)
            }
          >
            <option value="all">全部</option>
            {(Object.keys(TIME_CLASS_LABEL) as (keyof typeof TIME_CLASS_LABEL)[]).map(
              (id) => (
                <option key={id} value={id}>
                  {TIME_CLASS_LABEL[id]}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="insights-advanced-toggle">
          <input
            type="checkbox"
            checked={advanced}
            onChange={(e) => {
              const on = e.target.checked
              setAdvanced(on)
              saveInsightsAdvanced(on)
            }}
          />
          進階
        </label>
        <button
          type="button"
          className="stats-page__refresh"
          onClick={() => setCareer(loadCareerStats())}
        >
          更新
        </button>
        {onOpenStats && (
          <button type="button" className="stats-page__refresh" onClick={onOpenStats}>
            戰績
          </button>
        )}
      </div>

      <section className="stats-page__grid" aria-label="本期撮要">
        <StatCell label="場數" value={filteredMatches.length} />
        <StatCell label="勝場" value={won} />
        <StatCell label="負場" value={lost} />
        <StatCell
          label="勝率"
          value={formatWinRate(
            filteredMatches.length === 0
              ? null
              : won / filteredMatches.length,
          )}
        />
        <StatCell label="準確率 v1" value={formatAccuracy(accuracy)} />
        <StatCell
          label="首局日"
          value={formatFirstPlay(firstPlayAt(career))}
        />
        <StatCell label="對手逾時勝" value={timeoutOut.wonByOppTimeout} />
        <StatCell label="自己逾時輸" value={timeoutOut.lostBySelfTimeout} />
      </section>

      {compare && (
        <>
          <h2 className="stats-page__section-title">同上期對比</h2>
          <section className="stats-page__grid" aria-label="同期對比">
            <StatCell
              label="場數 Δ"
              value={
                compare.deltaGames === 0
                  ? '0'
                  : compare.deltaGames > 0
                    ? `+${compare.deltaGames}`
                    : `${compare.deltaGames}`
              }
            />
            <StatCell
              label="勝率 Δ"
              value={formatDeltaRate(compare.deltaWinRate)}
            />
            <StatCell
              label="準確率 Δ"
              value={formatDeltaRate(compare.deltaAccuracy)}
            />
            <StatCell
              label="上期勝率"
              value={formatWinRate(compare.previous.winRate)}
            />
            <StatCell
              label="上期準確"
              value={formatAccuracy(compare.previous.accuracy)}
            />
          </section>
        </>
      )}

      <h2 className="stats-page__section-title">場數時間線</h2>
      {timeline.length === 0 ? (
        <p className="stats-page__empty">呢個篩選未有完場 — 打完會出現</p>
      ) : (
        <ul className="insights-timeline" aria-label="每日場數">
          {timeline.map((b) => (
            <li key={b.day}>
              <span className="insights-timeline__day">{b.label}</span>
              <span className="insights-timeline__bar-wrap">
                <span
                  className="insights-timeline__bar"
                  style={{ width: `${(b.games / maxGames) * 100}%` }}
                />
              </span>
              <span className="insights-timeline__meta">
                {b.games}場 · {formatWinRate(b.winRate)}
                {b.accuracy != null
                  ? ` · 準${formatAccuracy(b.accuracy)}`
                  : ''}
                {b.rating != null ? ` · ${b.rating}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="stats-page__section-title">對手分差帶</h2>
      <p className="fan-page__note insights-note">
        用排位場嘅「對手平均分 − 你開場分」。普通／私人未記分差會空白。
      </p>
      <ul className="insights-bands" aria-label="對手分差">
        {bands.map((b) => (
          <li key={b.id}>
            <span className="insights-bands__label">{b.label}</span>
            <span className="insights-timeline__bar-wrap">
              <span
                className="insights-timeline__bar insights-timeline__bar--band"
                style={{ width: `${(b.n / bandMax) * 100}%` }}
              />
            </span>
            <span className="insights-timeline__meta">
              {b.n === 0
                ? '—'
                : `${formatWinRate(b.rate)}（${b.n}）`}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="stats-page__section-title">準確率 v1</h2>
      <p className="fan-page__note">
        合成：可糊把握、鳴牌把握、少出銃、練習跟提示（有樣本先計）。詳見專案{' '}
        <code>design/accuracy-v1.md</code>。唔係引擎最佳著評級。
      </p>
      <section className="stats-page__grid" aria-label="準確率">
        <StatCell label="本期" value={formatAccuracy(accuracy)} />
        <StatCell
          label="勝時準確"
          value={formatAccuracy(extras9.accuracyWhenWin)}
        />
        <StatCell
          label="負時準確"
          value={formatAccuracy(extras9.accuracyWhenLose)}
        />
        {(['early', 'mid', 'late'] as GamePhase[]).map((p) => (
          <StatCell
            key={p}
            label={`${phaseLabel(p)}段把握`}
            value={formatAccuracy(shapes.accuracyByPhase[p])}
          />
        ))}
      </section>

      <h2 className="stats-page__section-title">聽牌／拉帳／決策</h2>
      <section className="stats-page__grid" aria-label="聽牌拉帳決策">
        {(['early', 'mid', 'late'] as GamePhase[]).map((p) => (
          <StatCell
            key={`t-${p}`}
            label={`首聽·${phaseLabel(p)}`}
            value={extras9.tenpaiByPhase[p]}
          />
        ))}
        <StatCell
          label="聽後幾巡糊"
          value={formatAvgNum(extras9.avgTenpaiToWin)}
        />
        <StatCell
          label="流局聽牌"
          value={`${formatWinRate(extras9.drawTenpaiRate)}（${extras9.drawTenpaiN}）`}
        />
        <StatCell
          label="拉帳淨"
          value={
            extras9.laNetSum === 0
              ? '—'
              : extras9.laNetSum > 0
                ? `+$${extras9.laNetSum}`
                : `-$${Math.abs(extras9.laNetSum)}`
          }
        />
        <StatCell
          label="即時賞罰淨"
          value={
            extras9.instantBonusSum === 0
              ? '—'
              : extras9.instantBonusSum > 0
                ? `+$${extras9.instantBonusSum}`
                : `-$${Math.abs(extras9.instantBonusSum)}`
          }
        />
        <StatCell
          label="平均決策"
          value={formatDecisionMs(extras9.avgDecisionMs)}
        />
        <StatCell
          label="低時操作"
          value={
            extras9.decisionMoves === 0
              ? '—'
              : `${formatWinRate(extras9.lowTimeRate)}（${extras9.lowTimeMoves}）`
          }
        />
      </section>

      <h2 className="stats-page__section-title">出銃門類</h2>
      <section className="stats-page__grid" aria-label="出銃門類">
        {(['man', 'pin', 'sou', 'honor'] as SuitBias[]).map((s) => (
          <StatCell
            key={s}
            label={`銃${SUIT_BIAS_LABEL[s]}`}
            value={extras9.dealInBySuit[s]}
          />
        ))}
      </section>

      <h2 className="stats-page__section-title">曲線形狀</h2>
      <p className="fan-page__note insights-note">
        半場現金名次 vs 終場：穩贏／翻盤／崩盤／拉鋸／穩輸。翻盤＝中段後二→前二；崩盤相反。
      </p>
      <section className="stats-page__grid" aria-label="形狀">
        <StatCell
          label="翻盤率"
          value={formatWinRate(shapes.comebackRate)}
        />
        <StatCell
          label="崩盤率"
          value={formatWinRate(shapes.collapseRate)}
        />
        <StatCell
          label="平均表現分"
          value={
            shapes.avgPerfRating == null
              ? '—'
              : Math.round(shapes.avgPerfRating)
          }
        />
        {shapeIds.map((id) => (
          <StatCell
            key={id}
            label={MATCH_SHAPE_LABEL[id]}
            value={`${formatWinRate(shapes.byShape[id].rate)}（${shapes.byShape[id].n}）`}
          />
        ))}
      </section>

      {advanced && (
        <>
          <h2 className="stats-page__section-title">枱規組合</h2>
          {rulesCombos.length === 0 ? (
            <p className="stats-page__empty">未有枱規指紋場次</p>
          ) : (
            <ul className="stats-page__fan-list" aria-label="枱規">
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

          <h2 className="stats-page__section-title">起手／按巡／險棄</h2>
          <section className="stats-page__grid" aria-label="起手巡險">
            <StatCell
              label="跟標準起手"
              value={formatRate(openings.bookFollowRate)}
            />
            <StatCell
              label="偏離標準"
              value={formatRate(openings.leftBookRate)}
            />
            {TURN_BANDS.map((b) => (
              <StatCell
                key={b}
                label={`巡${b}`}
                value={formatRate(turnAcc[b])}
              />
            ))}
            <StatCell
              label="聽牌出銃"
              value={formatRate(danger.tenpaiDealInRate)}
            />
            <StatCell label="過牌後悔" value={danger.passRegrets} />
            <StatCell label="神棄率" value={formatRate(brilliant)} />
          </section>

          <h2 className="stats-page__section-title">品質時間線</h2>
          {qualityDays.length === 0 ? (
            <p className="stats-page__empty">未有樣本</p>
          ) : (
            <ul className="insights-timeline" aria-label="品質">
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
                    {formatRate(d.score)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="stats-page__section-title">排位分 Δ</h2>
          {ratingDays.length === 0 ? (
            <p className="stats-page__empty">未有排位分變動紀錄</p>
          ) : (
            <ul className="insights-timeline" aria-label="每日分差">
              {ratingDays.map((d) => (
                <li key={d.day}>
                  <span className="insights-timeline__day">{d.label}</span>
                  <span className="insights-timeline__bar-wrap">
                    <span
                      className="insights-timeline__bar"
                      style={{
                        width: `${Math.min(100, Math.abs(d.delta) * 2)}%`,
                      }}
                    />
                  </span>
                  <span className="insights-timeline__meta">
                    {d.delta > 0 ? `+${d.delta}` : d.delta} · {d.games}場
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="stats-page__section-title">形狀準確率</h2>
          <section className="stats-page__grid" aria-label="形狀準確">
            {shapeIds.map((id) => (
              <StatCell
                key={`sa-${id}`}
                label={MATCH_SHAPE_LABEL[id]}
                value={formatAccuracy(shapeAcc[id])}
              />
            ))}
          </section>

          <h2 className="stats-page__section-title">規則向技能分</h2>
          <p className="fan-page__note insights-note">
            由階段把握／鳴糊／聽牌／少出銃合成 0–100；唔係引擎評級。
          </p>
          <section className="stats-page__grid" aria-label="技能分">
            <StatCell
              label="早段"
              value={skills.opening == null ? '—' : skills.opening}
            />
            <StatCell
              label="戰術"
              value={skills.tactics == null ? '—' : skills.tactics}
            />
            <StatCell
              label="策略"
              value={skills.strategy == null ? '—' : skills.strategy}
            />
            <StatCell
              label="晚段"
              value={skills.endgame == null ? '—' : skills.endgame}
            />
            <StatCell label="重播次數" value={totalReplayViews()} />
          </section>

          <h2 className="stats-page__section-title">著法品質（粗）</h2>
          <section className="stats-page__grid" aria-label="著法品質">
            <StatCell label="跟提示" value={shapes.moveQuality.best} />
            <StatCell label="偏離提示" value={shapes.moveQuality.good} />
            <StatCell label="漏糊／出銃" value={shapes.moveQuality.miss} />
          </section>
        </>
      )}

      <h2 className="stats-page__section-title">相近段位基準</h2>
      <p className="fan-page__note">
        需要匿名聚合後端先有同段位對照線（backlog #42 #132）— 暫未開放。
      </p>
    </div>
  )
}

function StatCell({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="stats-page__cell">
      <span className="stats-page__cell-label">{label}</span>
      <span className="stats-page__cell-value">{value}</span>
    </div>
  )
}
