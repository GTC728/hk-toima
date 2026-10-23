import type { Seat, TileId } from './types'
import { createFullWall } from './tiles'
import { createRng, rollDice, shuffleInPlace } from './rng'

export interface DealtWall {
  wall: TileId[]
  /** 牆頭摸牌索引（由前向後） */
  liveIndex: number
  /** 槓尾：由後向前，初始 = wall.length */
  deadIndex: number
  dice: [number, number, number]
  openSeat: Seat
  hands: [TileId[], TileId[], TileId[], TileId[]]
}

/**
 * 洗牌、擲骰開門、派十六張。
 * 牆以直線表示：開門後 live 由 openOffset 起順時針（陣列向前），
 * 槓尾由末端向前補。
 */
export function dealWall(seed: number, dealer: Seat): DealtWall {
  const rng = createRng(seed)
  const wall = shuffleInPlace(createFullWall(), rng)
  const dice = rollDice(rng)
  const sum = dice[0]! + dice[1]! + dice[2]!
  // 由莊家起逆時針數骰點 → 開門座位
  const openSeat = ((dealer + (sum - 1)) % 4) as Seat
  // 由右邊數起撥開 sum 墩（每墩 2 張）——簡化：從牆頭跳過 sum*2 張作開門偏移
  const openOffset = (sum * 2) % wall.length
  // 旋轉牆，令牆頭在 index 0
  const rotated = [...wall.slice(openOffset), ...wall.slice(0, openOffset)]

  const hands: [TileId[], TileId[], TileId[], TileId[]] = [[], [], [], []]
  let live = 0
  // 四輪，每輪每人兩墩（4 張），由莊起逆時針
  for (let round = 0; round < 4; round++) {
    for (let s = 0; s < 4; s++) {
      const seat = ((dealer + s) % 4) as Seat
      hands[seat].push(rotated[live]!, rotated[live + 1]!, rotated[live + 2]!, rotated[live + 3]!)
      live += 4
    }
  }

  return {
    wall: rotated,
    liveIndex: live,
    deadIndex: rotated.length,
    dice,
    openSeat,
    hands,
  }
}

export function drawFromLive(wall: TileId[], liveIndex: number): { tile: TileId; liveIndex: number } {
  if (liveIndex >= wall.length) throw new Error('wall exhausted')
  // 唔好摸過槓尾
  return { tile: wall[liveIndex]!, liveIndex: liveIndex + 1 }
}

export function drawFromDead(
  wall: TileId[],
  deadIndex: number,
  liveIndex: number,
): { tile: TileId; deadIndex: number } {
  const next = deadIndex - 1
  if (next < liveIndex) throw new Error('no tiles left for supplement')
  return { tile: wall[next]!, deadIndex: next }
}

export function wallRemaining(liveIndex: number, deadIndex: number): number {
  return Math.max(0, deadIndex - liveIndex)
}
