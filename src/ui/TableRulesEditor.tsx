import { DEFAULT_RULES, diAmount, type TableRules } from '../engine'
import { ShellCycler } from './shell/ShellCycler'

export type RulesDraft = Pick<
  TableRules,
  | 'base'
  | 'fanValue'
  | 'maxLaKou'
  | 'fiveTongShunFan'
  | 'turnTimeoutSec'
  | 'claimTimeoutSec'
  | 'matchCircles'
>

export const DEFAULT_RULES_DRAFT: RulesDraft = {
  base: DEFAULT_RULES.base,
  fanValue: DEFAULT_RULES.fanValue,
  maxLaKou: DEFAULT_RULES.maxLaKou,
  fiveTongShunFan: DEFAULT_RULES.fiveTongShunFan,
  turnTimeoutSec: DEFAULT_RULES.turnTimeoutSec,
  claimTimeoutSec: DEFAULT_RULES.claimTimeoutSec,
  matchCircles: DEFAULT_RULES.matchCircles,
}

interface TableRulesEditorProps {
  value: RulesDraft
  onChange: (next: RulesDraft) => void
  disabled?: boolean
  onCommit?: (next: RulesDraft) => void
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function TableRulesEditor({
  value,
  onChange,
  disabled,
  onCommit,
}: TableRulesEditorProps) {
  function bump<K extends keyof RulesDraft>(
    key: K,
    delta: number,
    min: number,
    max: number,
  ) {
    if (disabled) return
    const next = {
      ...value,
      [key]: clamp(Number(value[key]) + delta, min, max),
    } as RulesDraft
    onChange(next)
    onCommit?.(next)
  }

  const diCash = diAmount(value as TableRules)

  return (
    <fieldset className="rules-editor" disabled={disabled}>
      <legend className="rules-editor__legend">枱規</legend>
      <div className="rules-editor__list">
        <ShellCycler
          label="底"
          valueLabel={String(value.base)}
          unit="番"
          disablePrev={disabled || value.base <= 0}
          disableNext={disabled || value.base >= 20}
          onPrev={() => bump('base', -1, 0, 20)}
          onNext={() => bump('base', 1, 0, 20)}
        />
        <ShellCycler
          label="番值"
          valueLabel={String(value.fanValue)}
          unit="$ / 番"
          disablePrev={disabled || value.fanValue <= 0}
          disableNext={disabled || value.fanValue >= 100}
          onPrev={() => bump('fanValue', -1, 0, 100)}
          onNext={() => bump('fanValue', 1, 0, 100)}
        />
        <ShellCycler
          label="拉口"
          valueLabel={String(value.maxLaKou)}
          unit="口可斬"
          disablePrev={disabled || value.maxLaKou <= 1}
          disableNext={disabled || value.maxLaKou >= 9}
          onPrev={() => bump('maxLaKou', -1, 1, 9)}
          onNext={() => bump('maxLaKou', 1, 1, 9)}
        />
        <ShellCycler
          label="五同順"
          valueLabel={String(value.fiveTongShunFan)}
          unit="番"
          disablePrev={disabled || value.fiveTongShunFan <= 0}
          disableNext={disabled || value.fiveTongShunFan >= 80}
          onPrev={() => bump('fiveTongShunFan', -5, 0, 80)}
          onNext={() => bump('fiveTongShunFan', 5, 0, 80)}
        />
        <ShellCycler
          label="出牌限時"
          valueLabel={String(value.turnTimeoutSec)}
          unit="秒"
          disablePrev={disabled || value.turnTimeoutSec <= 3}
          disableNext={disabled || value.turnTimeoutSec >= 120}
          onPrev={() => bump('turnTimeoutSec', -1, 3, 120)}
          onNext={() => bump('turnTimeoutSec', 1, 3, 120)}
        />
        <ShellCycler
          label="鳴牌限時"
          valueLabel={String(value.claimTimeoutSec)}
          unit="秒"
          disablePrev={disabled || value.claimTimeoutSec <= 3}
          disableNext={disabled || value.claimTimeoutSec >= 120}
          onPrev={() => bump('claimTimeoutSec', -1, 3, 120)}
          onNext={() => bump('claimTimeoutSec', 1, 3, 120)}
        />
        <ShellCycler
          label="局制"
          valueLabel={String(value.matchCircles)}
          unit="圈"
          disablePrev={disabled || value.matchCircles <= 1}
          disableNext={disabled || value.matchCircles >= 4}
          onPrev={() => bump('matchCircles', -1, 1, 4)}
          onNext={() => bump('matchCircles', 1, 1, 4)}
        />
      </div>
      <p className="rules-editor__hint" aria-live="polite">
        底 {value.base} 番 · 一番 ${value.fanValue} · 一個底＝${diCash} · 拉{' '}
        {value.maxLaKou} 口 · {value.matchCircles} 圈
      </p>
    </fieldset>
  )
}
