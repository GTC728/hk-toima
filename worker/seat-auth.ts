/** 打牌只對座位令牌。工作階段 cookie 唔係參數。 */
export function seatTokenMatches(
  stored: string | null,
  presented: string | null,
): boolean {
  return stored != null && stored.length > 0 && stored === presented
}

/** 改帳戶只睇工作階段玩家。座位令牌改唔到。 */
export function canChangeProfile(sessionPlayerId: string | null): boolean {
  return sessionPlayerId != null
}

const PLAYER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function cleanPlayerId(value: unknown): string | null {
  if (typeof value !== 'string' || !PLAYER_ID.test(value)) return null
  return value.toLowerCase()
}

/** 刪帳戶之後，打完嘅房間結果留低，但座位唔再掛原來個名。 */
export const REDACTED_SEAT_NAME = '已刪除'

/**
 * 重連唔改緊打嗰席嘅名同 playerId。
 * 新入座先寫入今次工作階段（可空）。
 */
export function seatAssignment(input: {
  reconnect: boolean
  existingPlayerId: string | null
  sessionPlayerId: string | null
  existingName: string
  requestedName: string
}): { playerId: string | null; name: string } {
  if (input.reconnect) {
    return {
      playerId: input.existingPlayerId,
      name: input.existingName,
    }
  }
  const requested = input.requestedName.trim()
  return {
    playerId: input.sessionPlayerId,
    name: requested || input.existingName,
  }
}
