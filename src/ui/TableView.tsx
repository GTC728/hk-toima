import {
  getWaitingTiles,
  matchRoundLabel,
  type Action,
  type PrivateGameView,
  type PublicPlayerView,
  type Seat,
  type TileId,
} from '../engine'
import { ActionBar } from './ActionBar'
import { handForDisplay } from './handDisplay'
import { FaceDownHand, MeldGroup, Tile, TileRow } from './tiles'
import { useFitScale } from './useFitScale'

const WIND = ['東', '南', '西', '北'] as const

type Slot = 'bottom' | 'right' | 'top' | 'left'

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
}

function SeatMeta({
  seat,
  p,
  isHuman,
}: {
  seat: Seat
  p: PublicPlayerView
  isHuman: boolean
}) {
  return (
    <div className="table__seat-meta">
      <strong>
        {WIND[seat]} · {p.name}
      </strong>
      <span className="table__seat-tags">
        {p.isDealer && <em>莊</em>}
        {p.ding && <em className="tag-ding">叮</em>}
        {!isHuman && <em className="tag-ai">AI</em>}
        <em className="tag-cash">${p.cash}</em>
      </span>
    </div>
  )
}

function MeldsBlock({
  p,
  slot,
  isYou,
  selectedTile,
  onSelectTile,
}: {
  p: PublicPlayerView
  slot: Slot
  isYou: boolean
  selectedTile: TileId | null
  onSelectTile: (t: TileId | null) => void
}) {
  if (p.melds.length === 0 && p.flowers.length === 0) return null
  const side = slot === 'left' || slot === 'right'
  const face = side ? slot : undefined
  return (
    <div
      className={
        side
          ? 'table__melds table__melds--side'
          : `table__melds table__orient table__orient--${slot}`
      }
    >
      <MeldGroup
        melds={p.melds}
        size="sm"
        face={face}
        selected={selectedTile}
        onSelect={
          isYou
            ? (t) => onSelectTile(selectedTile === t ? null : t)
            : undefined
        }
      />
      {p.flowers.length > 0 && (
        <TileRow
          tiles={p.flowers}
          size="sm"
          layout={side ? 'col' : 'row'}
          face={face}
          className="table__flowers"
          selected={selectedTile}
          selectable={isYou}
          onSelect={
            isYou
              ? (t) => onSelectTile(selectedTile === t ? null : t)
              : undefined
          }
        />
      )}
    </div>
  )
}

function RiverStrip({
  p,
  slot,
  selectedTile,
  isFocus,
}: {
  p: PublicPlayerView
  slot: Slot
  selectedTile: TileId | null
  isFocus: boolean
}) {
  const side = slot === 'left' || slot === 'right'
  // 牌桌牌統一 sm，唔再獨立 scale（避免同副露／對手手牌大細唔同）
  return (
    <div
      className={`table__river-strip table__river-strip--${slot}${
        isFocus ? ' is-focus' : ''
      }`}
      aria-label={`${WIND[p.seat]}牌河`}
    >
      <div
        className={
          side
            ? 'table__river-inner'
            : `table__orient table__orient--${slot}`
        }
      >
        {p.discards.length === 0 ? (
          <span className="table__river-empty">—</span>
        ) : (
          <TileRow
            tiles={p.discards}
            size="sm"
            layout={side ? 'col' : 'row'}
            face={side ? slot : undefined}
            className={`table__river-tiles${
              side ? ' table__river-tiles--side' : ''
            }`}
            selected={selectedTile}
          />
        )}
      </div>
    </div>
  )
}

function SideSeat({
  slot,
  seat,
  p,
  isHuman,
  isTurn,
  selectedTile,
  onSelectTile,
}: {
  slot: 'left' | 'right'
  seat: Seat
  p: PublicPlayerView
  isHuman: boolean
  isTurn: boolean
  selectedTile: TileId | null
  onSelectTile: (t: TileId | null) => void
}) {
  return (
    <section
      className={`table__edge table__edge--${slot}${
        isTurn ? ' is-turn' : ''
      }`}
    >
      <SeatMeta seat={seat} p={p} isHuman={isHuman} />
      <div className="table__side-fit">
        <div
          className={`table__side-stack${
            slot === 'right' ? ' table__side-stack--right' : ''
          }`}
        >
          {slot === 'left' ? (
            <>
              <div className="table__side-hand">
                <FaceDownHand
                  count={p.handCount}
                  size="sm"
                  layout="col"
                  face="left"
                />
              </div>
              <MeldsBlock
                p={p}
                slot="left"
                isYou={false}
                selectedTile={selectedTile}
                onSelectTile={onSelectTile}
              />
            </>
          ) : (
            <>
              <MeldsBlock
                p={p}
                slot="right"
                isYou={false}
                selectedTile={selectedTile}
                onSelectTile={onSelectTile}
              />
              <div className="table__side-hand">
                <FaceDownHand
                  count={p.handCount}
                  size="sm"
                  layout="col"
                  face="right"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
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
}: TableViewProps) {
  const seats = relativeSeats(view.you)
  const pending = view.pendingDiscard
  const youPlayer = view.players[view.you]!
  const waiting = getWaitingTiles(view.hand, youPlayer.melds)
  const roundLabel = matchRoundLabel(view.windRound, view.dealer)
  const myHand = handForDisplay(view.hand, view.justDrawn)

  const top = bySlot(seats, 'top')
  const left = bySlot(seats, 'left')
  const right = bySlot(seats, 'right')
  const bottom = bySlot(seats, 'bottom')

  const handFit = useFitScale([myHand.length, selectedTile])

  function isTurn(seat: Seat) {
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

  return (
    <div className="table">
      <header className="table__hud">
        <div className="table__brand-mini">
          <span>香港台麻</span>
          <em>HK ToiMA</em>
        </div>
        <div className="table__stats">
          <span>{roundLabel}</span>
          <span>第 {view.round} 局</span>
          <span>牆 {view.wallRemaining}</span>
          <span>
            莊 {WIND[view.dealer]}
            {view.consecutiveWins > 0 ? ` · 連${view.consecutiveWins}` : ''}
          </span>
          <span>骰 {view.dice.join('·')}</span>
          <span>
            底 {view.rules.base}番 · ${view.rules.fanValue}/番
          </span>
          {remainSec != null && (
            <span
              className={`table__timer${remainSec <= 5 ? ' is-urgent' : ''}`}
              role="timer"
              aria-live="polite"
            >
              {remainSec}s
            </span>
          )}
        </div>
      </header>

      <div className="table__felt">
        <section
          className={`table__edge table__edge--top${
            isTurn(top) ? ' is-turn' : ''
          }`}
        >
          <SeatMeta
            seat={top}
            p={pTop}
            isHuman={isHuman[top]!}
          />
          <div className="table__orient table__orient--top">
            <FaceDownHand count={pTop.handCount} size="sm" />
          </div>
          <MeldsBlock
            p={pTop}
            slot="top"
            isYou={false}
            selectedTile={selectedTile}
            onSelectTile={onSelectTile}
          />
        </section>

        <SideSeat
          slot="left"
          seat={left}
          p={pLeft}
          isHuman={isHuman[left]!}
          isTurn={isTurn(left)}
          selectedTile={selectedTile}
          onSelectTile={onSelectTile}
        />

        <div className="table__mouth" aria-label="牌河與中控">
          <RiverStrip
            p={pTop}
            slot="top"
            selectedTile={selectedTile}
            isFocus={pending?.seat === top}
          />
          <RiverStrip
            p={pLeft}
            slot="left"
            selectedTile={selectedTile}
            isFocus={pending?.seat === left}
          />
          <div className="table__console">
            <p className="table__console-round">{roundLabel}</p>
            <p>
              牆 {view.wallRemaining}
              {view.consecutiveWins > 0
                ? ` · 連${view.consecutiveWins}`
                : ''}
            </p>
            <p>
              底 {view.rules.base}番 · ${view.rules.fanValue}
            </p>
            {remainSec != null && (
              <p
                className={`table__console-timer${
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
          />
          <RiverStrip
            p={pBottom}
            slot="bottom"
            selectedTile={selectedTile}
            isFocus={pending?.seat === bottom}
          />
        </div>

        <SideSeat
          slot="right"
          seat={right}
          p={pRight}
          isHuman={isHuman[right]!}
          isTurn={isTurn(right)}
          selectedTile={selectedTile}
          onSelectTile={onSelectTile}
        />

        <section
          className={`table__edge table__edge--bottom${
            isTurn(bottom) ? ' is-turn' : ''
          }`}
        >
          <SeatMeta
            seat={bottom}
            p={pBottom}
            isHuman={isHuman[bottom]!}
          />
          <MeldsBlock
            p={pBottom}
            slot="bottom"
            isYou
            selectedTile={selectedTile}
            onSelectTile={onSelectTile}
          />
          <ActionBar
            legal={view.legalActions}
            selectedTile={selectedTile}
            declareDingWithDiscard={declareDing}
            onToggleDing={onToggleDing}
            onAction={onAction}
            pendingTile={pending?.tile}
            waitingTiles={waiting}
            mustDiscard={view.mustDiscard}
          />
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
                selected={selectedTile}
                justDrawn={view.justDrawn}
                hinted={hintDiscardTile}
                selectable
                onSelect={(t) => onSelectTile(t)}
                onDoubleSelect={(t) => {
                  const ok = view.legalActions.some(
                    (a) => a.type === 'discard' && a.tile === t,
                  )
                  if (!ok) return
                  onAction({
                    type: 'discard',
                    tile: t,
                    declareDing: declareDing || undefined,
                  })
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
