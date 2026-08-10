import type { SubmissionPayload } from './types'

const CTCSS = new Set([67, 69.3, 71.9, 74.4, 77, 79.7, 82.5, 85.4, 88.5, 91.5, 94.8, 97.4, 100, 103.5, 107.2, 110.9, 114.8, 118.8, 123, 127.3, 131.8, 136.5, 141.3, 146.2, 151.4, 156.7, 159.8, 162.2, 165.5, 167.9, 171.3, 173.8, 177.3, 179.9, 183.5, 186.2, 189.9, 192.8, 196.6, 199.5, 203.5, 206.5, 210.7, 218.1, 225.7, 229.1, 233.6, 241.8, 250.3, 254.1])

export function validatePayload(value: unknown): { input?: SubmissionPayload; errors: string[] } {
  const input = value as Partial<SubmissionPayload>
  const errors: string[] = []
  if (!input || typeof input !== 'object') return { errors: ['请求数据格式错误'] }
  for (const key of ['province', 'city', 'callsign', 'sourceUrl'] as const) if (typeof input[key] !== 'string' || !input[key]?.trim()) errors.push(`${key} 不能为空`)
  if (!/^[A-Z0-9-]{2,16}$/i.test(String(input.callsign || '').trim())) errors.push('呼号格式不正确')
  if (!Number.isFinite(Number(input.rxMhz)) || Number(input.rxMhz) < 18 || Number(input.rxMhz) > 1300) errors.push('接收频率必须在 18–1300 MHz 范围内')
  if (!Number.isFinite(Number(input.txMhz)) || Number(input.txMhz) < 18 || Number(input.txMhz) > 1300) errors.push('发射频率必须在 18–1300 MHz 范围内')
  if (Math.abs(Number(input.txMhz) - Number(input.rxMhz)) > 20) errors.push('收发频差不能超过 20 MHz')
  if (input.ctcssHz != null && !CTCSS.has(Number(input.ctcssHz))) errors.push('CTCSS 不是标准亚音值')
  if (!/^https?:\/\//i.test(String(input.sourceUrl || '').trim())) errors.push('来源链接必须使用 http 或 https')
  const normalized: SubmissionPayload = { province: String(input.province || '').trim(), city: String(input.city || '').trim(), district: String(input.district || '').trim(), callsign: String(input.callsign || '').trim().toUpperCase(), stationName: String(input.stationName || '').trim(), rxMhz: Number(input.rxMhz), txMhz: Number(input.txMhz), ctcssHz: input.ctcssHz == null ? null : Number(input.ctcssHz), mode: String(input.mode || 'FM').trim().toUpperCase(), rxOnly: Boolean(input.rxOnly), sourceUrl: String(input.sourceUrl || '').trim(), sourceDate: input.sourceDate == null || input.sourceDate === 0 ? null : Number(input.sourceDate), note: String(input.note || '').trim() }
  if (normalized.sourceDate != null && !/^\d{8}$/.test(String(normalized.sourceDate))) errors.push('来源日期应为 YYYYMMDD')
  return errors.length ? { errors } : { input: normalized, errors }
}

export function stationKey(input: SubmissionPayload) { return `${input.callsign}|${input.province}|${input.city}|${input.district || ''}|RX${input.rxMhz.toFixed(4)}|TX${input.txMhz.toFixed(4)}` }
