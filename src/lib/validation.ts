import type { RepeaterInput } from '../types/repeater'

const CTCSS_VALUES = new Set([
  67, 69.3, 71.9, 74.4, 77, 79.7, 82.5, 85.4, 88.5, 91.5, 94.8, 97.4,
  100, 103.5, 107.2, 110.9, 114.8, 118.8, 123, 127.3, 131.8, 136.5,
  141.3, 146.2, 151.4, 156.7, 159.8, 162.2, 165.5, 167.9, 171.3, 173.8,
  177.3, 179.9, 183.5, 186.2, 189.9, 192.8, 196.6, 199.5, 203.5, 206.5,
  210.7, 218.1, 225.7, 229.1, 233.6, 241.8, 250.3, 254.1,
])

export function validateRepeater(input: RepeaterInput): string[] {
  const errors: string[] = []
  if (!input.province.trim() || !input.city.trim()) errors.push('省份和城市不能为空')
  if (!/^[A-Z0-9-]{2,16}$/i.test(input.callsign.trim())) errors.push('呼号格式不正确')
  if (!Number.isFinite(input.rxMhz) || input.rxMhz < 18 || input.rxMhz > 1300) errors.push('接收频率必须在 18–1300 MHz 范围内')
  if (!Number.isFinite(input.txMhz) || input.txMhz < 18 || input.txMhz > 1300) errors.push('发射频率必须在 18–1300 MHz 范围内')
  if (Math.abs(input.txMhz - input.rxMhz) > 20) errors.push('收发频差不能超过 20 MHz')
  if (input.ctcssHz != null && !CTCSS_VALUES.has(Number(input.ctcssHz))) errors.push('CTCSS 必须是标准亚音值')
  if (!/^https?:\/\//i.test(input.sourceUrl.trim())) errors.push('请提供可访问的来源链接')
  if (input.sourceDate != null && !/^\d{8}$/.test(String(input.sourceDate))) errors.push('来源日期应为 YYYYMMDD')
  return errors
}

export function riskFor(input: RepeaterInput, duplicate = false): 'low' | 'high' {
  if (duplicate || input.rxOnly || input.ctcssHz == null) return 'high'
  return Math.abs(input.txMhz - input.rxMhz) > 20 ? 'high' : 'low'
}
