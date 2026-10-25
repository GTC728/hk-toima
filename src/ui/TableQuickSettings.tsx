import { useState } from 'react'
import {
  loadDoubleClickDiscard,
  loadShowTimer,
  saveDoubleClickDiscard,
  saveShowTimer,
} from './extraPrefs'
import {
  loadFocusMode,
  loadWinCelebrate,
  saveFocusMode,
  saveWinCelebrate,
} from './leftoverPrefs'
import { isMuted, setMuted } from './audio'

/** 局內常用設定彈層 */
export function TableQuickSettings({
  open,
  onClose,
  onOpenFull,
}: {
  open: boolean
  onClose: () => void
  onOpenFull?: () => void
}) {
  const [mute, setMute] = useState(() => isMuted())
  const [dbl, setDbl] = useState(loadDoubleClickDiscard)
  const [timer, setTimer] = useState(loadShowTimer)
  const [focus, setFocus] = useState(loadFocusMode)
  const [cele, setCele] = useState(loadWinCelebrate)

  if (!open) return null

  return (
    <div className="table-qs" role="dialog" aria-label="局內設定">
      <div className="table-qs__panel">
        <header className="table-qs__head">
          <strong>局內設定</strong>
          <button type="button" onClick={onClose}>
            關閉
          </button>
        </header>
        <label className="table-qs__row">
          <span>靜音</span>
          <input
            type="checkbox"
            checked={mute}
            onChange={() => {
              const next = !mute
              setMute(next)
              setMuted(next)
            }}
          />
        </label>
        <label className="table-qs__row">
          <span>雙擊打牌</span>
          <input
            type="checkbox"
            checked={dbl}
            onChange={() => {
              const next = !dbl
              setDbl(next)
              saveDoubleClickDiscard(next)
            }}
          />
        </label>
        <label className="table-qs__row">
          <span>顯示倒數</span>
          <input
            type="checkbox"
            checked={timer}
            onChange={() => {
              const next = !timer
              setTimer(next)
              saveShowTimer(next)
            }}
          />
        </label>
        <label className="table-qs__row">
          <span>專注模式（藏側欄）</span>
          <input
            type="checkbox"
            checked={focus}
            onChange={() => {
              const next = !focus
              setFocus(next)
              saveFocusMode(next)
            }}
          />
        </label>
        <label className="table-qs__row">
          <span>勝利慶祝</span>
          <input
            type="checkbox"
            checked={cele}
            onChange={() => {
              const next = !cele
              setCele(next)
              saveWinCelebrate(next)
            }}
          />
        </label>
        {onOpenFull && (
          <button type="button" className="table-qs__full" onClick={onOpenFull}>
            打開完整設定
          </button>
        )}
      </div>
      <button type="button" className="table-qs__scrim" aria-label="關閉" onClick={onClose} />
    </div>
  )
}
