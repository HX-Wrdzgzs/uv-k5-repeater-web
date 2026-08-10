import type { Env, SessionUser } from './types'

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } })
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
  if (!origin) return request.method === 'GET' || request.method === 'HEAD'
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
  const access = await verifyCloudflareAccessJwt(request, env)
  const allowedEmail = env.ADMIN_EMAIL?.trim().toLowerCase()
  if (!allowedEmail) throw new Response(JSON.stringify({ error: '管理员邮箱尚未配置' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  if (access.email.toLowerCase() !== allowedEmail) throw new Response(JSON.stringify({ error: '没有管理员权限' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

  const current = now()
  let user = await env.DB.prepare('SELECT id, email, display_name, role FROM users WHERE email = ?').bind(allowedEmail).first<{ id: string; email: string; display_name: string | null; role: SessionUser['role'] }>()
  if (!user) {
    const id = crypto.randomUUID()
    await env.DB.prepare('INSERT INTO users (id, email, display_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, allowedEmail, access.email, 'admin', current, current).run()
    user = { id, email: allowedEmail, display_name: access.email, role: 'admin' }
  } else if (user.role !== 'admin') {
    await env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').bind('admin', current, user.id).run()
    user = { ...user, role: 'admin' }
  }
  return { id: user.id, email: user.email, displayName: user.display_name, role: user.role }
}

interface AccessClaims { iss?: string; aud?: string | string[]; email?: string; sub?: string; exp?: number; nbf?: number }

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function decodeJsonPart<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T
}

function accessIssuer(teamDomain: string) {
  const normalized = teamDomain.trim().replace(/\/$/, '')
  return normalized.startsWith('http://') || normalized.startsWith('https://') ? normalized : `https://${normalized}`
}

async function verifyCloudflareAccessJwt(request: Request, env: Env) {
  const raw = request.headers.get('CF-Access-Jwt-Assertion')
  if (!raw) throw new Response(JSON.stringify({ error: '需要 Cloudflare Access' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD) throw new Response(JSON.stringify({ error: 'Cloudflare Access 验证参数尚未配置' }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

  const parts = raw.split('.')
  if (parts.length !== 3) throw new Response(JSON.stringify({ error: 'Cloudflare Access 凭据格式错误' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  let header: { alg?: string; kid?: string }
  let claims: AccessClaims
  try {
    header = decodeJsonPart(parts[0])
    claims = decodeJsonPart(parts[1])
  } catch {
    throw new Response(JSON.stringify({ error: 'Cloudflare Access 凭据无法解析' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  }
  const issuer = accessIssuer(env.CF_ACCESS_TEAM_DOMAIN)
  const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : []
  const current = now()
  if (header.alg !== 'RS256' || !header.kid || claims.iss !== issuer || !audiences.includes(env.CF_ACCESS_AUD) || !claims.email || !claims.exp || claims.exp <= current || (claims.nbf && claims.nbf > current + 30)) {
    throw new Response(JSON.stringify({ error: 'Cloudflare Access 凭据无效或已过期' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  }

  const certResponse = await fetch(`${issuer}/cdn-cgi/access/certs`, { headers: { Accept: 'application/json' } })
  if (!certResponse.ok) throw new Response(JSON.stringify({ error: '无法读取 Cloudflare Access 公钥' }), { status: 502, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  const certs = await certResponse.json() as { keys?: JsonWebKey[] }
  const key = (certs.keys || []).find((item) => (item as JsonWebKey & { kid?: string }).kid === header.kid)
  if (!key) throw new Response(JSON.stringify({ error: 'Cloudflare Access 公钥不存在' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  const publicKey = await crypto.subtle.importKey('jwk', key, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const verified = await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, publicKey, decodeBase64Url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`))
  if (!verified) throw new Response(JSON.stringify({ error: 'Cloudflare Access 签名校验失败' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  return claims as AccessClaims & { email: string }
}

export async function createSession(userId: string, env: Env) {
  const raw = token(32)
  const current = now()
  await env.DB.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), userId, await sha256(raw), current + 60 * 60 * 24 * 30, current, current).run()
  return raw
}

export async function upsertUser(email: string, displayName: string | null, provider: 'email' | 'github', subject: string, env: Env) {
  const current = now()
  const normalizedEmail = email.toLowerCase()
  const role = env.ADMIN_EMAIL?.trim().toLowerCase() === normalizedEmail ? 'admin' : 'user'
  const existingIdentity = await env.DB.prepare('SELECT user_id FROM auth_identities WHERE provider = ? AND provider_subject = ?').bind(provider, subject).first<{ user_id: string }>()
  if (existingIdentity) {
    await env.DB.prepare('UPDATE users SET email = ?, display_name = COALESCE(?, display_name), role = CASE WHEN ? = ? THEN ? ELSE role END, updated_at = ? WHERE id = ?').bind(normalizedEmail, displayName, normalizedEmail, env.ADMIN_EMAIL?.trim().toLowerCase() || '', 'admin', current, existingIdentity.user_id).run()
    return existingIdentity.user_id
  }
  const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(normalizedEmail).first<{ id: string }>()
  const userId = existingUser?.id || crypto.randomUUID()
  if (!existingUser) await env.DB.prepare('INSERT INTO users (id, email, display_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(userId, normalizedEmail, displayName, role, current, current).run()
  else if (role === 'admin') await env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').bind('admin', current, userId).run()
  await env.DB.prepare('INSERT INTO auth_identities (id, user_id, provider, provider_subject, provider_email, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), userId, provider, subject, email, current).run()
  return userId
}

export async function audit(env: Env, actorUserId: string | null, action: string, entityType: string, entityId: string, before: unknown, after: unknown, request: Request) {
  await env.DB.prepare('INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, before_json, after_json, request_ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), actorUserId, action, entityType, entityId, before == null ? null : JSON.stringify(before), after == null ? null : JSON.stringify(after), request.headers.get('CF-Connecting-IP'), now()).run()
}
