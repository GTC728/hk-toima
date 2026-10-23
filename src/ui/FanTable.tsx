import { useMemo, useState } from 'react'
import {
  allFanMetas,
  FAN_TABLE_META,
  type FanMeta,
} from '../engine'
import { FanHoverTip } from './FanHoverTip'

type FanEntry = FanMeta

type FanCat =
  | 'all'
  | 'basic'
  | 'wait'
  | 'combo'
  | 'chance'
  | 'honor'
  | 'ke'
  | 'long'
  | 'yao'
  | 'yise'
  | 'sanse'
  | 'special'
  | 'instant'
  | 'dealer'

const CAT_LABEL: Record<Exclude<FanCat, 'all'>, string> = {
  basic: '門清・叮・自摸',
  wait: '聽口・眼',
  combo: '組合牌型',
  chance: '偶然・時機',
  honor: '字・風・三元四喜',
  ke: '刻・槓',
  long: '龍',
  yao: '么九・斷幺',
  yise: '一色結構',
  sanse: '三色結構',
  special: '特殊牌型',
  instant: '即時賞罰',
  dealer: '莊・連莊',
}

/** id → 分類（未列嘅歸 combo） */
const FAN_CAT: Record<string, Exclude<FanCat, 'all'>> = {
  pinghu: 'combo',
  wuzihuadaping: 'combo',
  menqing: 'basic',
  menqing_zimo: 'basic',
  menqing_ding: 'basic',
  ding: 'basic',
  tianting: 'basic',
  diting: 'basic',
  zimo: 'basic',
  ippatsu: 'basic',
  wuzi: 'basic',
  wuhua: 'basic',
  zhenghua: 'basic',
  lanhua: 'basic',
  wuzihua: 'basic',
  qizhihua: 'basic',
  liuhuabuzheng: 'basic',
  liangtaihua: 'basic',
  duipeng: 'wait',
  dudu: 'wait',
  jiangyan: 'wait',
  jiadu: 'wait',
  queimen: 'combo',
  wumenqi: 'combo',
  qimenqi: 'combo',
  banqiuren: 'combo',
  quanqiuren: 'combo',
  daji: 'combo',
  daya: 'combo',
  hunyise: 'combo',
  qingyise: 'combo',
  duiduihu: 'combo',
  jijihu: 'combo',
  ziyise: 'honor',
  xiaosanyuan: 'honor',
  dasanyuan: 'honor',
  xiaosifeng: 'honor',
  dasifeng: 'honor',
  xiaosixi: 'honor',
  dasixi: 'honor',
  fengke: 'honor',
  sanyuanpai: 'honor',
  sizinnei: 'chance',
  qizinnei: 'chance',
  shizinnei: 'chance',
  hedilaoyu: 'chance',
  haidilaoyue: 'chance',
  huamo: 'chance',
  gangmo: 'chance',
  jinshangtianhua: 'chance',
  mingjue: 'chance',
  juejue: 'chance',
  tianhu: 'chance',
  dihu: 'chance',
  renhu: 'chance',
  shuangxiang: 'chance',
  sanxiang: 'chance',
  fanxue: 'chance',
  qianggang: 'chance',
  minggang: 'ke',
  angang: 'ke',
  lianganke: 'ke',
  sananke: 'ke',
  sianke: 'ke',
  wuanake: 'ke',
  wugangzi: 'ke',
  erlianke: 'ke',
  xiaosanlianke: 'ke',
  dasanlianke: 'ke',
  mingzalong: 'long',
  anzalong: 'long',
  mingqinglong: 'long',
  anqinglong: 'long',
  hundaiyao: 'yao',
  quandaiyao: 'yao',
  hunlaotou: 'yao',
  qinglaotou: 'yao',
  laoshao: 'yao',
  duanyaojiu: 'yao',
  hundaixyz: 'yao',
  quandaix: 'yao',
  quewu: 'yao',
  xiaoyuwu: 'yao',
  dayuwu: 'yao',
  mingsiguiji: 'yise',
  ansiguiji: 'yise',
  mingsiguier: 'yise',
  ansiguier: 'yise',
  mingsiguisi: 'yise',
  ansiguisi: 'yise',
  mingbangao: 'yise',
  anbangao: 'yise',
  mingxiaoshuangbangao: 'yise',
  anxiaoshuangbangao: 'yise',
  mingzhenshuangbangao: 'yise',
  anzhenshuangbangao: 'yise',
  mingyisesantong: 'yise',
  anyisesantong: 'yise',
  mingyisesitong: 'yise',
  anyisesitong: 'yise',
  mingdansebbg: 'yise',
  andansebbg: 'yise',
  wutongshun: 'yise',
  sitongshun: 'yise',
  xiangfeng: 'sanse',
  shuangjiemei: 'sanse',
  mingsanxiangfeng: 'sanse',
  ansanxiangfeng: 'sanse',
  mingsixiangfeng: 'sanse',
  ansixiangfeng: 'sanse',
  mingwuxiangfeng: 'sanse',
  anwuxiangfeng: 'sanse',
  liangxiongdi: 'sanse',
  xiaosanseke: 'sanse',
  dasanseke: 'sanse',
  xiaosanxiongdi: 'sanse',
  dasanxiongdi: 'sanse',
  mingsansebbg: 'sanse',
  ansansebbg: 'sanse',
  erjiemei: 'sanse',
  sanjiemei: 'sanse',
  sijiemei: 'sanse',
  shisanyao: 'special',
  liguligu: 'special',
  shiliubuda: 'special',
  yitaicao: 'instant',
  yitaihua: 'instant',
  qixian: 'instant',
  yiqiangqi: 'instant',
  baxian: 'instant',
  zhui: 'instant',
  ankong_instant: 'instant',
  weishai: 'instant',
  yiersan: 'instant',
  dealer: 'dealer',
  lianzhuang: 'dealer',
}

const CAT_ORDER: Exclude<FanCat, 'all'>[] = [
  'basic',
  'wait',
  'combo',
  'chance',
  'honor',
  'ke',
  'long',
  'yao',
  'yise',
  'sanse',
  'special',
  'instant',
  'dealer',
]

type SortMode = 'category' | 'value-desc' | 'value-asc' | 'name'

const fans = allFanMetas()

function catOf(id: string): Exclude<FanCat, 'all'> {
  return FAN_CAT[id] ?? 'combo'
}

function formatValue(f: FanEntry): string {
  if (f.note?.startsWith('即時') || catOf(f.id) === 'instant') {
    if (f.value > 0) return `即時 · ${f.value}番等值`
    return f.note ?? '即時賞罰'
  }
  if (f.id === 'lianzhuang') return f.note ?? '2N+1 番'
  if (f.note && (f.id === 'huamo' || f.id === 'gangmo' || f.id === 'fengke' || f.id === 'sanyuanpai' || f.id === 'minggang' || f.id === 'angang' || f.id === 'laoshao' || f.id === 'jinshangtianhua')) {
    return `${f.value} 番 · ${f.note}`
  }
  if (f.value === 0 && f.note) return f.note
  return `${f.value} 番`
}

function matchesQuery(f: FanEntry, q: string): boolean {
  if (!q) return true
  const hay =
    `${f.name} ${f.id} ${f.note ?? ''} ${f.desc} ${CAT_LABEL[catOf(f.id)]}`.toLowerCase()
  return q
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .every((token) => hay.includes(token))
}

interface FanTableProps {
  onBack: () => void
}

export function FanTable({ onBack }: FanTableProps) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<FanCat>('all')
  const [sort, setSort] = useState<SortMode>('category')
  const [instantOnly, setInstantOnly] = useState(false)

  const filtered = useMemo(() => {
    let list = fans.filter((f) => matchesQuery(f, query))
    if (cat !== 'all') list = list.filter((f) => catOf(f.id) === cat)
    if (instantOnly) list = list.filter((f) => catOf(f.id) === 'instant')
    const sorted = [...list]
    if (sort === 'value-desc') {
      sorted.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'zh-Hant'))
    } else if (sort === 'value-asc') {
      sorted.sort((a, b) => a.value - b.value || a.name.localeCompare(b.name, 'zh-Hant'))
    } else if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
    } else {
      sorted.sort((a, b) => {
        const ca = CAT_ORDER.indexOf(catOf(a.id))
        const cb = CAT_ORDER.indexOf(catOf(b.id))
        if (ca !== cb) return ca - cb
        return b.value - a.value || a.name.localeCompare(b.name, 'zh-Hant')
      })
    }
    return sorted
  }, [query, cat, sort, instantOnly])

  const grouped = useMemo(() => {
    if (sort !== 'category') return null
    const map = new Map<Exclude<FanCat, 'all'>, FanEntry[]>()
    for (const f of filtered) {
      const c = catOf(f.id)
      const arr = map.get(c) ?? []
      arr.push(f)
      map.set(c, arr)
    }
    return CAT_ORDER.filter((c) => (map.get(c)?.length ?? 0) > 0).map((c) => ({
      cat: c,
      items: map.get(c)!,
    }))
  }, [filtered, sort])

  const catCounts = useMemo(() => {
    const base = fans.filter((f) => matchesQuery(f, query))
    const counts: Partial<Record<FanCat, number>> = { all: base.length }
    for (const c of CAT_ORDER) {
      counts[c] = base.filter((f) => catOf(f.id) === c).length
    }
    return counts
  }, [query])

  return (
    <main className="fan-page fan-page--browse">
      <header className="fan-page__header">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返大廳
        </button>
        <p className="fan-page__eyebrow">HK ToiMA</p>
        <h1 className="fan-page__title">番數表</h1>
        <p className="fan-page__sub">{FAN_TABLE_META.name}</p>
        <p className="fan-page__note fan-page__note--top">{FAN_TABLE_META.note}</p>
        {FAN_TABLE_META.refs.length > 0 && (
          <nav className="fan-page__refs" aria-label="番數表參考來源">
            <p className="fan-page__refs-label">參考來源（預設＝坊間眾數）</p>
            <ul className="fan-page__refs-list">
              {FAN_TABLE_META.refs.map((r) => (
                <li key={r.url}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      r.role === 'default'
                        ? 'fan-page__ref fan-page__ref--default'
                        : 'fan-page__ref'
                    }
                  >
                    {r.role === 'default' ? '預設 · ' : ''}
                    {r.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <div className="fan-browse__toolbar">
        <label className="fan-browse__search">
          <span className="fan-browse__sr">搜尋番種</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜名稱、別名、分類…（例如：般高、清龍、即時）"
            autoComplete="off"
            enterKeyHint="search"
          />
          {query && (
            <button
              type="button"
              className="fan-browse__clear"
              onClick={() => setQuery('')}
              aria-label="清除搜尋"
            >
              ×
            </button>
          )}
        </label>

        <div className="fan-browse__meta">
          <span>
            {filtered.length}／{fans.length} 項
          </span>
          <label className="fan-browse__sort">
            排序
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              aria-label="排序方式"
            >
              <option value="category">按分類</option>
              <option value="value-desc">番數高→低</option>
              <option value="value-asc">番數低→高</option>
              <option value="name">名稱</option>
            </select>
          </label>
          <label className="fan-browse__check">
            <input
              type="checkbox"
              checked={instantOnly}
              onChange={(e) => {
                setInstantOnly(e.target.checked)
                if (e.target.checked) setCat('instant')
                else if (cat === 'instant') setCat('all')
              }}
            />
            只睇即時賞罰
          </label>
        </div>

        <div className="fan-browse__chips" role="tablist" aria-label="番種分類">
          <button
            type="button"
            role="tab"
            aria-selected={cat === 'all'}
            className={`fan-browse__chip ${cat === 'all' ? 'is-active' : ''}`}
            onClick={() => {
              setCat('all')
              setInstantOnly(false)
            }}
          >
            全部
            <em>{catCounts.all ?? 0}</em>
          </button>
          {CAT_ORDER.map((c) => {
            const n = catCounts[c] ?? 0
            if (n === 0 && query) return null
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={cat === c}
                className={`fan-browse__chip ${cat === c ? 'is-active' : ''}`}
                onClick={() => {
                  setCat(c)
                  setInstantOnly(c === 'instant')
                }}
              >
                {CAT_LABEL[c]}
                <em>{n}</em>
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="fan-browse__empty" role="status">
          搵唔到「{query || CAT_LABEL[cat as Exclude<FanCat, 'all'>] || '全部'}」相關番種。試吓改關鍵字或撳「全部」。
        </p>
      ) : grouped ? (
        grouped.map(({ cat: c, items }) => (
          <section
            key={c}
            className="fan-page__section"
            aria-label={CAT_LABEL[c]}
          >
            <h2>
              {CAT_LABEL[c]}
              <span className="fan-browse__count">{items.length}</span>
            </h2>
            <ul className="fan-page__list">
              {items.map((f) => (
                <FanRow key={f.id} fan={f} />
              ))}
            </ul>
          </section>
        ))
      ) : (
        <section className="fan-page__section" aria-label="搜尋結果">
          <h2>
            結果
            <span className="fan-browse__count">{filtered.length}</span>
          </h2>
          <ul className="fan-page__list">
            {filtered.map((f) => (
              <FanRow key={f.id} fan={f} showCat />
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function FanRow({
  fan,
  showCat,
}: {
  fan: FanEntry
  showCat?: boolean
}) {
  const c = catOf(fan.id)
  return (
    <li className="fan-page__row">
      <FanHoverTip fanId={fan.id}>
        <div className="fan-page__name-block">
          <span className="fan-page__name">{fan.name}</span>
          {showCat && (
            <span className="fan-browse__tag">{CAT_LABEL[c]}</span>
          )}
          <span className="fan-page__hint">{fan.desc}</span>
        </div>
      </FanHoverTip>
      <span className="fan-page__value">{formatValue(fan)}</span>
    </li>
  )
}
