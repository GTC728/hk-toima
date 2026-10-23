import { DEFAULT_RULES, type TableRules } from '../engine'

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
  /** 改動時即時回傳（網上房主同步） */
  onCommit?: (next: RulesDraft) => void
}

export function TableRulesEditor({
  value,
  onChange,
  disabled,
  onCommit,
}: TableRulesEditorProps) {
  function setField<K extends keyof RulesDraft>(key: K, raw: string) {
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) return
    let v = Math.floor(n)
    if (key === 'matchCircles') v = Math.min(4, Math.max(1, v || 1))
    if (key === 'turnTimeoutSec' || key === 'claimTimeoutSec') {
      v = Math.min(120, Math.max(3, v || 3))
    }
    const next = { ...value, [key]: v }
    onChange(next)
    onCommit?.(next)
  }

  return (
    <fieldset className="rules-editor" disabled={disabled}>
      <legend className="rules-editor__legend">枱規</legend>
      <div className="rules-editor__grid">
        <label className="rules-editor__field">
          <span>底</span>
          <input
            type="number"
            min={0}
            step={1}
            value={value.base}
            onChange={(e) => setField('base', e.target.value)}
            aria-label="底"
          />
          <em>$</em>
        </label>
        <label className="rules-editor__field">
          <span>番值</span>
          <input
            type="number"
            min={0}
            step={1}
            value={value.fanValue}
            onChange={(e) => setField('fanValue', e.target.value)}
            aria-label="番值"
          />
          <em>$ / 番</em>
        </label>
        <label className="rules-editor__field">
          <span>拉口</span>
          <input
            type="number"
            min={1}
            max={9}
            step={1}
            value={value.maxLaKou}
            onChange={(e) => setField('maxLaKou', e.target.value)}
            aria-label="拉幾口可斬"
          />
          <em>口可斬</em>
        </label>
        <label className="rules-editor__field">
          <span>五同順</span>
          <input
            type="number"
            min={0}
            step={1}
            value={value.fiveTongShunFan}
            onChange={(e) => setField('fiveTongShunFan', e.target.value)}
            aria-label="五同順番數"
          />
          <em>番</em>
        </label>
        <label className="rules-editor__field">
          <span>出牌限時</span>
          <input
            type="number"
            min={3}
            max={120}
            step={1}
            value={value.turnTimeoutSec}
            onChange={(e) => setField('turnTimeoutSec', e.target.value)}
            aria-label="出牌限時秒"
          />
          <em>秒</em>
        </label>
        <label className="rules-editor__field">
          <span>鳴牌限時</span>
          <input
            type="number"
            min={3}
            max={120}
            step={1}
            value={value.claimTimeoutSec}
            onChange={(e) => setField('claimTimeoutSec', e.target.value)}
            aria-label="鳴牌限時秒"
          />
          <em>秒</em>
        </label>
        <label className="rules-editor__field">
          <span>局制</span>
          <input
            type="number"
            min={1}
            max={4}
            step={1}
            value={value.matchCircles}
            onChange={(e) => setField('matchCircles', e.target.value)}
            aria-label="打幾圈"
          />
          <em>圈</em>
        </label>
      </div>
      <p className="rules-editor__hint" aria-live="polite">
        而家 ${value.base} 底 · ${value.fanValue} 一番 · 拉 {value.maxLaKou} 口 ·
        五同順 {value.fiveTongShunFan} 番 · 出牌 {value.turnTimeoutSec}s · 鳴牌{' '}
        {value.claimTimeoutSec}s · {value.matchCircles} 圈
      </p>
    </fieldset>
  )
}
