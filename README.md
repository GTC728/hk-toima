# 香港台麻 HK ToiMA

港式台牌（十六張）網頁 app：本機輪流／補 AI，以及網上房間碼聯機。

**規則依據：** [港式台牌玩法規則](https://mahjonglogbook.com/guides/hk-taiwanese-mahjong-rules/) · [番數表](https://mahjonglogbook.com/guides/hk-taiwanese-mahjong-scoring-table/)

預設枱規：$10 底、$2 一番、拉三口可斬。

## 指令

```bash
npm install
npm test           # vitest（引擎）
npm run build      # 前端 production build
npm run dev        # Vite 本機 UI（http://localhost:5173）
npm run worker:dev # Cloudflare Worker + Room DO（http://127.0.0.1:8787）
```

### 本機打牌

1. `npm run dev`
2. 大廳選「本機」→ 設底／番值／拉口 → 揀幾位真人 → 開枱

### 網上聯機（要開兩個進程）

1. 終端 A：`npm run worker:dev`（權威房間，port 8787）
2. 終端 B：`npm run dev`（Vite 會把 `/api` 同 WebSocket proxy 去 8787）
3. 大廳「開房」→ 大字房碼給朋友 → 對方「入房」輸入房碼
4. 房主可「空位補 AI」、調枱規後「開始打牌」
5. 重連：`localStorage` 存 `seatToken`；大廳「入房」可用「重連上次房間」

只開 Vite 而無 worker 時，開房／入房會失敗。

## 上線（手機可玩）

建議：**GitHub 存碼 + Cloudflare Workers 部署**（本專案已有房間 Durable Object，同一條 `*.workers.dev` 同時提供 UI 同聯機）。

```bash
# 1）登入 Cloudflare（本機互動一次）
npx wrangler login

# 2）build 前端 + 部署 Worker／靜態資源／房間 DO
npm run deploy
```

成功後終端會印出例如 `https://hk-toima.<你的帳號>.workers.dev` —— 手機瀏覽器開呢個網址即可（本機對打／開房聯機都得）。

| 做法 | 適合 | 備註 |
| --- | --- | --- |
| `npm run deploy` → Workers | 正式／朋友聯機 | 免費額度通常夠玩；要自訂域名可喺 CF Dashboard 綁 |
| 本機 `npm run dev -- --host` + 同一 Wi‑Fi | 自己試手機 UI | 聯機仍要另開 `worker:dev`；唔經公網 |
| Cloudflare Tunnel／ngrok 轉發本機 | 臨時分享 | 唔使正式 deploy，但電腦要開住 |

GitHub 只係存碼／CI；真正畀手機開嘅係 Workers 網址，唔係 `github.com` 頁面。

## 引擎 API

```ts
import {
  createGame,
  applyAction,
  getPublicView,
  getPrivateView,
  getLegalActions,
  discardAndResolve,
  autoPassImpossibleClaims,
} from './src/engine'

const state = createGame({ seed: 1, rules: { base: 10, fanValue: 2, maxLaKou: 3 } })
const next = applyAction(state, { type: 'discard', tile }, seat)
const pub = getPublicView(next)
const me = getPrivateView(next, seat)
```

| 函數 | 用途 |
| --- | --- |
| `createGame(config?)` | 開局（洗牌、派牌、補花、莊家摸牌） |
| `applyAction(state, action, actor?)` | 純 reducer：摸／打／鳴／食／叮／拉數 |
| `getPublicView(state)` | 公開枱面（手牌只顯示張數） |
| `getPrivateView(state, seat)` | 座位私有視圖 + `legalActions` |
| `getLegalActions(state, seat)` | 合法動作列表 |
| `discardAndResolve` / `autoPassImpossibleClaims` | 測試／AI 便利：自動 pass 無法鳴牌者 |

## 網上協議（摘要）

見 `worker/protocol.ts`：

- `POST /api/rooms` → `{ code, seat, seatToken, wsPath }`
- `POST /api/rooms/:code/join`（可帶 `seatToken` 重連）
- `GET /api/rooms/:code/ws?seat=&token=` WebSocket
- Client：`start`（可帶 `rules`）、`fillAi`、`action` 等
- Server：`room`、`private`（私有枱面）、`public`、`error`

## 目錄

```
src/engine/     # 共用引擎 + fans.json（常見枱表預設）+ tests
src/ui/         # 大廳、本機枱、網上房、番表、結算
src/ui/online/  # HTTP／WS／seatToken
worker/         # Room Durable Object + HTTP API
design/         # 番表互斥、參考來源（fan-refs.md）
```

預設番數＝多來源眾數（Ting 坊間系，唔跟麻雀數簿偏高檔）：見 `design/fan-survey.md`。

## 已補齊（相對初版）

- 上／碰後打牌（唔再錯摸一張）
- 網上房主改枱規即時同步；五同順番數可調
- 即時賞罰：圍骰／一二三、一台花／草、七搶一／一搶七、八仙、暗槓；枱面 toast
- 正花／爛花分開計；十六不搭、天地人胡、字一色、四五同順、河底／海底、雪上霜／冰、無字花等

## 仍暫不做

帳號登入、真錢、語音報牌、完整 100+ 番種、比賽級犯規系統。
