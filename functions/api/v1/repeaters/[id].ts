import type { PagesHandler } from '../../../_shared/types'
import { error, json } from '../../../_shared/http'

export const onRequestGet: PagesHandler = async ({ params, env }) => {
  const id = decodeURIComponent(String(params.id || ''))
  const item = await env.DB.prepare('SELECT * FROM repeaters WHERE id = ? AND status != ?').bind(id, 'retired').first()
  return item ? json({ data: item }) : error('没有找到这条记录', 404)
}
