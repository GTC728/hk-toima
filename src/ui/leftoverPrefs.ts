/** 原 backlog 剩餘適用項（Batch final） */

import { setMuted, setSfxEnabled, setVoiceEnabled } from './audio'
import { applySitePalette } from './sitePalettes'

export type { ThemePresetId } from './sitePalettes'
export { applyThemePreset, SITE_PALETTES as THEME_PRESETS } from './sitePalettes'
export type HandTilt = 'flat' | 'slight' | 'steep'
export type WindLabelStyle = 'full' | 'short' | 'off'
export type WallMode = 'number' | 'bar' | 'off'
export type HintDetail = 'low' | 'med' | 'high'
export type ColorScheme = 'system' | 'dark' | 'light'
export type TimeFormat = '24' | '12'
export type NameDensity = 'full' | 'compact'
export type AriaTileFormat = 'label' | 'suit-rank'

const K = {
  tilt: 'hktoima.ui.handTilt',
  wind: 'hktoima.ui.windLabel',
  flower: 'hktoima.ui.flowerFold',
  wallMode: 'hktoima.ui.wallMode',
  lowSec: 'hktoima.play.lowTimeSec',
  aiLabel: 'hktoima.ui.aiLabels',
  focus: 'hktoima.ui.focusMode',
  logTime: 'hktoima.ui.logTimestamps',
  autoReplay: 'hktoima.play.autoReplay',
  hintDetail: 'hktoima.play.hintDetail',
  scheme: 'hktoima.ui.colorScheme',
  timeFmt: 'hktoima.ui.timeFormat',
  perf: 'hktoima.ui.perfMode',
  navIcon: 'hktoima.ui.navIconsOnly',
  celebrate: 'hktoima.play.winCelebrate',
  fillAi: 'hktoima.play.autoFillAi',
  showRating: 'hktoima.ui.showRating',
  nameDens: 'hktoima.ui.nameDensity',
  captions: 'hktoima.a11y.soundCaptions',
  ariaFmt: 'hktoima.a11y.ariaTile',
  dnd: 'hktoima.notify.dnd',
  dndFrom: 'hktoima.notify.dndFrom',
  dndTo: 'hktoima.notify.dndTo',
  invite: 'hktoima.notify.invite',
  sfxDraw: 'hktoima.sfx.ch.draw',
  sfxDiscard: 'hktoima.sfx.ch.discard',
  sfxClaim: 'hktoima.sfx.ch.claim',
  sfxWin: 'hktoima.sfx.ch.win',
  sfxTick: 'hktoima.sfx.ch.tick',
  sfxUi: 'hktoima.sfx.ch.ui',
  calcBase: 'hktoima.calc.base',
  calcFan: 'hktoima.calc.fanValue',
  calcWin: 'hktoima.calc.winType',
  calcSession: 'hktoima.calc.session',
  longPress: 'hktoima.play.longPressClear',
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
    /* private */
  }
}

function flag(key: string, fallback: boolean): boolean {
  const v = read(key)
  if (v === '0') return false
  if (v === '1') return true
  return fallback
}

export function loadHandTilt(): HandTilt {
  const v = read(K.tilt)
  if (v === 'flat' || v === 'slight' || v === 'steep') return v
  return 'slight'
}

export function saveHandTilt(v: HandTilt) {
  write(K.tilt, v)
  applyHandTilt(v)
}

export function applyHandTilt(v: HandTilt = loadHandTilt()) {
  document.documentElement.dataset.handTilt = v
}

export function loadWindLabelStyle(): WindLabelStyle {
  const v = read(K.wind)
  if (v === 'full' || v === 'short' || v === 'off') return v
  return 'full'
}

export function saveWindLabelStyle(v: WindLabelStyle) {
  write(K.wind, v)
  applyWindLabelStyle(v)
}

export function applyWindLabelStyle(v: WindLabelStyle = loadWindLabelStyle()) {
  document.documentElement.dataset.windLabel = v
}

export function loadFlowerFold(): boolean {
  return flag(K.flower, false)
}

export function saveFlowerFold(on: boolean) {
  write(K.flower, on ? '1' : '0')
  applyFlowerFold(on)
}

export function applyFlowerFold(on: boolean = loadFlowerFold()) {
  document.documentElement.dataset.flowerFold = on ? '1' : '0'
}

export function loadWallMode(): WallMode {
  const v = read(K.wallMode)
  if (v === 'number' || v === 'bar' || v === 'off') return v
  return 'number'
}

export function saveWallMode(v: WallMode) {
  write(K.wallMode, v)
  applyWallMode(v)
}

export function applyWallMode(v: WallMode = loadWallMode()) {
  document.documentElement.dataset.wallMode = v
  document.documentElement.dataset.showWall = v === 'off' ? '0' : '1'
}

export function loadLowTimeSec(): number {
  const n = Number(read(K.lowSec))
  if (n === 3 || n === 5 || n === 8 || n === 10) return n
  return 5
}

export function saveLowTimeSec(n: number) {
  write(K.lowSec, String(n))
}

export function loadAiLabels(): boolean {
  return flag(K.aiLabel, true)
}

export function saveAiLabels(on: boolean) {
  write(K.aiLabel, on ? '1' : '0')
}

export function loadFocusMode(): boolean {
  return flag(K.focus, false)
}

export function saveFocusMode(on: boolean) {
  write(K.focus, on ? '1' : '0')
  applyFocusMode(on)
}

export function applyFocusMode(on: boolean = loadFocusMode()) {
  document.documentElement.dataset.focusMode = on ? '1' : '0'
}

export function loadLogTimestamps(): boolean {
  return flag(K.logTime, false)
}

export function saveLogTimestamps(on: boolean) {
  write(K.logTime, on ? '1' : '0')
}

export function loadAutoReplay(): boolean {
  return flag(K.autoReplay, false)
}

export function saveAutoReplay(on: boolean) {
  write(K.autoReplay, on ? '1' : '0')
}

export function loadHintDetail(): HintDetail {
  const v = read(K.hintDetail)
  if (v === 'low' || v === 'med' || v === 'high') return v
  return 'med'
}

export function saveHintDetail(v: HintDetail) {
  write(K.hintDetail, v)
}

export function loadColorScheme(): ColorScheme {
  const v = read(K.scheme)
  if (v === 'system' || v === 'dark' || v === 'light') return v
  return 'dark'
}

export function saveColorScheme(v: ColorScheme) {
  write(K.scheme, v)
  applyColorScheme(v)
}

export function applyColorScheme(v: ColorScheme = loadColorScheme()) {
  let resolved = v
  if (v === 'system' && typeof window !== 'undefined') {
    resolved = window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
  }
  document.documentElement.dataset.scheme = resolved
}

export function loadTimeFormat(): TimeFormat {
  const v = read(K.timeFmt)
  if (v === '12' || v === '24') return v
  return '24'
}

export function saveTimeFormat(v: TimeFormat) {
  write(K.timeFmt, v)
}

export function loadPerfMode(): boolean {
  return flag(K.perf, false)
}

export function savePerfMode(on: boolean) {
  write(K.perf, on ? '1' : '0')
  applyPerfMode(on)
}

export function applyPerfMode(on: boolean = loadPerfMode()) {
  document.documentElement.dataset.perfMode = on ? '1' : '0'
}

export function loadNavIconsOnly(): boolean {
  return flag(K.navIcon, false)
}

export function saveNavIconsOnly(on: boolean) {
  write(K.navIcon, on ? '1' : '0')
  applyNavIconsOnly(on)
}

export function applyNavIconsOnly(on: boolean = loadNavIconsOnly()) {
  document.documentElement.dataset.navIconsOnly = on ? '1' : '0'
}

export function loadWinCelebrate(): boolean {
  return flag(K.celebrate, true)
}

export function saveWinCelebrate(on: boolean) {
  write(K.celebrate, on ? '1' : '0')
}

export function loadAutoFillAi(): boolean {
  return flag(K.fillAi, true)
}

export function saveAutoFillAi(on: boolean) {
  write(K.fillAi, on ? '1' : '0')
}

export function loadShowRating(): boolean {
  return flag(K.showRating, false)
}

export function saveShowRating(on: boolean) {
  write(K.showRating, on ? '1' : '0')
}

export function loadNameDensity(): NameDensity {
  const v = read(K.nameDens)
  if (v === 'full' || v === 'compact') return v
  return 'full'
}

export function saveNameDensity(v: NameDensity) {
  write(K.nameDens, v)
  applyNameDensity(v)
}

export function applyNameDensity(v: NameDensity = loadNameDensity()) {
  document.documentElement.dataset.nameDensity = v
}

export function loadSoundCaptions(): boolean {
  return flag(K.captions, false)
}

export function saveSoundCaptions(on: boolean) {
  write(K.captions, on ? '1' : '0')
}

export function loadAriaTileFormat(): AriaTileFormat {
  const v = read(K.ariaFmt)
  if (v === 'label' || v === 'suit-rank') return v
  return 'label'
}

export function saveAriaTileFormat(v: AriaTileFormat) {
  write(K.ariaFmt, v)
  applyAriaTileFormat(v)
}

export function applyAriaTileFormat(v: AriaTileFormat = loadAriaTileFormat()) {
  document.documentElement.dataset.ariaTile = v
}

export function loadNotifyDnd(): boolean {
  return flag(K.dnd, false)
}

export function saveNotifyDnd(on: boolean) {
  write(K.dnd, on ? '1' : '0')
}

export function loadDndFrom(): string {
  return read(K.dndFrom) ?? '23:00'
}

export function saveDndFrom(v: string) {
  write(K.dndFrom, v)
}

export function loadDndTo(): string {
  return read(K.dndTo) ?? '08:00'
}

export function saveDndTo(v: string) {
  write(K.dndTo, v)
}

export function loadNotifyInvite(): boolean {
  return flag(K.invite, true)
}

export function saveNotifyInvite(on: boolean) {
  write(K.invite, on ? '1' : '0')
}

export function loadSfxDrawOn(): boolean {
  return flag(K.sfxDraw, true)
}
export function saveSfxDrawOn(on: boolean) {
  write(K.sfxDraw, on ? '1' : '0')
}
export function loadSfxDiscardOn(): boolean {
  return flag(K.sfxDiscard, true)
}
export function saveSfxDiscardOn(on: boolean) {
  write(K.sfxDiscard, on ? '1' : '0')
}
export function loadSfxClaimOn(): boolean {
  return flag(K.sfxClaim, true)
}
export function saveSfxClaimOn(on: boolean) {
  write(K.sfxClaim, on ? '1' : '0')
}
export function loadSfxWinOn(): boolean {
  return flag(K.sfxWin, true)
}
export function saveSfxWinOn(on: boolean) {
  write(K.sfxWin, on ? '1' : '0')
}
export function loadSfxTickOn(): boolean {
  return flag(K.sfxTick, true)
}
export function saveSfxTickOn(on: boolean) {
  write(K.sfxTick, on ? '1' : '0')
}
export function loadSfxUiOn(): boolean {
  return flag(K.sfxUi, true)
}
export function saveSfxUiOn(on: boolean) {
  write(K.sfxUi, on ? '1' : '0')
}

export function loadCalcBase(): number {
  const n = Number(read(K.calcBase))
  return Number.isFinite(n) ? Math.min(20, Math.max(0, Math.floor(n))) : 3
}

export function saveCalcBase(n: number) {
  write(K.calcBase, String(n))
}

export function loadCalcFanValue(): number {
  const n = Number(read(K.calcFan))
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

export function saveCalcFanValue(n: number) {
  write(K.calcFan, String(n))
}

export function loadCalcWinType(): 'self' | 'discard' {
  return read(K.calcWin) === 'discard' ? 'discard' : 'self'
}

export function saveCalcWinType(v: 'self' | 'discard') {
  write(K.calcWin, v)
}

/** 計番機牌面／枱況（離開再返保留） */
export type CalcSessionV1 = {
  v: 1
  hand: string[]
  melds: {
    kind: string
    tiles: string[]
    fromSeat: number
    claimedTile?: string | null
  }[]
  flowers: string[]
  winTile: string | null
  winType: 'tsumo' | 'ron'
  isDealer: boolean
  /** 連莊次數；>0 時計連莊 2N+1（含莊） */
  consecutiveWins?: number
  seat: number
  windRound: number
  dingKind: 'off' | 'normal' | 'tian' | 'di'
  ippatsu: boolean
  flowerDrawChain: number
  /** 連續槓補次數（槓摸） */
  kongDrawChain?: number
  /** 絕章：off／明絕／八絕 */
  jueKind?: 'off' | 'mingjue' | 'bajue'
  /** 子內：開牌後打牌數档 */
  ziNeiKind?: 'off' | 'si' | 'qi' | 'shi'
  /** 海底／河底（牆 0） */
  haidi?: boolean
  /** 天／地／人胡（優先於子內） */
  earlyWinKind?: 'off' | 'tian' | 'di' | 'ren'
  /** 一炮雙響／三響（雪上霜／雪上冰） */
  multiRonKind?: 'off' | 'shuang' | 'san'
  /** 反雪（一炮多響出銃者番×2 標記） */
  fanxue?: boolean
  mode: 'hand' | 'win' | 'meld'
  /** @deprecated 明牌改為自動偵測，可忽略 */
  meldKind?: string
}

export function loadCalcSession(): CalcSessionV1 | null {
  const raw = read(K.calcSession)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as CalcSessionV1
    if (!data || data.v !== 1) return null
    if (!Array.isArray(data.hand) || !Array.isArray(data.melds)) return null
    return data
  } catch {
    return null
  }
}

export function saveCalcSession(session: CalcSessionV1) {
  write(K.calcSession, JSON.stringify(session))
}

export function clearCalcSession() {
  try {
    localStorage.removeItem(K.calcSession)
  } catch {
    /* private */
  }
}

export function loadLongPressClear(): boolean {
  return flag(K.longPress, true)
}

export function saveLongPressClear(on: boolean) {
  write(K.longPress, on ? '1' : '0')
}

/** 勿擾時段內唔跳站內 toast */
export function isNotifyQuietNow(now = new Date()): boolean {
  if (!loadNotifyDnd()) return false
  const from = loadDndFrom()
  const to = loadDndTo()
  const cur = now.getHours() * 60 + now.getMinutes()
  const parse = (s: string) => {
    const [h, m] = s.split(':').map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
  }
  const a = parse(from)
  const b = parse(to)
  if (a === b) return true
  if (a < b) return cur >= a && cur < b
  return cur >= a || cur < b
}

/** 重設某設定分類用到嘅鍵（近似） */
export function resetCategoryKeys(
  section: 'board' | 'sound' | 'play' | 'interface' | 'a11y' | 'account',
): void {
  const groups: Record<string, string[]> = {
    board: [
      'hktoima.board.',
      'hktoima.tileSkin',
      'hktoima.ui.handTilt',
      'hktoima.ui.windLabel',
      'hktoima.ui.flowerFold',
      'hktoima.ui.wallMode',
      'hktoima.ui.highlightDrawn',
      'hktoima.ui.tableDensity',
      'hktoima.ui.hideTableBrand',
      'hktoima.ui.aiLabels',
      'hktoima.ui.nameDensity',
    ],
    sound: ['hktoima.sfx', 'hktoima.voice', 'hktoima.board.soundTheme', 'toima.mute'],
    play: [
      'hktoima.play.',
      'hktoima.match.',
      'hktoima.practiceHints',
      'hktoima.handArrange',
      'hktoima.rules.',
      'hktoima.calc.',
    ],
    interface: [
      'hktoima.ui.contentWidth',
      'hktoima.ui.sitePalette',
      'hktoima.ui.show',
      'hktoima.ui.log',
      'hktoima.ui.focus',
      'hktoima.ui.color',
      'hktoima.ui.time',
      'hktoima.ui.perf',
      'hktoima.ui.nav',
      'hktoima.ui.sideTab',
    ],
    a11y: [
      'hktoima.ui.highContrast',
      'hktoima.ui.colorblind',
      'hktoima.ui.largeTap',
      'hktoima.ui.reducedMotion',
      'hktoima.ui.tileRanks',
      'hktoima.a11y.',
      'hktoima.play.keyboard',
    ],
    account: ['hktoima.notify.', 'hktoima.social.'],
  }
  const prefixes = groups[section] ?? []
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (prefixes.some((p) => key === p || key.startsWith(p))) keys.push(key)
    }
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    /* private */
  }
}

export function applyStoredLeftoverPrefs() {
  applyHandTilt()
  applyWindLabelStyle()
  applyFlowerFold()
  applyWallMode()
  applyFocusMode()
  applyColorScheme()
  applySitePalette()
  applyPerfMode()
  applyNavIconsOnly()
  applyNameDensity()
  applyAriaTileFormat()
}

/** 總靜音便捷 */
export function setMasterMute(on: boolean) {
  setMuted(on)
  if (!on) {
    setSfxEnabled(true)
    setVoiceEnabled(true)
  }
}
