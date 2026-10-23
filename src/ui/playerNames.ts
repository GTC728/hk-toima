/** 開枱預設名：玩家-1…／AI-1…（按座位順序各自編號） */
export function buildSeatNames(humanSeats: boolean[]): string[] {
  let ai = 0
  let pl = 0
  return humanSeats.map((isHuman) =>
    isHuman ? `玩家-${++pl}` : `AI-${++ai}`,
  )
}

export function resolveStartNames(
  humanSeats: boolean[],
  draftNames: string[],
): string[] {
  let ai = 0
  let pl = 0
  return humanSeats.map((isHuman, i) => {
    const raw = (draftNames[i] ?? '').trim()
    if (isHuman) {
      pl += 1
      if (!raw || raw === '東家' || raw === '南家' || raw === '西家' || raw === '北家') {
        return `玩家-${pl}`
      }
      return raw
    }
    ai += 1
    return `AI-${ai}`
  })
}
