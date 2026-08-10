import type { PagesHandler } from '../../../../_shared/types'
import { allowRate, assertSameOrigin, error, json, now, sha256, token } from '../../../../_shared/http'

export const onRequestPost: PagesHandler = async ({ request, env }) => {
  if (!assertSameOrigin(request)) return error('来源校验失败', 403)
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (!allowRate(`magic:${ip}`, 5, 900)) return error('请求太频繁，请稍后再试', 429)
  const body = await request.json().catch(() => null) as { email?: string } | null
  const email = body?.email?.trim().toLowerCase() || ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('请输入有效的邮箱地址', 422)
  if (!env.RESEND_API_KEY) return error('邮箱登录尚未配置，请联系维护者', 503)
  if (!allowRate(`magic-email:${email}`, 3, 900)) return error('请求太频繁，请稍后再试', 429)

  const rawToken = token(32)
  const current = now()
  await env.DB.prepare('INSERT INTO login_tokens (id, email, token_hash, provider, expires_at, request_ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), email, await sha256(rawToken), 'email', current + 900, ip, current).run()
  const baseUrl = env.PUBLIC_SITE_URL || new URL(request.url).origin
  const verifyUrl = `${baseUrl}/api/v1/auth/email/verify?token=${encodeURIComponent(rawToken)}`
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: '全国中继 <noreply@mizuki.top>',
      to: [email],
      subject: '你的全国中继登录链接',
      html: `<p>点击下面的链接登录全国中继数据协作站：</p><p><a href="${verifyUrl}">登录全国中继</a></p><p>链接 15 分钟内有效且只能使用一次。</p>`,
    }),
  })
  if (!response.ok) return error('邮件服务暂时不可用，请稍后再试', 502)
  return json({ data: { accepted: true }, message: '如果该邮箱可以接收邮件，登录链接已经发送' })
}
