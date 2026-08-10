import type { PagesHandler } from '../../../_shared/types'
import { error, json, requireAdmin } from '../../../_shared/http'

export const onRequestGet: PagesHandler = async ({ request, env }) => {
  try {
    await requireAdmin(request, env)
    const rows = await env.DB.prepare('SELECT r.id, r.repeater_id, r.reason, r.status, r.created_at, u.email FROM reports r LEFT JOIN users u ON u.id = r.reporter_user_id WHERE r.status = ? ORDER BY r.created_at ASC LIMIT 200').bind('open').all()
    return json({ data: rows.results })
  } catch (exception) { return exception instanceof Response ? exception : error('读取举报队列失败', 500) }
}
