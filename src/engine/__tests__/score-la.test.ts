import { describe, expect, it } from 'vitest'
import { calculateFans, totalFan } from '../fan'
import { amountFromFan, buildWinResult, examplePinghuWuziZimo } from '../score'
import { applyWinToLa, canChopLa, chopLa, settleAllLa } from '../la'
import type { TableRules, TileId, WinResult } from '../types'
import { DEFAULT_RULES } from '../types'

describe('score', () => {
  it('amount = base + fan * fanValue', () => {
    const rules: TableRules = { ...DEFAULT_RULES, base: 5, fanValue: 1 }
    expect(amountFromFan(rules, 8)).toBe(13)
  })

  it('plan example: 平胡+無字+自摸 = 8 fan, each pays $13', () => {
    expect(examplePinghuWuziZimo()).toBe(13)

    // 有上破門清：平胡5 + 無字2 + 自摸1 = 8（加花避免無花）
    const concealed: TileId[] = [
      'man-4', 'man-5', 'man-6',
      'pin-1', 'pin-2', 'pin-3',
      'pin-4', 'pin-5', 'pin-6',
      'sou-1', 'sou-2',
      'sou-4', 'sou-4',
    ]
    // 13 張暗牌 + 1 組上 = 等價 16；自摸 sou-3
    // 叫糊時手牌 13（有一組鳴牌後），摸到第 14 張食
    const fans = calculateFans({
      hand: [
        'man-4', 'man-5', 'man-6',
        'pin-1', 'pin-2', 'pin-3',
        'pin-4', 'pin-5', 'pin-6',
        'sou-1', 'sou-2',
        'sou-4', 'sou-4',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['man-1', 'man-2', 'man-3'],
          fromSeat: 0,
          claimedTile: 'man-3',
        },
      ],
      flowers: ['flower-spring'],
      winTile: 'sou-3',
      winType: 'tsumo',
      ding: null,
      isDealer: false,
      consecutiveWins: 0,
      seat: 1,
    })
    // hand 13 + win = 14；exposed 1；remaining melds = 4；4*3+2=14 ✓
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('pinghu')
    expect(ids).toContain('wuzi')
    expect(ids).toContain('zimo')
    expect(ids).not.toContain('menqing_zimo')

    const core = fans.filter((f) =>
      ['pinghu', 'wuzi', 'zimo'].includes(f.id),
    )
    expect(totalFan(core)).toBe(8)

    const rules: TableRules = { ...DEFAULT_RULES, base: 5, fanValue: 1 }
    expect(amountFromFan(rules, 8)).toBe(13)

    const wr = buildWinResult({
      seat: 1,
      hand: [
        'man-4', 'man-5', 'man-6',
        'pin-1', 'pin-2', 'pin-3',
        'pin-4', 'pin-5', 'pin-6',
        'sou-1', 'sou-2',
        'sou-4', 'sou-4',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['man-1', 'man-2', 'man-3'],
          fromSeat: 0,
          claimedTile: 'man-3',
        },
      ],
      flowers: ['flower-spring'],
      winTile: 'sou-3',
      winType: 'tsumo',
      ding: null,
      dealer: 0,
      consecutiveWins: 0,
      rules,
    })
    // 閒家自摸：非莊各付 底+牌型番；牌型含平胡無字自摸同爛花
    const pinghuFan = 5 + 2 + 1
    expect(amountFromFan(rules, pinghuFan)).toBe(13)
    expect(wr.payments).toHaveLength(3)
    void concealed
  })
})

describe('拉數', () => {
  const maxLaKou = 3

  function win(from: 0 | 1 | 2 | 3, to: 0 | 1 | 2 | 3, amount: number): WinResult {
    return {
      seat: to,
      winType: 'ron',
      discarder: from,
      fans: [],
      totalFan: 0,
      handFan: 0,
      paymentPerPayer: amount,
      payments: [{ from, to, amount }],
    }
  }

  it('records debt on first win', () => {
    const { ledger } = applyWinToLa([], [win(1, 0, 13)], maxLaKou)
    expect(ledger).toEqual([
      { creditor: 0, debtor: 1, amount: 13, kou: 1 },
    ])
  })

  it('再食 ×1.5', () => {
    let { ledger } = applyWinToLa([], [win(1, 0, 10)], maxLaKou)
    ;({ ledger } = applyWinToLa(ledger, [win(1, 0, 10)], maxLaKou))
    expect(ledger[0]!.amount).toBe(25)
    expect(ledger[0]!.kou).toBe(2)
  })

  it('踢半 on reverse win', () => {
    let { ledger } = applyWinToLa([], [win(1, 0, 20)], maxLaKou)
    const r = applyWinToLa(ledger, [win(0, 1, 10)], maxLaKou)
    expect(r.settled.some((s) => s.reason === '踢半' && s.amount === 10)).toBe(true)
    expect(
      r.ledger.some((e) => e.creditor === 1 && e.debtor === 0 && e.amount === 10),
    ).toBe(true)
  })

  it('三口可斬拉', () => {
    let ledger = applyWinToLa([], [win(1, 0, 10)], 3).ledger
    ledger = applyWinToLa(ledger, [win(1, 0, 10)], 3).ledger
    ledger = applyWinToLa(ledger, [win(1, 0, 10)], 3).ledger
    expect(ledger[0]!.kou).toBe(3)
    expect(canChopLa(ledger[0]!, 3)).toBe(true)
    const chopped = chopLa(ledger, 0, 1)
    expect(chopped.ledger).toHaveLength(0)
    expect(chopped.settled[0]!.reason).toBe('斬拉')
  })

  it('埋單 clears all', () => {
    const { ledger } = applyWinToLa([], [win(1, 0, 10), win(2, 3, 20)], 3)
    const r = settleAllLa(ledger)
    expect(r.ledger).toHaveLength(0)
    expect(r.settled).toHaveLength(2)
  })
})
