import { useEffect, useRef, useState } from 'react'
import { CAREER_PROMPTED_KEY, careerPrompted } from './account'
import {
  deleteAccount,
  downloadOwnData,
  fetchMe,
  fetchSessions,
  logoutDevice,
  sendMagicLink,
  updateDisplayName,
  uploadCareer,
  type DeviceSession,
  type Me,
} from './accountClient'
import { loadCareerStats } from './stats'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

function safePrompted(): boolean {
  try {
    return careerPrompted(localStorage.getItem(CAREER_PROMPTED_KEY))
  } catch {
    return false
  }
}

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

export function useAccount() {
  const [me, setMe] = useState<Me | null>(null)
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [sessions, setSessions] = useState<DeviceSession[]>([])
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const widgetRef = useRef<HTMLDivElement>(null)
  const siteKey = SITE_KEY || ''

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const player = await fetchMe()
      if (cancelled) return
      if (!player) {
        setOffline(true)
        setLoading(false)
        return
      }
      setMe(player)
      setName(player.displayName)
      const listed = await fetchSessions()
      if (!cancelled && listed) setSessions(listed)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const showTurnstile = Boolean(siteKey && me && !me.email)
  const canSendLink = Boolean(me && !me.email && email.trim() && (!siteKey || turnstileToken))

  useEffect(() => {
    if (!showTurnstile || !siteKey || !widgetRef.current) return
    let cancelled = false
    const render = () => {
      if (cancelled || !widgetRef.current || !window.turnstile) return
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
  }, [showTurnstile, siteKey])

  async function saveName() {
    const next = name.trim()
    if (!next || !me) return
    setBusy(true)
    setNote(null)
    const updated = await updateDisplayName(next)
    setBusy(false)
    if (!updated) {
      setNote('改唔到顯示名')
      return
    }
    setMe(updated)
    setName(updated.displayName)
    setNote('已儲存。緊打嗰局唔會改，下一局先用新名。')
  }

  async function sendLink() {
    if (siteKey && !turnstileToken) return
    setBusy(true)
    setNote(null)
    setDevLink(null)
    const result = await sendMagicLink(email.trim(), turnstileToken ?? '')
    setBusy(false)
    if (!result.ok) {
      setNote(result.error)
      return
    }
    if (result.delivery === 'logged' && result.devLink) {
      setDevLink(result.devLink)
      setNote('開發環境未接寄信。撳下面開啟登入連結（15 分鐘內有效）。')
      return
    }
    setNote(
      result.delivery === 'logged'
        ? '開發環境未接寄信，連結已寫入 worker 日誌。'
        : '已寄出登入連結，請睇電郵。15 分鐘內有效。',
    )
  }

  function openDevLink() {
    if (devLink) window.location.assign(devLink)
  }

  async function refreshSessions() {
    const listed = await fetchSessions()
    if (listed) setSessions(listed)
  }

  async function onLogout(all: boolean) {
    setBusy(true)
    const ok = await logoutDevice(all)
    setBusy(false)
    if (!ok) {
      setNote('登出失敗')
      return
    }
    setMe(null)
    setSessions([])
    setOffline(false)
    setNote(all ? '全部裝置已登出。' : '呢部機已登出。')
  }

  async function onUpload() {
    setBusy(true)
    setNote(null)
    const result = await uploadCareer(loadCareerStats())
    setBusy(false)
    if (!result.ok) {
      setNote(result.error)
      return
    }
    localStorage.setItem(CAREER_PROMPTED_KEY, '1')
    setNote('本機戰績已上傳。同一批唔會再收第二次。')
  }

  async function onDownload() {
    setBusy(true)
    const ok = await downloadOwnData()
    setBusy(false)
    setNote(ok ? '已下載你嘅資料。' : '下載失敗')
  }

  async function onDelete() {
    if (
      !confirm(
        '刪除帳戶？所有登入會撤銷，電郵同顯示名會抹走。打完嘅牌局結果留低，但唔再掛呢個名。',
      )
    ) {
      return
    }
    setBusy(true)
    const ok = await deleteAccount()
    setBusy(false)
    if (!ok) {
      setNote('刪除失敗')
      return
    }
    setMe(null)
    setSessions([])
    setNote('帳戶已刪除。')
  }

  async function copyCode() {
    if (!me) return
    try {
      await navigator.clipboard.writeText(me.friendCode)
      setNote('已複製朋友碼')
    } catch {
      setNote(me.friendCode)
    }
  }

  return {
    me,
    offline,
    loading,
    name,
    setName,
    email,
    setEmail,
    sessions,
    note,
    busy,
    siteKey,
    showTurnstile,
    canSendLink,
    widgetRef,
    turnstileToken,
    devLink,
    prompted: safePrompted(),
    saveName,
    sendLink,
    openDevLink,
    refreshSessions,
    onLogout,
    onUpload,
    onDownload,
    onDelete,
    copyCode,
  }
}

export type AccountModel = ReturnType<typeof useAccount>
