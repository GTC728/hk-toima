import { useState, type ReactNode } from 'react'
import { GameDesk, type DeskCurrent } from './ui/GameDesk'
import type { JoinResponse } from '../worker/protocol'
import { defaultAiPersonas } from './engine'
import { Lobby, type LobbyStartConfig } from './ui/Lobby'
import { LocalGame } from './ui/LocalGame'
import { FanTable } from './ui/FanTable'
import { FanCalculator } from './ui/FanCalculator'
import { OnlineRoom } from './ui/online/OnlineRoom'
import { LearnHub } from './ui/learn/LearnHub'
import { LearnLesson } from './ui/learn/LearnLesson'
import { PuzzleHub } from './ui/puzzles/PuzzleHub'
import { PuzzlePlay } from './ui/puzzles/PuzzlePlay'
import { YouPage } from './ui/YouPage'
import { parseYouHash, type YouTab } from './ui/youTab'
import { ReplayDesk } from './ui/ReplayDesk'
import type { GameRecord } from './engine'
import { recordKey } from './engine'
import { SettingsPage } from './ui/SettingsPage'
import { isSettingsHash } from './ui/settingsNav'
import { InsightsPage } from './ui/InsightsPage'
import { isInsightsHash } from './ui/insightsNav'
import { LaBook } from './ui/LaBook'
import { EmailLinkPage } from './ui/EmailLinkPage'
import {
  DEFAULT_RULES_DRAFT,
  type RulesDraft,
} from './ui/TableRulesEditor'
import './ui/ui.css'
import './App.css'

const PRACTICE_LOCAL: LobbyStartConfig = {
  humanSeats: [true, false, false, false],
  names: ['玩家-1', 'AI-1', 'AI-2', 'AI-3'],
  rules: { ...DEFAULT_RULES_DRAFT },
  practiceHints: true,
  aiPersonas: defaultAiPersonas([true, false, false, false]),
}

type Screen =
  | { kind: 'lobby' }
  | { kind: 'local'; config: LobbyStartConfig }
  | {
      kind: 'online'
      join: JoinResponse
      name: string
      rules: RulesDraft
      autoStart?: { fillAi: boolean }
      /** casual／ranked／private */
      matchMode?: 'casual' | 'ranked' | 'private'
    }
  | { kind: 'fans' }
  | { kind: 'calculator' }
  | { kind: 'labook'; fromYou?: boolean }
  | { kind: 'learn' }
  | { kind: 'lesson'; id: string }
  | { kind: 'puzzles' }
  | { kind: 'puzzle'; id: string }
  | { kind: 'you'; tab: YouTab }
  | { kind: 'settings' }
  | { kind: 'insights' }
  | { kind: 'replay'; record: GameRecord }
  | { kind: 'email-link'; token: string | null }

function emailLinkToken(): string | null | undefined {
  if (typeof window === 'undefined') return undefined
  const path = window.location.pathname.replace(/\/$/, '')
  if (path !== '/auth/email') return undefined
  return new URLSearchParams(window.location.search).get('token')
}

function openYou(tab: YouTab): Screen {
  return { kind: 'you', tab }
}

function openSettings(): Screen {
  return { kind: 'settings' }
}

export default function App() {
  const initialLink = emailLinkToken()
  const initialHash = typeof window === 'undefined' ? '' : window.location.hash
  const initialSettings = isSettingsHash(initialHash)
  const initialInsights = !initialSettings && isInsightsHash(initialHash)
  const initialYou =
    initialSettings || initialInsights ? null : parseYouHash(initialHash)
  const [screen, setScreen] = useState<Screen>(
    initialLink !== undefined
      ? { kind: 'email-link', token: initialLink }
      : initialSettings
        ? openSettings()
        : initialInsights
          ? { kind: 'insights' }
          : initialYou
            ? openYou(initialYou)
            : { kind: 'lobby' },
  )
  function leaveLobby(hash: '' | '#/play' | '#/login') {
    const base = window.location.pathname + window.location.search
    window.history.replaceState(null, '', `${base}${hash}`)
    setScreen({ kind: 'lobby' })
  }

  const deskNav = {
    onLeave: () => leaveLobby('#/play'),
    onHome: () => leaveLobby(''),
    onLogin: () => leaveLobby('#/login'),
    onOpenFans: () => setScreen({ kind: 'fans' }),
    onOpenCalculator: () => setScreen({ kind: 'calculator' }),
    onOpenLaBook: () => setScreen({ kind: 'labook' }),
    onOpenTutorial: () => setScreen({ kind: 'learn' }),
    onOpenPuzzles: () => setScreen({ kind: 'puzzles' }),
    onOpenStats: () => setScreen(openYou('data')),
    onOpenSettings: () => setScreen(openSettings()),
    onOpenYou: () => setScreen(openYou('profile')),
  }

  function openInsights() {
    const base = window.location.pathname + window.location.search
    window.history.replaceState(null, '', `${base}#/insights`)
    setScreen({ kind: 'insights' })
  }

  if (screen.kind === 'replay') {
    const youName =
      screen.record.header.players[screen.record.youSeat ?? 0]
        ?.displayName ?? '玩'
    return (
      <GameDesk initial={youName.slice(0, 1)} {...deskNav}>
        <ReplayDesk
          record={screen.record}
          onLeave={() => {
            window.history.replaceState(
              null,
              '',
              `${window.location.pathname}${window.location.search}#/you/archive`,
            )
            setScreen(openYou('archive'))
          }}
        />
      </GameDesk>
    )
  }

  if (screen.kind === 'local') {
    const you = screen.config.names.find((name) => name.trim()) || '玩'
    return (
      <GameDesk initial={you.slice(0, 1)} {...deskNav}>
        <LocalGame
          config={screen.config}
          onLeave={deskNav.onLeave}
          onOpenSettings={deskNav.onOpenSettings}
        />
      </GameDesk>
    )
  }

  if (screen.kind === 'online') {
    return (
      <GameDesk initial={screen.name.slice(0, 1) || '玩'} {...deskNav}>
        <OnlineRoom
          join={screen.join}
          playerName={screen.name}
          rulesDraft={screen.rules}
          autoStart={screen.autoStart}
          matchMode={screen.matchMode === 'ranked' ? 'ranked' : 'casual'}
          playKind={
            screen.matchMode === 'ranked'
              ? 'ranked'
              : screen.matchMode === 'casual'
                ? 'casual'
                : 'private'
          }
          onLeave={deskNav.onLeave}
          onOpenSettings={deskNav.onOpenSettings}
        />
      </GameDesk>
    )
  }

  function showPage(current: DeskCurrent, child: ReactNode) {
    return (
      <GameDesk current={current} layout="page" initial="玩" {...deskNav}>
        {child}
      </GameDesk>
    )
  }

  if (screen.kind === 'fans') {
    return showPage('fans', <FanTable onBack={() => setScreen({ kind: 'lobby' })} />)
  }

  if (screen.kind === 'calculator') {
    return showPage('calc', <FanCalculator onBack={() => setScreen({ kind: 'lobby' })} />)
  }

  if (screen.kind === 'labook') {
    return showPage(
      'book',
      <LaBook
        onBack={() =>
          setScreen(screen.fromYou ? openYou('archive') : { kind: 'lobby' })
        }
        backLabel={screen.fromYou ? '← 返檔案' : undefined}
      />,
    )
  }

  if (screen.kind === 'learn') {
    return showPage(
      'learn',
      <LearnHub
        onBack={() => setScreen({ kind: 'lobby' })}
        onOpenLesson={(id) => setScreen({ kind: 'lesson', id })}
        onOpenPuzzles={() => setScreen({ kind: 'puzzles' })}
        onPractice={() =>
          setScreen({ kind: 'local', config: { ...PRACTICE_LOCAL } })
        }
      />,
    )
  }

  if (screen.kind === 'lesson') {
    return showPage(
      'learn',
      <LearnLesson
        key={screen.id}
        lessonId={screen.id}
        onBack={() => setScreen({ kind: 'learn' })}
        onDone={(nextId) => {
          if (nextId) setScreen({ kind: 'lesson', id: nextId })
          else setScreen({ kind: 'learn' })
        }}
        onStartTrack={(id) => setScreen({ kind: 'lesson', id })}
      />,
    )
  }

  if (screen.kind === 'puzzles') {
    return showPage(
      'puzzles',
      <PuzzleHub
        onBack={() => setScreen({ kind: 'lobby' })}
        onOpenPuzzle={(id) => setScreen({ kind: 'puzzle', id })}
        onOpenLearn={() => setScreen({ kind: 'learn' })}
      />,
    )
  }

  if (screen.kind === 'puzzle') {
    return showPage(
      'puzzles',
      <PuzzlePlay
        puzzleId={screen.id}
        onBack={() => setScreen({ kind: 'puzzles' })}
      />,
    )
  }

  if (screen.kind === 'settings') {
    return showPage(
      'settings',
      <SettingsPage
        onBack={() => {
          if (isSettingsHash(window.location.hash) || window.location.hash.startsWith('#/you/settings')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
          }
          setScreen({ kind: 'lobby' })
        }}
        onOpenYou={(tab) => setScreen(openYou(tab))}
      />,
    )
  }

  if (screen.kind === 'insights') {
    return showPage(
      'stats',
      <InsightsPage
        onBack={() => {
          if (isInsightsHash(window.location.hash)) {
            window.history.replaceState(
              null,
              '',
              window.location.pathname + window.location.search,
            )
          }
          setScreen({ kind: 'lobby' })
        }}
        onOpenStats={() => {
          window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search,
          )
          setScreen(openYou('data'))
        }}
      />,
    )
  }

  if (screen.kind === 'you') {
    const current: DeskCurrent = screen.tab === 'data' ? 'stats' : 'you'
    return showPage(
      current,
      <YouPage
        tab={screen.tab}
        onTab={(tab) => setScreen(openYou(tab))}
        onBack={() => {
          if (window.location.hash.startsWith('#/you')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search)
          }
          setScreen({ kind: 'lobby' })
        }}
        onOpenLaBook={() => setScreen({ kind: 'labook', fromYou: true })}
        onOpenInsights={openInsights}
        onOpenReplay={(record) => {
          const key = recordKey(record)
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${window.location.search}#/replay/${key}`,
          )
          setScreen({ kind: 'replay', record })
        }}
        onEnterOnline={(join, name, rules, opts) => {
          window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search,
          )
          setScreen({
            kind: 'online',
            join,
            name,
            rules,
            matchMode: opts?.matchMode ?? 'private',
          })
        }}
      />,
    )
  }

  if (screen.kind === 'email-link') {
    return showPage(
      'home',
      <EmailLinkPage
        token={screen.token}
        onDone={() => {
          window.history.replaceState(null, '', '/')
          setScreen({ kind: 'lobby' })
        }}
      />,
    )
  }

  return (
    <Lobby
      onStartLocal={(config) => setScreen({ kind: 'local', config })}
      onEnterOnline={(join, name, rules, opts) =>
        setScreen({
          kind: 'online',
          join,
          name,
          rules,
          autoStart: opts?.autoStart,
          matchMode: opts?.matchMode,
        })
      }
      onOpenFans={() => setScreen({ kind: 'fans' })}
      onOpenCalculator={() => setScreen({ kind: 'calculator' })}
      onOpenLaBook={() => setScreen({ kind: 'labook' })}
      onOpenTutorial={() => setScreen({ kind: 'learn' })}
      onOpenPuzzles={() => setScreen({ kind: 'puzzles' })}
      onOpenStats={() => setScreen(openYou('data'))}
      onOpenInsights={openInsights}
      onOpenSettings={() => setScreen(openSettings())}
      onOpenYou={(tab) => setScreen(openYou(tab ?? 'profile'))}
    />
  )
}
