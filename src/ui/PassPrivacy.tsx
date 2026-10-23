interface PassPrivacyProps {
  name: string
  windLabel: string
  onReveal: () => void
}

export function PassPrivacy({ name, windLabel, onReveal }: PassPrivacyProps) {
  return (
    <div className="privacy">
      <div className="privacy__card">
        <p className="privacy__eyebrow">Pass &amp; Play</p>
        <h2 className="privacy__title">請交機畀</h2>
        <p className="privacy__name">
          <span className="privacy__wind">{windLabel}</span>
          {name}
        </p>
        <p className="privacy__hint">確認周圍無人偷看手牌，先撳下面睇牌</p>
        <button type="button" className="privacy__btn" onClick={onReveal}>
          睇牌 · 開始操作
        </button>
      </div>
    </div>
  )
}
