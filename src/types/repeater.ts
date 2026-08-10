export type RepeaterStatus = 'published' | 'pending' | 'retired' | 'rejected' | 'draft'

export interface Repeater {
  id: string
  stationKey: string
  province: string
  city: string
  district: string
  callsign: string
  stationName: string
  rxMhz: number
  txMhz: number
  offsetMhz: number
  offsetDirection: '+' | '-' | '同频'
  ctcssHz: number | null
  mode: string
  rxOnly: boolean
  status: RepeaterStatus
  sourceType: string
  sourceLabel: string
  sourceUrl: string
  sourceDate: number | null
  collectedDate: number | null
  verifiedAt: number | null
  note: string
  latitude: number
  longitude: number
}

export interface RepeaterInput {
  kind?: 'create' | 'update' | 'retire'
  repeaterId?: string
  province: string
  city: string
  district?: string
  callsign: string
  stationName?: string
  rxMhz: number
  txMhz: number
  ctcssHz?: number | null
  mode: string
  rxOnly?: boolean
  sourceUrl: string
  sourceDate?: number | null
  note?: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
