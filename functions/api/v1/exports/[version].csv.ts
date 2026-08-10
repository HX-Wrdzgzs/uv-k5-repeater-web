import type { PagesHandler } from '../../../_shared/types'
import { error } from '../../../_shared/http'

const columns = ['station_key', 'province', 'city', 'district', 'callsign', 'station_name', 'rx_mhz', 'tx_mhz', 'ctcss_hz', 'mode', 'rx_only', 'source_type', 'source_label', 'source_url', 'source_date', 'collected_date', 'verified_at', 'status', 'note']
function cell(value: unknown) { const text = value == null ? '' : String(value); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text }

export const onRequestGet: PagesHandler = async ({ env, params }) => {
  try {
    const version = String(params.version || 'latest')
    const snapshot = await env.DB.prepare('SELECT version, sha256, csv_payload FROM export_snapshots WHERE version = ?').bind(version).first<{ version: string; sha256: string; csv_payload: string }>()
    if (snapshot) return new Response(snapshot.csv_payload, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${snapshot.version}.csv"`, 'X-Export-SHA256': snapshot.sha256 } })
    const rows = await env.DB.prepare(`SELECT ${columns.join(', ')} FROM repeaters WHERE status = ? ORDER BY province, city, rx_mhz, station_key`).bind('published').all<Record<string, unknown>>()
    if (!rows.results.length) return error('暂无可导出的已发布数据', 404)
    const csv = [columns.join(','), ...rows.results.map((row) => columns.map((column) => cell(row[column])).join(','))].join('\n') + '\n'
    return new Response(`\uFEFF${csv}`, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${version}.csv"` } })
  } catch (exception) { return error(exception instanceof Error ? exception.message : '生成 CSV 失败', 500) }
}
