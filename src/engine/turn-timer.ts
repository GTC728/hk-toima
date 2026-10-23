/** Helpers for turn / claim countdown (local UI + Room DO). */

export function deadlineFromOpened(
  openedAtMs: number,
  timeoutSec: number,
): number {
  return openedAtMs + Math.max(0, timeoutSec) * 1000
}

/** Whole seconds remaining; 0 when expired. */
export function remainingSec(deadlineAtMs: number, nowMs = Date.now()): number {
  return Math.max(0, Math.ceil((deadlineAtMs - nowMs) / 1000))
}

export function isExpired(deadlineAtMs: number, nowMs = Date.now()): boolean {
  return nowMs >= deadlineAtMs
}
