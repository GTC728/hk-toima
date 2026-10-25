# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

主要用家係打開這個網站、同其他人打港式台牌的人。本機輪流、補 AI、教學同練習提示都係現有功能，唔係主要工作。

## Product Purpose

香港台麻（HK ToiMA）係一個港式台牌（十六張）網頁。用家可以開網上房，用房碼一齊打；也可以在這部機打。成功係一舖打得完、番數同拉帳由引擎算、功能仍然叫得到。

## Positioning

同一套引擎同時服務網上房同本機局：坊間眾數番表、拉帳、可選 AI 性格、唔使登入都打得。座位令牌只證明這一席；玩家帳戶係另一層，可有可無。

## Operating Context

- 本機：`npm run dev`，大廳開枱。
- 網上：另開 Cloudflare Worker（`npm run worker:dev`，預設 8787）。Vite 把 `/api` 轉去 worker。只開 Vite 時，開房會失敗，本機局仍可打。
- 重連靠這部機的 `seatToken`。帳戶用 HttpOnly cookie，同座位令牌分開。
- 部署目標係 Cloudflare Workers，同一網址提供頁面同房間。
- 帳戶：遠端 D1 `hk-toima-accounts` 已建；Turnstile 已建。寄信用 Resend（域名 `opcg-tracker.com` 已有 Resend DNS），要設 Worker secret `RESEND_API_KEY`。

## Capabilities and Constraints

現有功能要留低，而且隨時叫得到。版面可以全部重排，功能不可以刪。

要留的能力：本機局、網上房碼、空位補 AI、三種 AI 性格、番數表、計番機、拉數簿、教學、戰績、個人（身份、數據、檔案、設定）、牌面與聲音設定、結算與重播、可選帳戶（匿名玩家、電郵魔法連結、裝置、下載同刪除）。

規則只由 `src/engine` 計算。介面不另估番、拉帳或犯規。真錢兌付不是現有功能，也不在這次範圍。未寫明的產品決定保持未決，不在畫面上發明。

## Brand Commitments

名稱係香港台麻，英文 HK ToiMA。介面用繁體中文，口語近粵語。

## Evidence on Hand

- 玩法同預設枱規見 `README.md`。
- 番表同來源對照見 `src/engine/fans.json`、`design/fan-survey.md`。
- 沒有用戶證言、銷售數字或牌照可以引用。不要虛構。

## Product Principles

- 網上打得成一舖，先於教學同裝飾。
- 功能不刪；換版面時每個現有入口仍然找得到。
- 引擎算規則，畫面只展示引擎的結果。
- 唔登入都打得。帳戶是加上去的一層。
- 介面繼續用繁體中文。
