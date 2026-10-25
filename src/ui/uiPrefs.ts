/** 介面／無障礙偏好（本機） */

export type ContentWidth = 'narrow' | 'standard' | 'wide'

const WIDTH_KEY = 'hktoima.ui.contentWidth'
const MOTION_KEY = 'hktoima.ui.reducedMotion'
const TAP_KEY = 'hktoima.ui.largeTap'
const CONTRAST_KEY = 'hktoima.ui.highContrast'
const COLORBLIND_KEY = 'hktoima.ui.colorblind'
const SKIN_BEFORE_CONTRAST_KEY = 'hktoima.ui.skinBeforeContrast'

const WIDTHS = new Set<string>(['narrow', 'standard', 'wide'])

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

export function loadContentWidth(): ContentWidth {
  const raw = read(WIDTH_KEY)
  if (raw && WIDTHS.has(raw)) return raw as ContentWidth
  return 'standard'
}

export function saveContentWidth(v: ContentWidth) {
  write(WIDTH_KEY, v)
  applyContentWidth(v)
}

export function loadReducedMotion(): boolean {
  return read(MOTION_KEY) === '1'
}

export function saveReducedMotion(on: boolean) {
  write(MOTION_KEY, on ? '1' : '0')
  applyReducedMotion(on)
}

export function loadLargeTap(): boolean {
  return read(TAP_KEY) === '1'
}

export function saveLargeTap(on: boolean) {
  write(TAP_KEY, on ? '1' : '0')
  applyLargeTap(on)
}

export function applyContentWidth(v: ContentWidth = loadContentWidth()) {
  document.documentElement.dataset.contentWidth = v
}

export function applyReducedMotion(on: boolean = loadReducedMotion()) {
  document.documentElement.dataset.reducedMotion = on ? '1' : '0'
}

export function applyLargeTap(on: boolean = loadLargeTap()) {
  document.documentElement.dataset.largeTap = on ? '1' : '0'
}

export function loadHighContrast(): boolean {
  return read(CONTRAST_KEY) === '1'
}

export function saveHighContrast(on: boolean) {
  write(CONTRAST_KEY, on ? '1' : '0')
  applyHighContrast(on)
}

export function applyHighContrast(on: boolean = loadHighContrast()) {
  document.documentElement.dataset.highContrast = on ? '1' : '0'
}

export function loadColorblindMarks(): boolean {
  return read(COLORBLIND_KEY) === '1'
}

export function saveColorblindMarks(on: boolean) {
  write(COLORBLIND_KEY, on ? '1' : '0')
  applyColorblindMarks(on)
}

export function applyColorblindMarks(on: boolean = loadColorblindMarks()) {
  document.documentElement.dataset.colorblind = on ? '1' : '0'
}

export function loadSkinBeforeContrast(): string | null {
  return read(SKIN_BEFORE_CONTRAST_KEY)
}

export function saveSkinBeforeContrast(id: string | null) {
  if (id == null) {
    try {
      localStorage.removeItem(SKIN_BEFORE_CONTRAST_KEY)
    } catch {
      /* private mode */
    }
    return
  }
  write(SKIN_BEFORE_CONTRAST_KEY, id)
}

/** App 啟動時套用一次 */
export function applyStoredUiPrefs() {
  applyContentWidth()
  applyReducedMotion()
  applyLargeTap()
  applyHighContrast()
  applyColorblindMarks()
}
