import { useState } from 'react'
import {
  TRACK_META,
  firstLessonId,
  getLesson,
  lessonIndexInTrack,
  nextTrack,
} from './catalog'
import { Tile } from '../tiles'
import { ShellButton } from '../shell/ShellButton'
import type { TileId } from '../../engine'

interface LearnLessonProps {
  lessonId: string
  onBack: () => void
  /** 有下一課就傳 id；線完結傳 null */
  onDone: (nextLessonId: string | null) => void
  /** 線完結時可跳去下一條線第一課 */
  onStartTrack?: (lessonId: string) => void
}

export function LearnLesson({
  lessonId,
  onBack,
  onDone,
  onStartTrack,
}: LearnLessonProps) {
  const lesson = getLesson(lessonId)
  const place = lessonIndexInTrack(lessonId)
  const [step, setStep] = useState(0)

  if (!lesson || !place) {
    return (
      <main className="learn-hub">
        <p>搵唔到呢課。</p>
        <ShellButton variant="ghost" onClick={onBack}>
          返目錄
        </ShellButton>
      </main>
    )
  }

  const current = lesson.steps[step]!
  const last = step >= lesson.steps.length - 1
  const trackLabel = TRACK_META[place.track].label
  const following = nextTrack(place.track)
  const followingFirst = following ? firstLessonId(following) : undefined
  const followingLabel = following ? TRACK_META[following].label : null

  return (
    <main className="learn-lesson">
      <header className="learn-hub__header">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返目錄
        </button>
        <p className="fan-page__eyebrow">
          {trackLabel} · 第 {place.index}/{place.total} 課 · 步{' '}
          {step + 1}/{lesson.steps.length}
        </p>
        <h1 className="fan-page__title">{lesson.title}</h1>
      </header>

      <section className="learn-lesson__card" aria-label={current.title}>
        <ol className="learn-lesson__dots" aria-hidden>
          {lesson.steps.map((_, i) => (
            <li
              key={i}
              className={
                i === step ? 'is-active' : i < step ? 'is-done' : undefined
              }
            />
          ))}
        </ol>
        <h2>{current.title}</h2>
        <p>{current.body}</p>
        {current.tiles && current.tiles.length > 0 && (
          <div className="learn-lesson__tiles" aria-label="示範牌">
            {current.tiles.map((id, i) => (
              <Tile key={`${id}-${i}`} id={id as TileId} size="md" />
            ))}
          </div>
        )}
      </section>

      <div className="learn-lesson__nav">
        <ShellButton
          variant="ghost"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          上一步
        </ShellButton>
        {last ? (
          place.nextId ? (
            <ShellButton
              variant="primary"
              onClick={() => onDone(place.nextId)}
            >
              下一課
            </ShellButton>
          ) : (
            <div className="learn-lesson__nav-end">
              {followingFirst && onStartTrack && followingLabel && (
                <ShellButton
                  variant="primary"
                  onClick={() => onStartTrack(followingFirst)}
                >
                  開始{followingLabel}
                </ShellButton>
              )}
              <ShellButton variant="secondary" onClick={() => onDone(null)}>
                返目錄
              </ShellButton>
            </div>
          )
        ) : (
          <ShellButton
            variant="primary"
            onClick={() =>
              setStep((s) => Math.min(lesson.steps.length - 1, s + 1))
            }
          >
            下一步
          </ShellButton>
        )}
      </div>
    </main>
  )
}
