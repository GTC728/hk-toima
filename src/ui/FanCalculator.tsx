import { useMemo, useState } from 'react'
import {
  amountFromFan,
  calculateFans,
  DEFAULT_RULES,
  makeMeld,
  parseTile,
  totalFan,
  type Meld,
  type MeldKind,
  type TileId,
} from '../engine'
import { MeldGroup, Tile, TileRow } from './tiles'

const SUIT_TILES: TileId[] = [
  ...([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((r) => `man-${r}` as TileId),
  ...([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((r) => `pin-${r}` as TileId),
  ...([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((r) => `sou-${r}` as TileId),
]

const HONOR_TILES: TileId[] = [
  'wind-east',
  'wind-south',
  'wind-west',
  'wind-north',
  'dragon-zhong',
  'dragon-fa',
  'dragon-bai',
]

const FLOWER_TILES: TileId[] = [
  'flower-spring',
  'flower-summer',
  'flower-autumn',
  'flower-winter',
  'flower-plum',
  'flower-orchid',
  'flower-chrysanthemum',
  'flower-bamboo',
]

type Target = 'hand' | 'win' | 'flowers' | 'meldDraft'
type WinType = 'tsumo' | 'ron'

const MELD_KIND_LABEL: Record<MeldKind, string> = {
  chi: '上',
  pong: '碰',
  mingkong: '明槓',
  ankong: '暗槓',
  jiagang: '加槓',
}

function countUsed(tiles: TileId[], id: TileId): number {
  return tiles.filter((t) => t === id).length
}

function maxCopies(id: TileId): number {
  return id.startsWith('flower-') ? 1 : 4
}

interface FanCalculatorProps {
  onBack: () => void
}

export function FanCalculator({ onBack }: FanCalculatorProps) {
  const [hand, setHand] = useState<TileId[]>([])
  const [melds, setMelds] = useState<Meld[]>([])
  const [flowers, setFlowers] = useState<TileId[]>([])
  const [winTile, setWinTile] = useState<TileId | null>(null)
  const [winType, setWinType] = useState<WinType>('tsumo')
  const [isDealer, setIsDealer] = useState(false)
  const [base, setBase] = useState(DEFAULT_RULES.base)
  const [fanValue, setFanValue] = useState(DEFAULT_RULES.fanValue)
  const [target, setTarget] = useState<Target>('hand')
  const [meldKind, setMeldKind] = useState<MeldKind>('pong')
  const [meldDraft, setMeldDraft] = useState<TileId[]>([])

  const allPlaced = useMemo(
    () => [
      ...hand,
      ...melds.flatMap((m) => m.tiles),
      ...flowers,
      ...(winTile ? [winTile] : []),
      ...meldDraft,
    ],
    [hand, melds, flowers, winTile, meldDraft],
  )

  function canAdd(id: TileId): boolean {
    return countUsed(allPlaced, id) < maxCopies(id)
  }

  function addTile(id: TileId) {
    if (!canAdd(id)) return
    if (target === 'hand') {
      setHand((h) => [...h, id])
      return
    }
    if (target === 'win') {
      setWinTile(id)
      return
    }
    if (target === 'flowers') {
      if (!id.startsWith('flower-')) return
      setFlowers((f) => [...f, id])
      return
    }
    setMeldDraft((d) => [...d, id])
  }

  function removeFromHand(index: number) {
    setHand((h) => h.filter((_, i) => i !== index))
  }

  function removeFlower(index: number) {
    setFlowers((f) => f.filter((_, i) => i !== index))
  }

  function removeMeld(index: number) {
    setMelds((m) => m.filter((_, i) => i !== index))
  }

  function commitMeld() {
    const need =
      meldKind === 'chi' || meldKind === 'pong'
        ? 3
        : meldKind === 'mingkong' ||
            meldKind === 'ankong' ||
            meldKind === 'jiagang'
          ? 4
          : 0
    if (meldDraft.length !== need) return
    if (meldKind === 'chi') {
      const sorted = [...meldDraft].sort()
      setMelds((m) => [...m, makeMeld('chi', sorted, 0, sorted[2])])
    } else if (meldKind === 'pong') {
      const t = meldDraft[0]!
      if (!meldDraft.every((x) => x === t)) return
      setMelds((m) => [...m, makeMeld('pong', [t, t, t], 0, t)])
    } else {
      const t = meldDraft[0]!
      if (!meldDraft.every((x) => x === t)) return
      setMelds((m) => [...m, makeMeld(meldKind, [t, t, t, t], 0, t)])
    }
    setMeldDraft([])
    setTarget('hand')
  }

  function resetAll() {
    setHand([])
    setMelds([])
    setFlowers([])
    setWinTile(null)
    setMeldDraft([])
    setTarget('hand')
  }

  const result = useMemo(() => {
    if (!winTile || hand.length === 0) return null
    try {
      const pattern = calculateFans({
        hand,
        melds,
        flowers,
        winTile,
        winType,
        ding: null,
        isDealer,
        consecutiveWins: 0,
        seat: isDealer ? 0 : 1,
      })
      const fans = [
        { id: 'di', name: '底', value: Math.max(0, base) },
        ...pattern,
      ]
      const fan = totalFan(fans)
      const amount = amountFromFan(
        { ...DEFAULT_RULES, base, fanValue },
        fan,
      )
      return { fans, fan, amount }
    } catch {
      return null
    }
  }, [hand, melds, flowers, winTile, winType, isDealer, base, fanValue])

  const palette =
    target === 'flowers' ? FLOWER_TILES : [...SUIT_TILES, ...HONOR_TILES]

  return (
    <main className="fan-page calc-page">
      <header className="fan-page__header">
        <button type="button" className="fan-page__back" onClick={onBack}>
          ← 返大廳
        </button>
        <p className="fan-page__eyebrow">HK ToiMa</p>
        <h1 className="fan-page__title">計番機</h1>
        <p className="fan-page__sub">砌手牌／門前／花 → 自摸或出銃</p>
      </header>

      <section className="calc-page__controls" aria-label="設定">
        <div className="calc-page__win-type" role="group" aria-label="糊法">
          {(
            [
              ['tsumo', '自摸'],
              ['ron', '出銃'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`lobby__chip ${winType === id ? 'is-active' : ''}`}
              onClick={() => setWinType(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="lobby__toggle calc-page__dealer">
          <input
            type="checkbox"
            checked={isDealer}
            onChange={(e) => setIsDealer(e.target.checked)}
          />
          <span>莊家</span>
        </label>
        <label className="calc-page__num">
          <span>底（番）</span>
          <input
            type="number"
            min={0}
            value={base}
            onChange={(e) => setBase(Number(e.target.value) || 0)}
            aria-label="底番數"
          />
        </label>
        <label className="calc-page__num">
          <span>$／番</span>
          <input
            type="number"
            min={0}
            value={fanValue}
            onChange={(e) => setFanValue(Number(e.target.value) || 0)}
            aria-label="番值"
          />
        </label>
        <button type="button" className="lobby__secondary" onClick={resetAll}>
          清空
        </button>
      </section>

      <section className="calc-page__board" aria-label="牌面">
        <div className="calc-page__slot">
          <div className="calc-page__slot-head">
            <h2>手牌（唔包糊牌）</h2>
            <button
              type="button"
              className={`lobby__chip ${target === 'hand' ? 'is-active' : ''}`}
              onClick={() => setTarget('hand')}
            >
              加到手牌
            </button>
          </div>
          <div className="tile-row">
            {hand.length === 0 && (
              <p className="calc-page__empty">撳下面牌庫加入</p>
            )}
            {hand.map((id, i) => (
              <Tile
                key={`h-${id}-${i}`}
                id={id}
                size="md"
                onClick={() => removeFromHand(i)}
              />
            ))}
          </div>
          <p className="calc-page__count">{hand.length} 張</p>
        </div>

        <div className="calc-page__slot">
          <div className="calc-page__slot-head">
            <h2>糊牌</h2>
            <button
              type="button"
              className={`lobby__chip ${target === 'win' ? 'is-active' : ''}`}
              onClick={() => setTarget('win')}
            >
              設糊牌
            </button>
          </div>
          {winTile ? (
            <Tile id={winTile} size="lg" onClick={() => setWinTile(null)} />
          ) : (
            <p className="calc-page__empty">未設</p>
          )}
        </div>

        <div className="calc-page__slot">
          <div className="calc-page__slot-head">
            <h2>門前／鳴牌</h2>
            <button
              type="button"
              className={`lobby__chip ${target === 'meldDraft' ? 'is-active' : ''}`}
              onClick={() => {
                setTarget('meldDraft')
                setMeldDraft([])
              }}
            >
              砌一組
            </button>
          </div>
          <MeldGroup melds={melds} size="sm" />
          {melds.length > 0 && (
            <div className="calc-page__meld-actions">
              {melds.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className="lobby__link"
                  onClick={() => removeMeld(i)}
                >
                  刪第 {i + 1} 組
                </button>
              ))}
            </div>
          )}
          {target === 'meldDraft' && (
            <div className="calc-page__meld-draft">
              <div className="calc-page__win-type" role="group">
                {(
                  ['chi', 'pong', 'mingkong', 'ankong'] as MeldKind[]
                ).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`lobby__chip ${meldKind === k ? 'is-active' : ''}`}
                    onClick={() => {
                      setMeldKind(k)
                      setMeldDraft([])
                    }}
                  >
                    {MELD_KIND_LABEL[k]}
                  </button>
                ))}
              </div>
              <TileRow tiles={meldDraft} size="sm" />
              <div className="calc-page__meld-actions">
                <button
                  type="button"
                  className="action-btn action-btn--primary"
                  onClick={commitMeld}
                >
                  確認組牌
                </button>
                <button
                  type="button"
                  className="action-btn action-btn--ghost"
                  onClick={() => setMeldDraft((d) => d.slice(0, -1))}
                >
                  退一張
                </button>
              </div>
              <p className="calc-page__count">
                {meldKind === 'chi' || meldKind === 'pong'
                  ? '要 3 張'
                  : '要 4 張（同款）'}
              </p>
            </div>
          )}
        </div>

        <div className="calc-page__slot">
          <div className="calc-page__slot-head">
            <h2>花</h2>
            <button
              type="button"
              className={`lobby__chip ${target === 'flowers' ? 'is-active' : ''}`}
              onClick={() => setTarget('flowers')}
            >
              加花
            </button>
          </div>
          <div className="tile-row">
            {flowers.map((id, i) => (
              <Tile
                key={`f-${id}-${i}`}
                id={id}
                size="sm"
                onClick={() => removeFlower(i)}
              />
            ))}
            {flowers.length === 0 && (
              <p className="calc-page__empty">無花</p>
            )}
          </div>
        </div>
      </section>

      <section className="calc-page__palette" aria-label="牌庫">
        <h2 className="lobby__section-title">
          牌庫
          <em>
            （而家加去
            {target === 'hand'
              ? '手牌'
              : target === 'win'
                ? '糊牌'
                : target === 'flowers'
                  ? '花'
                  : '鳴牌草稿'}
            ）
          </em>
        </h2>
        <div className="calc-page__palette-grid">
          {palette.map((id) => (
            <Tile
              key={id}
              id={id}
              size="sm"
              dimmed={!canAdd(id)}
              onClick={canAdd(id) ? () => addTile(id) : undefined}
            />
          ))}
        </div>
      </section>

      <section className="calc-page__result" aria-live="polite">
        <h2>結果</h2>
        {!winTile || hand.length === 0 ? (
          <p className="calc-page__empty">砌好手牌同糊牌先計</p>
        ) : result && result.fans.length > 0 ? (
          <>
            <ul className="fan-page__list">
              {result.fans.map((f) => (
                <li key={f.id} className="fan-page__row">
                  <span className="fan-page__name">{f.name}</span>
                  <span className="fan-page__value">{f.value} 番</span>
                </li>
              ))}
            </ul>
            <p className="calc-page__total">
              共 <strong>{result.fan}</strong> 番 · 金額{' '}
              <strong>${result.amount}</strong>
              <span className="calc-page__amount-hint">
                （總番×${fanValue}；底 {base} 番已計入
                {winType === 'tsumo' ? '；自摸每家付' : '；出銃者付'}）
              </span>
            </p>
          </>
        ) : (
          <p className="calc-page__empty">
            未成糊
            {winTile ? `（糊牌 ${parseTile(winTile).label}）` : ''}
          </p>
        )}
      </section>
    </main>
  )
}
