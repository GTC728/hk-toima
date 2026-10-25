import { useEffect } from 'react'
import { loadWakeLock } from './extraPrefs'

/** 牌局期間請求螢幕常亮（支援嘅瀏覽器） */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !loadWakeLock()) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let lock: WakeLockSentinel | null = null
    let cancelled = false

    async function request() {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await lock.release()
          lock = null
        }
      } catch {
        /* 唔支援／被拒 */
      }
    }

    void request()

    function onVisible() {
      if (document.visibilityState === 'visible') void request()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}
