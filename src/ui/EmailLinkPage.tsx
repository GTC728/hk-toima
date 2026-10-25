import { useEffect, useRef, useState } from 'react'
import { CAREER_PROMPTED_KEY, careerPrompted, shouldOfferCareerImport } from './account'
import { consumeMagicLink, uploadCareer } from './accountClient'
import { loadCareerStats } from './stats'

interface EmailLinkPageProps {
  token: string | null
  onDone: () => void
}

export function EmailLinkPage({ token, onDone }: EmailLinkPageProps) {
  const [phase, setPhase] = useState<'working' | 'ask' | 'error'>('working')
  const [message, setMessage] = useState('正在登入…')
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (!token) {
      setPhase('error')
      setMessage('連結冇令牌。')
      return
    }
    const stats = loadCareerStats()
    const prompted = careerPrompted(localStorage.getItem(CAREER_PROMPTED_KEY))
    const hasLocal = shouldOfferCareerImport(stats.rounds, stats.recent.length, prompted)
    let cancelled = false
    void consumeMagicLink(token, hasLocal).then((result) => {
      if (cancelled) return
      window.history.replaceState(null, '', '/')
      if (!result.ok || !result.player) {
        setPhase('error')
        setMessage(result.error ?? '連結無效或者已經用過')
        return
      }
      if (result.needsImportConfirm) {
        setPhase('ask')
        setMessage('呢部機仲有未上傳嘅本機戰績。要搬入呢個電郵帳戶？')
        return
      }
      onDoneRef.current()
    })
    return () => {
      cancelled = true
    }
  }, [token])

  async function answer(importNow: boolean) {
    localStorage.setItem(CAREER_PROMPTED_KEY, '1')
    if (importNow) await uploadCareer(loadCareerStats())
    onDoneRef.current()
  }

  if (phase === 'working') {
    return (
      <div className="gate__card" aria-busy="true" aria-label="正在登入">
        <p className="desk__login-brand">
          <i>萬</i>香港台麻
        </p>
        <p className="gate__note">{message}</p>
      </div>
    )
  }

  if (phase === 'ask') {
    return (
      <div className="gate__card" aria-label="搬入戰績">
        <p className="desk__login-brand">
          <i>萬</i>香港台麻
        </p>
        <p className="gate__note">{message}</p>
        <button type="button" className="desk__start" onClick={() => void answer(true)}>
          搬入帳戶
        </button>
        <button type="button" className="gate__play" onClick={() => void answer(false)}>
          唔使，返大廳
        </button>
      </div>
    )
  }

  return (
    <div className="gate__card" aria-label="登入失敗">
      <p className="desk__login-brand">
        <i>萬</i>香港台麻
      </p>
      <p className="desk__error" role="alert">
        {message}
      </p>
      <button type="button" className="desk__start" onClick={onDone}>
        返大廳
      </button>
    </div>
  )
}
