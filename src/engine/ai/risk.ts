import type { AiPersona } from './persona'
import type { GameState, Seat } from '../types'

/**
 * 莊、連莊、以及欠似聽牌嗰家嘅拉帳，都會推高安全分。
 * 穩陣加得多，搏糊加得少。1 = 冇額外風險。
 */
export function safetyPressure(
  state: GameState,
  self: Seat,
  threats: readonly Seat[],
  persona: AiPersona,
): number {
  const scale = persona === 'steady' ? 1 : persona === 'attack' ? 0.45 : 0.12
  let extra = 0
  if (state.dealer === self) extra += 0.4 * scale
  if (state.dealer === self && state.consecutiveWins > 0) extra += 0.3 * scale
  for (const entry of state.laLedger) {
    if (entry.debtor !== self || entry.amount <= 0) continue
    if (!threats.includes(entry.creditor)) continue
    extra += 1.4 * scale
  }
  return 1 + extra
}
