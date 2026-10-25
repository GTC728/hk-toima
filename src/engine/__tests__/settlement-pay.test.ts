import { describe, expect, it } from 'vitest'
import { applyWinToLa } from '../la'
import { amountFromFan, buildWinResult } from '../score'
import type { BuildWinInput } from '../score'
import { DEFAULT_RULES, type Seat, type TableRules, type WinResult } from '../types'

/**
 * 結算要對得上：番表總番 × 番值＝實付（反雪先乘 2）。
 * 莊家出銃同莊家食糊都要喺番表寫莊／連莊，唔好只加銀碼。
 */
const rules: TableRules = { ...DEFAULT_RULES, base: 5, fanValue: 2 }

const waiting: Omit<
  BuildWinInput,
  'seat' | 'dealer' | 'consecutiveWins' | 'discarder' | 'winType'
> = {
  hand: [
    'man-1', 'man-2', 'man-3',
    'man-4', 'man-5',
    'pin-1', 'pin-2', 'pin-3',
    'pin-7', 'pin-8', 'pin-9',
    'sou-1', 'sou-2', 'sou-3',
    'wind-east', 'wind-east',
  ],
  melds: [],
  flowers: [],
  winTile: 'man-6',
  ding: null,
  rules,
  discardsThisRound: 20,
  wallRemaining: 40,
  multiRonCount: 1,
}

function ron(partial: {
  seat: Seat
  dealer: Seat
  discarder: Seat
  consecutiveWins?: number
  fanxue?: boolean
}) {
  return buildWinResult({
    ...waiting,
    winType: 'ron',
    consecutiveWins: 0,
    ...partial,
  })
}

function expectPayMatchesFan(wr: WinResult, multiplier = 1) {
  expect(wr.payments).toHaveLength(wr.winType === 'tsumo' ? 3 : 1)
  const amount = amountFromFan(rules, wr.totalFan) * multiplier
  expect(wr.paymentPerPayer).toBe(amount)
  expect(wr.payments.every((p) => p.amount === amount)).toBe(true)
  expect(wr.payments.every((p) => p.to === wr.seat)).toBe(true)
}

describe('食糊付款同番表', () => {
  it('閒家食閒家出銃：唔加莊番', () => {
    const wr = ron({ seat: 1, dealer: 0, discarder: 2 })
    expect(wr.fans.some((f) => f.id === 'dealer' || f.id === 'lianzhuang')).toBe(
      false,
    )
    expect(wr.totalFan).toBe(wr.handFan)
    expect(wr.payments).toEqual([
      { from: 2, to: 1, amount: amountFromFan(rules, wr.totalFan) },
    ])
  })

  it('莊家未連莊出銃：番表寫莊 1，銀碼用總番', () => {
    const wr = ron({ seat: 1, dealer: 0, discarder: 0, consecutiveWins: 0 })
    expect(wr.fans.filter((f) => f.id === 'dealer')).toEqual([
      { id: 'dealer', name: '莊', value: 1 },
    ])
    expect(wr.fans.some((f) => f.id === 'lianzhuang')).toBe(false)
    expect(wr.totalFan).toBe(wr.handFan + 1)
    expectPayMatchesFan(wr)
    expect(wr.payments[0]!.from).toBe(0)
  })

  it('莊家連一出銃：連莊 3 番寫入番表，本鋪番數＝總番', () => {
    const wr = ron({ seat: 2, dealer: 0, discarder: 0, consecutiveWins: 1 })
    expect(wr.fans.filter((f) => f.id === 'lianzhuang')).toEqual([
      { id: 'lianzhuang', name: '連莊', value: 3 },
    ])
    expect(wr.totalFan).toBe(wr.handFan + 3)
    expectPayMatchesFan(wr)
    const { ledger, settled } = applyWinToLa([], [wr], rules.maxLaKou)
    expect(settled).toEqual([])
    expect(ledger).toEqual([
      {
        creditor: 2,
        debtor: 0,
        amount: amountFromFan(rules, wr.totalFan),
        kou: 1,
        lastHandAmount: amountFromFan(rules, wr.totalFan),
        prevAmount: 0,
      },
    ])
  })

  it('莊家連二出銃：連莊 5 番', () => {
    const wr = ron({ seat: 3, dealer: 0, discarder: 0, consecutiveWins: 2 })
    expect(wr.fans.find((f) => f.id === 'lianzhuang')!.value).toBe(5)
    expect(wr.totalFan).toBe(wr.handFan + 5)
    expectPayMatchesFan(wr)
  })

  it('莊家食出銃：出銃者付，番表有莊', () => {
    const wr = ron({ seat: 0, dealer: 0, discarder: 1, consecutiveWins: 0 })
    expect(wr.fans.some((f) => f.id === 'dealer' && f.value === 1)).toBe(true)
    expect(wr.totalFan).toBe(wr.handFan + 1)
    expect(wr.payments).toEqual([
      { from: 1, to: 0, amount: amountFromFan(rules, wr.totalFan) },
    ])
  })

  it('莊家連莊自摸：三家同一額，等於總番', () => {
    const wr = buildWinResult({
      ...waiting,
      seat: 0,
      dealer: 0,
      consecutiveWins: 1,
      winType: 'tsumo',
    })
    expect(wr.fans.find((f) => f.id === 'lianzhuang')!.value).toBe(3)
    expect(wr.totalFan).toBe(wr.handFan + 3)
    expectPayMatchesFan(wr)
    expect(new Set(wr.payments.map((p) => p.from))).toEqual(new Set([1, 2, 3]))
  })

  it('閒家自摸：三家唔另付莊番', () => {
    const wr = buildWinResult({
      ...waiting,
      seat: 1,
      dealer: 0,
      consecutiveWins: 2,
      winType: 'tsumo',
    })
    expect(wr.fans.some((f) => f.id === 'dealer' || f.id === 'lianzhuang')).toBe(
      false,
    )
    expect(wr.totalFan).toBe(wr.handFan)
    expectPayMatchesFan(wr)
  })

  it('反雪：番表總番含莊，銀碼再 ×2', () => {
    const plain = buildWinResult({
      ...waiting,
      seat: 1,
      dealer: 0,
      discarder: 0,
      consecutiveWins: 0,
      winType: 'ron',
      fanxue: false,
      multiRonCount: 2,
    })
    const doubled = buildWinResult({
      ...waiting,
      seat: 1,
      dealer: 0,
      discarder: 0,
      consecutiveWins: 0,
      winType: 'ron',
      fanxue: true,
      multiRonCount: 2,
    })
    expect(doubled.fans.some((f) => f.id === 'fanxue' && f.value === 0)).toBe(
      true,
    )
    expect(doubled.fans.some((f) => f.id === 'dealer' && f.value === 1)).toBe(
      true,
    )
    expect(doubled.payments[0]!.amount).toBe(plain.payments[0]!.amount * 2)
    expect(doubled.payments[0]!.amount).toBe(
      amountFromFan(rules, doubled.totalFan) * 2,
    )
  })
})

describe('拉帳結清同新帳', () => {
  function book(from: Seat, to: Seat, amount: number, winType: 'ron' | 'tsumo'): WinResult {
    const others: Seat[] = [0, 1, 2, 3]
    const payments =
      winType === 'tsumo'
        ? others
            .filter((s) => s !== to)
            .map((s) => ({ from: s, to, amount }))
        : [{ from, to, amount }]
    return {
      seat: to,
      winType,
      winTile: 'man-1',
      discarder: winType === 'ron' ? from : undefined,
      fans: [],
      totalFan: amount / rules.fanValue,
      handFan: amount / rules.fanValue,
      paymentPerPayer: amount,
      payments,
    }
  }

  it('上鋪莊家自摸，今鋪外人食莊出銃：其餘兩家全額結清，贏家踢半，新帳等於今鋪', () => {
    // 東自摸，南西北各欠 $48。下一鋪西食東出銃 $50。
    const first = applyWinToLa([], [book(1, 0, 48, 'tsumo')], rules.maxLaKou)
    expect(first.ledger).toHaveLength(3)

    const second = applyWinToLa(first.ledger, [book(0, 2, 50, 'ron')], rules.maxLaKou)

    expect(second.settled).toEqual(
      expect.arrayContaining([
        { from: 2, to: 0, amount: 24, reason: '踢半' },
        { from: 1, to: 0, amount: 48, reason: '其他人食糊結清' },
        { from: 3, to: 0, amount: 48, reason: '其他人食糊結清' },
      ]),
    )
    expect(second.settled).toHaveLength(3)
    expect(second.ledger).toEqual([
      {
        creditor: 2,
        debtor: 0,
        amount: 50,
        kou: 1,
        lastHandAmount: 50,
        prevAmount: 0,
      },
    ])
  })

  it('欠數方食第三者：同原債主斷拉，再同出銃者開新帳', () => {
    const first = applyWinToLa([], [book(1, 0, 40, 'ron')], rules.maxLaKou)
    const second = applyWinToLa(first.ledger, [book(3, 1, 20, 'ron')], rules.maxLaKou)
    expect(second.settled).toEqual([
      { from: 1, to: 0, amount: 40, reason: '斷拉結清' },
    ])
    expect(second.ledger).toEqual([
      {
        creditor: 1,
        debtor: 3,
        amount: 20,
        kou: 1,
        lastHandAmount: 20,
        prevAmount: 0,
      },
    ])
  })

  it('再食同一人：舊數 ×1.5 再加今鋪', () => {
    const first = applyWinToLa([], [book(1, 0, 10, 'ron')], rules.maxLaKou)
    const second = applyWinToLa(first.ledger, [book(1, 0, 10, 'ron')], rules.maxLaKou)
    expect(second.settled).toEqual([])
    expect(second.ledger[0]).toMatchObject({
      creditor: 0,
      debtor: 1,
      amount: 25,
      kou: 2,
      prevAmount: 10,
      lastHandAmount: 10,
    })
  })
})
