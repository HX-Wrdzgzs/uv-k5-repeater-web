import type { PagesHandler } from '../../../../../_shared/types'
import { assertSameOrigin, audit, error, json, now, requireAdmin } from '../../../../../_shared/http'

export const onRequestPost: PagesHandler = async ({ request, env, params }) => {
  if (!assertSameOrigin(request)) return error('来源校验失败', 403)
  try {
    const admin = await requireAdmin(request, env)
    const id = String(params.id || '')
    const action = String(params.action || '')
    const targetStatus = action === 'publish' ? 'published' : action === 'reject' ? 'rejected' : action === 'retire' ? 'retired' : ''
    if (!targetStatus) return error('不支持的审核动作', 404)
    const row = await env.DB.prepare('SELECT * FROM submissions WHERE id = ? AND status = ?').bind(id, 'pending').first<{ id: string; user_id: string; repeater_id: string | null; kind: string; payload_json: string; risk: string; status: string }>()
    if (!row) return error('提交不存在或已经处理', 404)
    const payload = JSON.parse(row.payload_json)
    const current = now()
    if (targetStatus === 'published') {
      const repeaterId = row.repeater_id || payload.stationKey || crypto.randomUUID()
      const upsertSql = 'INSERT INTO repeaters (id, station_key, province, city, district, callsign, station_name, rx_mhz, tx_mhz, ctcss_hz, mode, rx_only, source_type, source_label, source_url, source_date, collected_date, verified_at, status, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET province=excluded.province, city=excluded.city, district=excluded.district, callsign=excluded.callsign, station_name=excluded.station_name, rx_mhz=excluded.rx_mhz, tx_mhz=excluded.tx_mhz, ctcss_hz=excluded.ctcss_hz, mode=excluded.mode, rx_only=excluded.rx_only, source_url=excluded.source_url, source_date=excluded.source_date, verified_at=excluded.verified_at, status=excluded.status, note=excluded.note, updated_at=excluded.updated_at'
      await env.DB.prepare(upsertSql).bind(repeaterId, payload.stationKey, payload.province, payload.city, payload.district || '', payload.callsign, payload.stationName || '', payload.rxMhz, payload.txMhz, payload.ctcssHz, payload.mode || 'FM', payload.rxOnly ? 1 : 0, 'community', 'USER', payload.sourceUrl, payload.sourceDate, current, current, 'published', payload.note || '', current, current).run()
      await env.DB.prepare('UPDATE submissions SET repeater_id = ?, status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?').bind(repeaterId, targetStatus, admin.id, current, current, id).run()
    } else {
      await env.DB.prepare('UPDATE submissions SET status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?').bind(targetStatus, admin.id, current, current, id).run()
    }
    await audit(env, admin.id, `submission.${action}`, 'submission', id, row, { status: targetStatus }, request)
    return json({ data: { id, status: targetStatus } })
  } catch (exception) { return exception instanceof Response ? exception : error('处理审核动作失败', 500) }
}
