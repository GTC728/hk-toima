/**
 * 本機牌譜庫：局終寫入，重溫／統計可讀。
 */
import type { GameRecord } from '../engine'

const KEY = 'toima.gameRecords.v1'
const MAX = 40

function readAll(): GameRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is GameRecord =>
        !!r &&
        typeof r === 'object' &&
        (r as GameRecord).version === 1 &&
        Array.isArray((r as GameRecord).plies),
    )
  } catch {
    return []
  }
}

function writeAll(list: GameRecord[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    /* quota */
  }
}

export function saveGameRecord(record: GameRecord): void {
  const list = readAll().filter(
    (r) =>
      !(
        r.header.seed === record.header.seed &&
        r.header.round === record.header.round
      ),
  )
  list.unshift(record)
  writeAll(list)
}

export function loadGameRecord(
  seed: number,
  round?: number,
): GameRecord | null {
  const list = readAll()
  if (round != null) {
    return (
      list.find(
        (r) => r.header.seed === seed && r.header.round === round,
      ) ?? null
    )
  }
  return list.find((r) => r.header.seed === seed) ?? null
}

export function listGameRecords(): GameRecord[] {
  return readAll()
}

export function deleteGameRecord(seed: number, round: number): void {
  writeAll(
    readAll().filter(
      (r) => !(r.header.seed === seed && r.header.round === round),
    ),
  )
}
