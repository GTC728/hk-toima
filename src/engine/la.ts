import type { LaEntry, Seat, WinResult } from './types'

function key(creditor: Seat, debtor: Seat): string {
  return `${creditor}:${debtor}`
}

function findEntry(ledger: LaEntry[], creditor: Seat, debtor: Seat): LaEntry | undefined {
  return ledger.find((e) => e.creditor === creditor && e.debtor === debtor)
}

/**
 * 將一鋪贏嘅付款記入拉數簿。
 * - 再食同一人：舊數 ×1.5 + 今鋪，kou+1
 * - 反食（踢半）：清舊數時只收一半，新方向開新帳
 * - 其他人有關嘅帳（涉及今鋪贏家或輸家以外嘅拉）— 「其他人食糊，條數即時結清」
 *   簡化：任何與本鋪付款無關嘅兩人之間帳目，喺有人食糊時結清（回傳 settled）
 */
export interface LaApplyResult {
  ledger: LaEntry[]
  /** 即時結清嘅款（踢半、斬、其他人食糊清帳） */
  settled: { from: Seat; to: Seat; amount: number; reason: string }[]
}

export function applyWinToLa(
  ledger: LaEntry[],
  wins: WinResult[],
  maxLaKou: number,
): LaApplyResult {
  let next = ledger.map((e) => ({ ...e }))
  const settled: LaApplyResult['settled'] = []

  const involved = new Set<Seat>()
  for (const w of wins) {
    involved.add(w.seat)
    for (const p of w.payments) {
      involved.add(p.from)
      involved.add(p.to)
    }
  }

  // 其他人食糊 → 與本鋪無關嘅拉帳即時結清
  // 規則：「其他人食糊，條數就即時結清」— 指非拉數雙方嘅人食糊時，原拉數結清
  // 實作：若贏家可不在某條拉帳雙方內，該條結清
  const winners = new Set(wins.map((w) => w.seat))
  next = next.filter((e) => {
    if (!winners.has(e.creditor) && !winners.has(e.debtor)) {
      settled.push({
        from: e.debtor,
        to: e.creditor,
        amount: e.amount,
        reason: '其他人食糊結清',
      })
      return false
    }
    return true
  })

  for (const w of wins) {
    for (const pay of w.payments) {
      const creditor = pay.to
      const debtor = pay.from
      const handAmount = pay.amount

      // 反方向：debtor 曾係 creditor → 踢半
      const reverse = findEntry(next, debtor, creditor)
      if (reverse) {
        const half = Math.round(reverse.amount / 2)
        settled.push({
          from: creditor,
          to: debtor,
          amount: half,
          reason: '踢半',
        })
        next = next.filter((e) => !(e.creditor === debtor && e.debtor === creditor))
      }

      const existing = findEntry(next, creditor, debtor)
      if (existing) {
        const pulled = Math.round(existing.amount * 1.5) + handAmount
        existing.amount = pulled
        existing.kou += 1
      } else {
        next.push({
          creditor,
          debtor,
          amount: handAmount,
          kou: 1,
        })
      }
    }
  }

  void maxLaKou
  void involved
  void key
  return { ledger: next, settled }
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
