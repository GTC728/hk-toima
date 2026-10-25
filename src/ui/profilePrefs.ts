/** S8：個人殼偏好（本機；戰績公開稍後先同步帳戶） */

const KEY = 'toima.profilePrefs.v1'

export type StatsPrivacy = 'self' | 'public'

export interface ProfilePrefs {
  privacy: StatsPrivacy
  bio: string
  region: string
  /** 可選真名（本機） */
  realName: string
  /** 頭像底色（lite） */
  avatarHue: number
  avatarLetter: string
}

const DEFAULTS: ProfilePrefs = {
  privacy: 'self',
  bio: '',
  region: '',
  realName: '',
  avatarHue: 38,
  avatarLetter: '',
}

export const REGION_OPTIONS = [
  { id: '', label: '唔標' },
  { id: 'HK', label: '香港' },
  { id: 'MO', label: '澳門' },
  { id: 'TW', label: '台灣' },
  { id: 'CN', label: '中國大陸' },
  { id: 'SG', label: '新加坡' },
  { id: 'MY', label: '馬來西亞' },
  { id: 'OTHER', label: '其他' },
] as const

export function loadProfilePrefs(): ProfilePrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const p = JSON.parse(raw) as Partial<ProfilePrefs>
    const hue =
      typeof p.avatarHue === 'number' && Number.isFinite(p.avatarHue)
        ? Math.max(0, Math.min(360, Math.round(p.avatarHue)))
        : DEFAULTS.avatarHue
    return {
      privacy: p.privacy === 'public' ? 'public' : 'self',
      bio: typeof p.bio === 'string' ? p.bio.slice(0, 80) : '',
      region: typeof p.region === 'string' ? p.region.slice(0, 16) : '',
      realName:
        typeof p.realName === 'string' ? p.realName.slice(0, 40) : '',
      avatarHue: hue,
      avatarLetter:
        typeof p.avatarLetter === 'string'
          ? p.avatarLetter.slice(0, 1)
          : '',
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveProfilePrefs(prefs: ProfilePrefs): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        privacy: prefs.privacy,
        bio: prefs.bio.slice(0, 80),
        region: prefs.region.slice(0, 16),
        realName: prefs.realName.slice(0, 40),
        avatarHue: prefs.avatarHue,
        avatarLetter: prefs.avatarLetter.slice(0, 1),
      }),
    )
  } catch {
    /* ignore */
  }
}

export function avatarInitial(
  prefs: ProfilePrefs,
  displayName: string,
): string {
  const custom = prefs.avatarLetter.trim()
  if (custom) return custom.slice(0, 1).toUpperCase()
  const n = displayName.trim()
  return n ? n.slice(0, 1).toUpperCase() : '玩'
}

export function privacyLabel(p: StatsPrivacy): string {
  return p === 'public' ? '公開戰績' : '僅自己'
}
