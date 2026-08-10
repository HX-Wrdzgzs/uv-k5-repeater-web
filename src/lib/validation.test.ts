import { describe, expect, it } from 'vitest'
import { riskFor, validateRepeater } from './validation'

const valid = {
  province: '广东', city: '广州', district: '番禺', callsign: 'BR7JCB', stationName: '测试台',
  rxMhz: 439.475, txMhz: 434.475, ctcssHz: 88.5, mode: 'FM', rxOnly: false,
  sourceUrl: 'https://example.com/repeater', sourceDate: 20260801, note: '',
}

describe('repeater validation', () => {
  it('accepts a sourced analogue repeater record', () => {
    expect(validateRepeater(valid)).toEqual([])
  })

  it('rejects impossible frequency and source values', () => {
    const errors = validateRepeater({ ...valid, rxMhz: 4, txMhz: 900, ctcssHz: 88.6, sourceUrl: 'not-a-url' })
    expect(errors).toEqual(expect.arrayContaining(['接收频率必须在 18–1300 MHz 范围内', '收发频差不能超过 20 MHz', 'CTCSS 必须是标准亚音值', '请提供可访问的来源链接']))
  })

  it('raises the risk of duplicates and receive-only records', () => {
    expect(riskFor(valid)).toBe('low')
    expect(riskFor({ ...valid, rxOnly: true })).toBe('high')
    expect(riskFor(valid, true)).toBe('high')
  })
})
