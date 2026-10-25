/**
 * 網站外殼配色（10 套）：大廳／側欄／設定／工具頁／按鈕／字色。
 * 唔改牌桌絨布、木色、牌面——嗰啲喺「牌桌」單獨調。
 */

export type ThemePresetId =
  | 'classic'
  | 'midnight'
  | 'tea'
  | 'ocean'
  | 'bamboo'
  | 'slate'
  | 'rosewood'
  | 'mist'
  | 'daylight'
  | 'cloud'

/** 舊 id → 新網站配色 */
const LEGACY: Record<string, ThemePresetId> = {
  night: 'midnight',
  sand: 'tea',
  ivory: 'tea',
  jade: 'bamboo',
  inkstone: 'slate',
  amber: 'rosewood',
  ivoryday: 'daylight',
  contrast: 'midnight',
}

export interface SiteShellTokens {
  /** 主底（大廳／瀏覽器底） */
  bg: string
  /** 側欄／設定大卡 */
  panel: string
  /** 內嵌卡／輸入框 */
  card: string
  /** 次級面（次要掣） */
  elevated: string
  /** hover／選中底 */
  hover: string
  /** 分隔線 */
  line: string
  /** 主字 */
  text: string
  /** 次字／說明 */
  muted: string
  /** 主行動 */
  accent: string
  /** 行動掣字色 */
  accentInk: string
  /** focus ring */
  focus: string
}

export interface SitePalette {
  id: ThemePresetId
  name: string
  note: string
  mood: 'dark' | 'light'
  shell: SiteShellTokens
}

/** 10 套：整站外殼一鍵換；飽和度收斂、對比夠讀。 */
export const SITE_PALETTES: SitePalette[] = [
  {
    id: 'classic',
    name: '棋站灰綠',
    note: '預設 · 灰底白字綠掣',
    mood: 'dark',
    shell: {
      bg: '#312e2b',
      panel: '#262421',
      card: '#1f1d1b',
      elevated: '#3c3936',
      hover: '#4a4744',
      line: '#4a4642',
      text: '#f6f1e6',
      muted: '#c8c4bf',
      accent: '#81b64c',
      accentInk: '#14210c',
      focus: '#d7e7b8',
    },
  },
  {
    id: 'midnight',
    name: '深夜炭',
    note: '更深底 · 低眩光',
    mood: 'dark',
    shell: {
      bg: '#1a1918',
      panel: '#121110',
      card: '#0e0d0c',
      elevated: '#2a2826',
      hover: '#3a3734',
      line: '#3a3734',
      text: '#eceae6',
      muted: '#9a9690',
      accent: '#6fa05a',
      accentInk: '#0e180c',
      focus: '#b8d4a8',
    },
  },
  {
    id: 'tea',
    name: '茶樓暖',
    note: '暖灰褐 · 琥珀綠',
    mood: 'dark',
    shell: {
      bg: '#38302a',
      panel: '#2c2621',
      card: '#241e1a',
      elevated: '#453c35',
      hover: '#544940',
      line: '#544940',
      text: '#f5efe6',
      muted: '#c4b8a8',
      accent: '#9aaa58',
      accentInk: '#1a1e0c',
      focus: '#d4d8a8',
    },
  },
  {
    id: 'ocean',
    name: '遠洋藍',
    note: '藍灰 · 青藍掣',
    mood: 'dark',
    shell: {
      bg: '#2a3138',
      panel: '#1e252c',
      card: '#171d22',
      elevated: '#36404a',
      hover: '#44505c',
      line: '#44505c',
      text: '#eef2f5',
      muted: '#a8b4c0',
      accent: '#4a9eb8',
      accentInk: '#0a1820',
      focus: '#a8d4e4',
    },
  },
  {
    id: 'bamboo',
    name: '竹影',
    note: '橄欖灰 · 竹綠',
    mood: 'dark',
    shell: {
      bg: '#2e322a',
      panel: '#232720',
      card: '#1b1e18',
      elevated: '#3a4036',
      hover: '#4a5244',
      line: '#4a5244',
      text: '#f0f2ea',
      muted: '#b4bcb0',
      accent: '#7aaa4c',
      accentInk: '#12180c',
      focus: '#c4dca0',
    },
  },
  {
    id: 'slate',
    name: '青石',
    note: '中性石灰 · 苔綠',
    mood: 'dark',
    shell: {
      bg: '#2e3032',
      panel: '#232526',
      card: '#1b1c1d',
      elevated: '#3a3c3e',
      hover: '#4a4c4e',
      line: '#4a4c4e',
      text: '#f0f0ee',
      muted: '#b0b2b4',
      accent: '#7a9a68',
      accentInk: '#101810',
      focus: '#c0d4b4',
    },
  },
  {
    id: 'rosewood',
    name: '花梨夜',
    note: '紅木感 · 暖金掣',
    mood: 'dark',
    shell: {
      bg: '#342a28',
      panel: '#281f1e',
      card: '#1f1716',
      elevated: '#423634',
      hover: '#524442',
      line: '#524442',
      text: '#f6eee8',
      muted: '#c4b0a8',
      accent: '#b89858',
      accentInk: '#1a1408',
      focus: '#e0d0a8',
    },
  },
  {
    id: 'mist',
    name: '霧青',
    note: '冷霧灰 · 柔青',
    mood: 'dark',
    shell: {
      bg: '#2c3234',
      panel: '#212628',
      card: '#191d1e',
      elevated: '#384042',
      hover: '#485052',
      line: '#485052',
      text: '#eef2f2',
      muted: '#a8b4b6',
      accent: '#5aaa98',
      accentInk: '#0c1a16',
      focus: '#b0dcd0',
    },
  },
  {
    id: 'daylight',
    name: '日間米紙',
    note: '淺底深字 · 日間',
    mood: 'light',
    shell: {
      bg: '#e4dfd4',
      panel: '#f6f1e6',
      card: '#ebe6dc',
      elevated: '#ddd6c8',
      hover: '#d0c8b8',
      line: '#c4b8a8',
      text: '#1c1410',
      muted: '#5a5048',
      accent: '#5a8a3c',
      accentInk: '#f4f8ee',
      focus: '#3a5a28',
    },
  },
  {
    id: 'cloud',
    name: '雲白',
    note: '淡藍灰 · 清爽',
    mood: 'light',
    shell: {
      bg: '#d8dee4',
      panel: '#f2f5f7',
      card: '#e8eef2',
      elevated: '#d4dae0',
      hover: '#c4ccd4',
      line: '#b0bac4',
      text: '#1a2228',
      muted: '#4a5860',
      accent: '#3a7a8a',
      accentInk: '#f0f8fa',
      focus: '#2a5a68',
    },
  },
]

const BY_ID = new Map(SITE_PALETTES.map((p) => [p.id, p]))

const KEY = 'hktoima.ui.sitePalette'

export function isThemePresetId(v: string | null | undefined): v is ThemePresetId {
  return typeof v === 'string' && BY_ID.has(v as ThemePresetId)
}

export function resolveThemeId(raw: string | null): ThemePresetId {
  if (!raw) return 'classic'
  if (isThemePresetId(raw)) return raw
  const mapped = LEGACY[raw]
  if (mapped) return mapped
  return 'classic'
}

export function loadThemePreset(): ThemePresetId {
  try {
    return resolveThemeId(localStorage.getItem(KEY))
  } catch {
    return 'classic'
  }
}

export function saveThemePreset(id: ThemePresetId) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* private */
  }
}

export function getSitePalette(id: ThemePresetId = loadThemePreset()): SitePalette {
  return BY_ID.get(id) ?? SITE_PALETTES[0]!
}

/** 寫入全站外殼 CSS 變數（唔動枱絨／牌面） */
export function applySitePalette(id: ThemePresetId = loadThemePreset()) {
  const p = getSitePalette(id)
  const root = document.documentElement
  root.dataset.palette = p.id
  root.dataset.paletteMood = p.mood
  root.dataset.scheme = p.mood
  const s = p.shell
  root.style.setProperty('--shell-bg', s.bg)
  root.style.setProperty('--shell-panel', s.panel)
  root.style.setProperty('--shell-card', s.card)
  root.style.setProperty('--shell-elevated', s.elevated)
  root.style.setProperty('--shell-hover', s.hover)
  root.style.setProperty('--shell-line', s.line)
  root.style.setProperty('--shell-text', s.text)
  root.style.setProperty('--shell-muted', s.muted)
  root.style.setProperty('--accent', s.accent)
  root.style.setProperty('--accent-ink', s.accentInk)
  root.style.setProperty('--shell-focus', s.focus)
  /* 牌面／枱面 token 唔好跟外殼走——之前覆寫會整白／整花牌面 */
  root.style.removeProperty('--cream')
  root.style.removeProperty('--ink')
  root.style.removeProperty('--ink-soft')
  root.style.removeProperty('--gold')
  root.style.removeProperty('--ivory')
}

export function applyThemePreset(id: ThemePresetId) {
  saveThemePreset(id)
  applySitePalette(id)
}
