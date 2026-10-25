/** Batch 6–7 — 音量、打牌確認、HUD、交機遮罩等 */

const K = {
  sfxVol: 'hktoima.sfx.volume',
  voiceVol: 'hktoima.voice.volume',
  discardConfirm: 'hktoima.play.discardConfirm',
  showWall: 'hktoima.ui.showWall',
  lowTimeWarn: 'hktoima.play.lowTimeWarn',
  showDice: 'hktoima.ui.showDice',
  showTimer: 'hktoima.ui.showTimer',
  highlightDrawn: 'hktoima.ui.highlightDrawn',
  doubleClickDiscard: 'hktoima.play.doubleClickDiscard',
  passPrivacy: 'hktoima.play.passPrivacy',
  winConfirm: 'hktoima.play.winConfirm',
  claimConfirm: 'hktoima.play.claimConfirm',
  autoDraw: 'hktoima.play.autoDraw',
  showWaiting: 'hktoima.ui.showWaiting',
  instantToast: 'hktoima.ui.instantToast',
  autoPass: 'hktoima.play.autoPass',
  keyboard: 'hktoima.play.keyboard',
  tileRanks: 'hktoima.ui.tileRanks',
  sideTab: 'hktoima.ui.sideTab',
  autoNext: 'hktoima.play.settlementAutoNext',
  density: 'hktoima.ui.tableDensity',
  wakeLock: 'hktoima.play.wakeLock',
  claimChime: 'hktoima.play.claimChime',
  hideBrand: 'hktoima.ui.hideTableBrand',
  recordStats: 'hktoima.play.recordStats',
  nextRoundConfirm: 'hktoima.play.nextRoundConfirm',
} as const

export type PlaySideTabId = 'log' | 'info' | 'books' | 'hint'
export type AutoNextSec = 0 | 3 | 5 | 8
export type TableDensity = 'compact' | 'normal' | 'roomy'

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

function clampVol(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.min(1, Math.max(0, n))
}

export function loadSfxVolume(): number {
  const v = Number(read(K.sfxVol))
  return clampVol(Number.isFinite(v) ? v : 1)
}

export function saveSfxVolume(v: number) {
  write(K.sfxVol, String(clampVol(v)))
}

export function loadVoiceVolume(): number {
  const v = Number(read(K.voiceVol))
  return clampVol(Number.isFinite(v) ? v : 1)
}

export function saveVoiceVolume(v: number) {
  write(K.voiceVol, String(clampVol(v)))
}

export function loadDiscardConfirm(): boolean {
  return flag(K.discardConfirm, false)
}

export function saveDiscardConfirm(on: boolean) {
  write(K.discardConfirm, on ? '1' : '0')
}

export function loadShowWall(): boolean {
  return flag(K.showWall, true)
}

export function saveShowWall(on: boolean) {
  write(K.showWall, on ? '1' : '0')
  applyShowWall(on)
}

export function applyShowWall(on: boolean = loadShowWall()) {
  document.documentElement.dataset.showWall = on ? '1' : '0'
}

export function loadLowTimeWarn(): boolean {
  return flag(K.lowTimeWarn, true)
}

export function saveLowTimeWarn(on: boolean) {
  write(K.lowTimeWarn, on ? '1' : '0')
}

export function loadShowDice(): boolean {
  return flag(K.showDice, true)
}

export function saveShowDice(on: boolean) {
  write(K.showDice, on ? '1' : '0')
  applyShowDice(on)
}

export function applyShowDice(on: boolean = loadShowDice()) {
  document.documentElement.dataset.showDice = on ? '1' : '0'
}

export function loadShowTimer(): boolean {
  return flag(K.showTimer, true)
}

export function saveShowTimer(on: boolean) {
  write(K.showTimer, on ? '1' : '0')
  applyShowTimer(on)
}

export function applyShowTimer(on: boolean = loadShowTimer()) {
  document.documentElement.dataset.showTimer = on ? '1' : '0'
}

export function loadHighlightDrawn(): boolean {
  return flag(K.highlightDrawn, true)
}

export function saveHighlightDrawn(on: boolean) {
  write(K.highlightDrawn, on ? '1' : '0')
  applyHighlightDrawn(on)
}

export function applyHighlightDrawn(on: boolean = loadHighlightDrawn()) {
  document.documentElement.dataset.highlightDrawn = on ? '1' : '0'
}

export function loadDoubleClickDiscard(): boolean {
  return flag(K.doubleClickDiscard, true)
}

export function saveDoubleClickDiscard(on: boolean) {
  write(K.doubleClickDiscard, on ? '1' : '0')
}

export function loadPassPrivacy(): boolean {
  return flag(K.passPrivacy, true)
}

export function savePassPrivacy(on: boolean) {
  write(K.passPrivacy, on ? '1' : '0')
}

export function loadWinConfirm(): boolean {
  return flag(K.winConfirm, false)
}

export function saveWinConfirm(on: boolean) {
  write(K.winConfirm, on ? '1' : '0')
}

export function loadClaimConfirm(): boolean {
  return flag(K.claimConfirm, false)
}

export function saveClaimConfirm(on: boolean) {
  write(K.claimConfirm, on ? '1' : '0')
}

export function loadAutoDraw(): boolean {
  return flag(K.autoDraw, false)
}

export function saveAutoDraw(on: boolean) {
  write(K.autoDraw, on ? '1' : '0')
}

export function loadShowWaiting(): boolean {
  return flag(K.showWaiting, true)
}

export function saveShowWaiting(on: boolean) {
  write(K.showWaiting, on ? '1' : '0')
}

export function loadInstantToast(): boolean {
  return flag(K.instantToast, true)
}

export function saveInstantToast(on: boolean) {
  write(K.instantToast, on ? '1' : '0')
}

export function loadAutoPass(): boolean {
  return flag(K.autoPass, false)
}

export function saveAutoPass(on: boolean) {
  write(K.autoPass, on ? '1' : '0')
}

export function loadKeyboardShortcuts(): boolean {
  return flag(K.keyboard, true)
}

export function saveKeyboardShortcuts(on: boolean) {
  write(K.keyboard, on ? '1' : '0')
}

export function loadTileRanks(): boolean {
  return flag(K.tileRanks, false)
}

export function saveTileRanks(on: boolean) {
  write(K.tileRanks, on ? '1' : '0')
  applyTileRanks(on)
}

export function applyTileRanks(on: boolean = loadTileRanks()) {
  document.documentElement.dataset.tileRanks = on ? '1' : '0'
}

export function loadPlaySideTab(): PlaySideTabId {
  const v = read(K.sideTab)
  if (v === 'log' || v === 'info' || v === 'books' || v === 'hint') return v
  return 'log'
}

export function savePlaySideTab(tab: PlaySideTabId) {
  write(K.sideTab, tab)
}

export function loadSettlementAutoNext(): AutoNextSec {
  const v = Number(read(K.autoNext))
  if (v === 3 || v === 5 || v === 8) return v
  return 0
}

export function saveSettlementAutoNext(sec: AutoNextSec) {
  write(K.autoNext, String(sec))
}

export function loadTableDensity(): TableDensity {
  const v = read(K.density)
  if (v === 'compact' || v === 'normal' || v === 'roomy') return v
  return 'normal'
}

export function saveTableDensity(id: TableDensity) {
  write(K.density, id)
  applyTableDensity(id)
}

export function applyTableDensity(id: TableDensity = loadTableDensity()) {
  document.documentElement.dataset.tableDensity = id
}

export function loadWakeLock(): boolean {
  return flag(K.wakeLock, false)
}

export function saveWakeLock(on: boolean) {
  write(K.wakeLock, on ? '1' : '0')
}

export function loadClaimChime(): boolean {
  return flag(K.claimChime, true)
}

export function saveClaimChime(on: boolean) {
  write(K.claimChime, on ? '1' : '0')
}

export function loadHideTableBrand(): boolean {
  return flag(K.hideBrand, false)
}

export function saveHideTableBrand(on: boolean) {
  write(K.hideBrand, on ? '1' : '0')
  applyHideTableBrand(on)
}

export function applyHideTableBrand(on: boolean = loadHideTableBrand()) {
  document.documentElement.dataset.hideTableBrand = on ? '1' : '0'
}

export function loadRecordStats(): boolean {
  return flag(K.recordStats, true)
}

export function saveRecordStats(on: boolean) {
  write(K.recordStats, on ? '1' : '0')
}

export function loadNextRoundConfirm(): boolean {
  return flag(K.nextRoundConfirm, false)
}

export function saveNextRoundConfirm(on: boolean) {
  write(K.nextRoundConfirm, on ? '1' : '0')
}

export function requestNextRound(run: () => void): void {
  ask(run, loadNextRoundConfirm(), '開始下一局？')
}

export function applyStoredExtraPrefs() {
  applyShowWall()
  applyShowDice()
  applyShowTimer()
  applyHighlightDrawn()
  applyTileRanks()
  applyTableDensity()
  applyHideTableBrand()
}

function ask(run: () => void, needed: boolean, label: string) {
  if (!needed) {
    run()
    return
  }
  if (confirm(label)) run()
}

/** 打牌確認；關就直接出 */
export function requestDiscard(
  run: () => void,
  label = '確定打出這張牌？',
): void {
  ask(run, loadDiscardConfirm(), label)
}

export function requestWin(run: () => void, label = '確定食糊？'): void {
  ask(run, loadWinConfirm(), label)
}

export function requestClaim(run: () => void, label = '確定鳴牌？'): void {
  ask(run, loadClaimConfirm(), label)
}

/** 匯出本機設定鍵（hktoima.* + toima.mute） */
export function exportSettingsBlob(): string {
  const out: Record<string, string> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith('hktoima.') || key === 'toima.mute') {
        const v = localStorage.getItem(key)
        if (v != null) out[key] = v
      }
    }
  } catch {
    /* private */
  }
  return JSON.stringify({ version: 1, prefs: out }, null, 2)
}

export function importSettingsBlob(raw: string): boolean {
  try {
    const data = JSON.parse(raw) as { prefs?: Record<string, string> }
    if (!data.prefs || typeof data.prefs !== 'object') return false
    for (const [key, value] of Object.entries(data.prefs)) {
      if (
        (key.startsWith('hktoima.') || key === 'toima.mute') &&
        typeof value === 'string'
      ) {
        localStorage.setItem(key, value)
      }
    }
    return true
  } catch {
    return false
  }
}

/** 清本機設定鍵（唔清戰績／房間 session） */
export function resetSettingsKeys(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('hktoima.') || key === 'toima.mute')) {
        keys.push(key)
      }
    }
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    /* private */
  }
}
