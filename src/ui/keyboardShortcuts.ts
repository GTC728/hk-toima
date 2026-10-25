/** 牌局鍵盤捷徑（設定頁列表＋ TableView 實際綁定） */

export const TABLE_SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Esc', action: '取消揀牌' },
  { keys: 'Enter', action: '打出已揀嘅牌' },
  { keys: 'Space', action: '摸牌／過（視乎而家合法）' },
  { keys: 'P', action: '碰' },
  { keys: 'C', action: '上（第一個合法選項）' },
  { keys: 'K', action: '槓（明／暗／加，優先可用）' },
  { keys: 'H', action: '食糊' },
  { keys: 'D', action: '切換叮（打牌時）' },
]
