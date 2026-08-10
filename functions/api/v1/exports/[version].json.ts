import type { Env, PagesHandler } from '../../../_shared/types'
import { error, sha256 } from '../../../_shared/http'

async function exportRows(env: Env) {
  const rows = await env.DB.prepare('SELECT station_key, province, city, district, callsign, station_name, rx_mhz, tx_mhz, ctcss_hz, mode, rx_only, source_type, source_label, source_url, source_date, collected_date, verified_at, status, note FROM repeaters WHERE status = ? ORDER BY province, city, rx_mhz, station_key').bind('published').all()
  return rows.results
}

export const onRequestGet: PagesHandler = async ({ env, params }) => {
  try {
    const version = String(params.version || 'latest')
    const snapshot = await env.DB.prepare('SELECT version, source_date, record_count, sha256, json_payload FROM export_snapshots WHERE version = ?').bind(version).first<{ version: string; source_date: number; record_count: number; sha256: string; json_payload: string }>()
    if (snapshot) return new Response(snapshot.json_payload, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Export-Version': snapshot.version, 'X-Export-SHA256': snapshot.sha256, 'Cache-Control': 'public, max-age=300' } })
    const rows = await exportRows(env)
    if (!rows.length) return error('暂无可导出的已发布数据', 404)
    const payload = { version, source: 'published', recordCount: rows.length, records: rows }
    const serialized = JSON.stringify(payload)
    return new Response(serialized, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Export-Version': version, 'X-Export-SHA256': await sha256(serialized), 'Cache-Control': 'public, max-age=300' } })
  } catch (exception) { return error(exception instanceof Error ? exception.message : '生成导出失败', 500) }
}
