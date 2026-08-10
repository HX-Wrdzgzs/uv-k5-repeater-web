import type { PagesHandler } from '../../_shared/types'
import { allowRate, assertSameOrigin, audit, error, json, requireUser, now } from '../../_shared/http'
import { stationKey, validatePayload } from '../../_shared/validation'

export const onRequestGet: PagesHandler = async ({ request, env }) => {
  try {
    const user = await requireUser(request, env)
    if (!allowRate(`submission:${user.id}`, 20, 3600)) return error('提交太频繁，请稍后再试', 429)
    const rows = await env.DB.prepare('SELECT id, payload_json, status, risk, validation_json, review_note, created_at, updated_at FROM submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').bind(user.id).all<{ id: string; payload_json: string; status: string; risk: string; validation_json: string; review_note: string | null; created_at: number; updated_at: number }>()
    return json({ data: rows.results.map((row) => ({ ...JSON.parse(row.payload_json), id: row.id, status: row.status, risk: row.risk, createdAt: row.created_at, updatedAt: row.updated_at, reviewNote: row.review_note })) })
  } catch (exception) { return exception instanceof Response ? exception : error('读取个人提交失败', 500) }
}

export const onRequestPost: PagesHandler = async ({ request, env }) => {
  if (!assertSameOrigin(request)) return error('来源校验失败', 403)
  try {
    const user = await requireUser(request, env)
    const body = await request.json().catch(() => null)
    const { input, errors } = validatePayload(body)
    if (!input) return error(errors.join('；'), 422)
    const key = stationKey(input)
    const requestedKind = body && typeof body === 'object' && ['create', 'update', 'retire'].includes(String((body as { kind?: string }).kind)) ? (body as { kind: 'create' | 'update' | 'retire' }).kind : null
    const requestedRepeaterId = body && typeof body === 'object' ? String((body as { repeaterId?: string }).repeaterId || '').trim() : ''
    const duplicate = await env.DB.prepare('SELECT id FROM repeaters WHERE station_key = ?').bind(key).first<{ id: string }>()
    const target = requestedRepeaterId ? await env.DB.prepare('SELECT id FROM repeaters WHERE id = ? AND status = ?').bind(requestedRepeaterId, 'published').first<{ id: string }>() : duplicate
    const kind = requestedKind || (target ? 'update' : 'create')
    if (kind !== 'create' && !target) return error('修改或停用申请必须指定一条已发布记录', 422)
    const risk = duplicate || input.rxOnly || input.ctcssHz == null || Math.abs(input.txMhz - input.rxMhz) > 20 ? 'high' : 'low'
    const id = crypto.randomUUID()
    const current = now()
    await env.DB.prepare('INSERT INTO submissions (id, user_id, repeater_id, kind, payload_json, status, risk, validation_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, user.id, target?.id || null, kind, JSON.stringify({ ...input, stationKey: key, repeaterId: target?.id || null, kind }), 'pending', risk, '[]', current, current).run()
    await audit(env, user.id, 'submission.created', 'submission', id, null, { ...input, kind, repeaterId: target?.id || null, risk, status: 'pending' }, request)
    return json({ data: { id, status: 'pending', risk }, message: risk === 'high' ? '提交成功，已进入人工队列' : '提交成功，基础校验通过后会公开标记为待核验' }, 201)
  } catch (exception) { return exception instanceof Response ? exception : error('提交失败', 500) }
}
