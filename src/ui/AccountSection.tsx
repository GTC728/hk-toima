import { useState } from 'react'
import type { AccountModel } from './useAccount'
import { loadCareerStats } from './stats'
import {
  avatarInitial,
  loadProfilePrefs,
  privacyLabel,
  REGION_OPTIONS,
  saveProfilePrefs,
  type ProfilePrefs,
  type StatsPrivacy,
} from './profilePrefs'

interface AccountSectionProps {
  pane: 'profile' | 'archive'
  account: AccountModel
}

export function AccountSection({ pane, account }: AccountSectionProps) {
  const [prefs, setPrefs] = useState<ProfilePrefs>(() => loadProfilePrefs())

  function updatePrefs(patch: Partial<ProfilePrefs>) {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    saveProfilePrefs(next)
  }
  const {
    me,
    offline,
    loading,
    name,
    setName,
    email,
    setEmail,
    sessions,
    note,
    busy,
    siteKey,
    canSendLink,
    widgetRef,
    prompted,
    saveName,
    sendLink,
    openDevLink,
    devLink,
    refreshSessions,
    onLogout,
    onUpload,
    onDownload,
    onDelete,
    copyCode,
  } = account

  return (
    <section className="fan-page__section settings-account" aria-label={pane === 'profile' ? '個人' : '檔案'}>
      {pane === 'profile' && (
        <>
          <h2>身份</h2>
          <p className="fan-page__note">
            顯示名同電郵跟住玩家編號。座位令牌仍然只負責嗰一席出牌。
          </p>
          {loading && <p className="fan-page__note">正在讀取帳戶…</p>}
          {offline && (
            <p className="fan-page__note">暫時連唔到帳戶，呢部機照用本機名。數據同設定仍然留喺呢部機。</p>
          )}
          {!loading && !offline && !me && (
            <p className="fan-page__note">{note ?? '未有工作階段。'}</p>
          )}
          {me && (
            <>
              <label className="settings-field">
                <span>顯示名</span>
                <input
                  value={name}
                  maxLength={16}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
                <em>唔會改緊打緊嘅嗰局，下一局先用新名。</em>
              </label>
              <button
                type="button"
                className="settings-account__btn"
                disabled={busy || !name.trim()}
                onClick={() => void saveName()}
              >
                儲存顯示名
              </button>

              <p className="settings-account__label">朋友碼</p>
              <p className="settings-account__code">{me.friendCode}</p>
              <button type="button" className="settings-account__btn" onClick={() => void copyCode()}>
                複製朋友碼
              </button>
              <p className="fan-page__note">
                朋友用呢個碼加你。「個人 → 社交」處理請求同約局。
              </p>

              <h3 className="settings-account__label">檔案／私隱</h3>
              <div className="profile-avatar-row">
                <span
                  className="profile-avatar"
                  style={{
                    background: `hsl(${prefs.avatarHue} 42% 32%)`,
                  }}
                  aria-hidden
                >
                  {avatarInitial(prefs, name || me.displayName)}
                </span>
                <label className="settings-field">
                  <span>頭像字</span>
                  <input
                    value={prefs.avatarLetter}
                    maxLength={1}
                    placeholder="空＝用顯示名"
                    onChange={(e) =>
                      updatePrefs({ avatarLetter: e.target.value })
                    }
                  />
                </label>
                <label className="settings-field">
                  <span>頭像色相</span>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={prefs.avatarHue}
                    onChange={(e) =>
                      updatePrefs({
                        avatarHue: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <p className="fan-page__note">本機頭像色＋字；上傳圖片稍後。</p>
              <label className="settings-field">
                <span>戰績可見</span>
                <select
                  value={prefs.privacy}
                  onChange={(e) =>
                    updatePrefs({
                      privacy: e.target.value as StatsPrivacy,
                    })
                  }
                >
                  <option value="self">僅自己</option>
                  <option value="public">公開（預留）</option>
                </select>
                <em>
                  而家設定只存本機（{privacyLabel(prefs.privacy)}
                  ）。公開分享要帳戶 API 之後先生效。
                </em>
              </label>
              <label className="settings-field">
                <span>地區</span>
                <select
                  value={prefs.region}
                  onChange={(e) => updatePrefs({ region: e.target.value })}
                >
                  {REGION_OPTIONS.map((r) => (
                    <option key={r.id || 'none'} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="settings-field">
                <span>真名（可選）</span>
                <input
                  value={prefs.realName}
                  maxLength={40}
                  placeholder="只存本機"
                  onChange={(e) => updatePrefs({ realName: e.target.value })}
                />
              </label>
              <label className="settings-field">
                <span>狀態一句</span>
                <input
                  value={prefs.bio}
                  maxLength={80}
                  placeholder="例如：今晚東風位"
                  onChange={(e) => updatePrefs({ bio: e.target.value })}
                />
              </label>

              {me.email ? (
                <p className="fan-page__note">已驗證電郵：{me.email}</p>
              ) : (
                <>
                  <label className="settings-field">
                    <span>電郵登入</span>
                    <input
                      type="email"
                      value={email}
                      autoComplete="email"
                      placeholder="you@example.com"
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy}
                    />
                    <em>魔法連結，冇密碼。15 分鐘、用一次。</em>
                  </label>
                  {siteKey ? (
                    <div ref={widgetRef} className="settings-account__turnstile" />
                  ) : (
                    <p className="fan-page__note">本機開發：未設 Turnstile，可直接寄／顯示連結。</p>
                  )}
                  <button
                    type="button"
                    className="settings-account__btn"
                    disabled={busy || !canSendLink}
                    onClick={() => void sendLink()}
                  >
                    寄登入連結
                  </button>
                  {devLink && (
                    <button
                      type="button"
                      className="settings-account__btn"
                      onClick={openDevLink}
                    >
                      打開登入連結
                    </button>
                  )}
                </>
              )}

              <h3 className="settings-account__label">登入裝置</h3>
              {sessions.length === 0 ? (
                <p className="fan-page__note">未有裝置紀錄</p>
              ) : (
                <ul className="settings-account__devices">
                  {sessions.map((session) => (
                    <li key={session.id}>
                      <strong>{session.current ? '呢部機' : '其他裝置'}</strong>
                      <span>{session.deviceSummary}</span>
                      {session.revokedAt != null && <em>已登出</em>}
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="settings-account__btn"
                disabled={busy}
                onClick={() => void onLogout(false)}
              >
                登出呢部機
              </button>
              <button
                type="button"
                className="settings-account__btn"
                disabled={busy}
                onClick={() => void onLogout(true)}
              >
                全部裝置登出
              </button>
              <button
                type="button"
                className="settings-account__btn"
                disabled={busy}
                onClick={() => void refreshSessions()}
              >
                重新整理裝置
              </button>
            </>
          )}
        </>
      )}

      {pane === 'archive' && (
        <>
          <h2>你的檔案</h2>
          <p className="fan-page__note">
            下載係帳戶副本。上傳只收這部機的戰績一次。刪除帳戶唔會抹走已經打完的牌局結果。
          </p>
          {offline && <p className="fan-page__note">未連上帳戶，只可以清這部機的戰績。</p>}
          {me && (
            <>
              <button
                type="button"
                className="settings-account__btn"
                disabled={busy || loadCareerStats().rounds === 0}
                onClick={() => void onUpload()}
              >
                上傳本機戰績
              </button>
              <button
                type="button"
                className="settings-account__btn"
                disabled={busy}
                onClick={() => void onDownload()}
              >
                下載我的資料
              </button>
              {prompted && <p className="fan-page__note">本機戰績搬運已經問過一次。</p>}
              <button
                type="button"
                className="settings-account__danger"
                disabled={busy}
                onClick={() => void onDelete()}
              >
                刪除帳戶
              </button>
            </>
          )}
        </>
      )}
      {note && <p className="settings-account__note">{note}</p>}
    </section>
  )
}
