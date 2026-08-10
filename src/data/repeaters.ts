import manifest from './repeaters_manifest.json'
import type { Repeater } from '../types/repeater'

type ManifestRecord = Record<string, any>

const centers: Record<string, [number, number]> = {
  北京: [39.9042, 116.4074],
  天津: [39.0842, 117.2009],
  河北: [38.0428, 114.5149],
  山西: [37.8706, 112.5489],
  内蒙古: [40.8175, 111.7656],
  辽宁: [41.8057, 123.4315],
  吉林: [43.8171, 125.3235],
  黑龙江: [45.8038, 126.5349],
  上海: [31.2304, 121.4737],
  江苏: [32.0603, 118.7969],
  浙江: [30.2741, 120.1551],
  安徽: [31.8612, 117.2857],
  福建: [26.0745, 119.2965],
  江西: [28.6829, 115.8582],
  山东: [36.6512, 117.1201],
  河南: [34.7466, 113.6254],
  湖北: [30.5928, 114.3055],
  湖南: [28.2282, 112.9388],
  广东: [23.1291, 113.2644],
  广西: [22.817, 108.3669],
  海南: [20.044, 110.1983],
  重庆: [29.563, 106.5516],
  四川: [30.5728, 104.0668],
  贵州: [26.647, 106.6302],
  云南: [25.0453, 102.7097],
  西藏: [29.65, 91.1],
  陕西: [34.3416, 108.9398],
  甘肃: [36.0611, 103.8343],
  青海: [36.6171, 101.7782],
  宁夏: [38.4872, 106.2309],
  新疆: [43.8256, 87.6168],
  台湾: [25.033, 121.5654],
  香港: [22.3193, 114.1694],
  澳门: [22.1987, 113.5439],
  全国: [35.8617, 104.1954],
}

function hashOffset(value: string): number {
  let hash = 0
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) % 1000
  return (hash % 7 - 3) * 0.06
}

export function coordinatesFor(province: string, stationKey: string): [number, number] {
  const [latitude, longitude] = centers[province] ?? centers.全国
  return [latitude + hashOffset(stationKey), longitude + hashOffset(`${stationKey}-lng`)]
}

function toDateNumber(value: unknown): number | null {
  const number = Number(value || 0)
  return number > 0 ? number : null
}

export function normalizeRepeater(record: ManifestRecord, status: Repeater['status'] = 'published'): Repeater {
  const stationKey = String(record.station_key || `${record.callsign}|${record.province}|${record.city}`)
  const rxMhz = Number(record.rx_mhz || 0)
  const txMhz = Number(record.tx_mhz ?? rxMhz)
  const offsetMhz = Number((txMhz - rxMhz).toFixed(4))
  const offsetDirection = offsetMhz === 0 ? '同频' : offsetMhz > 0 ? '+' : '-'
  const [latitude, longitude] = coordinatesFor(String(record.province || '全国'), stationKey)

  return {
    id: stationKey,
    stationKey,
    province: String(record.province || '未填写'),
    city: String(record.city || '未填写'),
    district: String(record.district || ''),
    callsign: String(record.callsign || '未登记'),
    stationName: String(record.station_name || record.display_name || ''),
    rxMhz,
    txMhz,
    offsetMhz,
    offsetDirection,
    ctcssHz: record.ctcss_hz == null ? null : Number(record.ctcss_hz),
    mode: String(record.mode || 'FM'),
    rxOnly: Boolean(record.rx_only),
    status,
    sourceType: String(record.source_type || 'unknown'),
    sourceLabel: String(record.source_label || '未标注'),
    sourceUrl: String(record.source_url || ''),
    sourceDate: toDateNumber(record.source_date),
    collectedDate: toDateNumber(record.collected_date),
    verifiedAt: status === 'published' ? toDateNumber(record.source_date || record.collected_date) : null,
    note: String(record.note || ''),
    latitude,
    longitude,
  }
}

export const seedRepeaters: Repeater[] = (manifest.records as ManifestRecord[]).map((record) => normalizeRepeater(record))

export const seedMeta = {
  version: `k5db-v${manifest.format.version}-${manifest.source_date}`,
  formatVersion: manifest.format.version,
  sourceDate: manifest.source_date,
  recordCount: manifest.record_count,
  provinceCount: manifest.province_count,
  cityCount: manifest.city_count,
  binarySize: manifest.binary_size,
  sourceFile: manifest.source_file,
}

export const provinces = [...new Set(seedRepeaters.map((item) => item.province))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
export const cities = [...new Set(seedRepeaters.map((item) => item.city))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
