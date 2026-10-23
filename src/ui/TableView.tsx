import {
  getWaitingTiles,
  matchRoundLabel,
  type Action,
  type PrivateGameView,
  type Seat,
  type TileId,
} from '../engine'
import { ActionBar } from './ActionBar'
import { FaceDownHand, MeldGroup, Tile, TileRow } from './tiles'

const WIND = ['東', '南', '西', '北'] as const

function relativeSeats(you: Seat): { seat: Seat; slot: 'bottom' | 'right' | 'top' | 'left' }[] {
  const order: Array<'bottom' | 'right' | 'top' | 'left'> = [
    'bottom',
    'right',
    'top',
    'left',
  ]
  return order.map((slot, i) => ({
    seat: ((you + i) % 4) as Seat,
    slot,
  }))
}

interface TableViewProps {
  view: PrivateGameView
  isHuman: boolean[]
  selectedTile: TileId | null
  declareDing: boolean
  onSelectTile: (tile: TileId | null) => void
  onToggleDing: () => void
  onAction: (action: Action) => void
  /** 練習模式建議棄牌；網上應永遠唔傳／null */
  hintDiscardTile?: TileId | null
  /** Seconds left on current turn / claim window; omit when idle */
  remainSec?: number | null
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
        {seats.map(({ seat, slot }) => {
          const p = view.players[seat]!
          const isYou = seat === view.you
          const isTurn =
            (view.phase === 'playing' && view.currentSeat === seat) ||
            (view.phase === 'claim_window' &&
              pending?.awaiting.includes(seat))
          return (
            <section
              key={seat}
              className={`table__seat table__seat--${slot} ${isTurn ? 'is-turn' : ''}`}
            >
              <div className="table__seat-meta">
                <strong>
                  {WIND[seat]} · {p.name}
                </strong>
                <span className="table__seat-tags">
                  {p.isDealer && <em>莊</em>}
                  {p.ding && <em className="tag-ding">叮</em>}
                  {!isHuman[seat] && <em className="tag-ai">AI</em>}
                  {isTurn && <em className="tag-turn">行動中</em>}
                </span>
              </div>
              <MeldGroup melds={p.melds} size="sm" />
              {p.flowers.length > 0 && (
                <TileRow tiles={p.flowers} size="sm" className="table__flowers" />
              )}
              {isYou ? (
                <TileRow
                  tiles={view.hand}
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
              ) : (
                <FaceDownHand count={p.handCount} size="sm" />
              )}
              <div className="table__discards">
                <TileRow tiles={p.discards} size="sm" />
              </div>
            </section>
          )
        })}

        <div className="table__center">
          {pending ? (
            <div className="table__focus">
              <p>牌河焦點</p>
              <Tile id={pending.tile} size="lg" />
              <span>
                {WIND[pending.seat]}打出
              </span>
            </div>
          ) : (
            <div className="table__center-mark">
              <span>香港台麻</span>
            </div>
          )}
        </div>
      </div>

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
    </div>
  )
}
