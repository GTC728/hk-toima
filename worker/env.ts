export interface Env {
  ROOM: DurableObjectNamespace
  MATCH: DurableObjectNamespace
  /** 未建立遠端 D1 時，本機 wrangler dev 仍然可以綁呢個名。 */
  DB?: D1Database
  /** 未接寄信網域時唔好加 binding。 */
  EMAIL?: SendEmail
  EMAIL_FROM?: string
  /** Resend API（域名 opcg-tracker.com 已有 Resend DNS） */
  RESEND_API_KEY?: string
  TURNSTILE_SECRET_KEY?: string
  /** 魔法連結嘅來源。無則用請求 Origin。 */
  APP_ORIGIN?: string
  /** `production` 或 `development`。無則睇係咪 localhost。 */
  ENVIRONMENT?: string
}
