/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY?: string
}

declare module '*.json' {
  const value: unknown
  export default value
}
