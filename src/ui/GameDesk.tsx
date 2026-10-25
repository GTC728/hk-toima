import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { DeskRail } from './Lobby'
import { isMuted, setMuted } from './audio'
import { fetchMe } from './accountClient'

export type DeskCurrent =
  | 'home'
  | 'play'
  | 'fans'
  | 'calc'
  | 'book'
  | 'learn'
  | 'puzzles'
  | 'stats'
  | 'you'
  | 'settings'

export function GameDesk({
  initial,
  current = 'play',
  layout = 'play',
  onLeave,
  onHome,
  onOpenFans,
  onOpenCalculator,
  onOpenLaBook,
  onOpenTutorial,
  onOpenPuzzles,
  onOpenStats,
  onOpenSettings,
  onOpenYou,
  onLogin,
  children,
}: {
  initial: string
  current?: DeskCurrent
  layout?: 'play' | 'page'
  onLeave: () => void
  onHome: () => void
  onOpenFans: () => void
  onOpenCalculator: () => void
  onOpenLaBook: () => void
  onOpenTutorial: () => void
  onOpenPuzzles?: () => void
  onOpenStats: () => void
  onOpenSettings: () => void
  onOpenYou: () => void
  onLogin: () => void
  children: ReactNode
}) {
  const [muted, setMutedUi] = useState(() => isMuted())
  /** 只有驗證過電郵先算登入；匿名 session 唔算 */
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchMe().then((me) => {
      if (!cancelled) setSignedIn(Boolean(me?.email))
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className={layout === 'page' ? 'desk desk--page' : 'desk desk--ingame'}>
      <DeskRail
        page="play"
        current={current}
        accountOn={signedIn}
        initial={initial || '玩'}
        muted={muted}
        onHome={onHome}
        onPlay={onLeave}
        onLogin={onLogin}
        onOpenYou={onOpenYou}
        onOpenFans={onOpenFans}
        onOpenCalculator={onOpenCalculator}
        onOpenLaBook={onOpenLaBook}
        onOpenTutorial={onOpenTutorial}
        onOpenPuzzles={onOpenPuzzles}
        onOpenStats={onOpenStats}
        onOpenSettings={onOpenSettings}
        onToggleMute={() => {
          const next = !muted
          setMuted(next)
          setMutedUi(next)
        }}
      />
      <div className="desk__ingame">{children}</div>
    </main>
  )
}
