import {
  TRACK_META,
  firstLessonId,
  lessonsByTrack,
  type LearnTrack,
} from './catalog'
import { ShellButton } from '../shell/ShellButton'

interface LearnHubProps {
  onBack: () => void
  onOpenLesson: (id: string) => void
  onOpenPuzzles: () => void
  onPractice?: () => void
}

function LessonGrid({
  track,
  onOpenLesson,
  startLabel,
}: {
  track: LearnTrack
  onOpenLesson: (id: string) => void
  startLabel?: string
}) {
  const lessons = lessonsByTrack(track)
  const meta = TRACK_META[track]
  const first = firstLessonId(track)
  if (lessons.length === 0) return null

  return (
    <section
      className={`learn-hub__grid${track === 'master' ? ' learn-hub__grid--master' : ''}`}
      aria-label={meta.label}
    >
      <div className="learn-hub__section-head">
        <h2 className="learn-hub__section-title">{meta.label}</h2>
        <p className="learn-hub__section-lead">{meta.lead}</p>
        {startLabel && first && (
          <div className="learn-hub__section-actions">
            <ShellButton
              variant={track === 'master' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onOpenLesson(first)}
            >
              {startLabel}
            </ShellButton>
          </div>
        )}
      </div>
      {lessons.map((lesson, i) => (
        <button
          key={lesson.id}
          type="button"
          className="learn-card"
          onClick={() => onOpenLesson(lesson.id)}
        >
          <span className="learn-card__level">
            {i + 1}/{lessons.length} · {lesson.level}
          </span>
          <strong className="learn-card__title">{lesson.title}</strong>
          <span className="learn-card__blurb">{lesson.blurb}</span>
          <span className="learn-card__meta">
            {lesson.steps.length} 步 · 約 {lesson.minutes} 分
          </span>
        </button>
      ))}
    </section>
  )
}

export function LearnHub({
  onBack,
  onOpenLesson,
  onOpenPuzzles,
  onPractice,
}: LearnHubProps) {
  const basicsFirst = firstLessonId('zero')
  const masterFirst = firstLessonId('master')

  return (
    <main className="learn-hub">
      <header className="learn-hub__header">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返大廳
        </button>
        <p className="fan-page__eyebrow">Learn</p>
        <h1 className="fan-page__title">學打牌</h1>
        <p className="learn-hub__lead">
          基礎 → 打好啲 → 大師。每條線可由頭打到尾。
        </p>
        <div className="learn-hub__quick">
          {basicsFirst && (
            <ShellButton
              variant="secondary"
              size="sm"
              onClick={() => onOpenLesson(basicsFirst)}
            >
              開始基礎課程
            </ShellButton>
          )}
          {masterFirst && (
            <ShellButton
              variant="primary"
              size="sm"
              onClick={() => onOpenLesson(masterFirst)}
            >
              開始大師課程
            </ShellButton>
          )}
          <ShellButton variant="secondary" size="sm" onClick={onOpenPuzzles}>
            去題庫
          </ShellButton>
          {onPractice && (
            <ShellButton variant="secondary" size="sm" onClick={onPractice}>
              跟住打一鋪
            </ShellButton>
          )}
        </div>
      </header>

      <LessonGrid
        track="zero"
        onOpenLesson={onOpenLesson}
        startLabel="由頭上基礎"
      />
      <LessonGrid
        track="better"
        onOpenLesson={onOpenLesson}
        startLabel="由頭打好啲"
      />
      <LessonGrid
        track="master"
        onOpenLesson={onOpenLesson}
        startLabel="由頭上大師"
      />
    </main>
  )
}
