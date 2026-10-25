export type AiPersona = 'steady' | 'attack' | 'gamble'

export const AI_PERSONA_ORDER: readonly AiPersona[] = ['steady', 'attack', 'gamble']

export const AI_PERSONA_LABEL: Record<AiPersona, string> = {
  steady: '穩陣',
  attack: '進攻',
  gamble: '搏糊',
}

export interface PersonaProfile {
  /** 平常棄牌時成牌分權重 */
  shape: number
  /** 平常棄牌時安全分權重 */
  safety: number
  /** 有人似聽、自己未聽：安全分權重 */
  threatSafety: number
  /** 有人似聽、自己未聽：成牌分權重 */
  threatShape: number
  /** 打次佳嘅機率。同一 seed 固定。 */
  mistakeRate: number
  /** 上牌至少要進步幾多先上 */
  chiMinDelta: number
  /** 早段即使拆眼都碰 */
  earlyPong: boolean
  /** 碰／上會拆唯一眼就過 */
  protectOnlyEye: boolean
  /** safe：唔拆聽口先槓；always：見槓就槓 */
  kong: 'safe' | 'always'
}

export const PERSONA_PROFILE: Record<AiPersona, PersonaProfile> = {
  steady: {
    shape: 1,
    safety: 1.05,
    threatSafety: 1,
    threatShape: 1.5,
    mistakeRate: 0.02,
    chiMinDelta: 0,
    earlyPong: false,
    protectOnlyEye: true,
    kong: 'safe',
  },
  attack: {
    shape: 1.15,
    safety: 0.75,
    threatSafety: 0.55,
    threatShape: 1.15,
    mistakeRate: 0.06,
    chiMinDelta: 0,
    earlyPong: true,
    protectOnlyEye: false,
    kong: 'safe',
  },
  gamble: {
    shape: 1.45,
    safety: 0.35,
    threatSafety: 0.22,
    threatShape: 1.35,
    mistakeRate: 0.22,
    chiMinDelta: -18,
    earlyPong: true,
    protectOnlyEye: false,
    kong: 'always',
  },
}

export function isAiPersona(value: unknown): value is AiPersona {
  return value === 'steady' || value === 'attack' || value === 'gamble'
}

/** 尚未出場嘅性格；三種都用過就返進攻。 */
export function nextAiPersona(used: Iterable<AiPersona>): AiPersona {
  const taken = new Set(used)
  for (const persona of AI_PERSONA_ORDER) {
    if (!taken.has(persona)) return persona
  }
  return 'attack'
}

/**
 * 真人位唔參與分配。AI 位按座位順序派穩陣、進攻、搏糊。
 * 真人座位上嘅值唔會用，填進攻只係佔位。
 * `preferred`：第一個 AI 位優先用呢個性格（設定頁預設）。
 */
export function defaultAiPersonas(
  humanSeats: readonly boolean[],
  preferred?: AiPersona,
): [AiPersona, AiPersona, AiPersona, AiPersona] {
  const used = new Set<AiPersona>()
  const out: AiPersona[] = ['attack', 'attack', 'attack', 'attack']
  let firstAi = true
  for (let i = 0; i < 4; i++) {
    if (humanSeats[i]) continue
    let persona: AiPersona
    if (firstAi && preferred && isAiPersona(preferred)) {
      persona = preferred
      firstAi = false
    } else {
      persona = nextAiPersona(used)
      firstAi = false
    }
    used.add(persona)
    out[i] = persona
  }
  return out as [AiPersona, AiPersona, AiPersona, AiPersona]
}

export interface PersonaSeat {
  kind: string
  persona?: AiPersona | null
}

/**
 * 顯示用性格。AI 冇欄（舊房）當進攻。
 * 空位未指定就按座位順序預派，同之後補 AI 一致。
 */
export function displayPersonas(seats: readonly PersonaSeat[]): AiPersona[] {
  const used = new Set<AiPersona>()
  const out: AiPersona[] = []
  for (const seat of seats) {
    if (seat.kind === 'ai') {
      const persona = isAiPersona(seat.persona) ? seat.persona : 'attack'
      used.add(persona)
      out.push(persona)
      continue
    }
    if (seat.kind === 'empty') {
      if (isAiPersona(seat.persona)) {
        used.add(seat.persona)
        out.push(seat.persona)
      } else {
        const persona = nextAiPersona(used)
        used.add(persona)
        out.push(persona)
      }
      continue
    }
    out.push(isAiPersona(seat.persona) ? seat.persona : 'attack')
  }
  return out
}
