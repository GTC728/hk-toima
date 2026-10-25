/** 本機排位分數；登入後可同 /api/me/ranked 同步 */

import {
  applyRankedMatch,
  emptyRanked,
  RANKED_AI_RATING,
  RANKED_DEFAULT,
  tierForRating,
  type RankedState,
} from '../engine'

const K = 'hktoima.ranked.v1'

function read(): RankedState {
  try {
    const raw = localStorage.getItem(K)
    if (!raw) return emptyRanked()
    const p = JSON.parse(raw) as Partial<RankedState>
    const rating =
      typeof p.rating === 'number' && Number.isFinite(p.rating)
        ? Math.round(p.rating)
        : RANKED_DEFAULT
    const rankedGames =
      typeof p.rankedGames === 'number' && p.rankedGames >= 0
        ? Math.floor(p.rankedGames)
        : 0
    const peakRating =
      typeof p.peakRating === 'number' && Number.isFinite(p.peakRating)
        ? Math.round(p.peakRating)
        : rating
    return {
      rating: Math.max(100, Math.min(3000, rating)),
      rankedGames,
      peakRating: Math.max(rating, Math.max(100, Math.min(3000, peakRating))),
    }
  } catch {
    return emptyRanked()
  }
}

export function loadRankedState(): RankedState {
  return read()
}

export function saveRankedState(state: RankedState): void {
  try {
    localStorage.setItem(K, JSON.stringify(state))
  } catch {
    /* private */
  }
}

export function rankedSummary(state: RankedState = loadRankedState()): {
  rating: number
  games: number
  peak: number
  tierName: string
  tierId: string
} {
  const tier = tierForRating(state.rating)
  return {
    rating: state.rating,
    games: state.rankedGames,
    peak: state.peakRating,
    tierName: tier.name,
    tierId: tier.id,
  }
}

export function recordRankedMatchEnd(opts: {
  mySeat: number
  cash: readonly number[]
  /** 其他三席：人類用未知 → 預設 1000；AI → AI rating */
  seatIsAi: readonly boolean[]
  opponentRatings?: readonly (number | null)[]
}): { state: RankedState; delta: number; place: 1 | 2 | 3 | 4 } {
  const prev = loadRankedState()
  const withAi = opts.seatIsAi.some((ai, i) => i !== opts.mySeat && ai)
  const opponentRatings: number[] = []
  for (let s = 0; s < 4; s++) {
    if (s === opts.mySeat) continue
    const custom = opts.opponentRatings?.[s]
    if (typeof custom === 'number' && Number.isFinite(custom)) {
      opponentRatings.push(custom)
    } else if (opts.seatIsAi[s]) {
      opponentRatings.push(RANKED_AI_RATING)
    } else {
      opponentRatings.push(RANKED_DEFAULT)
    }
  }
  const { next, delta, place } = applyRankedMatch(prev, {
    myCash: opts.cash[opts.mySeat] ?? 0,
    allCash: opts.cash,
    mySeat: opts.mySeat,
    opponentRatings,
    withAi,
  })
  saveRankedState(next)
  void syncRankedToServer(next)
  return { state: next, delta, place }
}

/** 登入後拉帳戶分數；場數較多嘅一邊勝出 */
export async function pullRankedFromServer(): Promise<RankedState | null> {
  try {
    const res = await fetch('/api/me/ranked', { credentials: 'include' })
    if (!res.ok) return null
    const data = (await res.json()) as Partial<RankedState>
    if (typeof data.rating !== 'number') return null
    const remote: RankedState = {
      rating: data.rating,
      rankedGames:
        typeof data.rankedGames === 'number' ? data.rankedGames : 0,
      peakRating:
        typeof data.peakRating === 'number' ? data.peakRating : data.rating,
    }
    const local = loadRankedState()
    const merged =
      remote.rankedGames > local.rankedGames
        ? remote
        : remote.rankedGames < local.rankedGames
          ? local
          : {
              rating: Math.round((local.rating + remote.rating) / 2),
              rankedGames: local.rankedGames,
              peakRating: Math.max(local.peakRating, remote.peakRating),
            }
    saveRankedState(merged)
    if (merged.rankedGames > remote.rankedGames) {
      void syncRankedToServer(merged)
    }
    return merged
  } catch {
    return null
  }
}

async function syncRankedToServer(state: RankedState): Promise<void> {
  try {
    await fetch('/api/me/ranked', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(state),
    })
  } catch {
    /* offline / 未登入 */
  }
}
