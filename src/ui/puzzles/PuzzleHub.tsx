import { PUZZLES } from './catalog'
import { ShellButton } from '../shell/ShellButton'

interface PuzzleHubProps {
  onBack: () => void
  onOpenPuzzle: (id: string) => void
  onOpenLearn: () => void
}

export function PuzzleHub({
  onBack,
  onOpenPuzzle,
  onOpenLearn,
}: PuzzleHubProps) {
  return (
    <main className="learn-hub">
      <header className="learn-hub__header">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返大廳
        </button>
        <p className="fan-page__eyebrow">Puzzles</p>
        <h1 className="fan-page__title">題庫</h1>
        <p className="learn-hub__lead">
          短題練判斷：鳴唔鳴、打邊張。答完即刻有講解。
        </p>
        <div className="learn-hub__quick">
          <ShellButton variant="secondary" size="sm" onClick={onOpenLearn}>
            返學打牌
          </ShellButton>
        </div>
      </header>

      <section className="learn-hub__grid" aria-label="題目">
        {PUZZLES.map((p) => (
          <button
            key={p.id}
            type="button"
            className="learn-card learn-card--puzzle"
            onClick={() => onOpenPuzzle(p.id)}
          >
            <span className="learn-card__level">{p.theme}</span>
            <strong className="learn-card__title">{p.title}</strong>
            <span className="learn-card__blurb">{p.blurb}</span>
            <span className="learn-card__meta">評分 {p.rating}</span>
          </button>
        ))}
      </section>
    </main>
  )
}
