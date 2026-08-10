import type { PagesHandler } from '../../_shared/types'
import { error, json } from '../../_shared/http'

export const onRequestGet: PagesHandler = async ({ request, env }) => {
  const url = new URL(request.url)
  const search = (url.searchParams.get('q') || '').trim()
  const province = (url.searchParams.get('province') || '').trim()
  const city = (url.searchParams.get('city') || '').trim()
  const status = url.searchParams.get('status') === 'published' ? 'published' : null
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 100)))
  const clauses = ['status = ?']
  const bindings: (string | number)[] = [status || 'published']
  if (province) { clauses.push('province = ?'); bindings.push(province) }
  if (city) { clauses.push('city = ?'); bindings.push(city) }
  if (search) { clauses.push('(callsign LIKE ? OR station_name LIKE ? OR province LIKE ? OR city LIKE ?)'); const like = `%${search}%`; bindings.push(like, like, like, like) }
  try {
    const result = await env.DB.prepare(`SELECT id, station_key, province, city, district, callsign, station_name, rx_mhz, tx_mhz, ctcss_hz, mode, rx_only, source_type, source_label, source_url, source_date, collected_date, verified_at, status, note FROM repeaters WHERE ${clauses.join(' AND ')} ORDER BY province, city, rx_mhz LIMIT ?`).bind(...bindings, limit).all()
    return json({ data: result.results, meta: { count: result.results.length, limit } })
  } catch (exception) { return error(exception instanceof Error ? exception.message : '读取中继数据失败', 500) }
}
