/** 通知／社交偏好（Batch 4；後端未接時仍記喺本機） */

export type ChatScope = 'off' | 'table' | 'friends'

const K = {
  email: 'hktoima.notify.email',
  inbox: 'hktoima.notify.inbox',
  chat: 'hktoima.social.chatScope',
} as const

function read(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode */
  }
}

function flag(key: string, fallback: boolean): boolean {
  const v = read(key)
  if (v === '0') return false
  if (v === '1') return true
  return fallback
}

export function loadNotifyEmail(): boolean {
  return flag(K.email, true)
}

export function saveNotifyEmail(on: boolean) {
  write(K.email, on ? '1' : '0')
}

export function loadNotifyInbox(): boolean {
  return flag(K.inbox, true)
}

export function saveNotifyInbox(on: boolean) {
  write(K.inbox, on ? '1' : '0')
}

export function loadChatScope(): ChatScope {
  const v = read(K.chat)
  if (v === 'off' || v === 'table' || v === 'friends') return v
  return 'table'
}

export function saveChatScope(scope: ChatScope) {
  write(K.chat, scope)
}

export const CHAT_SCOPE_OPTIONS: { id: ChatScope; name: string; note: string }[] = [
  { id: 'off', name: '關閉', note: '唔收局內訊息' },
  { id: 'table', name: '本枱', note: '只同枱四個人' },
  { id: 'friends', name: '朋友', note: '加友之後先用到' },
]
