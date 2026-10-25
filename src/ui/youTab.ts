/** 個人中心。網址用 hash，唔加路由庫。 */

export const YOU_TABS = [
  { id: 'profile', label: '個人' },
  { id: 'data', label: '數據' },
  { id: 'awards', label: '成就' },
  { id: 'social', label: '社交' },
  { id: 'archive', label: '對局' },
] as const

export type YouTab = (typeof YOU_TABS)[number]['id']

const IDS = new Set<string>(YOU_TABS.map((tab) => tab.id))

export function youHash(tab: YouTab): string {
  return `#/you/${tab}`
}

export function parseYouHash(hash: string): YouTab | null {
  const match = /^#\/you\/([a-z]+)$/.exec(hash)
  if (!match) return null
  const id = match[1]
  if (!id || !IDS.has(id)) return null
  return id as YouTab
}
