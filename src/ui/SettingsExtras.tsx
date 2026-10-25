/** 原 backlog 剩餘適用項嘅設定 UI 區塊 */
import { useState } from 'react'
import { isMuted } from './audio'
import { resetCategoryKeys } from './leftoverPrefs'
import {
  applyThemePreset,
  loadAiLabels,
  loadAriaTileFormat,
  loadAutoFillAi,
  loadCalcBase,
  loadCalcFanValue,
  loadCalcWinType,
  loadColorScheme,
  loadDndFrom,
  loadDndTo,
  loadFlowerFold,
  loadFocusMode,
  loadHandTilt,
  loadHintDetail,
  loadLogTimestamps,
  loadLongPressClear,
  loadLowTimeSec,
  loadNameDensity,
  loadNavIconsOnly,
  loadNotifyDnd,
  loadNotifyInvite,
  loadPerfMode,
  loadSfxClaimOn,
  loadSfxDiscardOn,
  loadSfxDrawOn,
  loadSfxTickOn,
  loadSfxUiOn,
  loadSfxWinOn,
  loadShowRating,
  loadSoundCaptions,
  loadTimeFormat,
  loadWallMode,
  loadWinCelebrate,
  loadWindLabelStyle,
  saveAiLabels,
  saveAriaTileFormat,
  saveAutoFillAi,
  saveCalcBase,
  saveCalcFanValue,
  saveCalcWinType,
  saveColorScheme,
  saveDndFrom,
  saveDndTo,
  saveFlowerFold,
  saveFocusMode,
  saveHandTilt,
  saveHintDetail,
  saveLogTimestamps,
  saveLongPressClear,
  saveLowTimeSec,
  saveNameDensity,
  saveNavIconsOnly,
  saveNotifyDnd,
  saveNotifyInvite,
  savePerfMode,
  saveSfxClaimOn,
  saveSfxDiscardOn,
  saveSfxDrawOn,
  saveSfxTickOn,
  saveSfxUiOn,
  saveSfxWinOn,
  saveShowRating,
  saveSoundCaptions,
  saveTimeFormat,
  saveWallMode,
  saveWinCelebrate,
  saveWindLabelStyle,
  setMasterMute,
  type AriaTileFormat,
  type ColorScheme,
  type HandTilt,
  type HintDetail,
  type NameDensity,
  type ThemePresetId,
  type TimeFormat,
  type WallMode,
  type WindLabelStyle,
} from './leftoverPrefs'
import { loadThemePreset, SITE_PALETTES } from './sitePalettes'

function Switch({
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

function ResetCat({
  section,
}: {
  section: 'board' | 'sound' | 'play' | 'interface' | 'a11y' | 'account'
}) {
  return (
    <button
      type="button"
      className="settings-account__btn"
      onClick={() => {
        if (!confirm('重設呢一分類為預設？頁面會重新載入。')) return
        resetCategoryKeys(section)
        window.location.reload()
      }}
    >
      重設呢一分類
    </button>
  )
}

export function BoardExtras() {
  const [tilt, setTilt] = useState<HandTilt>(loadHandTilt)
  const [wind, setWind] = useState<WindLabelStyle>(loadWindLabelStyle)
  const [fold, setFold] = useState(loadFlowerFold)
  const [wall, setWall] = useState<WallMode>(loadWallMode)
  const [aiLab, setAiLab] = useState(loadAiLabels)
  const [dens, setDens] = useState<NameDensity>(loadNameDensity)

  return (
    <section className="settings-block" aria-label="更多牌桌">
      <p className="settings-block__lead">手牌、門風、牆剩等枱面細節</p>
      <label className="settings-field">
        <span>手牌傾斜</span>
        <select
          value={tilt}
          onChange={(e) => {
            const v = e.target.value as HandTilt
            setTilt(v)
            saveHandTilt(v)
          }}
        >
          <option value="flat">平</option>
          <option value="slight">微傾</option>
          <option value="steep">斜</option>
        </select>
      </label>
      <label className="settings-field">
        <span>門風標示</span>
        <select
          value={wind}
          onChange={(e) => {
            const v = e.target.value as WindLabelStyle
            setWind(v)
            saveWindLabelStyle(v)
          }}
        >
          <option value="full">完整</option>
          <option value="short">簡</option>
          <option value="off">關</option>
        </select>
      </label>
      <label className="settings-field">
        <span>牆剩顯示</span>
        <select
          value={wall}
          onChange={(e) => {
            const v = e.target.value as WallMode
            setWall(v)
            saveWallMode(v)
          }}
        >
          <option value="number">數字</option>
          <option value="bar">進度條</option>
          <option value="off">關</option>
        </select>
      </label>
      <label className="settings-field">
        <span>暱稱密度</span>
        <select
          value={dens}
          onChange={(e) => {
            const v = e.target.value as NameDensity
            setDens(v)
            saveNameDensity(v)
          }}
        >
          <option value="full">全名</option>
          <option value="compact">縮寫</option>
        </select>
      </label>
      <Switch
        title="花牌區摺疊"
        detail="花牌收細，撳開先睇"
        on={fold}
        onToggle={() => {
          const n = !fold
          setFold(n)
          saveFlowerFold(n)
        }}
      />
      <Switch
        title="AI 性格標籤"
        detail="座位旁顯示穩陣／進攻／搏糊"
        on={aiLab}
        onToggle={() => {
          const n = !aiLab
          setAiLab(n)
          saveAiLabels(n)
        }}
      />
      <ResetCat section="board" />
    </section>
  )
}

export function SoundExtras() {
  const [mute, setMute] = useState(() => isMuted())
  const [draw, setDraw] = useState(loadSfxDrawOn)
  const [disc, setDisc] = useState(loadSfxDiscardOn)
  const [claim, setClaim] = useState(loadSfxClaimOn)
  const [win, setWin] = useState(loadSfxWinOn)
  const [tick, setTick] = useState(loadSfxTickOn)
  const [ui, setUi] = useState(loadSfxUiOn)
  const [cap, setCap] = useState(loadSoundCaptions)

  return (
    <section className="settings-block" aria-label="分項聲音">
      <Switch
        title="總靜音"
        detail="摸打聲同報牌一齊關"
        on={mute}
        onToggle={() => {
          const n = !mute
          setMute(n)
          setMasterMute(n)
        }}
      />
      <Switch title="摸牌聲" detail="" on={draw} onToggle={() => { const n = !draw; setDraw(n); saveSfxDrawOn(n) }} />
      <Switch title="打牌聲" detail="" on={disc} onToggle={() => { const n = !disc; setDisc(n); saveSfxDiscardOn(n) }} />
      <Switch title="鳴牌聲" detail="碰／上／槓" on={claim} onToggle={() => { const n = !claim; setClaim(n); saveSfxClaimOn(n) }} />
      <Switch title="食糊聲" detail="" on={win} onToggle={() => { const n = !win; setWin(n); saveSfxWinOn(n) }} />
      <Switch title="倒數滴答" detail="低時警告 beep" on={tick} onToggle={() => { const n = !tick; setTick(n); saveSfxTickOn(n) }} />
      <Switch title="介面撳掣聲" detail="預留" on={ui} onToggle={() => { const n = !ui; setUi(n); saveSfxUiOn(n) }} />
      <Switch
        title="音效字幕"
        detail="牌局顯示文字代替聲"
        on={cap}
        onToggle={() => {
          const n = !cap
          setCap(n)
          saveSoundCaptions(n)
        }}
      />
      <ResetCat section="sound" />
    </section>
  )
}

export function PlayExtras() {
  const [low, setLow] = useState(loadLowTimeSec)
  const [hint, setHint] = useState<HintDetail>(loadHintDetail)
  const [fill, setFill] = useState(loadAutoFillAi)
  const [focus, setFocus] = useState(loadFocusMode)
  const [logT, setLogT] = useState(loadLogTimestamps)
  const [cele, setCele] = useState(loadWinCelebrate)
  const [hold, setHold] = useState(loadLongPressClear)
  const [cBase, setCBase] = useState(loadCalcBase)
  const [cFan, setCFan] = useState(loadCalcFanValue)
  const [cWin, setCWin] = useState(loadCalcWinType)

  return (
    <section className="settings-block" aria-label="更多打牌">
      <label className="settings-field">
        <span>低時門檻（秒）</span>
        <select
          value={low}
          onChange={(e) => {
            const v = Number(e.target.value)
            setLow(v)
            saveLowTimeSec(v)
          }}
        >
          <option value={3}>3</option>
          <option value={5}>5</option>
          <option value={8}>8</option>
          <option value={10}>10</option>
        </select>
      </label>
      <label className="settings-field">
        <span>練習提示詳細度</span>
        <select
          value={hint}
          onChange={(e) => {
            const v = e.target.value as HintDetail
            setHint(v)
            saveHintDetail(v)
          }}
        >
          <option value="low">少</option>
          <option value="med">中</option>
          <option value="high">多</option>
        </select>
      </label>
      <label className="settings-field">
        <span>計番機預設底</span>
        <select
          value={cBase}
          onChange={(e) => {
            const v = Number(e.target.value)
            setCBase(v)
            saveCalcBase(v)
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}番
            </option>
          ))}
        </select>
      </label>
      <label className="settings-field">
        <span>計番機 $/番</span>
        <select
          value={cFan}
          onChange={(e) => {
            const v = Number(e.target.value)
            setCFan(v)
            saveCalcFanValue(v)
          }}
        >
          {[1, 2, 5, 10].map((n) => (
            <option key={n} value={n}>
              ${n}
            </option>
          ))}
        </select>
      </label>
      <label className="settings-field">
        <span>計番機預設糊型</span>
        <select
          value={cWin}
          onChange={(e) => {
            const v = e.target.value as 'self' | 'discard'
            setCWin(v)
            saveCalcWinType(v)
          }}
        >
          <option value="self">自摸</option>
          <option value="discard">出衝</option>
        </select>
      </label>
      <Switch title="空位自動補 AI" detail="開房時空位當 AI" on={fill} onToggle={() => { const n = !fill; setFill(n); saveAutoFillAi(n) }} />
      <Switch title="專注模式" detail="打牌時藏側欄" on={focus} onToggle={() => { const n = !focus; setFocus(n); saveFocusMode(n) }} />
      <Switch title="操作紀錄時間戳" detail="" on={logT} onToggle={() => { const n = !logT; setLogT(n); saveLogTimestamps(n) }} />
      <p className="fan-page__note">
        牌譜重溫：個人 → 檔案 → 對局檔案（唔會局終即彈）。
      </p>
      <Switch title="勝利慶祝" detail="你食糊時結算特效" on={cele} onToggle={() => { const n = !cele; setCele(n); saveWinCelebrate(n) }} />
      <Switch
        title="長按取消揀牌"
        detail="手牌長按約半秒清揀"
        on={hold}
        onToggle={() => {
          const n = !hold
          setHold(n)
          saveLongPressClear(n)
        }}
      />
      <ResetCat section="play" />
    </section>
  )
}

export function InterfaceExtras() {
  const [palette, setPalette] = useState<ThemePresetId>(loadThemePreset)
  const [scheme, setScheme] = useState<ColorScheme>(loadColorScheme)
  const [tf, setTf] = useState<TimeFormat>(loadTimeFormat)
  const [perf, setPerf] = useState(loadPerfMode)
  const [nav, setNav] = useState(loadNavIconsOnly)
  const [rate, setRate] = useState(loadShowRating)

  return (
    <section className="settings-block" aria-label="網站配色">
      <p className="settings-block__lead">
        一鍵換成個網站外殼（大廳、側欄、設定、工具頁、掣）。唔改牌桌絨布／牌面。
      </p>
      <div
        className="settings-choice-grid settings-choice-grid--palette"
        role="radiogroup"
        aria-label="網站配色"
      >
        {SITE_PALETTES.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={palette === p.id}
            className={`settings-choice settings-choice--palette${
              palette === p.id ? ' is-selected' : ''
            }`}
            onClick={() => {
              setPalette(p.id)
              applyThemePreset(p.id)
            }}
          >
            <span className="settings-choice__swatch" aria-hidden>
              <i style={{ background: p.shell.bg }} />
              <i style={{ background: p.shell.panel }} />
              <i style={{ background: p.shell.accent }} />
            </span>
            <strong>{p.name}</strong>
            <em>{p.note}</em>
          </button>
        ))}
      </div>
      <label className="settings-field">
        <span>色彩模式</span>
        <select
          value={scheme}
          onChange={(e) => {
            const v = e.target.value as ColorScheme
            setScheme(v)
            saveColorScheme(v)
          }}
        >
          <option value="dark">深色</option>
          <option value="light">淺色</option>
          <option value="system">跟系統</option>
        </select>
      </label>
      <label className="settings-field">
        <span>時間格式</span>
        <select
          value={tf}
          onChange={(e) => {
            const v = e.target.value as TimeFormat
            setTf(v)
            saveTimeFormat(v)
          }}
        >
          <option value="24">24 小時</option>
          <option value="12">12 小時</option>
        </select>
      </label>
      <Switch title="效能模式" detail="減陰影同花巧" on={perf} onToggle={() => { const n = !perf; setPerf(n); savePerfMode(n) }} />
      <Switch title="側欄只顯示圖示" detail="大廳／工具導航" on={nav} onToggle={() => { const n = !nav; setNav(n); saveNavIconsOnly(n) }} />
      <Switch title="局中顯示戰績" detail="頂欄勝／局" on={rate} onToggle={() => { const n = !rate; setRate(n); saveShowRating(n) }} />
    </section>
  )
}

export function AccountExtras() {
  const [dnd, setDnd] = useState(loadNotifyDnd)
  const [from, setFrom] = useState(loadDndFrom)
  const [to, setTo] = useState(loadDndTo)
  const [inv, setInv] = useState(loadNotifyInvite)

  return (
    <section className="settings-block" aria-label="通知細項">
      <Switch title="開房／挑戰邀請通知" detail="偏好記低；推送稍後" on={inv} onToggle={() => { const n = !inv; setInv(n); saveNotifyInvite(n) }} />
      <Switch title="勿擾時段" detail="呢段時間唔跳站內提示" on={dnd} onToggle={() => { const n = !dnd; setDnd(n); saveNotifyDnd(n) }} />
      <label className="settings-field">
        <span>勿擾由</span>
        <input type="time" value={from} onChange={(e) => { setFrom(e.target.value); saveDndFrom(e.target.value) }} />
      </label>
      <label className="settings-field">
        <span>勿擾至</span>
        <input type="time" value={to} onChange={(e) => { setTo(e.target.value); saveDndTo(e.target.value) }} />
      </label>
      <ResetCat section="account" />
    </section>
  )
}

export function A11yExtras() {
  const [fmt, setFmt] = useState<AriaTileFormat>(loadAriaTileFormat)

  return (
    <section className="settings-block" aria-label="朗讀">
      <label className="settings-field">
        <span>螢幕閱讀器牌名</span>
        <select
          value={fmt}
          onChange={(e) => {
            const v = e.target.value as AriaTileFormat
            setFmt(v)
            saveAriaTileFormat(v)
          }}
        >
          <option value="label">中文牌名（一萬）</option>
          <option value="suit-rank">門＋點（man-5）</option>
        </select>
      </label>
      <ResetCat section="a11y" />
    </section>
  )
}
