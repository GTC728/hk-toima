/** 對局偏好（Batch 3） */

import {
  AI_PERSONA_ORDER,
  isAiPersona,
  type AiPersona,
} from '../engine'

export type DefaultPlayKind = 'casual' | 'private' | 'ai'

/** 等人幾耐之後用 AI 補位；0 = 只等人 */
export type MatchFillAiAfter = 0 | 15 | 30 | 60

export const DEFAULT_PLAY_OPTIONS: {
  id: DefaultPlayKind
  name: string
  note: string
}[] = [
  { id: 'ai', name: '和 AI 對戰', note: '一人對三 AI' },
  { id: 'private', name: '私人房間', note: '開房／入朋友房' },
  { id: 'casual', name: '普通', note: '匹配對手；大廳先開呢頁' },
]

const K = {
  play: 'hktoima.match.defaultPlay',
  persona: 'hktoima.match.defaultPersona',
  leave: 'hktoima.match.leaveConfirm',
  summary: 'hktoima.match.roundSummary',
  fillCasual: 'hktoima.match.fillAiAfterCasual',
  fillRanked: 'hktoima.match.fillAiAfterRanked',
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

export function loadDefaultPlayKind(): DefaultPlayKind {
  const v = read(K.play)
  if (v === 'casual' || v === 'private' || v === 'ai') return v
  return 'ai'
}

export function saveDefaultPlayKind(id: DefaultPlayKind) {
  write(K.play, id)
}

export function loadDefaultAiPersona(): AiPersona {
  const v = read(K.persona)
  if (isAiPersona(v)) return v
  return 'attack'
}

export function saveDefaultAiPersona(id: AiPersona) {
  write(K.persona, id)
}

export function loadLeaveConfirm(): boolean {
  return flag(K.leave, true)
}

export function saveLeaveConfirm(on: boolean) {
  write(K.leave, on ? '1' : '0')
}

export function loadRoundSummary(): boolean {
  return flag(K.summary, true)
}

export function saveRoundSummary(on: boolean) {
  write(K.summary, on ? '1' : '0')
}

function parseFillAfter(raw: string | null, fallback: MatchFillAiAfter): MatchFillAiAfter {
  const n = Number(raw)
  if (n === 0 || n === 15 || n === 30 || n === 60) return n
  return fallback
}

export function loadCasualFillAiAfter(): MatchFillAiAfter {
  return parseFillAfter(read(K.fillCasual), 15)
}

export function saveCasualFillAiAfter(sec: MatchFillAiAfter) {
  write(K.fillCasual, String(sec))
}

export function loadRankedFillAiAfter(): MatchFillAiAfter {
  return parseFillAfter(read(K.fillRanked), 0)
}

export function saveRankedFillAiAfter(sec: MatchFillAiAfter) {
  write(K.fillRanked, String(sec))
}

export function loadMatchFillAiAfter(mode: 'casual' | 'ranked'): MatchFillAiAfter {
  return mode === 'ranked' ? loadRankedFillAiAfter() : loadCasualFillAiAfter()
}

export function fillAiAfterLabel(sec: MatchFillAiAfter): string {
  if (sec === 0) return '只等人（唔補 AI）'
  return `${sec} 秒後可補 AI`
}

/** 退出／返大廳；開咗二次確認先問 */
export function requestLeave(onLeave: () => void, message = '確定退出這局？'): void {
  if (!loadLeaveConfirm()) {
    onLeave()
    return
  }
  if (confirm(message)) onLeave()
}

export function personaLabelList(): { id: AiPersona; name: string }[] {
  return AI_PERSONA_ORDER.map((id) => ({
    id,
    name: id === 'steady' ? '穩陣' : id === 'attack' ? '進攻' : '搏糊',
  }))
}
