export async function verifyTurnstile(opts: {
  secret: string | undefined
  token: string | undefined
  ip: string | null
  /** 本機／開發：未設 secret 時放行（正式環境必須驗證） */
  allowMissingSecret?: boolean
  fetchImpl?: typeof fetch
}): Promise<boolean> {
  if (!opts.secret) return opts.allowMissingSecret === true
  if (!opts.token) return false
  const body = new URLSearchParams()
  body.set('secret', opts.secret)
  body.set('response', opts.token)
  if (opts.ip) body.set('remoteip', opts.ip)
  try {
    const res = await (opts.fetchImpl ?? fetch)(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      },
    )
    if (!res.ok) return false
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}
