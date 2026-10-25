import { useEffect, useRef, useState, type FormEvent } from 'react'
import { fetchMe, sendMagicLink } from './accountClient'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
        },
      ) => string
      reset: (id?: string) => void
    }
  }
}

interface MagicLinkLoginProps {
  /** 已驗證電郵時顯示已登入 */
  verifiedEmail: string | null
  onOpenYou?: () => void
  onLoggedInRefresh?: () => void
}

export function MagicLinkLogin({
  verifiedEmail,
  onOpenYou,
  onLoggedInRefresh,
}: MagicLinkLoginProps) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [devLink, setDevLink] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const widgetRef = useRef<HTMLDivElement>(null)
  const siteKey = SITE_KEY?.trim() || ''

  useEffect(() => {
    if (!siteKey || verifiedEmail || !widgetRef.current) return
    let cancelled = false
    const render = () => {
      if (cancelled || !widgetRef.current || !window.turnstile) return
      widgetRef.current.innerHTML = ''
      window.turnstile.render(widgetRef.current, {
        sitekey: siteKey,
        callback: (token) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(null),
      })
    }
    if (window.turnstile) {
      render()
      return () => {
        cancelled = true
      }
    }
    let script = document.querySelector<HTMLScriptElement>('script[data-turnstile]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.dataset.turnstile = '1'
      document.head.appendChild(script)
    }
    script.addEventListener('load', render)
    return () => {
      cancelled = true
      script.removeEventListener('load', render)
    }
  }, [siteKey, verifiedEmail])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setNote(null)
    setDevLink(null)
    if (siteKey && !turnstileToken) {
      setNote('請先完成人機驗證')
      return
    }
    setBusy(true)
    // 確保有匿名工作階段，寄連結先掛得住玩家
    const me = await fetchMe()
    if (!me) {
      setBusy(false)
      setNote('暫時連唔到伺服器。請稍後再試。')
      return
    }
    const result = await sendMagicLink(email.trim(), turnstileToken ?? '')
    setBusy(false)
    if (!result.ok) {
      setNote(result.error)
      return
    }
    if (result.delivery === 'logged' && result.devLink) {
      setDevLink(result.devLink)
      setNote('開發環境未接寄信。撳下面開啟登入連結（15 分鐘內有效）。')
    } else {
      setNote('已寄出登入連結，請睇電郵。15 分鐘內有效，用一次。')
    }
    onLoggedInRefresh?.()
  }

  if (verifiedEmail) {
    return (
      <>
        <p className="gate__note">已用電郵登入：{verifiedEmail}</p>
        {onOpenYou && (
          <button type="button" className="desk__start" onClick={onOpenYou}>
            去個人頁
          </button>
        )}
      </>
    )
  }

  return (
    <form className="gate__login-form" onSubmit={(e) => void onSubmit(e)}>
      <label>
        電郵
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          placeholder="you@example.com"
          disabled={busy}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {siteKey ? (
        <div ref={widgetRef} className="settings-account__turnstile" />
      ) : (
        <p className="gate__note">本機開發：未設 Turnstile，直接寄／顯示連結。</p>
      )}
      <button
        type="submit"
        className="desk__start"
        disabled={busy || !email.trim() || (Boolean(siteKey) && !turnstileToken)}
      >
        {busy ? '請稍等…' : '寄登入連結'}
      </button>
      <p className="gate__note">沒有密碼。登入只係用來在另一部機認回你。</p>
      {note && (
        <p className="desk__error" role="status">
          {note}
        </p>
      )}
      {devLink && (
        <button
          type="button"
          className="desk__start"
          onClick={() => {
            window.location.assign(devLink)
          }}
        >
          打開登入連結
        </button>
      )}
    </form>
  )
}
