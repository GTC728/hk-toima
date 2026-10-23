import { useEffect, useRef, useState } from 'react'
import type { Seat } from '../engine'

const WIND = ['東', '南', '西', '北'] as const

export interface InstantPayout {
  from: Seat
  to: Seat
  amount: number
  reason: string
}

interface InstantToastProps {
  payouts: InstantPayout[]
  names?: string[]
}

/** 顯示最新即時賞罰（暗槓／一台花等） */
export function InstantToast({ payouts, names }: InstantToastProps) {
  const [banner, setBanner] = useState<string | null>(null)
  const seen = useRef(0)

  useEffect(() => {
    if (payouts.length <= seen.current) {
      seen.current = Math.min(seen.current, payouts.length)
      return
    }
    const fresh = payouts.slice(seen.current)
    seen.current = payouts.length
    const last = fresh[fresh.length - 1]!
    const toName = names?.[last.to] ?? WIND[last.to]
    setBanner(`${last.reason} · ${toName}收 $${last.amount}`)
    const t = window.setTimeout(() => setBanner(null), 3200)
    return () => window.clearTimeout(t)
  }, [payouts, names])

  if (!banner) return null
  return (
    <p className="instant-toast" role="status">
      {banner}
    </p>
  )
}
