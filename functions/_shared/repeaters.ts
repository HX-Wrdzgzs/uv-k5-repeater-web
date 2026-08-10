export const repeaterColumns = 'id, station_key, province, city, district, callsign, station_name, rx_mhz, tx_mhz, ctcss_hz, mode, rx_only, source_type, source_label, source_url, source_date, collected_date, verified_at, status, note'

export function publicRepeater(row: Record<string, unknown>) {
  return row
}

export function pendingRepeater(row: { id: string; payload_json: string; created_at: number; updated_at: number }) {
  const payload = JSON.parse(row.payload_json) as Record<string, unknown>
  const stationKey = String(payload.stationKey || `${payload.callsign || ''}|${payload.province || ''}|${payload.city || ''}`)
  return {
    id: `submission:${row.id}`,
    station_key: stationKey,
    province: String(payload.province || ''),
    city: String(payload.city || ''),
    district: String(payload.district || ''),
    callsign: String(payload.callsign || ''),
    station_name: String(payload.stationName || ''),
    rx_mhz: Number(payload.rxMhz || 0),
    tx_mhz: Number(payload.txMhz ?? payload.rxMhz ?? 0),
    ctcss_hz: payload.ctcssHz == null ? null : Number(payload.ctcssHz),
    mode: String(payload.mode || 'FM'),
    rx_only: payload.rxOnly ? 1 : 0,
    source_type: 'community',
    source_label: '社区提交',
    source_url: String(payload.sourceUrl || ''),
    source_date: payload.sourceDate == null ? null : Number(payload.sourceDate),
    collected_date: row.created_at,
    verified_at: null,
    status: 'pending',
    note: String(payload.note || ''),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
