interface ShellCyclerProps {
  label: string
  valueLabel: string
  unit?: string
  onPrev: () => void
  onNext: () => void
  disablePrev?: boolean
  disableNext?: boolean
}

/** 飢餓式 ＜ 值 ＞ 循環器 — 枱規／選項共用 */
export function ShellCycler({
  label,
  valueLabel,
  unit,
  onPrev,
  onNext,
  disablePrev,
  disableNext,
}: ShellCyclerProps) {
  return (
    <div className="shell-cycler">
      <span className="shell-cycler__label">{label}</span>
      <div className="shell-cycler__control">
        <button
          type="button"
          className="shell-cycler__btn"
          aria-label={`${label}減`}
          disabled={disablePrev}
          onClick={onPrev}
        >
          ‹
        </button>
        <div className="shell-cycler__value">
          {valueLabel}
          {unit ? <span className="shell-cycler__unit">{unit}</span> : null}
        </div>
        <button
          type="button"
          className="shell-cycler__btn"
          aria-label={`${label}加`}
          disabled={disableNext}
          onClick={onNext}
        >
          ›
        </button>
      </div>
    </div>
  )
}
