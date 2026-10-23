import { useState } from 'react'
import type { JoinResponse } from '../worker/protocol'
import { Lobby, type LobbyStartConfig } from './ui/Lobby'
import { LocalGame } from './ui/LocalGame'
import { FanTable } from './ui/FanTable'
import { FanCalculator } from './ui/FanCalculator'
import { OnlineRoom } from './ui/online/OnlineRoom'
import { Tutorial } from './ui/Tutorial'
import { StatsPage } from './ui/StatsPage'
import {
  DEFAULT_RULES_DRAFT,
  type RulesDraft,
} from './ui/TableRulesEditor'
import './ui/ui.css'
import './App.css'

const PRACTICE_LOCAL: LobbyStartConfig = {
  humanSeats: [true, false, false, false],
  names: ['你', 'AI·南', 'AI·西', 'AI·北'],
  rules: { ...DEFAULT_RULES_DRAFT },
  practiceHints: true,
}

type Screen =
  | { kind: 'lobby' }
  | { kind: 'local'; config: LobbyStartConfig }
  | {
      kind: 'online'
      join: JoinResponse
      name: string
      rules: RulesDraft
    }
  | { kind: 'fans' }
  | { kind: 'calculator' }
  | { kind: 'tutorial' }
  | { kind: 'stats' }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'lobby' })

  if (screen.kind === 'local') {
    return (
      <LocalGame
        config={screen.config}
        onLeave={() => setScreen({ kind: 'lobby' })}
      />
    )
  }

  if (screen.kind === 'online') {
    return (
      <OnlineRoom
        join={screen.join}
        playerName={screen.name}
        rulesDraft={screen.rules}
        onLeave={() => setScreen({ kind: 'lobby' })}
      />
    )
  }

  if (screen.kind === 'fans') {
    return <FanTable onBack={() => setScreen({ kind: 'lobby' })} />
  }

  if (screen.kind === 'calculator') {
    return <FanCalculator onBack={() => setScreen({ kind: 'lobby' })} />
  }

  if (screen.kind === 'tutorial') {
    return (
      <Tutorial
        onBack={() => setScreen({ kind: 'lobby' })}
        onPractice={() =>
          setScreen({ kind: 'local', config: { ...PRACTICE_LOCAL } })
        }
      />
    )
  }

  if (screen.kind === 'stats') {
    return <StatsPage onBack={() => setScreen({ kind: 'lobby' })} />
  }

  return (
    <Lobby
      onStartLocal={(config) => setScreen({ kind: 'local', config })}
      onEnterOnline={(join, name, rules) =>
        setScreen({ kind: 'online', join, name, rules })
      }
      onOpenFans={() => setScreen({ kind: 'fans' })}
      onOpenCalculator={() => setScreen({ kind: 'calculator' })}
      onOpenTutorial={() => setScreen({ kind: 'tutorial' })}
      onOpenStats={() => setScreen({ kind: 'stats' })}
    />
  )
}
