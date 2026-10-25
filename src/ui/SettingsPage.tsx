import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { TileId } from '../engine'
import {
  setSfxEnabled,
  setVoiceEnabled,
  sfxDiscard,
  sfxEnabled,
  voiceEnabled,
} from './audio'
import {
  FELT_OPTIONS,
  SOUND_THEMES,
  applyStoredBoardPrefs,
  feltPreviewGradient,
  loadAnimSpeed,
  loadFelt,
  loadFxOpen,
  loadFxResult,
  loadHighlightLast,
  loadShowLegal,
  loadSoundTheme,
  loadTileScale,
  saveAnimSpeed,
  saveFelt,
  saveFxOpen,
  saveFxResult,
  saveHighlightLast,
  saveShowLegal,
  saveSoundTheme,
  saveTileScale,
  type AnimSpeed,
  type FeltId,
  type SoundThemeId,
  type TileScale,
} from './boardPrefs'
import { ARRANGE_MODES, loadArrangeMode, saveArrangeMode, type ArrangeMode } from './handArrange'
import {
  DEFAULT_PLAY_OPTIONS,
  fillAiAfterLabel,
  loadCasualFillAiAfter,
  loadDefaultAiPersona,
  loadDefaultPlayKind,
  loadLeaveConfirm,
  loadRankedFillAiAfter,
  loadRoundSummary,
  personaLabelList,
  saveCasualFillAiAfter,
  saveDefaultAiPersona,
  saveDefaultPlayKind,
  saveLeaveConfirm,
  saveRankedFillAiAfter,
  saveRoundSummary,
  type DefaultPlayKind,
  type MatchFillAiAfter,
} from './matchPrefs'
import {
  exportSettingsBlob,
  importSettingsBlob,
  loadAutoDraw,
  loadAutoPass,
  loadClaimChime,
  loadClaimConfirm,
  loadDiscardConfirm,
  loadDoubleClickDiscard,
  loadHideTableBrand,
  loadHighlightDrawn,
  loadInstantToast,
  loadKeyboardShortcuts,
  loadLowTimeWarn,
  loadNextRoundConfirm,
  loadPassPrivacy,
  loadPlaySideTab,
  loadRecordStats,
  loadSettlementAutoNext,
  loadShowDice,
  loadShowTimer,
  loadShowWaiting,
  loadShowWall,
  loadSfxVolume,
  loadTableDensity,
  loadTileRanks,
  loadVoiceVolume,
  loadWakeLock,
  loadWinConfirm,
  resetSettingsKeys,
  saveAutoDraw,
  saveAutoPass,
  saveClaimChime,
  saveClaimConfirm,
  saveDiscardConfirm,
  saveDoubleClickDiscard,
  saveHideTableBrand,
  saveHighlightDrawn,
  saveInstantToast,
  saveKeyboardShortcuts,
  saveLowTimeWarn,
  saveNextRoundConfirm,
  savePassPrivacy,
  savePlaySideTab,
  saveRecordStats,
  saveSettlementAutoNext,
  saveShowDice,
  saveShowTimer,
  saveShowWaiting,
  saveShowWall,
  saveSfxVolume,
  saveTableDensity,
  saveTileRanks,
  saveVoiceVolume,
  saveWakeLock,
  saveWinConfirm,
  type AutoNextSec,
  type PlaySideTabId,
  type TableDensity,
} from './extraPrefs'
import { loadDefaultRules, saveDefaultRules } from './rulesPrefs'
import { TableRulesEditor, type RulesDraft } from './TableRulesEditor'
import {
  CHAT_SCOPE_OPTIONS,
  loadChatScope,
  loadNotifyEmail,
  loadNotifyInbox,
  saveChatScope,
  saveNotifyEmail,
  saveNotifyInbox,
  type ChatScope,
} from './notifyPrefs'
import { loadPracticeHints, savePracticeHints } from './playPrefs'
import type { AiPersona } from '../engine'
import {
  SETTINGS_SECTIONS,
  parseSettingsHash,
  parseSettingsSection,
  settingsHash,
  type SettingsSectionId,
} from './settingsNav'
import { useAccount } from './useAccount'
import type { YouTab } from './youTab'
import {
  TILE_SKINS,
  getTileSkin,
  setTileSkin,
  subscribeTileSkin,
  type TileSkinId,
} from './tileSkin'
import { Tile } from './tiles'
import { TABLE_SHORTCUTS } from './keyboardShortcuts'
import {
  A11yExtras,
  AccountExtras,
  BoardExtras,
  InterfaceExtras,
  PlayExtras,
  SoundExtras,
} from './SettingsExtras'
import {
  applyStoredUiPrefs,
  loadColorblindMarks,
  loadContentWidth,
  loadHighContrast,
  loadLargeTap,
  loadReducedMotion,
  loadSkinBeforeContrast,
  saveColorblindMarks,
  saveContentWidth,
  saveHighContrast,
  saveLargeTap,
  saveReducedMotion,
  saveSkinBeforeContrast,
  type ContentWidth,
} from './uiPrefs'

const PREVIEW: { id: TileId; faceDown?: boolean }[] = [
  { id: 'man-5' },
  { id: 'pin-5' },
  { id: 'sou-1' },
  { id: 'wind-east' },
  { id: 'dragon-zhong' },
  { id: 'dragon-bai' },
  { id: 'flower-plum' },
  { id: 'man-1', faceDown: true },
]

interface SettingsPageProps {
  onBack?: () => void
  onOpenYou?: (tab: YouTab) => void
}

export function SettingsPage({ onBack, onOpenYou }: SettingsPageProps) {
  const account = useAccount()
  const skin = useSyncExternalStore(subscribeTileSkin, getTileSkin)
  const [sfx, setSfx] = useState(sfxEnabled)
  const [voice, setVoice] = useState(voiceEnabled)
  const [sfxVol, setSfxVol] = useState(loadSfxVolume)
  const [voiceVol, setVoiceVol] = useState(loadVoiceVolume)
  const [discardConfirm, setDiscardConfirm] = useState(loadDiscardConfirm)
  const [showWall, setShowWall] = useState(loadShowWall)
  const [lowTimeWarn, setLowTimeWarn] = useState(loadLowTimeWarn)
  const [showDice, setShowDice] = useState(loadShowDice)
  const [showTimer, setShowTimer] = useState(loadShowTimer)
  const [highlightDrawn, setHighlightDrawn] = useState(loadHighlightDrawn)
  const [doubleClickDiscard, setDoubleClickDiscard] = useState(loadDoubleClickDiscard)
  const [passPrivacy, setPassPrivacy] = useState(loadPassPrivacy)
  const [winConfirm, setWinConfirm] = useState(loadWinConfirm)
  const [claimConfirm, setClaimConfirm] = useState(loadClaimConfirm)
  const [autoDraw, setAutoDraw] = useState(loadAutoDraw)
  const [autoPass, setAutoPass] = useState(loadAutoPass)
  const [keyboardOn, setKeyboardOn] = useState(loadKeyboardShortcuts)
  const [tileRanks, setTileRanks] = useState(loadTileRanks)
  const [sideTab, setSideTab] = useState<PlaySideTabId>(loadPlaySideTab)
  const [autoNext, setAutoNext] = useState<AutoNextSec>(loadSettlementAutoNext)
  const [showWaiting, setShowWaiting] = useState(loadShowWaiting)
  const [instantToast, setInstantToast] = useState(loadInstantToast)
  const [tableDensity, setTableDensity] = useState<TableDensity>(loadTableDensity)
  const [wakeLock, setWakeLock] = useState(loadWakeLock)
  const [claimChime, setClaimChime] = useState(loadClaimChime)
  const [hideBrand, setHideBrand] = useState(loadHideTableBrand)
  const [recordStats, setRecordStats] = useState(loadRecordStats)
  const [nextRoundConfirm, setNextRoundConfirm] = useState(loadNextRoundConfirm)
  const [defaultRules, setDefaultRules] = useState<RulesDraft>(loadDefaultRules)
  const [arrange, setArrange] = useState<ArrangeMode>(loadArrangeMode)
  const [hints, setHints] = useState(loadPracticeHints)
  const [width, setWidth] = useState<ContentWidth>(loadContentWidth)
  const [reducedMotion, setReducedMotion] = useState(loadReducedMotion)
  const [largeTap, setLargeTap] = useState(loadLargeTap)
  const [highContrast, setHighContrast] = useState(loadHighContrast)
  const [colorblind, setColorblind] = useState(loadColorblindMarks)
  const [felt, setFelt] = useState<FeltId>(loadFelt)
  const [tileScale, setTileScale] = useState<TileScale>(loadTileScale)
  const [anim, setAnim] = useState<AnimSpeed>(loadAnimSpeed)
  const [highlightLast, setHighlightLast] = useState(loadHighlightLast)
  const [showLegal, setShowLegal] = useState(loadShowLegal)
  const [fxOpen, setFxOpen] = useState(loadFxOpen)
  const [fxResult, setFxResult] = useState(loadFxResult)
  const [soundTheme, setSoundTheme] = useState<SoundThemeId>(loadSoundTheme)
  const [defaultPlay, setDefaultPlay] = useState<DefaultPlayKind>(loadDefaultPlayKind)
  const [defaultPersona, setDefaultPersona] = useState<AiPersona>(loadDefaultAiPersona)
  const [leaveConfirm, setLeaveConfirm] = useState(loadLeaveConfirm)
  const [roundSummary, setRoundSummary] = useState(loadRoundSummary)
  const [fillCasual, setFillCasual] = useState<MatchFillAiAfter>(loadCasualFillAiAfter)
  const [fillRanked, setFillRanked] = useState<MatchFillAiAfter>(loadRankedFillAiAfter)
  const [notifyEmail, setNotifyEmail] = useState(loadNotifyEmail)
  const [notifyInbox, setNotifyInbox] = useState(loadNotifyInbox)
  const [chatScope, setChatScope] = useState<ChatScope>(loadChatScope)
  const [query, setQuery] = useState('')
  const [section, setSection] = useState<SettingsSectionId>(() =>
    typeof window === 'undefined'
      ? 'board'
      : (parseSettingsHash(window.location.hash) ?? 'board'),
  )

  const arrangeHint = ARRANGE_MODES.find((m) => m.id === arrange)?.hint

  useEffect(() => {
    const next = settingsHash(section)
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', next)
    }
  }, [section])

  useEffect(() => {
    function onHash() {
      const parsed = parseSettingsHash(window.location.hash)
      if (parsed) setSection(parsed)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SETTINGS_SECTIONS
    return SETTINGS_SECTIONS.filter(
      (s) =>
        s.label.includes(q) ||
        s.blurb.includes(q) ||
        s.keywords.toLowerCase().includes(q),
    )
  }, [query])

  useEffect(() => {
    if (visibleSections.length === 0) return
    if (!visibleSections.some((s) => s.id === section)) {
      setSection(visibleSections[0]!.id)
    }
  }, [visibleSections, section])

  const active = SETTINGS_SECTIONS.find((s) => s.id === section) ?? SETTINGS_SECTIONS[0]!

  function goSection(id: SettingsSectionId) {
    setSection(parseSettingsSection(id))
  }

  return (
    <div className="fan-page settings-page settings-shell">
      <header className="fan-page__header">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返大廳
        </button>
        <h1 className="fan-page__title">設定</h1>
        <p className="fan-page__sub">記喺呢部機 · 唔掛喺個人底下</p>
      </header>

      <div className="settings-shell__layout">
        <aside className="settings-nav" aria-label="設定分類">
          <label className="settings-nav__search">
            <span className="settings-nav__sr">搜尋設定</span>
            <SettingsIcon name="search" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋設定…"
              autoComplete="off"
            />
          </label>
          <div className="settings-nav__list" role="tablist" aria-orientation="vertical">
            {visibleSections.length === 0 ? (
              <p className="settings-nav__empty">搵唔到「{query}」</p>
            ) : (
              visibleSections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={section === s.id}
                  className={`settings-nav__item${section === s.id ? ' is-active' : ''}`}
                  onClick={() => goSection(s.id)}
                >
                  <SettingsIcon name={s.icon} />
                  <span className="settings-nav__text">
                    <strong>{s.label}</strong>
                    <em>{s.blurb}</em>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="settings-panel" role="tabpanel" aria-label={active.label}>
          <header className="settings-panel__head">
            <SettingsIcon name={active.icon} />
            <div>
              <h2>{active.label}</h2>
              <p>{active.blurb}</p>
            </div>
          </header>

          {section === 'board' && (
            <>
              <section className="settings-block" aria-label="牌面">
                <p className="settings-block__lead">揀一款就即刻換，牌局裡面都係呢款</p>
                <div className="settings-skin__list">
                  {TILE_SKINS.map((item) => (
                    <SkinChoice
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      note={item.note}
                      selected={skin === item.id}
                    />
                  ))}
                </div>
              </section>

              <section className="settings-block" aria-label="枱布">
                <p className="settings-block__lead">枱絨色調（即時預覽）</p>
                <div className="settings-choice-grid" role="radiogroup" aria-label="枱布">
                  {FELT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={felt === opt.id}
                      className={`settings-choice settings-choice--felt${felt === opt.id ? ' is-selected' : ''}`}
                      style={{ background: feltPreviewGradient(opt.id) }}
                      onClick={() => {
                        setFelt(opt.id)
                        saveFelt(opt.id)
                      }}
                    >
                      <strong>{opt.name}</strong>
                      <em>{opt.note}</em>
                    </button>
                  ))}
                </div>
              </section>

              <section className="settings-block" aria-label="尺寸與動畫">
                <label className="settings-field">
                  <span>牌面尺寸</span>
                  <select
                    value={tileScale}
                    onChange={(e) => {
                      const v = e.target.value as TileScale
                      setTileScale(v)
                      saveTileScale(v)
                    }}
                  >
                    <option value="sm">細</option>
                    <option value="md">標準</option>
                    <option value="lg">大</option>
                  </select>
                </label>
                <label className="settings-field">
                  <span>打牌動畫速度</span>
                  <select
                    value={anim}
                    onChange={(e) => {
                      const v = e.target.value as AnimSpeed
                      setAnim(v)
                      saveAnimSpeed(v)
                    }}
                  >
                    <option value="off">關</option>
                    <option value="slow">慢</option>
                    <option value="med">中</option>
                    <option value="fast">快</option>
                  </select>
                </label>
                <SettingSwitch
                  title="高亮上一手"
                  detail="牌河最後一張棄牌保持外框"
                  on={highlightLast}
                  onToggle={() => {
                    const next = !highlightLast
                    setHighlightLast(next)
                    saveHighlightLast(next)
                  }}
                />
                <SettingSwitch
                  title="合法操作點"
                  detail="鳴牌目標同練習建議高亮"
                  on={showLegal}
                  onToggle={() => {
                    const next = !showLegal
                    setShowLegal(next)
                    saveShowLegal(next)
                  }}
                />
                <SettingSwitch
                  title="開局小動畫"
                  detail="入枱時枱面淡入"
                  on={fxOpen}
                  onToggle={() => {
                    const next = !fxOpen
                    setFxOpen(next)
                    saveFxOpen(next)
                  }}
                />
                <SettingSwitch
                  title="結算小動畫"
                  detail="局終面板滑入"
                  on={fxResult}
                  onToggle={() => {
                    const next = !fxResult
                    setFxResult(next)
                    saveFxResult(next)
                  }}
                />
              </section>
              <BoardExtras />
            </>
          )}

          {section === 'sound' && (
            <section className="settings-block" aria-label="聲音">
              <p className="settings-block__lead">可以只留提示聲，或者只留報牌</p>
              <SettingSwitch
                title="摸打聲"
                detail="摸牌、打牌的短聲"
                on={sfx}
                onToggle={() => {
                  const next = !sfx
                  setSfx(next)
                  setSfxEnabled(next)
                }}
              />
              <SettingSwitch
                title="粵語報牌"
                detail="碰、上、槓、食糊、叮"
                on={voice}
                onToggle={() => {
                  const next = !voice
                  setVoice(next)
                  setVoiceEnabled(next)
                }}
              />
              <label className="settings-field">
                <span>摸打聲音量 {Math.round(sfxVol * 100)}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(sfxVol * 100)}
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100
                    setSfxVol(v)
                    saveSfxVolume(v)
                  }}
                />
              </label>
              <label className="settings-field">
                <span>報牌音量 {Math.round(voiceVol * 100)}%</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(voiceVol * 100)}
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100
                    setVoiceVol(v)
                    saveVoiceVolume(v)
                  }}
                />
              </label>
              <p className="settings-block__lead">聲音主題（短 beep 質感）</p>
              <div className="settings-choice-grid" role="radiogroup" aria-label="聲音主題">
                {SOUND_THEMES.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={soundTheme === opt.id}
                    className={`settings-choice${soundTheme === opt.id ? ' is-selected' : ''}`}
                    onClick={() => {
                      setSoundTheme(opt.id)
                      saveSoundTheme(opt.id)
                      sfxDiscard()
                    }}
                  >
                    <strong>{opt.name}</strong>
                    <em>{opt.note}</em>
                  </button>
                ))}
              </div>
              <SoundExtras />
            </section>
          )}

          {section === 'play' && (
            <>
              <section className="settings-block" aria-label="對局偏好">
                <p className="settings-block__lead">開大廳玩法時預先揀好</p>
                <div className="settings-choice-grid" role="radiogroup" aria-label="預設玩法">
                  {DEFAULT_PLAY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={defaultPlay === opt.id}
                      className={`settings-choice${defaultPlay === opt.id ? ' is-selected' : ''}`}
                      onClick={() => {
                        setDefaultPlay(opt.id)
                        saveDefaultPlayKind(opt.id)
                      }}
                    >
                      <strong>{opt.name}</strong>
                      <em>{opt.note}</em>
                    </button>
                  ))}
                </div>
                <label className="settings-field">
                  <span>預設 AI 性格</span>
                  <select
                    value={defaultPersona}
                    onChange={(e) => {
                      const v = e.target.value as AiPersona
                      setDefaultPersona(v)
                      saveDefaultAiPersona(v)
                    }}
                  >
                    {personaLabelList().map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <em>第一個 AI 位優先用呢個；其餘仍會錯開</em>
                </label>
                <SettingSwitch
                  title="退出二次確認"
                  detail="返大廳／退出牌局前先問一次"
                  on={leaveConfirm}
                  onToggle={() => {
                    const next = !leaveConfirm
                    setLeaveConfirm(next)
                    saveLeaveConfirm(next)
                  }}
                />
                <SettingSwitch
                  title="局終摘要"
                  detail="結算顯示手牌同番種明細；關就只留分數"
                  on={roundSummary}
                  onToggle={() => {
                    const next = !roundSummary
                    setRoundSummary(next)
                    saveRoundSummary(next)
                  }}
                />
                <label className="settings-field">
                  <span>普通匹配 · 補 AI</span>
                  <select
                    value={fillCasual}
                    onChange={(e) => {
                      const v = Number(e.target.value) as MatchFillAiAfter
                      setFillCasual(v)
                      saveCasualFillAiAfter(v)
                    }}
                  >
                    {([15, 30, 60, 0] as MatchFillAiAfter[]).map((sec) => (
                      <option key={sec} value={sec}>
                        {fillAiAfterLabel(sec)}
                      </option>
                    ))}
                  </select>
                  <em>排隊逾時後用 AI 補齊再開枱</em>
                </label>
                <label className="settings-field">
                  <span>排位匹配 · 補 AI</span>
                  <select
                    value={fillRanked}
                    onChange={(e) => {
                      const v = Number(e.target.value) as MatchFillAiAfter
                      setFillRanked(v)
                      saveRankedFillAiAfter(v)
                    }}
                  >
                    {([15, 30, 60, 0] as MatchFillAiAfter[]).map((sec) => (
                      <option key={sec} value={sec}>
                        {fillAiAfterLabel(sec)}
                      </option>
                    ))}
                  </select>
                  <em>預設只等人；可改逾時補 AI（分數半幅）</em>
                </label>
              </section>
              <section className="settings-block" aria-label="打牌">
                <p className="settings-block__lead">牌局左下角仍可以臨時改排法</p>
                <label className="settings-field">
                  <span>開局排法</span>
                  <select
                    value={arrange}
                    onChange={(e) => {
                      const mode = e.target.value as ArrangeMode
                      setArrange(mode)
                      saveArrangeMode(mode)
                    }}
                  >
                    {ARRANGE_MODES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {arrangeHint && <em>{arrangeHint}</em>}
                </label>
                <SettingSwitch
                  title="練習提示"
                  detail="本機開枱時高亮建議打的牌。網上牌局唔顯示"
                  on={hints}
                  onToggle={() => {
                    const next = !hints
                    setHints(next)
                    savePracticeHints(next)
                  }}
                />
                <SettingSwitch
                  title="打牌二次確認"
                  detail="撳打牌／雙擊／Enter 出牌前再問一次"
                  on={discardConfirm}
                  onToggle={() => {
                    const next = !discardConfirm
                    setDiscardConfirm(next)
                    saveDiscardConfirm(next)
                  }}
                />
                <SettingSwitch
                  title="低時警告聲"
                  detail="倒數剩 5 秒嗰下短 beep"
                  on={lowTimeWarn}
                  onToggle={() => {
                    const next = !lowTimeWarn
                    setLowTimeWarn(next)
                    saveLowTimeWarn(next)
                  }}
                />
                <SettingSwitch
                  title="雙擊打牌"
                  detail="雙擊手牌即出；關就只可以用打牌掣／Enter"
                  on={doubleClickDiscard}
                  onToggle={() => {
                    const next = !doubleClickDiscard
                    setDoubleClickDiscard(next)
                    saveDoubleClickDiscard(next)
                  }}
                />
                <SettingSwitch
                  title="交機遮罩"
                  detail="本機多人輪流時遮住手牌；單人唔影響"
                  on={passPrivacy}
                  onToggle={() => {
                    const next = !passPrivacy
                    setPassPrivacy(next)
                    savePassPrivacy(next)
                  }}
                />
                <SettingSwitch
                  title="食糊二次確認"
                  detail="撳食／H 之前再問一次"
                  on={winConfirm}
                  onToggle={() => {
                    const next = !winConfirm
                    setWinConfirm(next)
                    saveWinConfirm(next)
                  }}
                />
                <SettingSwitch
                  title="鳴牌二次確認"
                  detail="碰／上／槓之前再問一次"
                  on={claimConfirm}
                  onToggle={() => {
                    const next = !claimConfirm
                    setClaimConfirm(next)
                    saveClaimConfirm(next)
                  }}
                />
                <SettingSwitch
                  title="自動摸牌"
                  detail="合法動作只有摸牌時自動摸"
                  on={autoDraw}
                  onToggle={() => {
                    const next = !autoDraw
                    setAutoDraw(next)
                    saveAutoDraw(next)
                  }}
                />
                <SettingSwitch
                  title="自動跳過"
                  detail="鳴牌窗合法動作只有「跳過」時自動過"
                  on={autoPass}
                  onToggle={() => {
                    const next = !autoPass
                    setAutoPass(next)
                    saveAutoPass(next)
                  }}
                />
                <SettingSwitch
                  title="鍵盤捷徑"
                  detail="牌局熱鍵；詳情見無障礙分類"
                  on={keyboardOn}
                  onToggle={() => {
                    const next = !keyboardOn
                    setKeyboardOn(next)
                    saveKeyboardShortcuts(next)
                  }}
                />
                <label className="settings-field">
                  <span>局終自動下一局</span>
                  <select
                    value={autoNext}
                    onChange={(e) => {
                      const v = Number(e.target.value) as AutoNextSec
                      setAutoNext(v)
                      saveSettlementAutoNext(v)
                    }}
                  >
                    <option value={0}>關</option>
                    <option value={3}>3 秒</option>
                    <option value={5}>5 秒</option>
                    <option value={8}>8 秒</option>
                  </select>
                </label>
                <SettingSwitch
                  title="下一局確認"
                  detail="手動撳「下一局」先問；自動下一局唔問"
                  on={nextRoundConfirm}
                  onToggle={() => {
                    const next = !nextRoundConfirm
                    setNextRoundConfirm(next)
                    saveNextRoundConfirm(next)
                  }}
                />
                <SettingSwitch
                  title="鳴牌提示聲"
                  detail="輪到你可以鳴／過時短 beep"
                  on={claimChime}
                  onToggle={() => {
                    const next = !claimChime
                    setClaimChime(next)
                    saveClaimChime(next)
                  }}
                />
                <SettingSwitch
                  title="螢幕常亮"
                  detail="打牌期間請求唔熄屏（睇瀏覽器支援）"
                  on={wakeLock}
                  onToggle={() => {
                    const next = !wakeLock
                    setWakeLock(next)
                    saveWakeLock(next)
                  }}
                />
                <SettingSwitch
                  title="記錄戰績"
                  detail="局終寫入本機戰績；關就唔計入統計"
                  on={recordStats}
                  onToggle={() => {
                    const next = !recordStats
                    setRecordStats(next)
                    saveRecordStats(next)
                  }}
                />
              </section>
              <section className="settings-block" aria-label="預設枱規">
                <p className="settings-block__lead">大廳開枱預先用呢套（私人／AI／匹配設定）</p>
                <TableRulesEditor
                  value={defaultRules}
                  onChange={(next) => {
                    setDefaultRules(next)
                    saveDefaultRules(next)
                  }}
                />
              </section>
              <PlayExtras />
            </>
          )}

          {section === 'account' && (
            <>
              <section className="settings-block" aria-label="帳戶捷徑">
                <p className="settings-block__lead">
                  {account.me?.email
                    ? `已登入 · ${account.me.email}`
                    : account.me
                      ? `本機玩家 · 朋友碼 ${account.me.friendCode}`
                      : '帳戶資料喺個人頁管理'}
                </p>
                <div className="settings-link-row">
                  <button
                    type="button"
                    className="settings-account__btn"
                    onClick={() => onOpenYou?.('profile')}
                  >
                    個人資料
                  </button>
                  <button
                    type="button"
                    className="settings-account__btn"
                    onClick={() => onOpenYou?.('profile')}
                  >
                    登入裝置
                  </button>
                  <button
                    type="button"
                    className="settings-account__btn"
                    onClick={() => onOpenYou?.('archive')}
                  >
                    檔案／刪除帳戶
                  </button>
                </div>
                {account.me && (
                  <div className="settings-link-row">
                    <button
                      type="button"
                      className="settings-account__btn"
                      disabled={account.busy}
                      onClick={() => void account.onLogout(false)}
                    >
                      登出呢部機
                    </button>
                    <button
                      type="button"
                      className="settings-account__danger"
                      disabled={account.busy}
                      onClick={() => void account.onDelete()}
                    >
                      刪除帳戶
                    </button>
                  </div>
                )}
                {account.note && <p className="settings-account__note">{account.note}</p>}
              </section>

              <section className="settings-block" aria-label="通知">
                <p className="settings-block__lead">
                  偏好記喺呢部機；伺服器推送稍後接上
                </p>
                <SettingSwitch
                  title="電郵通知"
                  detail="登入連結、重要帳戶訊息"
                  on={notifyEmail}
                  onToggle={() => {
                    const next = !notifyEmail
                    setNotifyEmail(next)
                    saveNotifyEmail(next)
                  }}
                />
                <SettingSwitch
                  title="站內通知"
                  detail="大廳／牌局提示（未開推送前只記偏好）"
                  on={notifyInbox}
                  onToggle={() => {
                    const next = !notifyInbox
                    setNotifyInbox(next)
                    saveNotifyInbox(next)
                  }}
                />
              </section>

              <section className="settings-block" aria-label="局內傾偈">
                <p className="settings-block__lead">局內傾偈範圍 · 功能稍後先上線</p>
                <div className="settings-choice-grid" role="radiogroup" aria-label="傾偈範圍">
                  {CHAT_SCOPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={chatScope === opt.id}
                      className={`settings-choice${chatScope === opt.id ? ' is-selected' : ''}`}
                      onClick={() => {
                        setChatScope(opt.id)
                        saveChatScope(opt.id)
                      }}
                    >
                      <strong>{opt.name}</strong>
                      <em>{opt.note}</em>
                    </button>
                  ))}
                </div>
                <p className="fan-page__note">傾偈功能稍後上線；而家先記低你想要嘅範圍。</p>
              </section>
              <AccountExtras />
            </>
          )}

          {section === 'interface' && (
            <>
            <InterfaceExtras />
            <section className="settings-block" aria-label="介面">
              <p className="settings-block__lead">工具頁置中欄寬（牌局唔變）</p>
              <label className="settings-field">
                <span>內容欄寬</span>
                <select
                  value={width}
                  onChange={(e) => {
                    const v = e.target.value as ContentWidth
                    setWidth(v)
                    saveContentWidth(v)
                  }}
                >
                  <option value="narrow">窄 · 易掃讀</option>
                  <option value="standard">標準</option>
                  <option value="wide">闊 · 牌面圖解</option>
                </select>
              </label>
              <SettingSwitch
                title="顯示牆剩張數"
                detail="中控同頂欄嘅「牆／剩餘」"
                on={showWall}
                onToggle={() => {
                  const next = !showWall
                  setShowWall(next)
                  saveShowWall(next)
                }}
              />
              <SettingSwitch
                title="顯示骰子"
                detail="頂欄骰點"
                on={showDice}
                onToggle={() => {
                  const next = !showDice
                  setShowDice(next)
                  saveShowDice(next)
                }}
              />
              <SettingSwitch
                title="顯示倒數"
                detail="出牌／鳴牌限時"
                on={showTimer}
                onToggle={() => {
                  const next = !showTimer
                  setShowTimer(next)
                  saveShowTimer(next)
                }}
              />
              <SettingSwitch
                title="高亮剛摸牌"
                detail="剛摸入嚟嗰張外框提示"
                on={highlightDrawn}
                onToggle={() => {
                  const next = !highlightDrawn
                  setHighlightDrawn(next)
                  saveHighlightDrawn(next)
                }}
              />
              <SettingSwitch
                title="顯示聽牌等張"
                detail="動作列「等：…」"
                on={showWaiting}
                onToggle={() => {
                  const next = !showWaiting
                  setShowWaiting(next)
                  saveShowWaiting(next)
                }}
              />
              <SettingSwitch
                title="即時賞罰提示"
                detail="暗槓／花等短橫幅"
                on={instantToast}
                onToggle={() => {
                  const next = !instantToast
                  setInstantToast(next)
                  saveInstantToast(next)
                }}
              />
              <SettingSwitch
                title="牌面點數角標"
                detail="萬筒索右下角顯示 1–9（學牌用）"
                on={tileRanks}
                onToggle={() => {
                  const next = !tileRanks
                  setTileRanks(next)
                  saveTileRanks(next)
                }}
              />
              <label className="settings-field">
                <span>側欄預設分頁</span>
                <select
                  value={sideTab}
                  onChange={(e) => {
                    const v = e.target.value as PlaySideTabId
                    setSideTab(v)
                    savePlaySideTab(v)
                  }}
                >
                  <option value="log">操作</option>
                  <option value="info">資訊</option>
                  <option value="books">帳目</option>
                  <option value="hint">提示</option>
                </select>
              </label>
              <label className="settings-field">
                <span>牌桌疏密</span>
                <select
                  value={tableDensity}
                  onChange={(e) => {
                    const v = e.target.value as TableDensity
                    setTableDensity(v)
                    saveTableDensity(v)
                  }}
                >
                  <option value="compact">密</option>
                  <option value="normal">標準</option>
                  <option value="roomy">疏</option>
                </select>
              </label>
              <SettingSwitch
                title="隱藏枱面品牌"
                detail="唔顯示頂欄「香港台麻」小標"
                on={hideBrand}
                onToggle={() => {
                  const next = !hideBrand
                  setHideBrand(next)
                  saveHideTableBrand(next)
                }}
              />
              <SettingSwitch
                title="減少動效"
                detail="關花巧過渡，跟系統「減少動態」以外再強制"
                on={reducedMotion}
                onToggle={() => {
                  const next = !reducedMotion
                  setReducedMotion(next)
                  saveReducedMotion(next)
                }}
              />
              <p className="settings-block__lead">匯出／重設（唔動戰績）</p>
              <div className="settings-link-row">
                <button
                  type="button"
                  className="settings-account__btn"
                  onClick={() => {
                    const blob = new Blob([exportSettingsBlob()], {
                      type: 'application/json',
                    })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'hktoima-settings.json'
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  匯出設定
                </button>
                <label className="settings-account__btn settings-import">
                  匯入設定
                  <input
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (!file) return
                      void file.text().then((text) => {
                        if (!importSettingsBlob(text)) {
                          alert('匯入失敗：檔案格式唔啱')
                          return
                        }
                        applyStoredUiPrefs()
                        applyStoredBoardPrefs()
                        window.location.reload()
                      })
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="settings-account__danger"
                  onClick={() => {
                    if (
                      !confirm(
                        '重設全部本機設定？戰績同房間資料唔會清。頁面會重新載入。',
                      )
                    ) {
                      return
                    }
                    resetSettingsKeys()
                    window.location.reload()
                  }}
                >
                  重設設定
                </button>
              </div>
            </section>
            </>
          )}

          {section === 'a11y' && (
            <>
              <section className="settings-block" aria-label="無障礙">
                <p className="settings-block__lead">對比、點擊、色盲角標</p>
                <SettingSwitch
                  title="高對比牌面"
                  detail="加強邊框同花色對比；開咗會切去黑底金字（關返會試恢復原皮膚）"
                  on={highContrast}
                  onToggle={() => {
                    const next = !highContrast
                    setHighContrast(next)
                    saveHighContrast(next)
                    if (next) {
                      if (skin !== 'black' && skin !== 'line') {
                        saveSkinBeforeContrast(skin)
                        setTileSkin('black')
                      }
                    } else {
                      const prev = loadSkinBeforeContrast()
                      if (prev) {
                        setTileSkin(prev as TileSkinId)
                        saveSkinBeforeContrast(null)
                      }
                    }
                  }}
                />
                <SettingSwitch
                  title="色盲角標"
                  detail="萬／筒／索角落加形狀標記（三角／圓／方）"
                  on={colorblind}
                  onToggle={() => {
                    const next = !colorblind
                    setColorblind(next)
                    saveColorblindMarks(next)
                  }}
                />
                <SettingSwitch
                  title="加大點擊目標"
                  detail="手牌同主要按鈕更容易撳中"
                  on={largeTap}
                  onToggle={() => {
                    const next = !largeTap
                    setLargeTap(next)
                    saveLargeTap(next)
                  }}
                />
                <SettingSwitch
                  title="減少動效"
                  detail="同介面分類共用；開咗兩邊都會減"
                  on={reducedMotion}
                  onToggle={() => {
                    const next = !reducedMotion
                    setReducedMotion(next)
                    saveReducedMotion(next)
                  }}
                />
                <button
                  type="button"
                  className="settings-account__btn"
                  onClick={() => {
                    setHighContrast(true)
                    saveHighContrast(true)
                    setColorblind(true)
                    saveColorblindMarks(true)
                    setLargeTap(true)
                    saveLargeTap(true)
                    if (skin !== 'black' && skin !== 'line') {
                      saveSkinBeforeContrast(skin)
                    }
                    setTileSkin('black')
                  }}
                >
                  一鍵套用高對比預設
                </button>
              </section>

              <section className="settings-block" aria-label="鍵盤捷徑">
                <p className="settings-block__lead">牌局內有效；輸入框聚焦時唔攔截</p>
                <table className="settings-shortcuts">
                  <thead>
                    <tr>
                      <th scope="col">鍵</th>
                      <th scope="col">動作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TABLE_SHORTCUTS.map((row) => (
                      <tr key={row.keys}>
                        <td>
                          <kbd>{row.keys}</kbd>
                        </td>
                        <td>{row.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <A11yExtras />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SettingSwitch({
  title,
  detail,
  on,
  onToggle,
}: {
  title: string
  detail: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className={`settings-toggle${on ? ' is-on' : ''}`}
      aria-pressed={on}
      onClick={onToggle}
    >
      <span>
        <strong>{title}</strong>
        <em>{detail}</em>
      </span>
      <span className="settings-switch" aria-hidden />
    </button>
  )
}

function SkinChoice({
  id,
  name,
  note,
  selected,
}: {
  id: TileSkinId
  name: string
  note: string
  selected: boolean
}) {
  return (
    <label className={`settings-skin__card${selected ? ' is-selected' : ''}`}>
      <input
        className="settings-skin__radio"
        type="radio"
        name="tile-skin"
        value={id}
        checked={selected}
        onChange={() => setTileSkin(id)}
      />
      <span className="settings-skin__name">{name}</span>
      <span className="settings-skin__note">{note}</span>
      <span className="settings-skin__tiles" aria-hidden>
        {PREVIEW.map((tile) => (
          <Tile
            key={`${id}-${tile.faceDown ? 'back' : tile.id}`}
            id={tile.id}
            size="md"
            faceDown={tile.faceDown}
            skin={id}
          />
        ))}
      </span>
    </label>
  )
}

function SettingsIcon({ name }: { name: string }) {
  return (
    <svg
      className="settings-icon"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'board' && (
        <>
          <rect x="4" y="5" width="7" height="10" rx="1.2" />
          <rect x="13" y="5" width="7" height="10" rx="1.2" />
          <path d="M7 19h10" />
        </>
      )}
      {name === 'sound' && (
        <>
          <path d="M4 10h3l4-3v10l-4-3H4z" />
          <path d="M16 9.5a3.5 3.5 0 0 1 0 5" />
        </>
      )}
      {name === 'play' && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M10 8l6 4-6 4V8z" />
        </>
      )}
      {name === 'account' && (
        <>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19c1.5-3 4-4.5 6.5-4.5S17 16 18.5 19" />
        </>
      )}
      {name === 'interface' && (
        <>
          <rect x="3.5" y="5" width="17" height="14" rx="2" />
          <path d="M3.5 10h17M10 10v9" />
        </>
      )}
      {name === 'a11y' && (
        <>
          <circle cx="12" cy="5" r="2" />
          <path d="M7 10h10M12 7v5l4 6M12 12l-4 6" />
        </>
      )}
      {name === 'search' && (
        <>
          <circle cx="11" cy="11" r="5.5" />
          <path d="M16 16l3.5 3.5" />
        </>
      )}
    </svg>
  )
}
