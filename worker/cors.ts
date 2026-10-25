/** 有 cookie 嘅回應只回顯真實 Origin，永遠唔用 `*`。 */
export function isEchoableOrigin(origin: string | null): origin is string {
  if (!origin || origin === '*' || origin === 'null') return false
  if (/[\r\n\s]/.test(origin)) return false
  try {
    const url = new URL(origin)
    return (
      url.origin === origin &&
      (url.protocol === 'http:' || url.protocol === 'https:')
    )
  } catch {
    return false
  }
}

export function corsHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'Origin',
  }
  const origin = request.headers.get('Origin')
  if (isEchoableOrigin(origin)) {
    headers['access-control-allow-origin'] = origin
    headers['access-control-allow-credentials'] = 'true'
  }
  return headers
}
