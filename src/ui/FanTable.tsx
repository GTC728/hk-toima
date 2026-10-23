import fansData from '../engine/fans.json'

interface FanEntry {
  id: string
  name: string
  value: number
  implemented?: boolean
  note?: string
}

const fans = fansData.fans as FanEntry[]

interface FanTableProps {
  onBack: () => void
}

export function FanTable({ onBack }: FanTableProps) {
  const implemented = fans.filter((f) => f.implemented)
  const reserved = fans.filter((f) => !f.implemented)

  return (
    <main className="fan-page">
      <header className="fan-page__header">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返大廳
        </button>
        <p className="fan-page__eyebrow">HK ToiMA</p>
        <h1 className="fan-page__title">番數表</h1>
        <p className="fan-page__sub">{fansData.name}</p>
      </header>

      <section className="fan-page__section" aria-label="已實作番種">
        <h2>已計入引擎</h2>
        <ul className="fan-page__list">
          {implemented.map((f) => (
            <li key={f.id} className="fan-page__row">
              <span className="fan-page__name">{f.name}</span>
              <span className="fan-page__value">
                {f.note ? f.note : `${f.value} 番`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="fan-page__section" aria-label="預留番種">
        <h2>預留（未實作）</h2>
        <p className="fan-page__note">{fansData.note}</p>
        <ul className="fan-page__list fan-page__list--muted">
          {reserved.map((f) => (
            <li key={f.id} className="fan-page__row">
              <span className="fan-page__name">{f.name}</span>
              <span className="fan-page__value">{f.value} 番</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
