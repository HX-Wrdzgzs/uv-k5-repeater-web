import type { Env, SessionUser } from './types'

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': status >= 400 ? 'no-store' : 'public, max-age=60', ...headers } })
}

export function error(message: string, status = 400) {
  return json({ error: message }, status, { 'Cache-Control': 'no-store' })
}

export function now() { return Math.floor(Date.now() / 1000) }

export function token(bytes = 32) {
  const value = new Uint8Array(bytes)
  crypto.getRandomValues(value)
  return btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function cookie(name: string, value: string, maxAge: number, extra = '') {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax${extra}`
}

export function readCookie(request: Request, name: string) {
  const header = request.headers.get('Cookie') || ''
  const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('Origin')
  if (!origin) return true
  return origin === new URL(request.url).origin
}

const hitCounts = new Map<string, { count: number; resetAt: number }>()
export function allowRate(key: string, limit: number, windowSeconds: number) {
  const current = now()
  const existing = hitCounts.get(key)
  if (!existing || existing.resetAt <= current) { hitCounts.set(key, { count: 1, resetAt: current + windowSeconds }); return true }
  if (existing.count >= limit) return false
  existing.count += 1
  return true
}

export async function sessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  const raw = readCookie(request, 'session')
  if (!raw) return null
  const hash = await sha256(raw)
  const row = await env.DB.prepare('SELECT u.id, u.email, u.display_name, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?').bind(hash, now()).first<{ id: string; email: string; display_name: string | null; role: SessionUser['role'] }>()
  if (!row) return null
  await env.DB.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?').bind(now(), hash).run()
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role }
}

export async function requireUser(request: Request, env: Env) {
  const user = await sessionUser(request, env)
  if (!user) throw new Response(JSON.stringify({ error: '请先登录' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  return user
}

export async function requireAdmin(request: Request, env: Env) {
  if (!request.headers.get('CF-Access-Jwt-Assertion')) throw new Response(JSON.stringify({ error: '需要 Cloudflare Access' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  const user = await requireUser(request, env)
  if (!['admin', 'moderator'].includes(user.role)) throw new Response(JSON.stringify({ error: '没有管理员权限' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  return user
}

export async function createSession(userId: string, env: Env) {
  const raw = token(32)
  const current = now()
  await env.DB.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), userId, await sha256(raw), current + 60 * 60 * 24 * 30, current, current).run()
  return raw
}

export async function upsertUser(email: string, displayName: string | null, provider: 'email' | 'github', subject: string, env: Env) {
  const current = now()
  const existingIdentity = await env.DB.prepare('SELECT user_id FROM auth_identities WHERE provider = ? AND provider_subject = ?').bind(provider, subject).first<{ user_id: string }>()
  if (existingIdentity) {
    await env.DB.prepare('UPDATE users SET email = ?, display_name = COALESCE(?, display_name), updated_at = ? WHERE id = ?').bind(email, displayName, current, existingIdentity.user_id).run()
    return existingIdentity.user_id
  }
  const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first<{ id: string }>()
  const userId = existingUser?.id || crypto.randomUUID()
  if (!existingUser) await env.DB.prepare('INSERT INTO users (id, email, display_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(userId, email.toLowerCase(), displayName, 'user', current, current).run()
  await env.DB.prepare('INSERT INTO auth_identities (id, user_id, provider, provider_subject, provider_email, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), userId, provider, subject, email, current).run()
  return userId
}

export async function audit(env: Env, actorUserId: string | null, action: string, entityType: string, entityId: string, before: unknown, after: unknown, request: Request) {
  await env.DB.prepare('INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, before_json, after_json, request_ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), actorUserId, action, entityType, entityId, before == null ? null : JSON.stringify(before), after == null ? null : JSON.stringify(after), request.headers.get('CF-Connecting-IP'), now()).run()
}
