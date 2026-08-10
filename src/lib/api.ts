import { coordinatesFor } from '../data/repeaters'
import type { ApiResponse, Repeater, RepeaterInput } from '../types/repeater'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok) throw new Error(body.error || body.message || `请求失败（${response.status}）`)
  return body.data as T
}

function value(record: Record<string, unknown>, camel: string, snake: string, fallback: unknown = null) {
  return record[camel] ?? record[snake] ?? fallback
}

export function normalizeRepeater(record: Record<string, unknown>): Repeater {
  const stationKey = String(value(record, 'stationKey', 'station_key', record.id || `${record.callsign || ''}|${record.province || ''}`))
  const rxMhz = Number(value(record, 'rxMhz', 'rx_mhz', 0))
  const txMhz = Number(value(record, 'txMhz', 'tx_mhz', rxMhz))
  const offsetMhz = Number((txMhz - rxMhz).toFixed(4))
  const [latitude, longitude] = coordinatesFor(String(record.province || '全国'), stationKey)
  return {
    id: String(record.id || stationKey),
    stationKey,
    province: String(record.province || ''),
    city: String(record.city || ''),
    district: String(value(record, 'district', 'district', '')),
    callsign: String(record.callsign || ''),
    stationName: String(value(record, 'stationName', 'station_name', '')),
    rxMhz,
    txMhz,
    offsetMhz,
    offsetDirection: offsetMhz === 0 ? '同频' : offsetMhz > 0 ? '+' : '-',
    ctcssHz: value(record, 'ctcssHz', 'ctcss_hz') == null ? null : Number(value(record, 'ctcssHz', 'ctcss_hz')),
    mode: String(record.mode || 'FM'),
    rxOnly: Boolean(value(record, 'rxOnly', 'rx_only', false)),
    status: String(record.status || 'published') as Repeater['status'],
    sourceType: String(value(record, 'sourceType', 'source_type', 'unknown')),
    sourceLabel: String(value(record, 'sourceLabel', 'source_label', '未标注')),
    sourceUrl: String(value(record, 'sourceUrl', 'source_url', '')),
    sourceDate: value(record, 'sourceDate', 'source_date') == null ? null : Number(value(record, 'sourceDate', 'source_date')),
    collectedDate: value(record, 'collectedDate', 'collected_date') == null ? null : Number(value(record, 'collectedDate', 'collected_date')),
    verifiedAt: value(record, 'verifiedAt', 'verified_at') == null ? null : Number(value(record, 'verifiedAt', 'verified_at')),
    note: String(record.note || ''),
    latitude,
    longitude,
  }
}

export async function fetchRepeaters() {
  const rows = await request<Record<string, unknown>[]>('/api/v1/repeaters?limit=500')
  return rows.map(normalizeRepeater)
}

export async function fetchRepeater(id: string) {
  const row = await request<Record<string, unknown>>(`/api/v1/repeaters/${encodeURIComponent(id)}`)
  return normalizeRepeater(row)
}

export function requestMagicLink(email: string) {
  return request<{ accepted: boolean }>('/api/v1/auth/email/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function startGithubLogin() {
  window.location.assign('/api/v1/auth/github/start')
}

export function submitRepeater(input: RepeaterInput) {
  return request<{ id: string; status: string }>('/api/v1/submissions', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getMySubmissions() {
  return request<Record<string, unknown>[]>('/api/v1/submissions/me').then((rows) => rows.map(normalizeRepeater))
}
