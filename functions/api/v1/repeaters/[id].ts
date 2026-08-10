import type { PagesHandler } from '../../../_shared/types'
import { error, json } from '../../../_shared/http'
import { pendingRepeater, repeaterColumns } from '../../../_shared/repeaters'

export const onRequestGet: PagesHandler = async ({ params, env }) => {
  const id = decodeURIComponent(String(params.id || ''))
  try {
    const item = await env.DB.prepare(`SELECT ${repeaterColumns} FROM repeaters WHERE id = ? AND status = ?`).bind(id, 'published').first<Record<string, unknown>>()
    if (item) return json({ data: item }, 200, { 'Cache-Control': 'public, max-age=60' })
    if (id.startsWith('submission:')) {
      const submissionId = id.slice('submission:'.length)
      const row = await env.DB.prepare('SELECT id, payload_json, created_at, updated_at FROM submissions WHERE id = ? AND status = ?').bind(submissionId, 'pending').first<{ id: string; payload_json: string; created_at: number; updated_at: number }>()
      if (row) return json({ data: pendingRepeater(row) }, 200, { 'Cache-Control': 'public, max-age=60' })
    }
    return error('没有找到这条记录', 404)
  } catch (exception) { return error(exception instanceof Error ? exception.message : '读取中继详情失败', 500) }
}
