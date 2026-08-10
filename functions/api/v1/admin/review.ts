import type { PagesHandler } from '../../../_shared/types'
import { error, json, requireAdmin } from '../../../_shared/http'

export const onRequestGet: PagesHandler = async ({ request, env }) => {
  try {
    await requireAdmin(request, env)
    const rows = await env.DB.prepare('SELECT s.id, s.payload_json, s.status, s.risk, s.created_at, u.email FROM submissions s JOIN users u ON u.id = s.user_id WHERE s.status = ? ORDER BY CASE s.risk WHEN ? THEN 0 ELSE 1 END, s.created_at DESC LIMIT 200').bind('pending', 'high').all<{ id: string; payload_json: string; status: 'pending'; risk: 'low' | 'high'; created_at: number; email: string }>()
    return json({ data: rows.results.map((row) => { const payload = JSON.parse(row.payload_json); return { id: row.id, callsign: payload.callsign, province: payload.province, city: payload.city, sourceUrl: payload.sourceUrl, status: row.status, risk: row.risk, submittedAt: row.created_at, contributor: row.email } }) })
  } catch (exception) { return exception instanceof Response ? exception : error('读取审核队列失败', 500) }
}
