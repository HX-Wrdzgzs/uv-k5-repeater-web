import type { PagesHandler } from '../../../../_shared/types'
import { cookie, createSession, error, now, sha256, upsertUser } from '../../../../_shared/http'

export const onRequestGet: PagesHandler = async ({ request, env }) => {
  const value = new URL(request.url).searchParams.get('token') || ''
  if (!value) return error('登录链接无效', 400)
  const hash = await sha256(value)
  const current = now()
  const login = await env.DB.prepare('SELECT id, email FROM login_tokens WHERE token_hash = ? AND provider = ? AND used_at IS NULL AND expires_at > ?').bind(hash, 'email', current).first<{ id: string; email: string }>()
  if (!login) return error('登录链接已过期、已使用或不存在', 410)
  const marked = await env.DB.prepare('UPDATE login_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL').bind(current, login.id).run()
  if ((marked.meta?.changes || 0) !== 1) return error('登录链接已使用', 410)
  const userId = await upsertUser(login.email, null, 'email', login.email, env)
  const session = await createSession(userId, env)
  const target = new URL('/', env.PUBLIC_SITE_URL || new URL(request.url).origin)
  target.searchParams.set('auth', 'success')
  return new Response(null, { status: 302, headers: { Location: target.toString(), 'Set-Cookie': cookie('session', session, 60 * 60 * 24 * 30) } })
}
