/**
 * WebAudio short beeps + speechSynthesis 粵語報牌（zh-HK）。
 * 靜音存 localStorage；預設開聲。
 */

import type { Action, ActionLogEntry } from '../engine'

const MUTE_KEY = 'toima.mute'

let audioCtx: AudioContext | null = null

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    /* ignore */
  }
  if (muted && typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel()
  }
}

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AC) return null
      audioCtx = new AC()
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

/** Short sine beep */
export function playBeep(
  freq = 440,
  durationMs = 80,
  type: OscillatorType = 'sine',
  gain = 0.08,
): void {
  if (isMuted()) return
  const ac = ctx()
  if (!ac) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.value = gain
  osc.connect(g)
  g.connect(ac.destination)
  const now = ac.currentTime
  g.gain.setValueAtTime(gain, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000)
  osc.start(now)
  osc.stop(now + durationMs / 1000 + 0.02)
}

const VOICE_PHRASES: Record<string, string> = {
  pong: '碰',
  chi: '上',
  kong: '槓',
  win: '食',
  ding: '叮',
}

export function speakCantonese(phrase: string): void {
  if (isMuted()) return
  if (typeof speechSynthesis === 'undefined') return
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(phrase)
    u.lang = 'zh-HK'
    u.rate = 1.05
    u.pitch = 1
    const voices = speechSynthesis.getVoices()
    const hk =
      voices.find((v) => /zh-HK|yue|Cantonese/i.test(`${v.lang} ${v.name}`)) ??
      voices.find((v) => /zh-TW|zh-CN|zh/i.test(v.lang))
    if (hk) u.voice = hk
    speechSynthesis.speak(u)
  } catch {
    /* ignore */
  }
}

export function announceCall(
  kind: 'pong' | 'chi' | 'kong' | 'win' | 'ding',
): void {
  if (isMuted()) return
  const phrase = VOICE_PHRASES[kind] ?? kind
  // Soft cue then voice
  const freq =
    kind === 'win'
      ? 660
      : kind === 'kong'
        ? 520
        : kind === 'ding'
          ? 700
          : kind === 'pong'
            ? 480
            : 420
  playBeep(freq, kind === 'win' ? 120 : 70, 'triangle', 0.1)
  speakCantonese(phrase)
}

export function sfxDraw(): void {
  playBeep(320, 45, 'sine', 0.05)
}

export function sfxDiscard(): void {
  playBeep(380, 55, 'sine', 0.06)
}

/** Map engine action → sfx / 報牌 */
export function playForAction(action: Action): void {
  if (isMuted()) return
  switch (action.type) {
    case 'draw':
      sfxDraw()
      break
    case 'discard':
      if (action.declareDing) announceCall('ding')
      else sfxDiscard()
      break
    case 'chi':
      announceCall('chi')
      break
    case 'pong':
      announceCall('pong')
      break
    case 'mingkong':
    case 'ankong':
    case 'jiagang':
      announceCall('kong')
      break
    case 'win':
      announceCall('win')
      break
    default:
      break
  }
}

/** Play audio for new actionLog entries since `fromIndex` */
export function playForLogEntries(
  log: ActionLogEntry[],
  fromIndex: number,
): void {
  if (isMuted() || fromIndex < 0) return
  for (let i = fromIndex; i < log.length; i++) {
    const entry = log[i]
    if (!entry || entry.action.type === 'start') continue
    playForAction(entry.action)
  }
}
