import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JoinResponse } from '../../worker/protocol'
import { AccountSection } from './AccountSection'
import { AwardsWall, StreakBadge } from './AwardsWall'
import { fetchFriends } from './accountClient'
import { socialAlertCount } from './friendsUi'
import { SocialPane } from './SocialPane'
import { StatsPage } from './StatsPage'
import type { RulesDraft } from './TableRulesEditor'
import {
  buildAchievementContext,
  syncAchievements,
} from './stats-achievements'
import {
  avatarInitial,
  loadProfilePrefs,
} from './profilePrefs'
import { bumpProfileViews, profileViewCount } from './localFriends'
import { clearCareerStats, loadCareerStats } from './stats'
import { firstPlayAt, formatFirstPlay } from './stats-s11'
import { GamesArchive } from './GamesArchive'
import type { GameRecord } from '../engine'
import { useAccount } from './useAccount'
import { YOU_TABS, youHash, type YouTab } from './youTab'

interface YouPageProps {
  tab: YouTab
  onTab: (tab: YouTab) => void
  onBack: () => void
  onOpenLaBook: () => void
  onOpenInsights?: () => void
  onOpenReplay?: (record: GameRecord) => void
  onEnterOnline?: (
    join: JoinResponse,
    name: string,
    rules: RulesDraft,
    opts?: { matchMode?: 'private' },
  ) => void
}

export function YouPage({
  tab,
  onTab,
  onBack,
  onOpenLaBook,
  onOpenInsights,
  onOpenReplay,
  onEnterOnline,
}: YouPageProps) {
  const account = useAccount()
  const [statsKey, setStatsKey] = useState(0)
  const [socialAlerts, setSocialAlerts] = useState(0)

  const refreshAlerts = useCallback(async () => {
    if (!account.me) {
      setSocialAlerts(0)
      return
    }
    const snap = await fetchFriends()
    setSocialAlerts(socialAlertCount(snap))
  }, [account.me])

  useEffect(() => {
    const next = youHash(tab)
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', next)
    }
  }, [tab])

  useEffect(() => {
    void refreshAlerts()
    if (!account.me) return
    const t = window.setInterval(() => void refreshAlerts(), 20_000)
    return () => window.clearInterval(t)
  }, [account.me, refreshAlerts])

  useEffect(() => {
    syncAchievements(buildAchievementContext(loadCareerStats()))
  }, [statsKey, tab])

  useEffect(() => {
    bumpProfileViews()
  }, [])

  const playStreak = useMemo(
    () => buildAchievementContext(loadCareerStats()).playStreak,
    [statsKey, tab],
  )
  const prefs = loadProfilePrefs()

  function clearLocal() {
    if (!confirm('清除這部機的戰績？帳戶已上傳的副本唔會因此消失。')) return
    clearCareerStats()
    setStatsKey((n) => n + 1)
  }

  const displayName = account.me?.displayName ?? '本機玩家'
  const firstPlay = formatFirstPlay(firstPlayAt(loadCareerStats()))
  const status = account.loading
    ? '正在讀取'
    : account.offline
      ? '未連上帳戶'
      : account.me?.email
        ? account.me.email
        : '這部機的玩家'

  return (
    <main className="you-page">
      <header className="you-id">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返大廳
        </button>
        <span
          className="profile-avatar you-id__avatar"
          style={{
            background: `hsl(${prefs.avatarHue} 42% 32%)`,
          }}
          aria-hidden
        >
          {avatarInitial(prefs, displayName)}
        </span>
        <div className="you-id__body">
          <p className="fan-page__eyebrow">HK ToiMA</p>
          <h1 className="you-id__name">
            {displayName}
            <StreakBadge streak={playStreak} />
          </h1>
          {!account.loading && account.me && !account.me.email && (
            <p className="fan-page__note">未登入電郵。下面填電郵寄連結，先算登入。</p>
          )}
          <p className="you-id__status">
            {status}
            {prefs.realName ? ` · ${prefs.realName}` : ''}
            {prefs.region ? ` · ${prefs.region}` : ''}
            {firstPlay !== '—' ? ` · 首局 ${firstPlay}` : ''}
            {` · 瀏覽 ${profileViewCount()}`}
          </p>
          {prefs.bio ? <p className="fan-page__note">{prefs.bio}</p> : null}
        </div>
        {account.me && (
          <button type="button" className="you-id__code" onClick={() => void account.copyCode()}>
            朋友碼 {account.me.friendCode}
          </button>
        )}
      </header>

      <div className="you-layout">
        <nav className="you-nav" aria-label="個人">
          {YOU_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`you-nav__btn${tab === item.id ? ' is-active' : ''}`}
              aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => onTab(item.id)}
            >
              {item.label}
              {item.id === 'social' && socialAlerts > 0 && (
                <em className="you-nav__count" aria-label={`${socialAlerts} 則待處理`}>
                  {socialAlerts > 9 ? '9+' : socialAlerts}
                </em>
              )}
            </button>
          ))}
        </nav>

        <div className="you-main">
          {tab === 'profile' && <AccountSection pane="profile" account={account} />}
          {tab === 'data' && (
            <StatsPage
              key={statsKey}
              embedded
              onOpenArchive={() => onTab('archive')}
              onOpenInsights={onOpenInsights}
            />
          )}
          {tab === 'awards' && <AwardsWall key={statsKey} />}
          {tab === 'social' && (
            <SocialPane
              account={account}
              onEnterOnline={onEnterOnline}
              onAlertsChange={setSocialAlerts}
            />
          )}
          {tab === 'archive' && (
            <div className="you-pane">
              {onOpenReplay && (
                <GamesArchive onOpen={onOpenReplay} />
              )}
              <AccountSection pane="archive" account={account} />
              <section className="fan-page__section" aria-label="本機檔案">
                <h2>這部機</h2>
                <p className="fan-page__note">戰績數字喺數據頁。拉數簿係欠帳，唔係戰績。牌譜重溫喺上面「對局檔案」。</p>
                <button type="button" className="settings-account__btn" onClick={onOpenLaBook}>
                  打開拉數簿
                </button>
                <button type="button" className="settings-account__danger" onClick={clearLocal}>
                  清除本機戰績
                </button>
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
