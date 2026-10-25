import { describe, expect, it } from 'vitest'
import { calculateFans, totalFan } from '../fan'
import { amountFromFan, buildWinResult, examplePinghuWuziZimo } from '../score'
import {
  applyWinToLa,
  canChopLa,
  chopLa,
  laDeltaForSeat,
  settleAllLa,
} from '../la'
import type { TableRules, WinResult } from '../types'
import { DEFAULT_RULES } from '../types'

describe('score', () => {
  it('amount = totalFan × fanValue（底已在 totalFan）', () => {
    const rules: TableRules = { ...DEFAULT_RULES, base: 5, fanValue: 1 }
    expect(amountFromFan(rules, 13)).toBe(13)
    expect(amountFromFan(rules, 8)).toBe(8)
  })

  it('連莊番＝2N+1（奇數），唔拆莊+雙數連莊', () => {
    const wr = buildWinResult({
      seat: 0,
      hand: [
        'man-1', 'man-2', 'man-3',
        'man-4', 'man-5', 'man-6',
        'pin-1', 'pin-2', 'pin-3',
        'sou-1', 'sou-2', 'sou-3',
        'pin-5',
      ],
      melds: [
        {
          kind: 'chi',
          tiles: ['sou-4', 'sou-5', 'sou-6'],
          fromSeat: 1,
          claimedTile: 'sou-6',
        },
      ],
      flowers: [],
      winTile: 'pin-5',
      winType: 'ron',
      ding: null,
      dealer: 0,
      consecutiveWins: 3,
      discarder: 2,
      rules: { ...DEFAULT_RULES, base: 5, fanValue: 2 },
      discardsThisRound: 20,
    })
    const ids = wr.fans.map((f) => f.id)
    expect(ids).toContain('lianzhuang')
    expect(ids).not.toContain('dealer')
    expect(wr.fans.find((f) => f.id === 'lianzhuang')!.value).toBe(7)
  })

  it('plan example: 底+平胡+無字+自摸（坊間眾數）', () => {
    expect(examplePinghuWuziZimo()).toBe(12)

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
    const ids = fans.map((f) => f.id)
    expect(ids).toContain('pinghu')
    expect(ids).toContain('wuzi')
    expect(ids).toContain('zimo')
    expect(ids).not.toContain('menqing_zimo')

    const core = fans.filter((f) =>
      ['pinghu', 'wuzi', 'zimo'].includes(f.id),
    )
    // 偏高檔：平胡5＋無字1＋自摸1
    expect(totalFan(core)).toBe(7)

    const rules: TableRules = { ...DEFAULT_RULES, base: 5, fanValue: 1 }
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
    // 底5 + 牌型（平胡3+無字1+自摸1 + 爛花等）
    expect(wr.fans.some((f) => f.id === 'di' && f.value === 5)).toBe(true)
    expect(wr.handFan).toBeGreaterThanOrEqual(10)
    expect(wr.payments).toHaveLength(3)
    // 閒家自摸：三家同一額（唔另收莊多付）
    const expectAmt = amountFromFan(rules, wr.handFan)
    expect(wr.payments.every((p) => p.amount === expectAmt)).toBe(true)
    expect(wr.paymentPerPayer).toBe(expectAmt)
  })

  it('莊家自摸：三家同一額（含莊番）', () => {
    const rules: TableRules = { ...DEFAULT_RULES, base: 5, fanValue: 2 }
    const wr = buildWinResult({
      seat: 0,
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
          fromSeat: 1,
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
    expect(wr.payments).toHaveLength(3)
    expect(new Set(wr.payments.map((p) => p.amount)).size).toBe(1)
    expect(wr.payments[0]!.amount).toBe(
      amountFromFan(rules, wr.handFan + 1),
    )
  })

  it('反雪：一炮多響出銃者付款×2', () => {
    const rules: TableRules = { ...DEFAULT_RULES, base: 5, fanValue: 2 }
    // 16 張聽 man-6（同 meld-claims 叫糊形）
    const hand = [
      'man-1', 'man-2', 'man-3',
      'man-4', 'man-5',
      'pin-1', 'pin-2', 'pin-3',
      'pin-7', 'pin-8', 'pin-9',
      'sou-1', 'sou-2', 'sou-3',
      'wind-east', 'wind-east',
    ] as const
    const common = {
      seat: 1 as const,
      hand: [...hand],
      melds: [],
      flowers: [] as const,
      winTile: 'man-6' as const,
      winType: 'ron' as const,
      ding: null,
      dealer: 0 as const,
      consecutiveWins: 0,
      discarder: 0 as const,
      rules,
      discardsThisRound: 20,
      wallRemaining: 40,
      multiRonCount: 2,
    }
    const plain = buildWinResult({ ...common, fanxue: false })
    const doubled = buildWinResult({ ...common, fanxue: true })

    expect(doubled.fans.some((f) => f.id === 'fanxue' && f.value === 0)).toBe(
      true,
    )
    expect(doubled.fans.some((f) => f.id === 'shuangxiang')).toBe(true)
    expect(plain.payments).toHaveLength(1)
    expect(doubled.payments).toHaveLength(1)
    expect(doubled.payments[0]!.from).toBe(0)
    expect(doubled.payments[0]!.to).toBe(1)
    expect(doubled.payments[0]!.amount).toBe(plain.payments[0]!.amount * 2)

    // 出銃者係莊：相關番含莊番，再×2。鎖死銀碼，避免反雪退回只掛名。
    // 無花偏高檔 1 → 銀碼跟住變
    expect(plain.payments[0]!.amount).toBe(112)
    expect(doubled.payments[0]!.amount).toBe(224)
    expect(doubled.paymentPerPayer).toBe(224)

    const { ledger, settled } = applyWinToLa([], [doubled], rules.maxLaKou)
    expect(settled).toEqual([])
    expect(ledger).toEqual([
      {
        creditor: 1,
        debtor: 0,
        amount: 224,
        kou: 1,
        lastHandAmount: 224,
        prevAmount: 0,
      },
    ])
  })
})

describe('拉數', () => {
  const maxLaKou = 3

  function win(from: 0 | 1 | 2 | 3, to: 0 | 1 | 2 | 3, amount: number): WinResult {
    return {
      seat: to,
      winType: 'ron',
      winTile: 'man-1',
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
      {
        creditor: 0,
        debtor: 1,
        amount: 13,
        kou: 1,
        lastHandAmount: 13,
        prevAmount: 0,
      },
    ])
    expect(laDeltaForSeat(ledger, 0)).toBe(13)
  })

  it('再食 ×1.5', () => {
    let { ledger } = applyWinToLa([], [win(1, 0, 10)], maxLaKou)
    ;({ ledger } = applyWinToLa(ledger, [win(1, 0, 10)], maxLaKou))
    expect(ledger[0]!.amount).toBe(25)
    expect(ledger[0]!.kou).toBe(2)
    expect(ledger[0]!.prevAmount).toBe(10)
    expect(ledger[0]!.lastHandAmount).toBe(10)
    // 現金應計本鋪拉帳增減：25−10＝15（含×1.5）
    expect(laDeltaForSeat(ledger, 0)).toBe(15)
    expect(laDeltaForSeat(ledger, 1)).toBe(-15)
  })

  it('踢半 on reverse win', () => {
    let { ledger } = applyWinToLa([], [win(1, 0, 20)], maxLaKou)
    const r = applyWinToLa(ledger, [win(0, 1, 10)], maxLaKou)
    expect(r.settled.some((s) => s.reason === '踢半' && s.amount === 10)).toBe(true)
    expect(
      r.ledger.some((e) => e.creditor === 1 && e.debtor === 0 && e.amount === 10),
    ).toBe(true)
  })

  it('被 A 拉住之後胡 B → 同 A 全額斷拉', () => {
    // 第一鋪：A(0) 食你(1) → 你欠 A 152
    let { ledger } = applyWinToLa([], [win(1, 0, 152)], maxLaKou)
    // 第二鋪：你(1) 食 B(3) → 同 A 斷拉全額；B 欠你新帳
    const r = applyWinToLa(ledger, [win(3, 1, 132)], maxLaKou)
    expect(
      r.settled.some(
        (s) =>
          s.reason === '斷拉結清' &&
          s.from === 1 &&
          s.to === 0 &&
          s.amount === 152,
      ),
    ).toBe(true)
    expect(r.ledger.some((e) => e.creditor === 0 && e.debtor === 1)).toBe(false)
    expect(
      r.ledger.some(
        (e) => e.creditor === 1 && e.debtor === 3 && e.amount === 132 && e.kou === 1,
      ),
    ).toBe(true)
  })

  it('拉住方食其他人 → 原欠數照拉', () => {
    // A(0) 食你(1)；之後 A 再食 B(3) → 你欠 A 照拉
    let { ledger } = applyWinToLa([], [win(1, 0, 152)], maxLaKou)
    const r = applyWinToLa(ledger, [win(3, 0, 100)], maxLaKou)
    expect(r.settled.some((s) => s.reason === '斷拉結清')).toBe(false)
    expect(
      r.ledger.some(
        (e) => e.creditor === 0 && e.debtor === 1 && e.amount === 152 && e.kou === 1,
      ),
    ).toBe(true)
    expect(
      r.ledger.some((e) => e.creditor === 0 && e.debtor === 3 && e.amount === 100),
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
