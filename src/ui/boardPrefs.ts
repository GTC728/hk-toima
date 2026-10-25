/** 牌桌體驗偏好（Batch 2＋枱布擴充） */

export type FeltId =
  | 'classic'
  | 'deep'
  | 'night'
  | 'sand'
  | 'jade'
  | 'teal'
  | 'ocean'
  | 'indigo'
  | 'slate'
  | 'charcoal'
  | 'wine'
  | 'rosewood'
  | 'copper'
  | 'amber'
  | 'olive'
  | 'moss'
  | 'mint'
  | 'dusk'
  | 'plum'
  | 'ivoryfelt'
  | 'crimson'
  | 'pine'
  | 'lacquer'
  | 'bamboo'

export type TileScale = 'sm' | 'md' | 'lg'
export type AnimSpeed = 'off' | 'slow' | 'med' | 'fast'
export type SoundThemeId = 'wood' | 'stone' | 'soft'

export interface FeltPalette {
  felt: string
  deep: string
  light: string
}

/** 枱絨三色：主色／陰影／高光 */
export const FELT_PALETTE: Record<FeltId, FeltPalette> = {
  classic: { felt: '#1a5c45', deep: '#0f3d2e', light: '#2a7a5c' },
  deep: { felt: '#0d3d2c', deep: '#071f18', light: '#1f6b4a' },
  night: { felt: '#0e241c', deep: '#060e0c', light: '#1a3d32' },
  sand: { felt: '#4a5c38', deep: '#2e3a24', light: '#6b7a4a' },
  jade: { felt: '#0f7a5c', deep: '#085240', light: '#2aa882' },
  teal: { felt: '#0d5c5a', deep: '#063836', light: '#1a8a86' },
  ocean: { felt: '#1a3d5c', deep: '#0c2236', light: '#2e6a94' },
  indigo: { felt: '#243056', deep: '#121a32', light: '#3a4e82' },
  slate: { felt: '#3a4550', deep: '#1e252c', light: '#5a6874' },
  charcoal: { felt: '#2a2e32', deep: '#121416', light: '#4a5056' },
  wine: { felt: '#5c1e2e', deep: '#2e0e18', light: '#8a3248' },
  rosewood: { felt: '#6b2e28', deep: '#3a1614', light: '#9a4a42' },
  copper: { felt: '#6b3e24', deep: '#3a2012', light: '#9a5e3a' },
  amber: { felt: '#7a5220', deep: '#3f2a10', light: '#a87838' },
  olive: { felt: '#4a5228', deep: '#282e14', light: '#6e7840' },
  moss: { felt: '#2e4a32', deep: '#162418', light: '#4a724e' },
  mint: { felt: '#2a6a58', deep: '#14382e', light: '#4a9a80' },
  dusk: { felt: '#3e3848', deep: '#201c28', light: '#5e5670' },
  plum: { felt: '#4a2e3e', deep: '#261820', light: '#6e4a5e' },
  ivoryfelt: { felt: '#8a8070', deep: '#4a443c', light: '#b0a898' },
  crimson: { felt: '#6e2420', deep: '#3a1210', light: '#9a3e38' },
  pine: { felt: '#1e4a42', deep: '#0e2824', light: '#3a7a6c' },
  lacquer: { felt: '#1a1e1c', deep: '#080a09', light: '#323834' },
  bamboo: { felt: '#3e5c28', deep: '#223416', light: '#5e8a3e' },
}

export const FELT_OPTIONS: { id: FeltId; name: string; note: string }[] = [
  { id: 'classic', name: '經典絨綠', note: '坊間常見枱布' },
  { id: 'deep', name: '深松綠', note: '對比較高' },
  { id: 'night', name: '夜局炭綠', note: '偏暗少眩光' },
  { id: 'sand', name: '暖沙絨', note: '偏暖色調' },
  { id: 'jade', name: '翡翠絨', note: '亮綠、廳堂感' },
  { id: 'teal', name: '潮綠絨', note: '藍綠、清爽' },
  { id: 'ocean', name: '遠洋藍', note: '深藍枱面' },
  { id: 'indigo', name: '靛青絨', note: '夜色藍紫' },
  { id: 'slate', name: '石板灰', note: '冷灰、低調' },
  { id: 'charcoal', name: '墨炭絨', note: '近黑少反光' },
  { id: 'wine', name: '酒紅絨', note: '茶樓夜局' },
  { id: 'rosewood', name: '花梨紅', note: '暖紅木感' },
  { id: 'copper', name: '銅鏽棕', note: '偏棕金屬' },
  { id: 'amber', name: '琥珀絨', note: '金褐、暖光' },
  { id: 'olive', name: '橄欖絨', note: '軍綠偏黃' },
  { id: 'moss', name: '青苔絨', note: '暗綠自然' },
  { id: 'mint', name: '薄荷絨', note: '偏亮青綠' },
  { id: 'dusk', name: '暮色灰', note: '灰紫、黃昏' },
  { id: 'plum', name: '梅子褐', note: '紫褐沉穩' },
  { id: 'ivoryfelt', name: '米白絨', note: '淺枱、少見' },
  { id: 'crimson', name: '朱砂絨', note: '深紅偏朱' },
  { id: 'pine', name: '北松絨', note: '冷調松綠' },
  { id: 'lacquer', name: '黑漆絨', note: '近黑漆面' },
  { id: 'bamboo', name: '竹影絨', note: '黃綠竹色' },
]

const FELT_IDS = new Set<string>(FELT_OPTIONS.map((o) => o.id))

export function isFeltId(v: string | null | undefined): v is FeltId {
  return typeof v === 'string' && FELT_IDS.has(v)
}

export function feltPreviewGradient(id: FeltId): string {
  const p = FELT_PALETTE[id]
  return `linear-gradient(135deg, ${p.light}, ${p.felt} 55%, ${p.deep})`
}

export const SOUND_THEMES: { id: SoundThemeId; name: string; note: string }[] = [
  { id: 'wood', name: '木枱', note: '偏實、短促' },
  { id: 'stone', name: '石面', note: '清脆一啲' },
  { id: 'soft', name: '柔和', note: '較細、少刺耳' },
]

const K = {
  felt: 'hktoima.board.felt',
  scale: 'hktoima.board.tileScale',
  anim: 'hktoima.board.anim',
  highlight: 'hktoima.board.highlightLast',
  legal: 'hktoima.board.showLegal',
  fxOpen: 'hktoima.board.fxOpen',
  fxResult: 'hktoima.board.fxResult',
  sound: 'hktoima.board.soundTheme',
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

function flag(key: string, fallback = true): boolean {
  const v = read(key)
  if (v === '0') return false
  if (v === '1') return true
  return fallback
}

export function loadFelt(): FeltId {
  const v = read(K.felt)
  if (isFeltId(v)) return v
  return 'classic'
}

export function saveFelt(id: FeltId) {
  write(K.felt, id)
  applyFelt(id)
}

export function loadTileScale(): TileScale {
  const v = read(K.scale)
  if (v === 'sm' || v === 'md' || v === 'lg') return v
  return 'md'
}

export function saveTileScale(id: TileScale) {
  write(K.scale, id)
  applyTileScale(id)
}

export function loadAnimSpeed(): AnimSpeed {
  const v = read(K.anim)
  if (v === 'off' || v === 'slow' || v === 'med' || v === 'fast') return v
  return 'med'
}

export function saveAnimSpeed(id: AnimSpeed) {
  write(K.anim, id)
  applyAnimSpeed(id)
}

export function loadHighlightLast(): boolean {
  return flag(K.highlight, true)
}

export function saveHighlightLast(on: boolean) {
  write(K.highlight, on ? '1' : '0')
  applyHighlightLast(on)
}

export function loadShowLegal(): boolean {
  return flag(K.legal, true)
}

export function saveShowLegal(on: boolean) {
  write(K.legal, on ? '1' : '0')
  applyShowLegal(on)
}

export function loadFxOpen(): boolean {
  return flag(K.fxOpen, true)
}

export function saveFxOpen(on: boolean) {
  write(K.fxOpen, on ? '1' : '0')
  applyFxOpen(on)
}

export function loadFxResult(): boolean {
  return flag(K.fxResult, true)
}

export function saveFxResult(on: boolean) {
  write(K.fxResult, on ? '1' : '0')
  applyFxResult(on)
}

export function loadSoundTheme(): SoundThemeId {
  const v = read(K.sound)
  if (v === 'wood' || v === 'stone' || v === 'soft') return v
  return 'wood'
}

export function saveSoundTheme(id: SoundThemeId) {
  write(K.sound, id)
  applySoundTheme(id)
}

export function applyFelt(id: FeltId = loadFelt()) {
  const root = document.documentElement
  root.dataset.felt = id
  const p = FELT_PALETTE[id] ?? FELT_PALETTE.classic
  root.style.setProperty('--felt', p.felt)
  root.style.setProperty('--felt-deep', p.deep)
  root.style.setProperty('--felt-light', p.light)
}

export function applyTileScale(id: TileScale = loadTileScale()) {
  document.documentElement.dataset.tileScale = id
}

export function applyAnimSpeed(id: AnimSpeed = loadAnimSpeed()) {
  document.documentElement.dataset.anim = id
}

export function applyHighlightLast(on: boolean = loadHighlightLast()) {
  document.documentElement.dataset.highlightLast = on ? '1' : '0'
}

export function applyShowLegal(on: boolean = loadShowLegal()) {
  document.documentElement.dataset.showLegal = on ? '1' : '0'
}

export function applyFxOpen(on: boolean = loadFxOpen()) {
  document.documentElement.dataset.fxOpen = on ? '1' : '0'
}

export function applyFxResult(on: boolean = loadFxResult()) {
  document.documentElement.dataset.fxResult = on ? '1' : '0'
}

export function applySoundTheme(id: SoundThemeId = loadSoundTheme()) {
  document.documentElement.dataset.soundTheme = id
}

export function applyStoredBoardPrefs() {
  applyFelt()
  applyTileScale()
  applyAnimSpeed()
  applyHighlightLast()
  applyShowLegal()
  applyFxOpen()
  applyFxResult()
  applySoundTheme()
}

/** 俾 audio 讀：頻率／音量微調 */
export function soundThemeParams(id: SoundThemeId = loadSoundTheme()): {
  freqMul: number
  gainMul: number
  type: OscillatorType
} {
  if (id === 'stone') return { freqMul: 1.12, gainMul: 0.95, type: 'triangle' }
  if (id === 'soft') return { freqMul: 0.92, gainMul: 0.65, type: 'sine' }
  return { freqMul: 1, gainMul: 1, type: 'sine' }
}
