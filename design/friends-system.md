# 好友系統設計（Chess.com → 香港台麻）

對照：[加友](https://support.chess.com/en/articles/8609433-how-do-i-send-a-friend-request)、[同好友對局](https://support.chess.com/en/articles/8588467-how-do-i-play-a-friend)、Clubs／訊息（Community 說明）。

目標：喺「個人 → 社交」同大廳入口，做到**加友 → 名單 → 約局**，體驗對齊 Chess.com，但用語同流程跟港式台麻（房碼、排位／私人／普通）。

---

## 1. Chess.com 能力 → 台麻映射

| Chess.com | 香港台麻 | 優先 |
|-----------|----------|------|
| 用顯示名／個人頁加友 | **朋友碼**（已有）＋完場對手「加為好友」 | P0 |
| 請求：接受／拒絕／忽略 | 待處理請求匣（收／發） | P0 |
| 好友名單 | 已接受名單（顯示名、朋友碼、段位可選） | P0 |
| 在線綠／橘燈 | 大廳／名單狀態：離線／網上／對局中 | P1 |
| Play a Friend（Live／Daily） | **約局**：開私人房並邀請／發挑戰（枱規＋時限） | P1 |
| 完場後加友 | 結算／重播對手卡「加友」 | P1 |
| 訊息／Inbox | 系統通知（請求、約局）先；自由私訊 later | P2 |
| Clubs | **枱團**（已有頁殼）— 成員、團房 later | P2 |
| Follow（單向） | 唔做；台麻以雙向好友為主 | — |
| 地理／常遇 | 本機常遇對手已有；帳戶常遇 later | P2 |

原則（跟 `PRODUCT.md`）：
- **唔登入都打得**；好友係帳戶層能力。
- 無 session 時社交頁只顯示本機備忘（已有朋友碼清單），並引導開帳戶／登入。
- 約局走現有**私人房**，唔另造棋類「Daily 通信對局」。

---

## 2. 產品流程

### 2.1 加友

1. 輸入對方**朋友碼**（或由完場對手一鍵帶碼）。
2. 發送請求（對方未接受前可取消）。
3. 對方在「收到嘅請求」接受／拒絕。
4. 雙方名單出現對方（顯示名 + 朋友碼縮寫）。

限制（防濫用，對齊 Chess 限額精神）：
- 待處理**發出**請求 ≤ 10。
- 已接受好友 ≤ 200（可調）。
- 唔可以加自己；封鎖關係 later（P2）。

### 2.2 名單同狀態（P1）

每列：頭像色字、顯示名、朋友碼、狀態點。

| 狀態 | 含義 |
|------|------|
| 灰 | 離線／未知 |
| 綠 | 近期有帳戶活動（心跳／開過大廳） |
| 金 | 正在某房對局中（`player_rooms`） |

### 2.3 約局（P1）

對齊「Play a Friend」：
1. 好友列「約局」→ 選枱規草稿（沿用 `RulesDraft`）＋玩法（私人為主）。
2. 系統開房並產生邀請（房碼 + 深鏈 `#/join/CODE`）。
3. 對方通知／社交頁「約局邀請」接受 → 入席。

Live 挑戰超時：邀請 10 分鐘失效（對方唔使在線「Daily」唔適用；台麻一舖係即時枱）。

### 2.4 枱團（P2）

保留現有殼；實體：團名、成員、團專用私人房。唔做 Chess Vote Chess／Club Arena。

---

## 3. 資料模型（D1）

```sql
-- migrations/0003_friends.sql
friendships (
  id TEXT PK,
  requester_id TEXT NOT NULL,   -- 發起
  addressee_id TEXT NOT NULL,   -- 接收
  status TEXT NOT NULL,         -- pending | accepted | declined
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (requester_id, addressee_id)
)
```

查詢習慣：接受後仍保留方向列；名單 API 正規化成「對方係邊個」。

F2 已加：
- `players.last_seen_at`（`0004_friends_f2.sql`）
- `friend_challenges`（room_code、expires_at 10 分鐘）

Later：
- `friend_blocks`
- 枱團實體

---

## 4. API（帳戶 cookie）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/friends` | `friends` / `incoming` / `outgoing` / `challenges`（含 presence） |
| POST | `/api/friends/request` | body `{ friendCode }` |
| POST | `/api/friends/:id/accept` | 接受 |
| POST | `/api/friends/:id/decline` | 拒絕 |
| DELETE | `/api/friends/:id` | 取消 pending 或解除好友 |
| POST | `/api/friends/presence` | 心跳（更新 last_seen） |
| POST | `/api/friends/challenge` | body `{ friendshipId }` → 開私人房＋邀請；可選 `roomCode` → **房間內邀請**（唔新開房） |
| POST | `/api/friends/challenges/:id/accept` | 回傳 `roomCode` |
| POST | `/api/friends/challenges/:id/decline` | 拒絕／取消 |
| GET | `/api/friends/peers?code=` | 同房對手朋友碼（結算加友） |

錯誤碼：`no_session`、`not_found`、`self`、`already`、`limit_pending`、`limit_friends`、`limit_challenge`、`expired`。

---

## 5. UI 資訊架構

**個人 → 社交**（`#/you/social`）分三段（Chess Friends 頁壓縮版）：

1. **我嘅朋友碼**（複製）
2. **請求**（收到／已送出）
3. **好友名單**（搜尋過濾 + 約局按鈕 P1）
4. **常遇對手**（本機；可「加友」若有碼）
5. **枱團**（殼）

大廳可加次要入口「約好友」（P1，連去社交或約局 modal）。

---

## 6. 分期

| 期 | 內容 | 狀態 |
|----|------|------|
| **F0** | 本機朋友碼備忘＋常遇 | 已有 |
| **F1** | D1 好友請求／名單 API＋社交頁接真資料 | 已落地（`0003_friends.sql`、`/api/friends*`、`SocialPane`） |
| **F2** | 在線狀態＋約局邀請＋結算加友 | 已落地（`0004_friends_f2.sql`、presence／challenge／peers、結算加友、`#/join/CODE`） |
| **F2.1** | UX：社交角標、名單排序、約局倒數／複製連結／回房、大廳心跳、解除確認 | 已落地 |
| **F2.2** | 房間內邀請：私人房大廳選好友 → 沿用現有 `roomCode` 發約局 | 已落地（`RoomInvite`、`inviteFriendToRoom`） |
| **F3** | 枱團實體、通知鈴、封鎖 | later |

---

## 7. 非目標

- 單向 Follow、公開動態牆、地理地圖好友。
- 真錢枱、強制電郵先加友（匿名帳戶有朋友碼都可以互相加；建議有顯示名）。
- 引擎規則改動。

---

## 8. 成功標準

- 兩部機／兩個帳戶用朋友碼可以完成「請求→接受→名單見到」。
- 未開 Worker 時社交頁降級本機備忘，唔崩。
- 介面繁中粵語口語，對齊現有 `you-pane`／設定帳戶風格。
