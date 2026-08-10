import type { PagesHandler } from '../../../../../_shared/types'
import { assertSameOrigin, audit, error, json, now, requireAdmin } from '../../../../../_shared/http'

export const onRequestPost: PagesHandler = async ({ request, env, params }) => {
  if (!assertSameOrigin(request)) return error('来源校验失败', 403)
  try {
    const admin = await requireAdmin(request, env)
    const id = String(params.id || '')
    const action = String(params.action || '')
    const status = action === 'resolve' ? 'resolved' : action === 'dismiss' ? 'dismissed' : ''
    if (!status) return error('不支持的举报动作', 404)
    const row = await env.DB.prepare('SELECT id, status, repeater_id, reason FROM reports WHERE id = ? AND status = ?').bind(id, 'open').first<{ id: string; status: string; repeater_id: string; reason: string }>()
    if (!row) return error('举报不存在或已经处理', 404)
    const current = now()
    await env.DB.prepare('UPDATE reports SET status = ?, resolved_at = ? WHERE id = ?').bind(status, current, id).run()
    await audit(env, admin.id, `report.${action}`, 'report', id, row, { status }, request)
    return json({ data: { id, status } })
  } catch (exception) { return exception instanceof Response ? exception : error('处理举报失败', 500) }
}
