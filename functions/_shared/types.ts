export interface D1Statement {
  bind(...values: unknown[]): D1Statement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
  run(): Promise<unknown>
}

export interface Env {
  DB: { prepare(query: string): D1Statement }
  PUBLIC_SITE_URL?: string
  ADMIN_EMAIL?: string
  RESEND_API_KEY?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GITHUB_OAUTH_REDIRECT_URL?: string
  SESSION_SECRET?: string
  TURNSTILE_SECRET?: string
}

export type PagesHandler = (context: { request: Request; env: Env; params: Record<string, string> }) => Response | Promise<Response>

export interface SessionUser {
  id: string
  email: string
  displayName: string | null
  role: 'user' | 'trusted_contributor' | 'moderator' | 'admin'
}

export interface SubmissionPayload {
  province: string
  city: string
  district?: string
  callsign: string
  stationName?: string
  rxMhz: number
  txMhz: number
  ctcssHz?: number | null
  mode: string
  rxOnly?: boolean
  sourceUrl: string
  sourceDate?: number | null
  note?: string
}
