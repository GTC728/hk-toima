import { useState } from 'react'
import {
  clearCareerStats,
  loadCareerStats,
  type CareerStats,
} from './stats'

interface StatsPageProps {
  onBack: () => void
}

export function StatsPage({ onBack }: StatsPageProps) {
  const [stats, setStats] = useState<CareerStats>(() => loadCareerStats())

  function handleClear() {
    if (!confirm('清除本機戰績？')) return
    clearCareerStats()
    setStats(loadCareerStats())
  }

  return (
    <main className="stats-page">
      <header className="fan-page__header">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返大廳
        </button>
        <p className="fan-page__eyebrow">HK ToiMA</p>
        <h1 className="fan-page__title">戰績</h1>
        <p className="fan-page__sub">本機紀錄 · 唔上雲</p>
      </header>

      <section className="stats-page__grid" aria-label="總覽">
        <StatCell label="局數" value={stats.rounds} />
        <StatCell label="食糊" value={stats.wins} />
        <StatCell label="自摸" value={stats.tsumo} />
        <StatCell label="出銃食" value={stats.ron} />
        <StatCell label="出銃" value={stats.dealIns} />
        <StatCell label="流局" value={stats.draws} />
        <StatCell label="總番" value={stats.totalFan} />
        <StatCell
          label="淨銀"
          value={stats.netAmount >= 0 ? `+$${stats.netAmount}` : `-$${Math.abs(stats.netAmount)}`}
        />
      </section>

      <section className="stats-page__recent" aria-label="近期">
        <h2>近期對局</h2>
        {stats.recent.length === 0 ? (
          <p className="stats-page__empty">未有紀錄 — 打完一局會寫入</p>
        ) : (
          <ul className="stats-page__list">
            {stats.recent.map((r, i) => (
              <li key={`${r.t}-${i}`}>
                <span className="stats-page__when">
                  {new Date(r.t).toLocaleString('zh-HK', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="stats-page__mode">
                  {r.mode === 'online' ? '網上' : '本機'}
                </span>
                <span className="stats-page__note">{r.note ?? r.outcome}</span>
                {r.amount != null && (
                  <span className="stats-page__amt">
                    {r.amount >= 0 ? `+$${r.amount}` : `-$${Math.abs(r.amount)}`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <button type="button" className="stats-page__clear" onClick={handleClear}>
        清除戰績
      </button>
    </main>
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
