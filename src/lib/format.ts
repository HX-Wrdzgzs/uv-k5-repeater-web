export function formatDate(value: number | null | undefined): string {
  if (!value) return '暂无'
  const text = String(value)
  if (text.length !== 8) return text
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6)}`
}

export function formatFrequency(value: number): string {
  return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}

export function formatOffset(value: number, direction: string): string {
  if (direction === '同频' || value === 0) return '同频'
  return `${direction}${Math.abs(value).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')} MHz`
}

export function sourceLabel(value: string): string {
  const labels: Record<string, string> = {
    government: '政府/监管',
    operator: '运营方',
    association: '协会/台站',
    'qlham-community': 'QLH 社区',
    'hamcq-community': 'HamCQ 社区',
    'user-curated-table': '维护者整理',
  }
  return labels[value] || value || '未标注来源'
}
