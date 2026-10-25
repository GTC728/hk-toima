import type { Action } from '../engine'
import { requestClaim, requestDiscard, requestWin } from './extraPrefs'

/** 統一過設定確認（食／鳴／打牌） */
export function gateAction(action: Action, send: (a: Action) => void): void {
  if (action.type === 'win') {
    requestWin(() => send(action))
    return
  }
  if (
    action.type === 'pong' ||
    action.type === 'chi' ||
    action.type === 'mingkong' ||
    action.type === 'ankong' ||
    action.type === 'jiagang'
  ) {
    const label =
      action.type === 'pong'
        ? '確定碰？'
        : action.type === 'chi'
          ? '確定上？'
          : '確定槓？'
    requestClaim(() => send(action), label)
    return
  }
  if (action.type === 'discard') {
    requestDiscard(() => send(action))
    return
  }
  send(action)
}
