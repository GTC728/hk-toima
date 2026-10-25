import {
  getWaitingTiles,
  matchRoundLabel,
  type Action,
  type PrivateGameView,
  type Seat,
  type TileId,
} from '../engine'
import { ActionBar } from './ActionBar'
import { ARRANGE_MODES, type ArrangeMode } from './handArrange'
import { useHandArrange } from './useHandArrange'
import { MeldsBlock, SeatMeta, WIND, type Slot } from './table/parts'
import { RiverStrip } from './table/RiverStrip'
import { SideSeat } from './table/SideSeat'
import { FaceDownHand, Tile, TileRow } from './tiles'
import { loadDoubleClickDiscard, loadKeyboardShortcuts } from './extraPrefs'
import {
  loadLowTimeSec,
  loadShowRating,
  loadWallMode,
} from './leftoverPrefs'
import { loadCareerStats } from './stats'
import { gateAction } from './gateAction'
import { useFitScale } from './useFitScale'
import { useTableKeyboard } from './useTableKeyboard'

function relativeSeats(you: Seat): { seat: Seat; slot: Slot }[] {
  const order: Slot[] = ['bottom', 'right', 'top', 'left']
  return order.map((slot, i) => ({
    seat: ((you + i) % 4) as Seat,
    slot,
  }))
}

function bySlot(
  seats: { seat: Seat; slot: Slot }[],
  slot: Slot,
): Seat {
  return seats.find((s) => s.slot === slot)!.seat
}

interface TableViewProps {
  view: PrivateGameView
  isHuman: boolean[]
  selectedTile: TileId | null
  declareDing: boolean
  onSelectTile: (tile: TileId | null) => void
  onToggleDing: () => void
  onAction: (action: Action) => void
  hintDiscardTile?: TileId | null
  remainSec?: number | null
  /** AI 座位名旁嘅性格；真人位留空 */
  personaLabels?: (string | null)[]
  /** 開桌頁的樣子：同一塊檯，但未開局 */
  staticTable?: boolean
  /** 重溫：四家攤開手牌（用牌桌系統） */
  reviewHands?: TileId[][] | null
}

export function TableView({
  view,
  isHuman,
  selectedTile,
  declareDing,
  onSelectTile,
  onToggleDing,
  onAction,
  hintDiscardTile = null,
  remainSec = null,
  personaLabels,
  staticTable = false,
  reviewHands = null,
}: TableViewProps) {
  const seats = relativeSeats(view.you)
  const pending = view.pendingDiscard
  const youPlayer = view.players[view.you]!
  const reviewing = reviewHands != null
  const frozen = staticTable || reviewing
  const waiting = frozen
    ? []
    : getWaitingTiles(view.hand, youPlayer.melds)
  const roundLabel = matchRoundLabel(view.windRound, view.dealer)
  const arrange = useHandArrange(view)
  const myHand = reviewing
    ? (reviewHands[view.you] ?? arrange.tiles)
    : arrange.tiles

  const top = bySlot(seats, 'top')
  const left = bySlot(seats, 'left')
  const right = bySlot(seats, 'right')
  const bottom = bySlot(seats, 'bottom')

  const handFit = useFitScale([myHand.length, selectedTile])

  function sendAction(action: Parameters<typeof onAction>[0]) {
    gateAction(action, onAction)
  }

  useTableKeyboard({
    enabled: !frozen && loadKeyboardShortcuts(),
    selectedTile,
    legal: view.legalActions,
    declareDing,
    onSelectTile,
    onToggleDing,
    onAction: sendAction,
  })

  function isTurn(seat: Seat) {
    if (frozen) {
      return (
        reviewing &&
        ((view.phase === 'playing' && view.currentSeat === seat) ||
          (view.phase === 'claim_window' &&
            (pending?.awaiting.includes(seat) ?? false)))
      )
    }
    return (
      (view.phase === 'playing' && view.currentSeat === seat) ||
      (view.phase === 'claim_window' &&
        (pending?.awaiting.includes(seat) ?? false))
    )
  }

  const pTop = view.players[top]!
  const pLeft = view.players[left]!
  const pRight = view.players[right]!
  const pBottom = view.players[bottom]!
  const wallMode = loadWallMode()
  const lowAt = loadLowTimeSec()
  const rating =
    loadShowRating() && !frozen
      ? loadCareerStats().rounds > 0
        ? `戰 ${loadCareerStats().wins}/${loadCareerStats().rounds}`
        : null
      : null

  const showWall = !staticTable || reviewing

  return (
    <div className={`table${reviewing ? ' table--review' : ''}`}>
      <header className="table__hud">
        <div className="table__brand-mini">
          <span>{reviewing ? '重溫' : '香港台麻'}</span>
          <em>HK ToiMA</em>
        </div>
        <div className="table__stats">
          <span>{roundLabel}</span>
          <span>第 {view.round} 局</span>
          {wallMode !== 'off' && (
            <span className="table__wall-stat">
              {wallMode === 'bar' ? (
                <span
                  className="table__wall-bar"
                  title={`牆 ${view.wallRemaining}`}
                >
                  <i
                    style={{
                      width: `${Math.min(100, (view.wallRemaining / 144) * 100)}%`,
                    }}
                  />
                </span>
              ) : (
                <>牆 {showWall ? view.wallRemaining : '—'}</>
              )}
            </span>
          )}
          <span>
            莊 {WIND[view.dealer]}
            {!frozen && view.consecutiveWins > 0
              ? ` · 連${view.consecutiveWins}`
              : reviewing && view.consecutiveWins > 0
                ? ` · 連${view.consecutiveWins}`
                : ''}
          </span>
          {(!frozen || reviewing) && (
            <span className="table__dice-stat">骰 {view.dice.join('·')}</span>
          )}
          <span>
            底 {view.rules.base}番 · ${view.rules.fanValue}/番
          </span>
          {rating && <span className="table__rating-stat">{rating}</span>}
          {!frozen && remainSec != null && (
            <span
              className={`table__timer table__timer-stat${remainSec <= lowAt ? ' is-urgent' : ''}`}
              role="timer"
              aria-live="polite"
            >
              {remainSec}s
            </span>
          )}
        </div>
      </header>

      <div className="table__felt">
        {!frozen && <label className="table__arrange">
          排牌
          <select
            aria-label="排牌方式"
            title={
              arrange.manual
                ? '拖過牌，再揀一種排法就會重新排'
                : ARRANGE_MODES.find((m) => m.id === arrange.mode)?.hint
            }
            value={arrange.manual ? 'manual' : arrange.mode}
            onChange={(e) => {
              const next = e.target.value
              if (next === 'manual') return
              arrange.choose(next as ArrangeMode)
            }}
          >
            {arrange.manual ? <option value="manual">手動</option> : null}
            {ARRANGE_MODES.map((m) => (
              <option key={m.id} value={m.id} title={m.hint}>
                {m.label}
              </option>
            ))}
          </select>
        </label>}
        <section
          className={`table__edge table__edge--top${
            isTurn(top) ? ' is-turn' : ''
          }`}
        >
          <SeatMeta
            seat={top}
            p={
              reviewing
                ? { ...pTop, handCount: reviewHands[top]?.length ?? pTop.handCount }
                : pTop
            }
            isHuman={isHuman[top]!}
            personaLabel={personaLabels?.[top]}
          />
          <div className="table__orient table__orient--top">
            {reviewing ? (
              <TileRow tiles={reviewHands[top] ?? []} size="sm" />
            ) : (
              <FaceDownHand count={pTop.handCount} size="sm" />
            )}
          </div>
          <MeldsBlock
            p={
              reviewing
                ? { ...pTop, melds: view.players[top]!.melds }
                : pTop
            }
            slot="top"
            isYou={false}
            selectedTile={selectedTile}
            onSelectTile={onSelectTile}
          />
        </section>

        <SideSeat
          slot="left"
          seat={left}
          p={
            reviewing
              ? { ...pLeft, handCount: reviewHands[left]?.length ?? pLeft.handCount }
              : pLeft
          }
          isHuman={isHuman[left]!}
          isTurn={isTurn(left)}
          selectedTile={selectedTile}
          onSelectTile={onSelectTile}
          personaLabel={personaLabels?.[left]}
          openHand={reviewing ? reviewHands[left] : null}
        />

        <div className="table__mouth" aria-label="牌河與中控">
          <RiverStrip
            p={pTop}
            slot="top"
            selectedTile={selectedTile}
            isFocus={pending?.seat === top}
            pendingTile={pending?.tile}
          />
          <RiverStrip
            p={pLeft}
            slot="left"
            selectedTile={selectedTile}
            isFocus={pending?.seat === left}
            pendingTile={pending?.tile}
          />
          <div className="table__console">
            <p className="table__console-round">{roundLabel}</p>
            <p className="table__console-wall table__wall-stat">
              {staticTable && !reviewing ? '—' : view.wallRemaining}
            </p>
            <p className="table__console-label table__wall-stat">
              {staticTable && !reviewing
                ? '未開局'
                : reviewing
                  ? view.phase === 'claim_window'
                    ? '鳴牌'
                    : view.phase === 'round_over' || view.phase === 'match_over'
                      ? '結算'
                      : '剩餘'
                  : '剩餘'}
              {!frozen && view.consecutiveWins > 0 ? ` · 連${view.consecutiveWins}` : ''}
            </p>
            <p className="table__console-label">
              底 {view.rules.base}番 · ${view.rules.fanValue}
            </p>
            {!staticTable && remainSec != null && (
              <p
                className={`table__console-timer table__timer-stat${
                  remainSec <= 5 ? ' is-urgent' : ''
                }`}
              >
                {remainSec}s
              </p>
            )}
            {pending && (
              <div className="table__console-focus">
                <Tile
                  id={pending.tile}
                  size="sm"
                  className="tile--focus"
                  selected={
                    selectedTile != null && selectedTile === pending.tile
                  }
                />
                <span>{WIND[pending.seat]}打出</span>
              </div>
            )}
          </div>
          <RiverStrip
            p={pRight}
            slot="right"
            selectedTile={selectedTile}
            isFocus={pending?.seat === right}
            pendingTile={pending?.tile}
          />
          <RiverStrip
            p={pBottom}
            slot="bottom"
            selectedTile={selectedTile}
            isFocus={pending?.seat === bottom}
            pendingTile={pending?.tile}
          />
        </div>

        <SideSeat
          slot="right"
          seat={right}
          p={
            reviewing
              ? {
                  ...pRight,
                  handCount: reviewHands[right]?.length ?? pRight.handCount,
                }
              : pRight
          }
          isHuman={isHuman[right]!}
          isTurn={isTurn(right)}
          selectedTile={selectedTile}
          onSelectTile={onSelectTile}
          personaLabel={personaLabels?.[right]}
          openHand={reviewing ? reviewHands[right] : null}
        />

        <section
          className={`table__edge table__edge--bottom${
            isTurn(bottom) ? ' is-turn' : ''
          }`}
        >
          <SeatMeta
            seat={bottom}
            p={
              reviewing
                ? {
                    ...pBottom,
                    handCount: reviewHands[bottom]?.length ?? pBottom.handCount,
                  }
                : pBottom
            }
            isHuman={isHuman[bottom]!}
            personaLabel={personaLabels?.[bottom]}
          />
          <MeldsBlock
            p={pBottom}
            slot="bottom"
            isYou
            selectedTile={selectedTile}
            onSelectTile={onSelectTile}
          />
          {!frozen && <ActionBar
            legal={view.legalActions}
            selectedTile={selectedTile}
            declareDingWithDiscard={declareDing}
            onToggleDing={onToggleDing}
            onAction={sendAction}
            pendingTile={pending?.tile}
            waitingTiles={waiting}
            mustDiscard={view.mustDiscard}
          />}
          <div className="table__hand-fit" ref={handFit.outerRef}>
            <div
              className="table__fit-inner"
              ref={handFit.innerRef}
              style={{
                transform: `scale(${handFit.scale})`,
                transformOrigin: 'center bottom',
              }}
            >
              <TileRow
                tiles={myHand}
                size="lg"
                selected={frozen ? null : selectedTile}
                justDrawn={frozen ? null : view.justDrawn}
                hinted={frozen ? null : hintDiscardTile}
                selectable={!frozen}
                onReorder={frozen ? undefined : arrange.reorder}
                onSelect={frozen ? undefined : (t) => onSelectTile(t)}
                onClearSelect={
                  frozen ? undefined : () => onSelectTile(null)
                }
                onDoubleSelect={
                  frozen || !loadDoubleClickDiscard()
                    ? undefined
                    : (t) => {
                        const ok = view.legalActions.some(
                          (a) => a.type === 'discard' && a.tile === t,
                        )
                        if (!ok) return
                        sendAction({
                          type: 'discard',
                          tile: t,
                          declareDing: declareDing || undefined,
                        })
                      }
                }
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
