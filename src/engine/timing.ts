import type { AiPersona } from './ai/persona'

/** 本機同聯機共用：進攻思考／鳴牌延遲（舊 AI_DELAY_MS）。 */
export const AI_DELAY_MS = 3000

const THINK_MS: Record<AiPersona, number> = {
  steady: 4500,
  attack: AI_DELAY_MS,
  gamble: 1600,
}

/** 即將行動嗰家嘅思考時間。舊房冇性格當進攻。 */
export function aiThinkMs(persona: AiPersona = 'attack'): number {
  return THINK_MS[persona] ?? AI_DELAY_MS
}
