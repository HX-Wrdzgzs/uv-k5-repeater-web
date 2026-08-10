import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(root, 'src', 'data', 'repeaters_manifest.json')
const outputPath = path.join(root, 'migrations', '0002_seed.sql')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const timestamp = Math.floor(Date.parse('2026-07-26T00:00:00Z') / 1000)
const quote = (value) => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`
const number = (value) => value == null || value === '' ? 'NULL' : String(Number(value))
const records = manifest.records.map((record) => {
  const id = record.station_key
  const verified = record.source_date || record.collected_date || manifest.source_date
  return `INSERT OR IGNORE INTO repeaters (id, station_key, province, city, district, callsign, station_name, rx_mhz, tx_mhz, ctcss_hz, mode, rx_only, source_type, source_label, source_url, source_date, collected_date, verified_at, status, note, created_at, updated_at) VALUES (${quote(id)}, ${quote(record.station_key)}, ${quote(record.province)}, ${quote(record.city)}, ${quote(record.district || '')}, ${quote(record.callsign)}, ${quote(record.station_name || record.display_name || '')}, ${number(record.rx_mhz)}, ${number(record.tx_mhz)}, ${number(record.ctcss_hz)}, ${quote(record.mode || 'FM')}, ${record.rx_only ? 1 : 0}, ${quote(record.source_type || 'unknown')}, ${quote(record.source_label || '')}, ${quote(record.source_url || '')}, ${number(record.source_date)}, ${number(record.collected_date)}, ${number(verified)}, 'published', ${quote(record.note || '')}, ${timestamp}, ${timestamp});`
})
const header = `-- Generated from repeaters_manifest.json (K5DB v${manifest.format.version}, ${manifest.record_count} records, source ${manifest.source_date}).\n-- Do not edit by hand; run npm run seed:sql after updating the source snapshot.\n`
fs.writeFileSync(outputPath, `${header}${records.join('\n')}\n`, 'utf8')
console.log(`Generated ${outputPath}: ${records.length} published records`)
