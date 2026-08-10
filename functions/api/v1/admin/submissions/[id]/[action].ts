import type { PagesHandler } from '../../../../../_shared/types'
import { assertSameOrigin, audit, error, json, now, requireAdmin } from '../../../../../_shared/http'

interface SubmissionRow {
  id: string
  user_id: string
  repeater_id: string | null
  kind: 'create' | 'update' | 'retire'
  payload_json: string
  risk: 'low' | 'high'
  status: string
}

export const onRequestPost: PagesHandler = async ({ request, env, params }) => {
  if (!assertSameOrigin(request)) return error('来源校验失败', 403)
  try {
    const admin = await requireAdmin(request, env)
    const id = String(params.id || '')
    const action = String(params.action || '')
    const targetStatus = action === 'publish' ? 'published' : action === 'reject' ? 'rejected' : action === 'retire' ? 'retired' : ''
    if (!targetStatus) return error('不支持的审核动作', 404)
    const body = await request.json().catch(() => ({})) as { reviewNote?: string }
    const reviewNote = String(body.reviewNote || '').trim().slice(0, 1000) || null
    const row = await env.DB.prepare('SELECT id, user_id, repeater_id, kind, payload_json, risk, status FROM submissions WHERE id = ? AND status = ?').bind(id, 'pending').first<SubmissionRow>()
    if (!row) return error('提交不存在或已经处理', 404)
    const payload = JSON.parse(row.payload_json) as Record<string, unknown>
    const current = now()
    const stationKey = String(payload.stationKey || '')
    const existing = stationKey ? await env.DB.prepare('SELECT id FROM repeaters WHERE station_key = ?').bind(stationKey).first<{ id: string }>() : null
    const repeaterId = row.repeater_id || existing?.id || crypto.randomUUID()

    if (targetStatus === 'published') {
      if (existing || row.repeater_id) {
        await env.DB.prepare('UPDATE repeaters SET station_key = ?, province = ?, city = ?, district = ?, callsign = ?, station_name = ?, rx_mhz = ?, tx_mhz = ?, ctcss_hz = ?, mode = ?, rx_only = ?, source_type = ?, source_label = ?, source_url = ?, source_date = ?, collected_date = ?, verified_at = ?, status = ?, note = ?, updated_at = ? WHERE id = ?').bind(stationKey, payload.province, payload.city, payload.district || '', payload.callsign, payload.stationName || '', payload.rxMhz, payload.txMhz, payload.ctcssHz ?? null, payload.mode || 'FM', payload.rxOnly ? 1 : 0, 'community', '社区提交', payload.sourceUrl || '', payload.sourceDate ?? null, current, current, 'published', payload.note || '', current, repeaterId).run()
      } else {
        await env.DB.prepare('INSERT INTO repeaters (id, station_key, province, city, district, callsign, station_name, rx_mhz, tx_mhz, ctcss_hz, mode, rx_only, source_type, source_label, source_url, source_date, collected_date, verified_at, status, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(repeaterId, stationKey, payload.province, payload.city, payload.district || '', payload.callsign, payload.stationName || '', payload.rxMhz, payload.txMhz, payload.ctcssHz ?? null, payload.mode || 'FM', payload.rxOnly ? 1 : 0, 'community', '社区提交', payload.sourceUrl || '', payload.sourceDate ?? null, current, current, 'published', payload.note || '', current, current).run()
      }
      await env.DB.prepare('UPDATE submissions SET repeater_id = ?, status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?').bind(repeaterId, targetStatus, reviewNote, admin.id, current, current, id).run()
    } else if (targetStatus === 'retired') {
      const targetId = row.repeater_id || existing?.id
      if (!targetId) return error('停用申请没有对应的已发布台站', 422)
      await env.DB.prepare('UPDATE repeaters SET status = ?, updated_at = ? WHERE id = ?').bind('retired', current, targetId).run()
      await env.DB.prepare('UPDATE submissions SET repeater_id = ?, status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?').bind(targetId, targetStatus, reviewNote, admin.id, current, current, id).run()
    } else {
      await env.DB.prepare('UPDATE submissions SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?').bind(targetStatus, reviewNote, admin.id, current, current, id).run()
    }
    await audit(env, admin.id, `submission.${action}`, 'submission', id, row, { status: targetStatus, reviewNote }, request)
    return json({ data: { id, status: targetStatus } })
  } catch (exception) { return exception instanceof Response ? exception : error('处理审核动作失败', 500) }
}
