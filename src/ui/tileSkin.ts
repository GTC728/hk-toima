/** 牌面皮膚：一共 20 款 */

export type TileSkinId =
  | 'hk'
  | 'taiwan'
  | 'malaysia'
  | 'vietnam'
  | 'relief'
  | 'ivory'
  | 'black'
  | 'bone'
  | 'line'
  | 'emerald'
  | 'navy'
  | 'gold'
  | 'cinnabar'
  | 'frost'
  | 'jade'
  | 'ink'
  | 'dusk'
  | 'sakura'
  | 'cobalt'
  | 'lacquer'

export type LineThemeId = 'default' | 'ink' | 'warm'

export interface TileSkinArt {
  mode: 'art'
  /** 牌面圖資料夾 */
  faces: string
  /** Front／Back 資料夾 */
  body: string
  bodyExt: 'svg' | 'png'
  /** 面孔副檔名：svg 地區套／png 膠牌 */
  faceExt: 'svg' | 'png'
  /** 整隻牌 CSS filter（可選） */
  filter?: string
  /** 單圖（斜視／花牌路徑） */
  singleImage?: boolean
}

export interface TileSkinLine {
  mode: 'line'
  theme: LineThemeId
}

export type TileSkinRender = TileSkinArt | TileSkinLine

export interface TileSkinOption {
  id: TileSkinId
  name: string
  note: string
  render: TileSkinRender
}

export const TILE_SKINS: readonly TileSkinOption[] = [
  {
    id: 'hk',
    name: '港式紙牌',
    note: '藍字紅萬，黑框白紙',
    render: {
      mode: 'art',
      faces: 'hk',
      body: 'hk',
      bodyExt: 'svg',
      faceExt: 'svg',
    },
  },
  {
    id: 'taiwan',
    name: '台式牌面',
    note: '台灣字樣參考',
    render: {
      mode: 'art',
      faces: 'taiwan',
      body: 'taiwan',
      bodyExt: 'svg',
      faceExt: 'svg',
    },
  },
  {
    id: 'malaysia',
    name: '馬來牌面',
    note: '南洋風格',
    render: {
      mode: 'art',
      faces: 'malaysia',
      body: 'malaysia',
      bodyExt: 'svg',
      faceExt: 'svg',
    },
  },
  {
    id: 'vietnam',
    name: '越南牌面',
    note: '越式圖樣',
    render: {
      mode: 'art',
      faces: 'vietnam',
      body: 'vietnam',
      bodyExt: 'svg',
      faceExt: 'svg',
    },
  },
  {
    id: 'relief',
    name: '斜視立體',
    note: '有厚度的斜視牌',
    render: {
      mode: 'art',
      faces: 'relief',
      body: 'relief',
      bodyExt: 'svg',
      faceExt: 'png',
      singleImage: true,
    },
  },
  {
    id: 'ivory',
    name: '紅背膠牌',
    note: '白紙牌面，牌背全紅',
    render: {
      mode: 'art',
      faces: 'ivory',
      body: 'ivory',
      bodyExt: 'png',
      faceExt: 'png',
    },
  },
  {
    id: 'black',
    name: '黑底金字',
    note: '黑牌面，金字同白字',
    render: {
      mode: 'art',
      faces: 'black',
      body: 'black',
      bodyExt: 'png',
      faceExt: 'png',
    },
  },
  {
    id: 'bone',
    name: '暖色骨牌',
    note: '骨面暖色，牌背綠色',
    render: {
      mode: 'art',
      faces: 'ivory',
      body: 'bone',
      bodyExt: 'svg',
      faceExt: 'png',
    },
  },
  {
    id: 'line',
    name: '簡筆線條',
    note: '細牌都睇得清',
    render: { mode: 'line', theme: 'default' },
  },
  {
    id: 'emerald',
    name: '翡翠枱牌',
    note: '綠背象牙面',
    render: {
      mode: 'art',
      faces: 'ivory',
      body: 'emerald',
      bodyExt: 'svg',
      faceExt: 'png',
    },
  },
  {
    id: 'navy',
    name: '海軍藍背',
    note: '深藍背，清晰牌面',
    render: {
      mode: 'art',
      faces: 'ivory',
      body: 'navy',
      bodyExt: 'svg',
      faceExt: 'png',
    },
  },
  {
    id: 'gold',
    name: '琥珀金背',
    note: '金褐背，暖光',
    render: {
      mode: 'art',
      faces: 'ivory',
      body: 'gold',
      bodyExt: 'svg',
      faceExt: 'png',
    },
  },
  {
    id: 'cinnabar',
    name: '朱砂背',
    note: '深紅朱砂背',
    render: {
      mode: 'art',
      faces: 'ivory',
      body: 'cinnabar',
      bodyExt: 'svg',
      faceExt: 'png',
    },
  },
  {
    id: 'frost',
    name: '霜藍背',
    note: '冷調藍白',
    render: {
      mode: 'art',
      faces: 'ivory',
      body: 'frost',
      bodyExt: 'svg',
      faceExt: 'png',
    },
  },
  {
    id: 'jade',
    name: '玉框港字',
    note: '玉綠框＋港式字',
    render: {
      mode: 'art',
      faces: 'hk',
      body: 'jade',
      bodyExt: 'svg',
      faceExt: 'svg',
    },
  },
  {
    id: 'ink',
    name: '水墨紙牌',
    note: '墨框宣紙感',
    render: {
      mode: 'art',
      faces: 'hk',
      body: 'ink',
      bodyExt: 'svg',
      faceExt: 'svg',
      filter: 'contrast(1.08) saturate(0.92)',
    },
  },
  {
    id: 'dusk',
    name: '暮色背',
    note: '灰紫夜局',
    render: {
      mode: 'art',
      faces: 'ivory',
      body: 'dusk',
      bodyExt: 'svg',
      faceExt: 'png',
    },
  },
  {
    id: 'sakura',
    name: '櫻花粉背',
    note: '淺粉背',
    render: {
      mode: 'art',
      faces: 'ivory',
      body: 'sakura',
      bodyExt: 'svg',
      faceExt: 'png',
    },
  },
  {
    id: 'cobalt',
    name: '鈷藍背',
    note: '鮮明藍背',
    render: {
      mode: 'art',
      faces: 'ivory',
      body: 'cobalt',
      bodyExt: 'svg',
      faceExt: 'png',
    },
  },
  {
    id: 'lacquer',
    name: '黑漆金字',
    note: '黑漆背＋黑金牌面',
    render: {
      mode: 'art',
      faces: 'black',
      body: 'lacquer',
      bodyExt: 'svg',
      faceExt: 'png',
    },
  },
] as const

const BY_ID = Object.fromEntries(
  TILE_SKINS.map((s) => [s.id, s]),
) as Record<TileSkinId, TileSkinOption>

export function getTileSkinOption(id: TileSkinId): TileSkinOption {
  return BY_ID[id] ?? BY_ID.ivory
}

const KEY = 'hktoima.tileSkin'
const TILE_SKIN_IDS = new Set<string>(TILE_SKINS.map((s) => s.id))

export function parseTileSkin(raw: string | null): TileSkinId {
  if (raw && TILE_SKIN_IDS.has(raw)) return raw as TileSkinId
  return 'ivory'
}

function readStored(): TileSkinId {
  try {
    if (typeof localStorage === 'undefined') return 'ivory'
    return parseTileSkin(localStorage.getItem(KEY))
  } catch {
    return 'ivory'
  }
}

let current: TileSkinId = readStored()
const listeners = new Set<() => void>()

export function getTileSkin(): TileSkinId {
  return current
}

export function setTileSkin(id: TileSkinId) {
  if (id === current) return
  current = id
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* private mode */
  }
  listeners.forEach((listener) => listener())
}

export function subscribeTileSkin(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
