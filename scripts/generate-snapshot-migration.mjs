import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(root, 'src', 'data', 'repeaters_manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const sourceDate = String(manifest.source_date || '')
if (!/^\d{8}$/.test(sourceDate)) throw new Error(`Invalid manifest source_date: ${sourceDate}`)

const outputPath = path.join(root, 'migrations', `0003_sync_snapshot_${sourceDate}.sql`)
const timestamp = Math.floor(Date.parse(`${sourceDate.slice(0, 4)}-${sourceDate.slice(4, 6)}-${sourceDate.slice(6)}T00:00:00Z`) / 1000)
const quote = (value) => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`
const number = (value) => value == null || value === '' ? 'NULL' : String(Number(value))

const columns = [
  'id', 'station_key', 'province', 'city', 'district', 'callsign', 'station_name',
  'rx_mhz', 'tx_mhz', 'ctcss_hz', 'mode', 'rx_only', 'source_type', 'source_label',
  'source_url', 'source_date', 'collected_date', 'verified_at', 'status', 'note',
  'created_at', 'updated_at',
]
const valueFor = (record, column) => {
  const map = {
    id: record.station_key,
    station_key: record.station_key,
    province: record.province,
    city: record.city,
    district: record.district || '',
    callsign: record.callsign,
    station_name: record.station_name || record.display_name || '',
    rx_mhz: record.rx_mhz,
    tx_mhz: record.tx_mhz,
    ctcss_hz: record.ctcss_hz,
    mode: record.mode || 'FM',
    rx_only: record.rx_only ? 1 : 0,
    source_type: record.source_type || 'unknown',
    source_label: record.source_label || '',
    source_url: record.source_url || '',
    source_date: record.source_date,
    collected_date: record.collected_date,
    verified_at: record.source_date || record.collected_date || manifest.source_date,
    status: 'published',
    note: record.note || '',
    created_at: timestamp,
    updated_at: timestamp,
  }
  const value = map[column]
  return ['rx_mhz', 'tx_mhz', 'ctcss_hz', 'source_date', 'collected_date', 'verified_at', 'created_at', 'updated_at'].includes(column)
    ? number(value)
    : column === 'rx_only'
      ? String(value)
      : quote(value)
}

const updateColumns = columns.filter((column) => !['id', 'created_at'].includes(column))
const statements = manifest.records.map((record) => {
  const values = columns.map((column) => valueFor(record, column)).join(', ')
  const updates = updateColumns.map((column) => `${column} = excluded.${column}`).join(', ')
  return `INSERT INTO repeaters (${columns.join(', ')}) VALUES (${values}) ON CONFLICT(station_key) DO UPDATE SET ${updates};`
})

const header = [
  `-- Sync generated from repeaters_manifest.json (K5DB v${manifest.format.version}, ${manifest.record_count} records, source ${manifest.source_date}).`,
  '-- This migration upserts the public snapshot and intentionally does not delete records outside the snapshot.',
  '-- It does not touch users, submissions, reports, audit logs, sessions, or private tail-tone resources.',
  '-- Review the target D1 database before applying remotely.',
  '',
].join('\n')

fs.writeFileSync(outputPath, `${header}${statements.join('\n')}\n`, 'utf8')
console.log(`Generated ${outputPath}: ${statements.length} snapshot upserts`)
