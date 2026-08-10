import type { PagesHandler } from '../../../../_shared/types'
import { allowRate, assertSameOrigin, cookie, createSession, error, json, now, sha256, upsertUser } from '../../../../_shared/http'

async function completeLogin(value: string, email: string | null, request: Request, env: Parameters<PagesHandler>[0]['env'], redirect: boolean) {
  const hash = await sha256(value)
  const current = now()
  const statement = email
    ? env.DB.prepare('SELECT id, email FROM login_tokens WHERE email = ? AND token_hash = ? AND provider = ? AND used_at IS NULL AND expires_at > ?').bind(email, hash, 'email', current)
    : env.DB.prepare('SELECT id, email FROM login_tokens WHERE token_hash = ? AND provider = ? AND used_at IS NULL AND expires_at > ?').bind(hash, 'email', current)
  const login = await statement.first<{ id: string; email: string }>()
  if (!login) return error(email ? '验证码错误、已过期或已使用' : '登录链接已过期、已使用或不存在', 410)

  const marked = await env.DB.prepare('UPDATE login_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL').bind(current, login.id).run()
  if ((marked.meta?.changes || 0) !== 1) return error(email ? '验证码已使用' : '登录链接已使用', 410)

  const userId = await upsertUser(login.email, null, 'email', login.email, env)
  const session = await createSession(userId, env)
  const sessionCookie = cookie('session', session, 60 * 60 * 24 * 30)
  if (!redirect) return json({ data: { authenticated: true }, message: '登录成功' }, 200, { 'Set-Cookie': sessionCookie })

  const target = new URL('/', env.PUBLIC_SITE_URL || new URL(request.url).origin)
  target.searchParams.set('auth', 'success')
  return new Response(null, { status: 302, headers: { Location: target.toString(), 'Set-Cookie': sessionCookie } })
}

export const onRequestGet: PagesHandler = async ({ request, env }) => {
  const value = new URL(request.url).searchParams.get('token') || ''
  if (!value) return error('登录链接无效', 400)
  return completeLogin(value, null, request, env, true)
}

export const onRequestPost: PagesHandler = async ({ request, env }) => {
  if (!assertSameOrigin(request)) return error('来源校验失败', 403)
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (!allowRate(`email-verify:${ip}`, 10, 900)) return error('验证尝试太频繁，请稍后再试', 429)

  const body = await request.json().catch(() => null) as { email?: string; code?: string } | null
  const email = body?.email?.trim().toLowerCase() || ''
  const code = body?.code?.trim() || ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('请输入有效的邮箱地址', 422)
  if (!/^\d{6}$/.test(code)) return error('请输入 6 位数字验证码', 422)
  if (!allowRate(`email-verify-email:${email}`, 10, 900)) return error('验证尝试太频繁，请稍后再试', 429)
  return completeLogin(code, email, request, env, false)
}
