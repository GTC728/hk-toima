import { useMemo, useState } from 'react'
import {
  allFanMetas,
  FAN_TABLE_META,
  type FanMeta,
  type TileId,
} from '../engine'
import { FanHoverTip } from './FanHoverTip'
import { FAN_TILE_EXAMPLES } from './fanExamples'
import { Tile } from './tiles'

type FanEntry = FanMeta

/** 對齊坊間紙本分類命名（一般／特殊／數字／順子／刻子／花／牌型／么九／哩咕／獎罰） */
type FanCat =
  | 'all'
  | 'yiban'
  | 'teshu'
  | 'shuzi'
  | 'shunzi'
  | 'kezi'
  | 'hua'
  | 'paixing'
  | 'yaojiu'
  | 'ligu'
  | 'jiangfa'

const CAT_LABEL: Record<Exclude<FanCat, 'all'>, string> = {
  yiban: '一般',
  teshu: '特殊',
  shuzi: '數字',
  shunzi: '順子',
  kezi: '刻子',
  hua: '花',
  paixing: '牌型',
  yaojiu: '么九',
  ligu: '哩咕',
  jiangfa: '獎罰',
}

const CAT_BLURB: Record<Exclude<FanCat, 'all'>, string> = {
  yiban: '門清、叮、自摸、花字基礎',
  teshu: '天聽地胡、海底、槓摸等時機',
  shuzi: '缺五、斷么、大於小於五',
  shunzi: '般高、相逢、龍、步步高',
  kezi: '姊妹、兄弟、暗刻、槓',
  hua: '花牌同花賞罰',
  paixing: '平胡、對對、一色、三元四喜',
  yaojiu: '帶么、老頭、十三么',
  ligu: '嚦咕嚦咕',
  jiangfa: '即時賞罰（追、圍骰等）',
}

const FAN_CAT: Record<string, Exclude<FanCat, 'all'>> = {
  // 一般
  menqing: 'yiban',
  menqing_zimo: 'yiban',
  menqing_ding: 'yiban',
  ding: 'yiban',
  dingmo: 'yiban',
  zimo: 'yiban',
  ippatsu: 'yiban',
  wuzi: 'yiban',
  wuhua: 'yiban',
  wuzihua: 'yiban',
  zhenghua: 'yiban',
  lanhua: 'yiban',
  duipeng: 'yiban',
  dudu: 'yiban',
  jiangyan: 'yiban',
  jiadu: 'yiban',
  fengke: 'yiban',
  sanyuanpai: 'yiban',
  dealer: 'yiban',
  lianzhuang: 'yiban',
  // 特殊
  tianting: 'teshu',
  diting: 'teshu',
  tianhu: 'teshu',
  dihu: 'teshu',
  renhu: 'teshu',
  sizinnei: 'teshu',
  qizinnei: 'teshu',
  shizinnei: 'teshu',
  hedilaoyu: 'teshu',
  haidilaoyue: 'teshu',
  huamo: 'teshu',
  gangmo: 'teshu',
  jinshangtianhua: 'teshu',
  mingjue: 'teshu',
  juejue: 'teshu',
  shuangxiang: 'teshu',
  sanxiang: 'teshu',
  fanxue: 'teshu',
  qianggang: 'teshu',
  // 數字
  quewu: 'shuzi',
  xiaoyuwu: 'shuzi',
  dayuwu: 'shuzi',
  duanyaojiu: 'shuzi',
  laoshao: 'shuzi',
  // 順子
  mingbangao: 'shunzi',
  anbangao: 'shunzi',
  mingxiaoshuangbangao: 'shunzi',
  anxiaoshuangbangao: 'shunzi',
  mingzhenshuangbangao: 'shunzi',
  anzhenshuangbangao: 'shunzi',
  mingyisesantong: 'shunzi',
  anyisesantong: 'shunzi',
  mingyisesitong: 'shunzi',
  anyisesitong: 'shunzi',
  mingdansebbg: 'shunzi',
  andansebbg: 'shunzi',
  mingwutongshun: 'shunzi',
  anwutongshun: 'shunzi',
  mingsitongshun: 'shunzi',
  ansitongshun: 'shunzi',
  wutongshun: 'shunzi',
  sitongshun: 'shunzi',
  mingsiguiji: 'shunzi',
  ansiguiji: 'shunzi',
  mingsiguier: 'shunzi',
  ansiguier: 'shunzi',
  mingsiguisi: 'shunzi',
  ansiguisi: 'shunzi',
  xiangfeng: 'shunzi',
  mingsanxiangfeng: 'shunzi',
  ansanxiangfeng: 'shunzi',
  mingsixiangfeng: 'shunzi',
  ansixiangfeng: 'shunzi',
  mingwuxiangfeng: 'shunzi',
  anwuxiangfeng: 'shunzi',
  mingsansebbg: 'shunzi',
  ansansebbg: 'shunzi',
  mingzalong: 'shunzi',
  anzalong: 'shunzi',
  mingqinglong: 'shunzi',
  anqinglong: 'shunzi',
  // 刻子
  minggang: 'kezi',
  angang: 'kezi',
  lianganke: 'kezi',
  sananke: 'kezi',
  sianke: 'kezi',
  wuanake: 'kezi',
  wugangzi: 'kezi',
  erlianke: 'kezi',
  xiaosanlianke: 'kezi',
  dasanlianke: 'kezi',
  erjiemei: 'kezi',
  sanjiemei: 'kezi',
  sijiemei: 'kezi',
  shuangjiemei: 'kezi',
  liangxiongdi: 'kezi',
  xiaosanxiongdi: 'kezi',
  dasanxiongdi: 'kezi',
  xiaosanseke: 'kezi',
  dasanseke: 'kezi',
  // 花
  qizhihua: 'hua',
  liuhuabuzheng: 'hua',
  liangtaihua: 'hua',
  yitaicao: 'hua',
  yitaihua: 'hua',
  qixian: 'hua',
  yiqiangqi: 'hua',
  baxian: 'hua',
  // 牌型
  pinghu: 'paixing',
  wuzihuadaping: 'paixing',
  queimen: 'paixing',
  wumenqi: 'paixing',
  qimenqi: 'paixing',
  banqiuren: 'paixing',
  quanqiuren: 'paixing',
  daji: 'paixing',
  daya: 'paixing',
  hunyise: 'paixing',
  qingyise: 'paixing',
  duiduihu: 'paixing',
  jijihu: 'paixing',
  ziyise: 'paixing',
  xiaosanyuan: 'paixing',
  dasanyuan: 'paixing',
  xiaosifeng: 'paixing',
  dasifeng: 'paixing',
  xiaosixi: 'paixing',
  dasixi: 'paixing',
  // 么九
  hundaiyao: 'yaojiu',
  quandaiyao: 'yaojiu',
  hunlaotou: 'yaojiu',
  qinglaotou: 'yaojiu',
  hundaixyz: 'yaojiu',
  hunmantingfang: 'yaojiu',
  quandaix: 'yaojiu',
  mantingfang: 'yaojiu',
  shisanyao: 'yaojiu',
  shiliubuda: 'yaojiu',
  // 哩咕
  liguligu: 'ligu',
  // 獎罰
  zhui: 'jiangfa',
  ankong_instant: 'jiangfa',
  weishai: 'jiangfa',
  yiersan: 'jiangfa',
}

const CAT_ORDER: Exclude<FanCat, 'all'>[] = [
  'yiban',
  'teshu',
  'shuzi',
  'shunzi',
  'kezi',
  'hua',
  'paixing',
  'yaojiu',
  'ligu',
  'jiangfa',
]

type SortMode = 'category' | 'value-desc' | 'value-asc' | 'name'

const fans = allFanMetas()

function catOf(id: string): Exclude<FanCat, 'all'> {
  return FAN_CAT[id] ?? 'paixing'
}

const INSTANT_IDS = new Set([
  'yitaicao',
  'yitaihua',
  'qixian',
  'yiqiangqi',
  'baxian',
  'zhui',
  'ankong_instant',
  'weishai',
  'yiersan',
])

function formatValue(f: FanEntry): string {
  if (f.note?.startsWith('即時') || INSTANT_IDS.has(f.id)) {
    if (f.value > 0) return `即時 · ${f.value}番等值`
    return f.note ?? '即時賞罰'
  }
  if (f.id === 'lianzhuang') return f.note ?? '2N+1 番'
  if (f.value === 0 && f.note) return f.note
  return `${f.value} 番`
}

function matchesQuery(f: FanEntry, q: string): boolean {
  if (!q) return true
  const hay =
    `${f.name} ${f.id} ${f.note ?? ''} ${f.desc} ${CAT_LABEL[catOf(f.id)]} ${CAT_BLURB[catOf(f.id)]}`.toLowerCase()
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
  const [jiangfaOnly, setJiangfaOnly] = useState(false)

  const filtered = useMemo(() => {
    let list = fans.filter((f) => matchesQuery(f, query))
    if (cat !== 'all') list = list.filter((f) => catOf(f.id) === cat)
    if (jiangfaOnly) list = list.filter((f) => catOf(f.id) === 'jiangfa' || catOf(f.id) === 'hua')
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
        // 同類由淺入深（番數低→高），同紙本圖鑑結構
        return a.value - b.value || a.name.localeCompare(b.name, 'zh-Hant')
      })
    }
    return sorted
  }, [query, cat, sort, jiangfaOnly])

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
    <main className="fan-page fan-page--browse fan-page--search-first fan-page--atlas">
      <header className="fan-page__header fan-page__header--compact">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返大廳
        </button>
        <h1 className="fan-page__title">番數表</h1>
        <p className="fan-page__sub">
          {FAN_TABLE_META.name} · {fans.length} 項 · 圖解示範
        </p>
      </header>

      <div className="fan-browse__toolbar">
        <label className="fan-browse__search fan-browse__search--hero">
          <span className="fan-browse__sr">搜尋番種</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋名稱、別名、分類…（例如：姊妹、清一色、花）"
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
              checked={jiangfaOnly}
              onChange={(e) => {
                setJiangfaOnly(e.target.checked)
                if (e.target.checked) setCat('all')
              }}
            />
            只睇花／獎罰
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
              setJiangfaOnly(false)
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
                title={CAT_BLURB[c]}
                className={`fan-browse__chip ${cat === c ? 'is-active' : ''}`}
                onClick={() => {
                  setCat(c)
                  setJiangfaOnly(false)
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
            id={`fan-cat-${c}`}
            className="fan-atlas__chapter"
            aria-labelledby={`fan-cat-h-${c}`}
          >
            <header className="fan-atlas__chapter-head">
              <h2 id={`fan-cat-h-${c}`}>
                {CAT_LABEL[c]}
                <span className="fan-browse__count">{items.length}</span>
              </h2>
              <p className="fan-atlas__blurb">{CAT_BLURB[c]}</p>
            </header>
            <ul className="fan-atlas__list">
              {items.map((f) => (
                <FanRow key={f.id} fan={f} />
              ))}
            </ul>
          </section>
        ))
      ) : (
        <section className="fan-atlas__chapter" aria-label="搜尋結果">
          <header className="fan-atlas__chapter-head">
            <h2>
              結果
              <span className="fan-browse__count">{filtered.length}</span>
            </h2>
          </header>
          <ul className="fan-atlas__list">
            {filtered.map((f) => (
              <FanRow key={f.id} fan={f} showCat />
            ))}
          </ul>
        </section>
      )}

      <footer className="fan-page__footer">
        {FAN_TABLE_META.refs.length > 0 && (
          <details className="fan-page__refs-fold">
            <summary className="fan-page__refs-summary">參考來源</summary>
            <p className="fan-page__note">{FAN_TABLE_META.note}</p>
            <nav className="fan-page__refs" aria-label="番數表參考來源">
              <p className="fan-page__refs-label">預設＝坊間眾數</p>
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
          </details>
        )}
      </footer>
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
  const groups = FAN_TILE_EXAMPLES[fan.id]
  return (
    <li className="fan-atlas__row">
      <div className="fan-atlas__row-top">
        <FanHoverTip fanId={fan.id}>
          <div className="fan-atlas__identity">
            <span className="fan-atlas__name">{fan.name}</span>
            {showCat && <span className="fan-browse__tag">{CAT_LABEL[c]}</span>}
          </div>
        </FanHoverTip>
        <span className="fan-atlas__value">{formatValue(fan)}</span>
      </div>
      <p className="fan-atlas__desc">{fan.desc}</p>
      {groups && groups.length > 0 && (
        <div className="fan-atlas__tiles" aria-hidden>
          {groups.map((group, gi) => (
            <span key={gi} className="fan-atlas__meld">
              {group.map((id, ti) => (
                <Tile key={`${id}-${ti}`} id={id as TileId} size="sm" />
              ))}
            </span>
          ))}
        </div>
      )}
    </li>
  )
}
