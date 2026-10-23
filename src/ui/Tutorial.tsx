import { useState } from 'react'

const STEPS = [
  {
    title: '牌種',
    body: '港式台麻用十六張。萬／筒／索各 1–9，加東南西北、中發白，另有春夏秋冬同梅蘭菊竹花牌。花牌摸到就要即補。',
  },
  {
    title: '摸打',
    body: '輪到你先摸一張，再打一張出河。上家／對家／下家可以視乎牌況鳴牌。牆摸晒就流局。',
  },
  {
    title: '上・碰・槓',
    body: '上（吃）只能上上家打出嘅順子；碰係三張一樣；槓係四張（明槓／暗槓／加槓）。鳴完通常要打牌。',
  },
  {
    title: '叮／食',
    body: '叫糊之後可以「叮」鎖定聽牌，之後摸乜打乜。食糊可以自摸或者食人出銃；叮後有即食同過水等規矩。',
  },
  {
    title: '底・番・拉數',
    body: '每局有底同番值。食糊計番收錢；贏家可選擇拉數（欠住下局再計），拉滿口可以斬拉埋單。大廳有番數表同計番機可查。',
  },
] as const

interface TutorialProps {
  onBack: () => void
  /** 跟住打一鋪：直接開本機練習 */
  onPractice?: () => void
}

export function Tutorial({ onBack, onPractice }: TutorialProps) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]!
  const last = step >= STEPS.length - 1

  return (
    <main className="tutorial">
      <header className="tutorial__header">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返大廳
        </button>
        <p className="fan-page__eyebrow">HK ToiMA</p>
        <h1 className="fan-page__title">學打牌</h1>
        <p className="tutorial__progress">
          第 {step + 1}／{STEPS.length} 步
        </p>
      </header>

      <section className="tutorial__card" aria-label={current.title}>
        <ol className="tutorial__dots" aria-hidden>
          {STEPS.map((_, i) => (
            <li key={i} className={i === step ? 'is-active' : i < step ? 'is-done' : ''} />
          ))}
        </ol>
        <h2 className="tutorial__title">{current.title}</h2>
        <p className="tutorial__body">{current.body}</p>
      </section>

      <div className="tutorial__nav">
        <button
          type="button"
          className="tutorial__btn tutorial__btn--ghost"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          上一步
        </button>
        {last ? (
          <>
            {onPractice && (
              <button
                type="button"
                className="tutorial__btn"
                onClick={onPractice}
              >
                跟住打一鋪
              </button>
            )}
            <button
              type="button"
              className="tutorial__btn tutorial__btn--ghost"
              onClick={onBack}
            >
              完成
            </button>
          </>
        ) : (
          <button
            type="button"
            className="tutorial__btn"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          >
            下一步
          </button>
        )}
      </div>
    </main>
  )
}
