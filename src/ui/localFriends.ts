/** 本機朋友碼清單（真加友後端 later） */

const KEY = 'toima.localFriends.v1'
const VIEW_KEY = 'toima.profileViews.v1'

export function loadLocalFriends(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const p = JSON.parse(raw) as unknown
    if (!Array.isArray(p)) return []
    return p
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 40)
  } catch {
    return []
  }
}

export function saveLocalFriends(codes: string[]): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(
        [...new Set(codes.map((c) => c.trim().toUpperCase()).filter(Boolean))].slice(
          0,
          40,
        ),
      ),
    )
  } catch {
    /* ignore */
  }
}

export function addLocalFriend(code: string): string[] {
  const next = [...loadLocalFriends(), code.trim().toUpperCase()]
  saveLocalFriends(next)
  return loadLocalFriends()
}

export function removeLocalFriend(code: string): string[] {
  const c = code.trim().toUpperCase()
  const next = loadLocalFriends().filter((x) => x !== c)
  saveLocalFriends(next)
  return next
}

export function bumpProfileViews(): number {
  try {
    const n = (Number(localStorage.getItem(VIEW_KEY)) || 0) + 1
    localStorage.setItem(VIEW_KEY, String(n))
    return n
  } catch {
    return 0
  }
}

export function profileViewCount(): number {
  try {
    return Number(localStorage.getItem(VIEW_KEY)) || 0
  } catch {
    return 0
  }
}
