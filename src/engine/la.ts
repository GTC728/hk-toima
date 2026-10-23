import type { LaEntry, Seat, WinResult } from './types'

function findEntry(ledger: LaEntry[], creditor: Seat, debtor: Seat): LaEntry | undefined {
  return ledger.find((e) => e.creditor === creditor && e.debtor === debtor)
}

function clearRoundMarks(ledger: LaEntry[]): LaEntry[] {
  return ledger.map((e) => {
    const { lastHandAmount: _h, prevAmount: _p, ...rest } = e
    return { ...rest }
  })
}

/**
 * 將一鋪贏嘅付款記入拉數簿（港式台牌常見計法）。
 *
 * - 再食同一人：舊數 ×1.5 + 今鋪，kou+1
 * - 反食（踢半）：欠數方反食拉住自己嗰家 → 只付舊數一半，新方向開新帳
 * - 欠數方食其他人：同拉住自己嗰家全額結清（斷拉），再同今鋪輸家開新帳
 * - 拉住方食其他人：原欠數照拉，唔郁
 * - 外人（非該條雙方）食糊：該條全額結清
 */
export interface LaApplyResult {
  ledger: LaEntry[]
  /** 即時結清嘅款（踢半、斷拉、斬、外人食糊） */
  settled: { from: Seat; to: Seat; amount: number; reason: string }[]
}

export function applyWinToLa(
  ledger: LaEntry[],
  wins: WinResult[],
  maxLaKou: number,
): LaApplyResult {
  let next = clearRoundMarks(ledger)
  const settled: LaApplyResult['settled'] = []

  const winners = new Set(wins.map((w) => w.seat))

  // 先處理「要即時全額結清」嘅舊帳（踢半留畀下面付款迴圈）
  next = next.filter((e) => {
    const { creditor, debtor } = e

    // 外人食糊：贏家唔喺呢對雙方入面
    const outsiderWin = [...winners].some(
      (w) => w !== creditor && w !== debtor,
    )
    if (outsiderWin && !winners.has(creditor) && !winners.has(debtor)) {
      settled.push({
        from: debtor,
        to: creditor,
        amount: e.amount,
        reason: '其他人食糊結清',
      })
      return false
    }

    // 欠數方食糊，但今鋪唔係反食拉住自己嗰家 → 全額斷拉
    for (const w of wins) {
      if (w.seat !== debtor) continue
      const reverseKick = w.payments.some(
        (p) => p.from === creditor && p.to === debtor,
      )
      if (!reverseKick) {
        settled.push({
          from: debtor,
          to: creditor,
          amount: e.amount,
          reason: '斷拉結清',
        })
        return false
      }
    }

    return true
  })

  for (const w of wins) {
    for (const pay of w.payments) {
      const creditor = pay.to
      const debtor = pay.from
      const handAmount = pay.amount

      // 反方向：今鋪贏家曾欠今鋪輸家 → 踢半
      const reverse = findEntry(next, debtor, creditor)
      if (reverse) {
        const half = Math.floor(reverse.amount / 2)
        settled.push({
          from: creditor,
          to: debtor,
          amount: half,
          reason: '踢半',
        })
        next = next.filter(
          (e) => !(e.creditor === debtor && e.debtor === creditor),
        )
      }

      const existing = findEntry(next, creditor, debtor)
      if (existing) {
        const prev = existing.amount
        const pulled = Math.ceil(prev * 1.5) + handAmount
        existing.prevAmount = prev
        existing.lastHandAmount = handAmount
        existing.amount = pulled
        existing.kou += 1
      } else {
        next.push({
          creditor,
          debtor,
          amount: handAmount,
          kou: 1,
          lastHandAmount: handAmount,
          prevAmount: 0,
        })
      }
    }
  }

  void maxLaKou
  return { ledger: next, settled }
}

/** 本鋪拉帳令某座位「應收／應付」變動（再食含 ×1.5 滾存） */
export function laDeltaForSeat(ledger: LaEntry[], seat: Seat): number {
  let net = 0
  for (const e of ledger) {
    if (e.lastHandAmount == null) continue
    const prev = e.prevAmount ?? 0
    const delta = e.amount - prev
    if (e.creditor === seat) net += delta
    if (e.debtor === seat) net -= delta
  }
  return net
}

/** 斬拉：即時找清某一對 */
export function chopLa(
  ledger: LaEntry[],
  creditor: Seat,
  debtor: Seat,
): LaApplyResult {
  const entry = findEntry(ledger, creditor, debtor)
  if (!entry) {
    return { ledger, settled: [] }
  }
  return {
    ledger: ledger.filter((e) => !(e.creditor === creditor && e.debtor === debtor)),
    settled: [
      {
        from: debtor,
        to: creditor,
        amount: entry.amount,
        reason: '斬拉',
      },
    ],
  }
}

export function canChopLa(entry: LaEntry, maxLaKou: number): boolean {
  return entry.kou >= maxLaKou
}

/** 未結清帳顯示用：銀碼 → 番數文案（結清入金池時仍用 amount） */
export function formatLaFanDebt(e: LaEntry, fanValue: number): string {
  const kou = `${e.kou}口`
  const fv = Math.max(1, fanValue)
  const toFan = (n: number) => Math.round(n / fv)
  if (
    e.kou >= 2 &&
    e.lastHandAmount != null &&
    e.prevAmount != null &&
    e.prevAmount > 0
  ) {
    return `本局${toFan(e.lastHandAmount)}番 + 上局${toFan(e.prevAmount)}番×1.5 = ${toFan(e.amount)}番（${kou}）`
  }
  if (e.lastHandAmount != null) {
    return `本局${toFan(e.lastHandAmount)}番（${kou}）`
  }
  return `${toFan(e.amount)}番（${kou}）`
}

/** 埋單：全部拉數結清 */
export function settleAllLa(ledger: LaEntry[]): LaApplyResult {
  const settled = ledger.map((e) => ({
    from: e.debtor,
    to: e.creditor,
    amount: e.amount,
    reason: '埋單',
  }))
  return { ledger: [], settled }
}
