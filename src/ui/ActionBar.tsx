import { parseTile, type Action, type TileId } from '../engine'
import { loadShowWaiting } from './extraPrefs'

function tileLabel(id: TileId): string {
  try {
    return parseTile(id).label
  } catch {
    return id
  }
}

interface ActionBarProps {
  legal: Action[]
  selectedTile: TileId | null
  declareDingWithDiscard: boolean
  onToggleDing: () => void
  onAction: (action: Action) => void
  pendingTile?: TileId | null
  /** 聽牌等待列表（自己） */
  waitingTiles?: TileId[]
  /** 上／碰後強制打牌（唔係淨係「有 discard 冇 draw」） */
  mustDiscard?: boolean
}

export function ActionBar({
  legal,
  selectedTile,
  declareDingWithDiscard,
  onToggleDing,
  onAction,
  waitingTiles = [],
}: ActionBarProps) {
  const canWin = legal.some((a) => a.type === 'win')
  const canPong = legal.some((a) => a.type === 'pong')
  const canPass = legal.some((a) => a.type === 'pass')
  const canDraw = legal.some((a) => a.type === 'draw')
  const canDeclareDing = legal.some((a) => a.type === 'declareDing')
  const chiOptions = legal.filter((a) => a.type === 'chi')
  const discardLegal = legal.filter((a) => a.type === 'discard')
  const canDiscardSelected =
    selectedTile != null &&
    discardLegal.some((a) => a.type === 'discard' && a.tile === selectedTile)

  const anKongs = legal.filter((a) => a.type === 'ankong')
  const jiaGangs = legal.filter((a) => a.type === 'jiagang')
  const mingKong = legal.find((a) => a.type === 'mingkong')

  return (
    <div className="action-bar">
      {loadShowWaiting() && waitingTiles.length > 0 && (
        <p className="action-bar__waiting" role="status">
          等：{waitingTiles.map(tileLabel).join(' · ')}
        </p>
      )}

      <div className="action-bar__row">
        {canWin && (
          <button
            type="button"
            className="action-btn action-btn--win"
            onClick={() => onAction({ type: 'win' })}
          >
            食
          </button>
        )}
        {canPong && (
          <button
            type="button"
            className="action-btn"
            onClick={() => onAction({ type: 'pong' })}
          >
            碰
          </button>
        )}
        {chiOptions.map((a, i) =>
          a.type === 'chi' ? (
            <button
              key={i}
              type="button"
              className="action-btn"
              onClick={() => onAction(a)}
            >
              上 {a.tiles.map(tileLabel).join('')}
            </button>
          ) : null,
        )}
        {mingKong && (
          <button
            type="button"
            className="action-btn"
            onClick={() => onAction(mingKong)}
          >
            明槓
          </button>
        )}
        {anKongs.map((a, i) =>
          a.type === 'ankong' ? (
            <button
              key={`an-${i}`}
              type="button"
              className="action-btn"
              onClick={() => onAction(a)}
            >
              暗槓 {tileLabel(a.tile)}
            </button>
          ) : null,
        )}
        {jiaGangs.map((a, i) =>
          a.type === 'jiagang' ? (
            <button
              key={`jia-${i}`}
              type="button"
              className="action-btn"
              onClick={() => onAction(a)}
            >
              加槓 {tileLabel(a.tile)}
            </button>
          ) : null,
        )}
        {canDeclareDing && discardLegal.length > 0 && (
          <button
            type="button"
            className={`action-btn ${declareDingWithDiscard ? 'is-armed' : ''}`}
            onClick={onToggleDing}
            title="打牌時一併叮"
          >
            叮
          </button>
        )}
        {canDeclareDing && discardLegal.length === 0 && (
          <button
            type="button"
            className="action-btn"
            onClick={() => onAction({ type: 'declareDing' })}
          >
            叮
          </button>
        )}
        {canDraw && (
          <button
            type="button"
            className="action-btn action-btn--primary"
            onClick={() => onAction({ type: 'draw' })}
          >
            摸牌
          </button>
        )}
        {discardLegal.length > 0 && (
          <button
            type="button"
            className="action-btn action-btn--primary"
            disabled={!canDiscardSelected}
            title={
              canDiscardSelected
                ? '打牌'
                : '先撳手牌選一張（或雙擊手牌即出）'
            }
            onClick={() => {
              if (!canDiscardSelected || selectedTile == null) return
              onAction({
                type: 'discard',
                tile: selectedTile,
                declareDing: declareDingWithDiscard || undefined,
              })
            }}
          >
            打牌
          </button>
        )}
        {canPass && (
          <button
            type="button"
            className="action-btn action-btn--ghost"
            onClick={() => onAction({ type: 'pass' })}
          >
            跳過
          </button>
        )}
      </div>

      {discardLegal.length > 0 && !selectedTile && (
        <p className="action-bar__tip">撳手牌選一張再打牌，或雙擊手牌即出</p>
      )}
    </div>
  )
}
