# 戰績／分析 backlog（Chess.com → 香港台麻）

來源對照：

- 個人頁：https://www.chess.com/member/gtc728（綜述／棋局／統計／朋友／獎／俱樂部）
- Insights：https://www.chess.com/insights?type=2&timeClass=rapid&dateRange=last30#overview  
  （篩選：類型／時間班／日期；區塊：棋局、綜述、對局結果、對局類型、遊戲階段、開局、戰術、著法、日曆、地理）
- 官方說明：[What is Insights](https://support.chess.com/en/articles/8708925-what-is-insights-on-chess-com)

對照原則：棋類專屬（開局譜、王車易位、兵種著法準確率）改成**台麻可算／可顯示**嘅指標；真錢、外站地理、鑽石付費鎖可做但標 `later`。

狀態：`have`＝而家已有粗胚 · `now`＝可做 · `later`＝缺產品／數據管線 · `na`＝唔適用。

---

## 映射速查

| Chess.com | 香港台麻 |
|-----------|----------|
| Bullet／Blitz／Rapid／Daily | 玩法：普通匹配／排位／私人／AI；可再分出牌時限档 |
| Rating／段位 | 排位分＋段位（已有） |
| Accuracy（引擎） | **規則向準確率**：跟提示、可糊未糊、危險出銃、逾時率（無引擎） |
| Opening／Middlegame／Endgame | **局階段**：早（牆剩多）／中／晚（牆剩少／聽牌後） |
| White／Black | **莊／閑**；或門風（東南西北） |
| Book moves | 常見起手棄牌／門花節奏（規則庫，非開局書） |
| Tactics fork／pin／mate | 可碰未碰、可槓未槓、可糊未糊、出銃、漏花 |
| Game shape（優劣曲線） | 現金／拉帳曲線形狀 |
| Opponent rating band | 對手排位分差帶 |
| Time of day／weekday | 時段／星期勝率 |
| Geography | later；暫代：人／AI／性格 |
| Awards／Clubs／Friends | 成就／房間／好友（社交 later） |

---

## A. 個人檔案殼（Chess 綜述頭）

| # | Chess 項 | 台麻項 | 狀態 |
|---|----------|--------|------|
| 1 | Avatar | 頭像（帳戶／本機） | have（色＋字；上傳 later） |
| 2 | Username | 顯示名／暱稱 | have |
| 3 | Real name | 可選真名（私隱） | have（本機） |
| 4 | Status / bio | 狀態一句 | have（本機） |
| 5 | Country flag | 地區標（可選） | have（本機） |
| 6 | Membership badge | 帳戶等級／支援者（若有） | later（產品未定） |
| 7 | Streak fire | 連玩日數／連勝火 | have |
| 8 | Join date | 加入日／首局日 | have |
| 9 | Friends count | 好友數 | have（本機清單數；真加友 later） |
| 10 | Profile views | 個人頁瀏覽（需帳戶） | have（本機計數） |
| 11 | Online now | 在線狀態 | later（需社交後端） |
| 12 | Edit profile | 編輯個人（已有帳戶連結） | have |
| 13 | Tab: Overview | 綜述 | have |
| 14 | Tab: Games | 牌局紀錄 | have |
| 15 | Tab: Stats | 統計 | have |
| 16 | Tab: Friends | 朋友 | have（本機殼；真好友 later） |
| 17 | Tab: Awards | 成就 | have |
| 18 | Tab: Clubs | 俱樂部／枱團 | have（頁殼；實體 later） |
| 19 | Activity feed | 近期動態（完局／升級） | have |
| 20 | Membership card | 帳戶卡（登入狀態） | have |

---

## B. 統計表（Chess「你的統計」時間班表）

| # | Chess 項 | 台麻項 | 狀態 |
|---|----------|--------|------|
| 21 | Rapid rating | 排位分 | have |
| 22 | Blitz rating | （無對應）合併入「快速枱」若有短時限 | have（時限档 short） |
| 23 | Rapid rating | 普通匹配分／勝率（非排位） | have |
| 24 | Daily rating | 私人房長期局統計 | have |
| 25 | Rating Δ | 分數升跌（場後／日） | have |
| 26 | Games played / mode | 各玩法場數 | have |
| 27 | W / L / D | 勝／負／流（按場或按局） | have |
| 28 | Win % | 勝率 | have |
| 29 | Best rating | 最高排位分 | have |
| 30 | Timeout % | 逾時次數／比例 | have |
| 31 | Avg game length | 平均一場圈數／分鐘 | have |
| 32 | Opening skill rating | 早段表現分（規則估） | have |
| 33 | Tactics skill | 「戰術」分：鳴／糊把握 | have |
| 34 | Strategy skill | 「策略」分：聽牌／棄險 | have |
| 35 | Endgame skill | 晚段表現分 | have |
| 36 | Date filter 90d / all | 篩選：7／30／90／全部 | have |
| 37 | Advanced stats toggle | 進階統計開關 | have |
| 38 | Show more stats | 展開更多列 | have |

---

## C. Insights 篩選殼

| # | Chess 項 | 台麻項 | 狀態 |
|---|----------|--------|------|
| 39 | Type filter（rated…） | 類型：排位／普通／私人／AI／全部 | have |
| 40 | Time class | 時限档：短／標準／長（跟枱規秒數） | have |
| 41 | Date range last30 | 日期範圍 | have |
| 42 | Similar players tab | 相近段位對照（匿名聚合） | later（需匿名聚合後端） |
| 43 | Past performance tab | 同上期對比（Δ） | have |
| 44 | By color tab | 按莊／閑拆 | have |
| 45 | By phase tab | 按早中晚拆 | have |
| 46 | Short vs long | 短局 vs 長局（圈數／耗時） | have |

---

## D. 綜述 Overview

| # | Chess 項 | 台麻項 | 狀態 |
|---|----------|--------|------|
| 47 | Games played over time | 場／局數時間線 | have |
| 48 | Avg accuracy over time | 準確率（規則向）時間線 | have |
| 49 | Accuracy by move number | 按巡數／摸打序準確率 | have（巡數帶） |
| 50 | Results by opponent rating | 對不同分數帶對手結果 | have |
| 51 | Games won / drawn / lost counts | 場勝負流局數 | have |
| 52 | Accuracy when win／lose | 勝／負時「準確率」 | have |
| 53 | Performance rating (per game) | 單場表現分（相對對手） | have |

---

## E. 對局結果 Game Results

| # | Chess 項 | 台麻項 | 狀態 |
|---|----------|--------|------|
| 54 | Won by checkmate | 自摸勝場／局 | have |
| 55 | Won by resignation | （無投降勝）→ 對手斷線勝 | have（你中離／對手中離代理；真斷線偵測 later） |
| 56 | Won by timeout | 對手逾時勝 | have |
| 57 | Won by abandonment | 對手離開勝 | have（同 #55 代理；真偵測 later） |
| 58 | Lost by checkmate | 被自摸／被出銃輸 | have |
| 59 | Lost by timeout | 自己逾時輸 | have |
| 60 | Drawn by agreement | （無）流局協議 → na | na |
| 61 | Drawn by repetition | 流局（牆盡／特殊） | have |
| 62 | Drawn stalemate / 50-move | na | na |
| 63 | Place distribution 1st–4th | 一場名次分布（排位已有名次） | have |
| 64 | Avg placement | 平均名次 | have |
| 65 | Net $ / fan over period | 淨銀／總番（已有總量） | have |
| 66 | Biggest win / loss streak | 最長連勝／連衰 | have |
| 67 | Current streak | 而家連勝／連衰 | have |

---

## F. 對局類型／形狀 Game Shapes

| # | Chess 項 | 台麻項 | 狀態 |
|---|----------|--------|------|
| 68 | Shape wheel | 曲線類型：穩贏／翻盤／崩盤／拉鋸 | have |
| 69 | Results by shape | 各形狀勝率 | have |
| 70 | Accuracy by shape | 各形狀準確率 | have |
| 71 | Comeback rate | 中段落後→最終前二比例 | have |
| 72 | Collapse rate | 領先→最終後二比例 | have |
| 73 | Dealer vs non-dealer W% | 坐莊勝率 vs 閑 | have |
| 74 | Seat wind W% | 東南西北勝率 | have |

---

## G. 遊戲階段 Phases

| # | Chess 項 | 台麻項 | 狀態 |
|---|----------|--------|------|
| 75 | Ended in opening | 早段已定勝負（少見）／早段結束局 | have |
| 76 | Ended middlegame | 中段結束 | have |
| 77 | Ended endgame | 晚段結束 | have |
| 78 | Accuracy opening | 早段準確率 | have |
| 79 | Accuracy middlegame | 中段準確率 | have |
| 80 | Accuracy endgame | 晚段準確率 | have |
| 81 | Results by end-phase | 各階段結束時名次／勝率 | have |
| 82 | Tenpai rate by phase | 各階段首次聽牌率 | have |
| 83 | Avg wall remaining at win | 食糊時平均牆剩 | have |
| 84 | Avg turns to first meld | 首次副露平均巡 | have |

---

## H. 「開局」→ 起手／結構

| # | Chess 項 | 台麻項 | 狀態 |
|---|----------|--------|------|
| 85 | Top openings White | 莊家常見起手棄牌 Top10 | have |
| 86 | Top openings Black | 閑家常見起手棄牌 Top10 | have |
| 87 | Opening W/L | 各起手模式勝率 | have |
| 88 | Book moves avg | 跟「標準起手」巡數（規則表） | have（跟／偏離率） |
| 89 | Left book first % | 偏離標準起手比例 | have |
| 90 | First discard suit mix | 首棄：萬筒索字比例 | have |
| 91 | Flower timing | 補花／露花時機分布 | have（終局階段粗分） |
| 92 | Ding declare rate／timing | 叮宣布率／平均巡 | have |
| 93 | Prefer suit bias | 主攻門（萬／筒／索）偏好 | have |

---

## I. 戰術 Tactics（規則事件）

| # | Chess 項 | 台麻項 | 狀態 |
|---|----------|--------|------|
| 94 | Mate in 1 found／missed | **可糊**：把握／錯過 | have |
| 95 | Mate in 2… | 聽牌後 N 巡內食糊率 | have |
| 96 | Forks found／missed | **可碰**把握／錯過 | have |
| 97 | Pins | **可吃／上**把握／錯過 | have |
| 98 | Hanging pieces you | 你打出危險牌（出銃） | have |
| 99 | Hanging pieces opp | 對手打出你食得嘅牌次數 | have |
| 100 | Kong opportunities | 可槓／漏槓 | have |
| 101 | Rob kong | 搶槓次數 | have |
| 102 | False tenpai / dangerous discard | 聽牌時險棄率 | have（聽牌後出銃率） |
| 103 | Claim pass then regret | 過牌後同巡被他人鳴 | have |

---

## J. 著法品質 Moves（無引擎版）

| # | Chess 項 | 台麻項 | 狀態 |
|---|----------|--------|------|
| 104 | Brilliant % | 「神棄」：提示最高分且未出銃（練習局） | have（跟提示率） |
| 105 | Best / Great / Good | 跟練習提示等級分布 | have |
| 106 | Inaccuracy／Mistake／Blunder | 偏離提示／出銃／可糊未糊 | have |
| 107 | Move quality over time | 品質時間線 | have |
| 108 | Hint follow rate | 練習提示跟從率 | have |
| 109 | Auto-draw／auto-pass usage | 自動摸／過使用率 | have |
| 110 | Avg decision time | 平均出牌／鳴牌用時 | have |
| 111 | Low-time moves % | 低時倉促操作比例 | have |

---

## K. 「棋子」→ 牌種／操作類型

| # | Chess 項 | 台麻項 | 狀態 |
|---|----------|--------|------|
| 112 | Piece move frequency | 棄牌門類頻率 | have |
| 113 | Piece accuracy | 各門棄牌後出銃率 | have |
| 114 | Honor tile handling | 字牌／三元處理（留／打／碰） | have |
| 115 | Terminals (1/9) bias | 幺九偏好 | have |
| 116 | Meld type mix | 碰／吃／槓／暗槓比例 | have |
| 117 | Closed vs open hand | 門清勝率 vs 有副露 | have |

---

## L. 日曆／地理／社交周邊

| # | Chess 項 | 台麻項 | 狀態 |
|---|----------|--------|------|
| 118 | By hour of day | 時段勝率／場數 | have |
| 119 | By weekday | 星期分布 | have |
| 120 | Heatmap calendar | 打幾日／連續日 | have |
| 121 | Geography map | 對手地區 | later（需對手地區＋地圖） |
| 122 | Opponent list | 常遇對手（帳戶） | have（本機名；跨裝置 later） |
| 123 | vs AI persona W% | 對穩陣／進攻／搏糊勝率 | have |
| 124 | Human vs AI W% | 人局 vs AI 局 | have |
| 125 | Awards count | 成就數 | have |
| 126 | Award gallery | 成就牆 | have |
| 127 | Clubs list | 枱團 | have（頁殼；實體 later） |
| 128 | Favorite games | 收藏牌局 | have |
| 129 | Game history search | 紀錄搜尋／篩選 | have |
| 130 | Export games／stats | 匯出（帳戶已有部分） | have |
| 131 | Insights privacy | 戰績公開／僅自己 | have（本機偏好；公開 API later） |
| 132 | Compare to similar MMR | 同段位基準線 | later（需匿名聚合後端） |

---

## M. 台麻專屬加項（Chess 無直接對應，Insights 同級）

| # | 台麻項 | 狀態 |
|---|--------|------|
| 133 | 平均食糊番數 | have |
| 134 | 最高單次番 | have |
| 135 | 番種 Top（食糊時） | have |
| 136 | 自摸率 vs 出銃食率 | have |
| 137 | 出銃率（deal-in） | have |
| 138 | 拉帳淨額／口數 | have |
| 139 | 一台花／暗槓即時賞罰次數 | have |
| 140 | 流局時聽牌率 | have |
| 141 | 四圈場完名次（已排位） | have |
| 142 | 枱規組合表現（底／$/番） | have |
| 143 | 重播觀看次數 | have |

**合計：143 項**（≥100）；`na` 已標明。

---

## 分批計劃

### Batch S0 — 已有（唔重做）
- 基本戰績格子、近期列表、排位分／段位／場數／峰值、自摸／出銃／流局／淨銀  
- 對應約：#2 #12 #15 #20 #21 #29 #54 #58 #61 #65 #98 #130 #136 #137 #141

### Batch S1 — 戰績殼＋篩選（已做）
- [x] 戰績頁分 Tab：綜述／牌局／統計（#13–15）  
- [x] 篩選：玩法類型、日期範圍（#36 #39 #41）  
- [x] 勝率、各玩法場數、連勝／連衰（#26–28 #66–67）  
- [x] 活動一條：最近完局（#19）  
- [x] **數據**：`MatchRecord`（名次、playKind、時長）＋完場寫入

### Batch S2 — 結果同名次（已做）
- [x] 名次分布、平均名次、莊閑勝率、門風勝率（#63–64 #73–74）  
- [x] 逾時統計（自己被自動操作；#30）  
- [x] 人／AI／性格對照（#123–124）  
- [x] 完場寫入座位、vsAi、性格、逾時次數

### Batch S3 — 階段同節奏（已做）
- [x] 早／中／晚定義（牆剩閾值）＋結束階段分布（#75–77 #81）
- [x] 聽牌巡、食糊牆剩、首副露巡（#82–84）
- [x] 短 vs 長（#46 #31）
- [x] 時段／星期簡易表（#118–120；完整日曆熱圖留 S6＋）

### Batch S4 — 戰術事件（引擎無關）（已做）
- [x] 可糊／可碰／可上／可槓：出現／把握／錯過（#94–97 #100）＋搶槓次數（#101）
- [x] 對手打給你（可鳴／糊窗；#99）
- [x] 門清 vs 副露、副露類型比（#116–117）
- [x] 練習提示跟從率＋自動摸／過（#108–109）

### Batch S5 — 「開局」偏好＋牌種（已做）
- [x] 首棄門類、主攻門、字牌／幺九棄牌比（#90 #93 #112 #114–115）  
- [x] 叮宣布率／平均巡、平均花數（#91–92；花時機細分 later）  
- [x] 番種 Top、平均／最高番（#133–135）

### Batch S6 — Insights 頁（獨立「作戰分析」）（已做）
- [x] 新入口 `#/insights`＋大廳／戰績連入（#37–38）  
- [x] 時間線：每日場數／勝率／排位分（#47–48 #51）  
- [x] 對手分差帶結果（排位／AI；#50）  
- [x] 同上期對比（#43）  
- [x] 準確率 v1 定義（`design/accuracy-v1.md`）＋合成指標（#52）

### Batch S7 — 形狀／進階準確／對照（已做；段位基準 later）
- [x] 現金曲線形狀：穩贏／翻盤／崩盤／拉鋸／穩輸＋翻盤／崩盤率（#68–72）  
- [x] 階段把握（早中晚機會）、表現分、著法品質粗分（#53 #78–80 簡化；#104–106）  
- [ ] 相近段位基準（#42 #132）— 需匿名聚合後端（頁面已標未開放）  
- [x] 按巡細準確（#49）→ S12

### Batch S8 — 社交／成就／私隱（本機已做；社交後端 later）
- [x] 成就系統＋牆、連玩火、近八週熱圖（#7 #17 #120 #125–126）  
- [x] 地區／狀態一句、戰績可見偏好本機（#4–5 #131 預留；公開分享要 API）  
- [x] 社交／枱團頁殼＋朋友碼（#16 #18；本機清單／常遇 S12；真加友／在線 #11 later）  
- [ ] 頭像上傳、會員徽章、俱樂部實體（#1 上傳 #6 #127 實體）— 需帳戶／產品

### Batch S9 — 補漏（仍標 now、唔使後端）（已做）
- [x] 勝／負時準確率、時間線準確率（#48 #52）  
- [x] 牌局搜尋、各玩法勝率（#23–24 #129）  
- [x] 聽牌後幾巡食糊、各段首次聽牌、流局聽牌（#82 #95 #140）  
- [x] 棄牌門類出銃、拉帳／即時賞罰淨額（#113 #138–139）  
- [x] 決策用時／低時操作（#110–111）  
- 時限档篩選（#40）→ S10；對手逾時勝（#56）→ S11

### Batch S10 — 收尾（本機可做嘅 later／缺口）
- [x] 時限档篩選＋完場寫入出牌秒（#40）  
- [x] 排位分 Δ 日條（#25）  
- [x] 進階統計開關、各形狀準確率（#37–38 #70）  
- [x] 規則向技能分（早／戰術／策略／晚粗分；#32–35）  
- [x] 本機頭像色＋字（#1 lite；上傳仍 later）  
- [x] 收藏場次、重播觀看次數（#128 #143）  
- （段位基準／真好友仍要後端）

### Batch S11 — 逾時結果／首局／枱規（本機＋網上事件）
- [x] 首局日（#8）  
- [x] 對手逾時勝／自己逾時輸代理＋對手自動操作（#56 #59；網上靠「時限到」事件）  
- [x] 枱規組合表現：底／$/番／出牌秒（#142）  

### Batch S12 — 原表剩餘本機項收齊
- [x] 按巡準確帶、起手 Top／標準起手、聽牌出銃、過牌後悔、品質時間線、神棄率（#49 #85–89 #102–104 #107）  
- [x] 花時機粗分、真名、本機瀏覽數、本機朋友碼清單、常遇對手名、中離代理（#91 #3 #10 #9 #122 #55–57）  
- [ ] **仍要後端／產品**：頭像上傳、會員徽章、真在線、對手地理地圖、同段位基準線（#1 上傳 #6 #11 #121 #42 #132）

---

## 建議開工順序

1. **S1 → S2**（場級紀錄是後面所有圖表的根）  
2. **S3 → S4**（階段＋戰術事件，差異化最大）  
3. **S5 → S6**（偏好＋Insights 殼）  
4. **S7／S8** 按需求  
5. **S9 → S12** 補漏／收尾；之後只剩後端向

唔好一次做齊引擎式「準確率」；先用**可觀測規則事件**（可糊未糊、出銃、逾時、提示跟從）合成一個 0–100 分，再標清楚唔係 Chess CAPS。
