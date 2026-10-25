/** 本機練習提示。未設定當開。網上牌局唔用呢個開關。 */

const KEY = 'hktoima.practiceHints'

export function parsePracticeHints(raw: string | null): boolean {
  return raw !== '0'
}

export function loadPracticeHints(): boolean {
  try {
    return parsePracticeHints(localStorage.getItem(KEY))
  } catch {
    return true
  }
}

export function savePracticeHints(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    /* 私人模式 */
  }
}
