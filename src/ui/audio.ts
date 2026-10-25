/**
 * WebAudio short beeps + speechSynthesis 粵語報牌（zh-HK）。
 * 摸打聲同報牌分開記；舊嘅 toima.mute＝1 當兩邊都關。
 */

import type { Action, ActionLogEntry } from '../engine'
import { soundThemeParams } from './boardPrefs'
import { loadSfxVolume, loadVoiceVolume } from './extraPrefs'
import {
  loadSfxClaimOn,
  loadSfxDiscardOn,
  loadSfxDrawOn,
  loadSfxWinOn,
  loadSoundCaptions,
} from './leftoverPrefs'

type CaptionFn = (text: string) => void
let captionSink: CaptionFn | null = null

export function setSoundCaptionSink(fn: CaptionFn | null) {
  captionSink = fn
}

function caption(text: string) {
  if (!loadSoundCaptions() || !captionSink) return
  captionSink(text)
}

const MUTE_KEY = 'toima.mute'
const SFX_KEY = 'hktoima.sfx'
const VOICE_KEY = 'hktoima.voice'

let audioCtx: AudioContext | null = null

/** 新鍵未寫過時，跟舊靜音；寫過就以 0／1 為準。 */
export function parseSoundEnabled(
  stored: string | null,
  legacyMute: string | null,
): boolean {
  if (stored === '0') return false
  if (stored === '1') return true
  return legacyMute !== '1'
}

function readFlag(key: string): boolean {
  try {
    return parseSoundEnabled(
      localStorage.getItem(key),
      localStorage.getItem(MUTE_KEY),
    )
  } catch {
    return true
  }
}

function writeFlag(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch {
    /* private mode */
  }
}

function syncLegacyMute(): void {
  try {
    const muted = !sfxEnabled() && !voiceEnabled()
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function sfxEnabled(): boolean {
  return readFlag(SFX_KEY)
}

export function voiceEnabled(): boolean {
  return readFlag(VOICE_KEY)
}

export function setSfxEnabled(on: boolean): void {
  writeFlag(SFX_KEY, on)
  syncLegacyMute()
}

export function setVoiceEnabled(on: boolean): void {
  writeFlag(VOICE_KEY, on)
  syncLegacyMute()
  if (!on && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

/** 兩邊都關先算靜音。大廳按鈕一按就齊關或齊開。 */
export function isMuted(): boolean {
  return !sfxEnabled() && !voiceEnabled()
}

export function setMuted(muted: boolean): void {
  writeFlag(SFX_KEY, !muted)
  writeFlag(VOICE_KEY, !muted)
  syncLegacyMute()
  if (muted && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
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

/** Short sine beep（跟聲音主題微調頻率／音量／波形） */
export function playBeep(
  freq = 440,
  durationMs = 80,
  type: OscillatorType = 'sine',
  gain = 0.08,
): void {
  if (!sfxEnabled()) return
  const ac = ctx()
  if (!ac) return
  const theme = soundThemeParams()
  const useType = type === 'sine' ? theme.type : type
  const useFreq = freq * theme.freqMul
  const useGain = gain * theme.gainMul * loadSfxVolume()
  if (useGain <= 0.0001) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = useType
  osc.frequency.value = useFreq
  g.gain.value = useGain
  osc.connect(g)
  g.connect(ac.destination)
  const now = ac.currentTime
  g.gain.setValueAtTime(useGain, now)
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
  if (!voiceEnabled()) return
  if (typeof speechSynthesis === 'undefined') return
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(phrase)
    u.lang = 'zh-HK'
    u.rate = 1.05
    u.pitch = 1
    u.volume = loadVoiceVolume()
    if (u.volume <= 0.01) return
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
  const phrase = VOICE_PHRASES[kind] ?? kind
  const isWin = kind === 'win'
  if (isWin && !loadSfxWinOn()) {
    speakCantonese(phrase)
    caption(phrase)
    return
  }
  if (!isWin && kind !== 'ding' && !loadSfxClaimOn()) {
    speakCantonese(phrase)
    caption(phrase)
    return
  }
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
  caption(phrase)
}

export function sfxDraw(): void {
  if (!loadSfxDrawOn()) return
  playBeep(320, 45, 'sine', 0.05)
  caption('摸牌')
}

export function sfxDiscard(): void {
  if (!loadSfxDiscardOn()) return
  playBeep(380, 55, 'sine', 0.06)
  caption('打牌')
}

/** Map engine action → sfx / 報牌 */
export function playForAction(action: Action): void {
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
  if (fromIndex < 0 || isMuted()) return
  for (let i = fromIndex; i < log.length; i++) {
    const entry = log[i]
    if (!entry || entry.action.type === 'start') continue
    playForAction(entry.action)
  }
}
