import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getFanMeta } from '../engine'

interface FanHoverTipProps {
  fanId: string
  children: ReactNode
  /** 毫秒，預設 2000 */
  delayMs?: number
}

/** 指住約 2 秒顯示番薯表描述 */
export function FanHoverTip({
  fanId,
  children,
  delayMs = 2000,
}: FanHoverTipProps) {
  const [show, setShow] = useState(false)
  const timer = useRef<number | null>(null)
  const meta = getFanMeta(fanId)

  function clear() {
    if (timer.current != null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    setShow(false)
  }

  function arm() {
    clear()
    timer.current = window.setTimeout(() => setShow(true), delayMs)
  }

  useEffect(() => () => clear(), [])

  return (
    <span
      className="fan-tip"
      onMouseEnter={arm}
      onMouseLeave={clear}
      onFocus={arm}
      onBlur={clear}
    >
      {children}
      {show && (
        <span className="fan-tip__bubble" role="tooltip">
          <strong>
            {meta.name}
            {meta.value > 0 ? ` · ${meta.value}番` : ''}
          </strong>
          <span>{meta.desc}</span>
        </span>
      )}
    </span>
  )
}
