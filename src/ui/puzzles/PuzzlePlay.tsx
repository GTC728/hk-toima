import { useState } from 'react'
import { getPuzzle } from './catalog'
import { Tile } from '../tiles'
import { ShellButton } from '../shell/ShellButton'
import type { TileId } from '../../engine'

interface PuzzlePlayProps {
  puzzleId: string
  onBack: () => void
}

export function PuzzlePlay({ puzzleId, onBack }: PuzzlePlayProps) {
  const puzzle = getPuzzle(puzzleId)
  const [picked, setPicked] = useState<string | null>(null)
  const [discardPick, setDiscardPick] = useState<TileId | null>(null)
  const [revealed, setRevealed] = useState(false)

  if (!puzzle) {
    return (
      <main className="learn-hub">
        <p>搵唔到呢題。</p>
        <ShellButton variant="ghost" onClick={onBack}>
          返題庫
        </ShellButton>
      </main>
    )
  }

  const choice =
    puzzle.kind === 'choice'
      ? puzzle.choices?.find((c) => c.id === picked)
      : null
  const discardOk =
    puzzle.kind === 'discard' &&
    revealed &&
    discardPick === puzzle.correctDiscard

  function submitChoice(id: string) {
    setPicked(id)
    setRevealed(true)
  }

  function submitDiscard(id: TileId) {
    if (revealed) return
    setDiscardPick(id)
    setRevealed(true)
  }

  return (
    <main className="puzzle-play">
      <header className="learn-hub__header">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返題庫
        </button>
        <p className="fan-page__eyebrow">
          {puzzle.theme} · 評分 {puzzle.rating}
        </p>
        <h1 className="fan-page__title">{puzzle.title}</h1>
        <p className="learn-hub__lead">{puzzle.prompt}</p>
      </header>

      {puzzle.focusTile && (
        <div className="puzzle-play__focus">
          <span>{puzzle.focusLabel ?? '焦點'}</span>
          <Tile id={puzzle.focusTile} size="lg" />
        </div>
      )}

      <section className="puzzle-play__hand" aria-label="你的手牌">
        <h2>手牌</h2>
        <div className="puzzle-play__tiles">
          {puzzle.hand.map((id, i) => (
            <Tile
              key={`${id}-${i}`}
              id={id}
              size="md"
              selected={discardPick === id}
              onClick={
                puzzle.kind === 'discard' && !revealed
                  ? () => submitDiscard(id)
                  : undefined
              }
            />
          ))}
        </div>
        {puzzle.kind === 'discard' && !revealed && (
          <p className="puzzle-play__hint">撳一張牌表示你要打佢</p>
        )}
      </section>

      {puzzle.kind === 'choice' && puzzle.choices && (
        <div className="puzzle-play__choices" role="group" aria-label="選項">
          {puzzle.choices.map((c) => (
            <ShellButton
              key={c.id}
              variant={
                revealed
                  ? c.correct
                    ? 'primary'
                    : picked === c.id
                      ? 'secondary'
                      : 'ghost'
                  : 'secondary'
              }
              disabled={revealed}
              onClick={() => submitChoice(c.id)}
            >
              {c.label}
            </ShellButton>
          ))}
        </div>
      )}

      {revealed && (
        <section
          className={`puzzle-play__result${
            (choice?.correct ?? discardOk) ? ' is-ok' : ' is-bad'
          }`}
          aria-live="polite"
        >
          <strong>
            {choice?.correct || discardOk ? '答啱' : '未啱'}
          </strong>
          <p>
            {puzzle.kind === 'choice'
              ? choice?.explain
              : discardOk
                ? puzzle.discardExplain
                : `正確係打 ${puzzle.correctDiscard}。${puzzle.discardExplain ?? ''}`}
          </p>
          <ShellButton variant="secondary" size="sm" onClick={onBack}>
            下一題（返題庫）
          </ShellButton>
        </section>
      )}
    </main>
  )
}
