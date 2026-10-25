import type { Seat } from '../src/engine'

export type RoomSeatKind = 'human' | 'ai' | 'empty'

export interface ActionReject {
  message: string
  code: string
}

/**
 * 真人動作入場檢查。回傳 null 代表可以交俾 engine。
 * 非法動作唔使 Durable Object。
 */
export function rejectHumanAction(
  started: boolean,
  seatKind: RoomSeatKind,
): ActionReject | null {
  if (!started) return { message: '未開始', code: 'not_started' }
  if (seatKind !== 'human') {
    return { message: '唔係你嘅座位', code: 'not_human' }
  }
  return null
}

/**
 * 鳴牌窗：仲有真人未答，AI 唔好搶先碰／上／槓／食。
 * 時限到由呼叫方另外 pass，呢度只判斷可唔可以俾 AI 鳴。
 */
export function aiMayClaim(
  awaiting: readonly Seat[],
  kindOf: (seat: Seat) => RoomSeatKind,
): boolean {
  if (awaiting.some((seat) => kindOf(seat) === 'human')) return false
  return awaiting.some((seat) => kindOf(seat) === 'ai')
}

/** AI 可以鳴嘅座位（真人未答完就係空）。 */
export function aiClaimSeats(
  awaiting: readonly Seat[],
  kindOf: (seat: Seat) => RoomSeatKind,
): Seat[] {
  if (!aiMayClaim(awaiting, kindOf)) return []
  return awaiting.filter((seat) => kindOf(seat) === 'ai')
}
