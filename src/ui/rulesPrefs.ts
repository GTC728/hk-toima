/** 大廳預設枱規（Batch 7） */

import {
  DEFAULT_RULES_DRAFT,
  type RulesDraft,
} from './TableRulesEditor'

const KEY = 'hktoima.rules.default'

function clampDraft(raw: Partial<RulesDraft>): RulesDraft {
  const d = { ...DEFAULT_RULES_DRAFT, ...raw }
  return {
    base: Math.min(20, Math.max(0, Math.floor(d.base) || 0)),
    fanValue: Math.max(0, Math.floor(d.fanValue) || 0),
    maxLaKou: Math.max(0, Math.floor(d.maxLaKou) || 0),
    fiveTongShunFan: Math.max(0, Math.floor(d.fiveTongShunFan) || 0),
    turnTimeoutSec: Math.min(120, Math.max(3, Math.floor(d.turnTimeoutSec) || 3)),
    claimTimeoutSec: Math.min(120, Math.max(3, Math.floor(d.claimTimeoutSec) || 3)),
    matchCircles: Math.min(4, Math.max(1, Math.floor(d.matchCircles) || 1)),
  }
}

export function loadDefaultRules(): RulesDraft {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_RULES_DRAFT }
    return clampDraft(JSON.parse(raw) as Partial<RulesDraft>)
  } catch {
    return { ...DEFAULT_RULES_DRAFT }
  }
}

export function saveDefaultRules(rules: RulesDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(clampDraft(rules)))
  } catch {
    /* private mode */
  }
}
