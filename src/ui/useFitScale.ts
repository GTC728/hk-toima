import { useLayoutEffect, useRef, useState } from 'react'

/** 將內層縮放到外殼內完整可見（唔用 scroll） */
export function useFitScale(deps: unknown[] = []) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const measure = () => {
      const oh = outer.clientHeight
      const ow = outer.clientWidth
      const ih = inner.scrollHeight
      const iw = inner.scrollWidth
      if (oh < 8 || ow < 8 || ih < 1 || iw < 1) {
        setScale(1)
        return
      }
      const next = Math.min(1, oh / ih, ow / iw)
      setScale(Number.isFinite(next) && next > 0.2 ? next : 1)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(outer)
    ro.observe(inner)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller passes layout deps
  }, deps)

  return { outerRef, innerRef, scale }
}
