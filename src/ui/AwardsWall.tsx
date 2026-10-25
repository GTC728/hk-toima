import { useMemo, useState } from 'react'
import {
  ACHIEVEMENTS,
  buildAchievementContext,
  calendarDays,
  firstPlayAt,
  playDaySet,
  playDayStreak,
  syncAchievements,
} from './stats-achievements'
import { loadCareerStats } from './stats'

export function AwardsWall() {
  const [career] = useState(() => loadCareerStats())
  const ctx = useMemo(() => buildAchievementContext(career), [career])
  const { unlocks } = useMemo(() => syncAchievements(ctx), [ctx])
  const unlocked = useMemo(() => new Map(unlocks.map((u) => [u.id, u.t])), [unlocks])
  const streak = ctx.playStreak
  const firstAt = firstPlayAt(career.matches)
  const days = useMemo(() => calendarDays(56), [])
  const played = useMemo(
    () => playDaySet(career.matches, 56),
    [career.matches],
  )

  return (
    <div className="you-pane awards-wall">
      <section className="fan-page__section" aria-label="連玩">
        <h2>連玩火</h2>
        <p className="awards-wall__streak">
          {streak > 0 ? (
            <>
              <span className="awards-wall__fire" aria-hidden>
                {streak >= 7 ? '🔥🔥' : '🔥'}
              </span>
              連續 <strong>{streak}</strong> 日有打牌
            </>
          ) : (
            '今日未開枱 — 打完一場就點着'
          )}
        </p>
        {firstAt != null && (
          <p className="fan-page__note">
            首場：{new Date(firstAt).toLocaleDateString('zh-HK')}
          </p>
        )}
      </section>

      <section className="fan-page__section" aria-label="打牌日曆">
        <h2>近八週</h2>
        <ul className="awards-heat" aria-label="打牌熱圖">
          {days.map((d) => (
            <li
              key={d.key}
              title={d.label}
              className={played.has(d.key) ? 'is-on' : undefined}
            />
          ))}
        </ul>
      </section>

      <section className="fan-page__section" aria-label="成就牆">
        <h2>
          成就牆{' '}
          <span className="awards-wall__count">
            {unlocked.size}/{ACHIEVEMENTS.length}
          </span>
        </h2>
        <ul className="awards-grid">
          {ACHIEVEMENTS.map((a) => {
            const t = unlocked.get(a.id)
            const on = t != null
            return (
              <li
                key={a.id}
                className={on ? 'is-on' : 'is-off'}
                title={on ? new Date(t).toLocaleString('zh-HK') : undefined}
              >
                <strong>{a.name}</strong>
                <span>{a.desc}</span>
                <em>{on ? '已解鎖' : '未解鎖'}</em>
              </li>
            )
          })}
        </ul>
      </section>

      <p className="fan-page__note">
        成就只存在呢部機。好友／俱樂部榜稍後先做。
      </p>
    </div>
  )
}

export function StreakBadge({ streak }: { streak: number }) {
  if (streak <= 0) return null
  return (
    <span className="awards-wall__badge" title={`連玩 ${streak} 日`}>
      🔥{streak}
    </span>
  )
}

export { playDayStreak, syncAchievements }
