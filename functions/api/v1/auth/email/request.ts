import type { PagesHandler } from '../../../../_shared/types'
import { allowRate, assertSameOrigin, error, json, now, sha256 } from '../../../../_shared/http'

export const onRequestPost: PagesHandler = async ({ request, env }) => {
  if (!assertSameOrigin(request)) return error('来源校验失败', 403)
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (!allowRate(`email-code:${ip}`, 5, 900)) return error('请求太频繁，请稍后再试', 429)
  const body = await request.json().catch(() => null) as { email?: string } | null
  const email = body?.email?.trim().toLowerCase() || ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('请输入有效的邮箱地址', 422)
  if (!env.RESEND_API_KEY) return error('邮箱登录尚未配置，请联系维护者', 503)
  if (!allowRate(`email-code-email:${email}`, 3, 900)) return error('请求太频繁，请稍后再试', 429)

  const entropy = new Uint32Array(1)
  crypto.getRandomValues(entropy)
  const code = String(100000 + (entropy[0] % 900000))
  const current = now()
  await env.DB.prepare('INSERT INTO login_tokens (id, email, token_hash, provider, expires_at, request_ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), email, await sha256(code), 'email', current + 600, ip, current).run()
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: '中继数据协作站 <noreply@mizuki.top>',
      to: [email],
      subject: '你的中继数据登录验证码',
      text: `你的中继数据登录验证码是：${code}\n\n验证码 10 分钟内有效且只能使用一次。如果不是你本人请求，请忽略这封邮件。`,
      html: `<p>你的中继数据登录验证码是：</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>验证码 10 分钟内有效且只能使用一次。如果不是你本人请求，请忽略这封邮件。</p>`,
    }),
  })
  if (!response.ok) return error('邮件服务暂时不可用，请稍后再试', 502)
  return json({ data: { accepted: true }, message: '如果该邮箱可以接收邮件，6 位登录验证码已经发送' })
}
