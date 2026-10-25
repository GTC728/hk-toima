/** 設定分類 — 對齊 Chess.com「中欄分類 → 右欄內容」 */

export const SETTINGS_SECTIONS = [
  {
    id: 'board',
    label: '牌桌與牌面',
    icon: 'board',
    blurb: '枱布、牌面、尺寸、動畫',
    keywords: '牌面 皮膚 牌 主題 tile skin 枱布 felt 尺寸 動畫 高亮',
  },
  {
    id: 'sound',
    label: '聲音',
    icon: 'sound',
    blurb: '摸打聲、主題、粵語報牌',
    keywords: '聲音 音效 靜音 報牌 粵語 主題 音量 sfx voice mute theme wood volume',
  },
  {
    id: 'play',
    label: '打牌',
    icon: 'play',
    blurb: '玩法、AI、排法、提示',
    keywords: '打牌 排法 提示 練習 arrange hints AI 性格 退出 確認 摘要 玩法 低時 警告 雙擊 交機 枱規 底番',
  },
  {
    id: 'account',
    label: '帳戶',
    icon: 'account',
    blurb: '個人、通知、裝置',
    keywords: '帳戶 個人 裝置 刪除 登出 通知 電郵 站內 傾偈 社交 account notify',
  },
  {
    id: 'interface',
    label: '介面',
    icon: 'interface',
    blurb: '欄寬、動效',
    keywords: '介面 欄寬 動效 動畫 閱讀 牆 骰 倒數 摸牌 匯出 匯入 重設 ui layout motion wall dice timer export',
  },
  {
    id: 'a11y',
    label: '無障礙',
    icon: 'a11y',
    blurb: '對比、色盲、鍵盤',
    keywords: '無障礙 對比 大掣 色盲 角標 鍵盤 捷徑 a11y accessibility contrast colorblind',
  },
] as const

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id']

const IDS = new Set<string>(SETTINGS_SECTIONS.map((s) => s.id))

export function parseSettingsSection(raw: string | null | undefined): SettingsSectionId {
  if (raw && IDS.has(raw)) return raw as SettingsSectionId
  return 'board'
}

/** 獨立設定頁：`#/settings` 或 `#/settings/board`（舊 `#/you/settings…` 仍認得） */
export function settingsHash(section: SettingsSectionId = 'board'): string {
  return `#/settings/${section}`
}

export function parseSettingsHash(hash: string): SettingsSectionId | null {
  const m = /^#\/(?:settings|you\/settings)(?:\/([a-z0-9]+))?$/.exec(hash)
  if (!m) return null
  return parseSettingsSection(m[1] ?? 'board')
}

export function isSettingsHash(hash: string): boolean {
  return /^#\/(?:settings|you\/settings)(?:\/[a-z0-9]+)?$/.test(hash)
}
