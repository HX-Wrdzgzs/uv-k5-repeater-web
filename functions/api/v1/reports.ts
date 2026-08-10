import type { PagesHandler } from '../../_shared/types'
import { allowRate, assertSameOrigin, audit, error, json, now, sessionUser } from '../../_shared/http'

export const onRequestPost: PagesHandler = async ({ request, env }) => {
  if (!assertSameOrigin(request)) return error('来源校验失败', 403)
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (!allowRate(`report:${ip}`, 10, 3600)) return error('举报太频繁，请稍后再试', 429)
  const body = await request.json().catch(() => null) as { repeaterId?: string; reason?: string } | null
  const repeaterId = String(body?.repeaterId || '').trim()
  const reason = String(body?.reason || '').trim().slice(0, 1000)
  if (!repeaterId || !reason) return error('请提供记录和变化说明', 422)
  try {
    const repeater = await env.DB.prepare('SELECT id FROM repeaters WHERE id = ? AND status = ?').bind(repeaterId, 'published').first<{ id: string }>()
    if (!repeater) return error('记录不存在或已经停用', 404)
    const user = await sessionUser(request, env)
    const id = crypto.randomUUID()
    const current = now()
    await env.DB.prepare('INSERT INTO reports (id, repeater_id, reporter_user_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, repeaterId, user?.id || null, reason, 'open', current).run()
    await audit(env, user?.id || null, 'report.created', 'repeater', repeaterId, null, { reportId: id, reason }, request)
    return json({ data: { id, status: 'open' }, message: '变化报告已提交，维护者会在审核队列中处理' }, 201)
  } catch (exception) { return error(exception instanceof Error ? exception.message : '提交报告失败', 500) }
}
