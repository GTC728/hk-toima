# 港式台牌番數 · 參考來源

本專案**預設番數**＝多來源**眾數**（以 Raymond Ting 坊間經典為主），**唔跟**麻雀數簿偏高檔。  
對照過程見 [`fan-survey.md`](./fan-survey.md)；數值以 [`src/engine/fans.json`](../src/engine/fans.json) 為準；互斥見 [`fan-exclusivity.md`](./fan-exclusivity.md)。

## 預設主源（Ting 系／眾數勝出）

| 來源 | 網址 | 用途 |
| --- | --- | --- |
| twmahjong.com · Raymond Ting | https://twmahjong.com/ | **預設主源**（全求人 15、清一色 80 等） |
| Ting 番數一覽 | http://www.twmahjong.com/twmj/TWMJPDAbyname.html | 同系完整列表 |
| Ting 鏡像 | http://adhoc-bet.appspot.com/twmj.htm | 同系 |

## 用戶指定補充參考

| 來源 | 網址 | 備註 |
| --- | --- | --- |
| Raymond Ting · 香港人的台灣麻雀番數表 | https://twmahjong.com/ | 早期坊間表；部分番數較舊（例：平胡 3、清一色 80）；五同順 40＋唔再計般高相逢與預設一致 |
| Studocu · 港式台牌番數表 | https://www.studocu.com/hk/document/%E9%A6%99%E6%B8%AF%E4%B8%AD%E6%96%87%E5%A4%A7%E5%AD%B8/understanding-china/%E6%B8%AF%E5%BC%8F%E5%8F%B0%E7%81%A3%E7%89%8C%E7%95%AA%E6%95%B8%E8%A1%A8-%E6%B8%AF%E5%BC%8F%E5%8F%B0%E7%81%A3%E7%89%8C%E7%95%AA%E6%95%B8%E8%A1%A8/100092098 | 課堂／筆記轉載；數值以對照為主 |
| Scribd · 台牌番數表 20210316（Ronald Hui v9） | https://www.scribd.com/document/646624560/%E5%8F%B0%E7%89%8C%E7%95%AA%E6%95%B8%E8%A1%A820210316 | 2021 枱表；部分項目與常見枱表不同（例：四／七／十子內、天胡、相逢档）——**唔作預設覆寫** |
| HK01 · 港式台灣麻雀計番對照 | https://www.hk01.com/%E9%81%8A%E6%88%B2%E5%8B%95%E6%BC%AB/425874/%E6%B8%AF%E5%BC%8F%E5%8F%B0%E7%81%A3%E9%BA%BB%E9%9B%80-%E6%96%B0%E5%B9%B4%E5%BF%85%E8%A3%9Dapp%E8%A8%88%E7%95%AA-%E5%AF%A6%E6%88%B0%E8%A6%8F%E5%89%87-%E8%A8%88%E7%95%AA%E5%B0%8D%E7%85%A7%E5%9C%96-%E4%B8%80%E6%96%87%E5%AD%B8%E6%9B%89 | 入門規則＋對照圖 |

## 其他常用公開表

| 來源 | 網址 |
| --- | --- |
| 港式台牌番表 hktwmjtgt | https://hktwmjtgt.com/ |
| Raymond Ting 鏡像（adhoc） | http://adhoc-bet.appspot.com/twmj.htm |

## 預設枱規對應

- `fiveTongShunFan: 40`
- `excludeBanGaoXiangFengAfterWuTong: false`（仍另計般高／相逢；開 true 跟舊坊間吞組件）
- 明／暗分档（般高、相逢、龍、四歸等）跟麻雀數簿常見枱表

舊坊間（計四五同順後唔再計般高相逢）開 `excludeBanGaoXiangFengAfterWuTong: true`；預設跟協會另加。

---

*更新：2026-10-24*
