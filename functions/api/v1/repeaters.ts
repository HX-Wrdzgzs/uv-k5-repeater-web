import type { PagesHandler } from '../../_shared/types'
import { error, json } from '../../_shared/http'
import { pendingRepeater, repeaterColumns } from '../../_shared/repeaters'

export const onRequestGet: PagesHandler = async ({ request, env }) => {
  const url = new URL(request.url)
  const search = (url.searchParams.get('q') || '').trim().toLowerCase()
  const province = (url.searchParams.get('province') || '').trim()
  const city = (url.searchParams.get('city') || '').trim()
  const mode = (url.searchParams.get('mode') || '').trim().toUpperCase()
  const requestedStatus = (url.searchParams.get('status') || 'all').trim()
  const limitValue = Number(url.searchParams.get('limit') || 100)
  const limit = Math.min(500, Math.max(1, Number.isFinite(limitValue) ? Math.floor(limitValue) : 100))
  if (!['all', 'published', 'pending'].includes(requestedStatus)) return error('不支持的状态筛选', 422)

  try {
    const records: Record<string, unknown>[] = []
    if (requestedStatus !== 'pending') {
      const published = await env.DB.prepare(`SELECT ${repeaterColumns} FROM repeaters WHERE status = ? ORDER BY province, city, rx_mhz`).bind('published').all<Record<string, unknown>>()
      records.push(...published.results)
    }
    if (requestedStatus !== 'published') {
      const pending = await env.DB.prepare('SELECT id, payload_json, created_at, updated_at FROM submissions WHERE status = ? ORDER BY created_at DESC LIMIT 500').bind('pending').all<{ id: string; payload_json: string; created_at: number; updated_at: number }>()
      for (const row of pending.results) {
        try { records.push(pendingRepeater(row)) } catch { /* Ignore malformed historical submissions. */ }
      }
    }
    const filtered = records.filter((record) => {
      const text = [record.callsign, record.station_name, record.province, record.city, record.district].map((value) => String(value || '')).join(' ').toLowerCase()
      return (!search || text.includes(search)) && (!province || record.province === province) && (!city || record.city === city) && (!mode || String(record.mode || '').toUpperCase() === mode)
    })
    return json({ data: filtered.slice(0, limit), meta: { count: filtered.length, limit, statuses: requestedStatus === 'all' ? ['published', 'pending'] : [requestedStatus] } }, 200, { 'Cache-Control': 'public, max-age=60' })
  } catch (exception) { return error(exception instanceof Error ? exception.message : '读取中继数据失败', 500) }
}
