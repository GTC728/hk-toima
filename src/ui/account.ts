/** 大廳名同「問一次先搬戰績」。工作階段 cookie 唔會寫入呢度。 */

export const CAREER_PROMPTED_KEY = 'toima.careerImportPrompted'

export function lobbyDisplayName(
  accountName: string | null | undefined,
  localName: string,
): string {
  const account = accountName?.trim()
  if (account) return account
  const local = localName.trim()
  return local || '玩家'
}

export function careerPrompted(raw: string | null): boolean {
  return raw === '1'
}

/** 已經問過就唔再問。本機仲有局數先算未搬走。 */
export function shouldOfferCareerImport(
  rounds: number,
  recentCount: number,
  prompted: boolean,
): boolean {
  if (prompted) return false
  return rounds > 0 || recentCount > 0
}
