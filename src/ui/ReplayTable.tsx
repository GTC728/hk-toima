import {
  matchRoundLabel,
  type PublicGameView,
  type PublicPlayerView,
  type Seat,
  type TileId,
} from '../engine'
import { MeldsBlock, SeatMeta, WIND, type Slot } from './table/parts'
import { RiverStrip } from './table/RiverStrip'
import { Tile, TileRow } from './tiles'
import type { ReplayFrame } from './replaySource'

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

function enrichPlayer(
  pub: PublicPlayerView,
  hand: TileId[],
  melds: PublicPlayerView['melds'],
  name: string,
): PublicPlayerView {
  return {
    ...pub,
    name,
    handCount: hand.length,
    melds,
  }
}

function SideOpenHand({
  tiles,
  face,
}: {
  tiles: TileId[]
  face: 'left' | 'right'
}) {
  return (
    <div
      className={`replay-table__side-hand replay-table__side-hand--${face}`}
      aria-label="手牌"
    >
      {tiles.map((t, i) => (
        <Tile key={`${t}-${i}`} id={t} size="sm" />
      ))}
    </div>
  )
}

interface ReplayTableProps {
  frame: ReplayFrame
  names: string[]
  /** 視角：通常係玩家席，放喺下 */
  you?: Seat
}

/** 重溫用牌桌：四家同時、手牌攤開 */
export function ReplayTable({
  frame,
  names,
  you = 0,
}: ReplayTableProps) {
  const view: PublicGameView = frame.public
  const seats = relativeSeats(you)
  const top = bySlot(seats, 'top')
  const left = bySlot(seats, 'left')
  const right = bySlot(seats, 'right')
  const bottom = bySlot(seats, 'bottom')
  const pending = view.pendingDiscard
  const roundLabel = matchRoundLabel(view.windRound, view.dealer)

  const p = (seat: Seat) =>
    enrichPlayer(
      view.players[seat]!,
      frame.hands[seat] ?? [],
      frame.melds[seat] ?? view.players[seat]!.melds,
      names[seat] ?? view.players[seat]!.name,
    )

  const pTop = p(top)
  const pLeft = p(left)
  const pRight = p(right)
  const pBottom = p(bottom)

  function isTurn(seat: Seat) {
    return (
      (view.phase === 'playing' && view.currentSeat === seat) ||
      (view.phase === 'claim_window' &&
        (pending?.awaiting.includes(seat) ?? false))
    )
  }

  const noop = () => {}

  return (
    <div className="table replay-table" aria-label="重溫牌桌">
      <header className="table__hud">
        <div className="table__brand-mini">
          <span>重溫</span>
          <em>牌譜</em>
        </div>
        <div className="table__stats">
          <span>{roundLabel}</span>
          <span>第 {view.round} 局</span>
          <span>牆 {view.wallRemaining}</span>
          <span>
            莊 {WIND[view.dealer]}
            {view.consecutiveWins > 0 ? ` · 連${view.consecutiveWins}` : ''}
          </span>
        </div>
      </header>

      <div className="table__felt">
        <section
          className={`table__edge table__edge--top${
            isTurn(top) ? ' is-turn' : ''
          }`}
        >
          <SeatMeta seat={top} p={pTop} isHuman={false} />
          <div className="table__orient table__orient--top">
            <TileRow tiles={frame.hands[top] ?? []} size="sm" />
          </div>
          <MeldsBlock
            p={pTop}
            slot="top"
            isYou={false}
            selectedTile={null}
            onSelectTile={noop}
          />
        </section>

        <section
          className={`table__edge table__edge--left${
            isTurn(left) ? ' is-turn' : ''
          }`}
        >
          <SeatMeta seat={left} p={pLeft} isHuman={false} />
          <div className="table__side-fit">
            <div className="table__side-stack">
              <div className="table__side-hand">
                <SideOpenHand tiles={frame.hands[left] ?? []} face="left" />
              </div>
              <MeldsBlock
                p={pLeft}
                slot="left"
                isYou={false}
                selectedTile={null}
                onSelectTile={noop}
              />
            </div>
          </div>
        </section>

        <div className="table__mouth" aria-label="牌河">
          <RiverStrip
            p={pTop}
            slot="top"
            selectedTile={null}
            isFocus={pending?.seat === top}
            pendingTile={pending?.tile}
          />
          <RiverStrip
            p={pLeft}
            slot="left"
            selectedTile={null}
            isFocus={pending?.seat === left}
            pendingTile={pending?.tile}
          />
          <div className="table__console">
            <p className="table__console-round">{roundLabel}</p>
            <p className="table__console-wall">{view.wallRemaining}</p>
            <p className="table__console-label">
              {view.phase === 'claim_window'
                ? '鳴牌'
                : view.phase === 'round_over' || view.phase === 'match_over'
                  ? '結算'
                  : '剩餘'}
            </p>
            {pending && (
              <div className="table__console-focus">
                <Tile id={pending.tile} size="sm" className="tile--focus" />
                <span>{WIND[pending.seat]}打出</span>
              </div>
            )}
            {frame.note && (
              <p className="replay-table__step">{frame.note}</p>
            )}
          </div>
          <RiverStrip
            p={pRight}
            slot="right"
            selectedTile={null}
            isFocus={pending?.seat === right}
            pendingTile={pending?.tile}
          />
          <RiverStrip
            p={pBottom}
            slot="bottom"
            selectedTile={null}
            isFocus={pending?.seat === bottom}
            pendingTile={pending?.tile}
          />
        </div>

        <section
          className={`table__edge table__edge--right${
            isTurn(right) ? ' is-turn' : ''
          }`}
        >
          <SeatMeta seat={right} p={pRight} isHuman={false} />
          <div className="table__side-fit">
            <div className="table__side-stack table__side-stack--right">
              <MeldsBlock
                p={pRight}
                slot="right"
                isYou={false}
                selectedTile={null}
                onSelectTile={noop}
              />
              <div className="table__side-hand">
                <SideOpenHand tiles={frame.hands[right] ?? []} face="right" />
              </div>
            </div>
          </div>
        </section>

        <section
          className={`table__edge table__edge--bottom${
            isTurn(bottom) ? ' is-turn' : ''
          }`}
        >
          <SeatMeta seat={bottom} p={pBottom} isHuman />
          <MeldsBlock
            p={pBottom}
            slot="bottom"
            isYou
            selectedTile={null}
            onSelectTile={noop}
          />
          <div className="table__hand-fit">
            <div className="table__fit-inner">
              <TileRow tiles={frame.hands[bottom] ?? []} size="md" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
