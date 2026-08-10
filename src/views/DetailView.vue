<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchRepeater } from '../lib/api'
import StatusBadge from '../components/StatusBadge.vue'
import { seedRepeaters } from '../data/repeaters'
import type { Repeater } from '../types/repeater'
import { formatDate, formatFrequency, formatOffset, sourceLabel } from '../lib/format'

const route = useRoute()
const repeater = ref<Repeater | null>(null)
const loading = ref(true)
const reportReason = ref('')
const reportMessage = ref('')
const reportError = ref('')
const reportBusy = ref(false)

async function load() {
  loading.value = true
  const id = decodeURIComponent(String(route.params.id || ''))
  try { repeater.value = await fetchRepeater(id) }
  catch { repeater.value = seedRepeaters.find((item) => item.id === id) || null }
  finally { loading.value = false }
}

watch(() => route.params.id, load, { immediate: true })

async function reportChange() {
  if (!repeater.value || !reportReason.value.trim()) { reportError.value = '请先填写变化说明'; return }
  reportBusy.value = true
  reportMessage.value = ''
  reportError.value = ''
  try {
    const response = await fetch('/api/v1/reports', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repeaterId: repeater.value.id, reason: reportReason.value }) })
    const body = await response.json() as { message?: string; error?: string }
    if (!response.ok) throw new Error(body.error || '提交报告失败')
    reportMessage.value = body.message || '已提交变化报告'
    reportReason.value = ''
  } catch (exception) { reportError.value = exception instanceof Error ? exception.message : '提交报告失败' }
  finally { reportBusy.value = false }
}
</script>

<template>
  <section v-if="loading" class="page-container loading-state">正在读取中继详情…</section>
  <section v-else-if="repeater" class="page-container detail-page">
    <RouterLink class="back-link" to="/repeaters">← 返回数据目录</RouterLink>
    <div class="detail-layout">
      <article class="detail-main data-card">
        <div class="detail-top"><span class="source-chip">{{ repeater.sourceLabel }}</span><StatusBadge :status="repeater.status" /></div>
        <div class="detail-title"><div><span class="eyebrow">{{ repeater.province }} / {{ repeater.city }}</span><h1>{{ repeater.callsign }}</h1><p>{{ repeater.stationName || '未填写台站名称' }}<template v-if="repeater.district"> · {{ repeater.district }}</template></p></div><span class="detail-mode">{{ repeater.mode }}</span></div>
        <div v-if="repeater.status === 'pending'" class="pending-banner"><strong>这是一条待核验记录</strong><span>它可以作为线索查看，但不会进入固件导出。</span></div>
        <div class="detail-frequency-grid"><div><span>接收频率 RX</span><strong>{{ formatFrequency(repeater.rxMhz) }} <small>MHz</small></strong></div><div><span>发射频率 TX</span><strong>{{ repeater.rxOnly ? '只收' : `${formatFrequency(repeater.txMhz)} MHz` }}</strong></div><div><span>收发差</span><strong>{{ formatOffset(repeater.offsetMhz, repeater.offsetDirection) }}</strong></div><div><span>CTCSS / DCS</span><strong>{{ repeater.ctcssHz ? `${repeater.ctcssHz} Hz` : '无亚音' }}</strong></div></div>
        <div class="detail-notes"><h2>使用提示</h2><p>{{ repeater.note || (repeater.rxOnly ? '此记录仅供接收，请勿发射。' : '请在实际使用前确认台站状态、覆盖范围和发射许可。') }}</p></div>
      </article>
      <aside class="detail-side"><div class="data-card source-card"><span class="eyebrow">TRACEABILITY</span><h2>数据从哪里来</h2><dl><div><dt>来源类型</dt><dd>{{ sourceLabel(repeater.sourceType) }}</dd></div><div><dt>来源标记</dt><dd>{{ repeater.sourceLabel }}</dd></div><div><dt>来源日期</dt><dd>{{ formatDate(repeater.sourceDate) }}</dd></div><div><dt>最近核验</dt><dd>{{ formatDate(repeater.verifiedAt) }}</dd></div></dl><a v-if="repeater.sourceUrl" class="source-link" :href="repeater.sourceUrl" target="_blank" rel="noreferrer">打开来源链接 ↗</a></div><div class="data-card report-card"><span class="eyebrow">KEEP IT CURRENT</span><h3>发现这条记录有变化？</h3><p>登录后提交修改或停用申请，系统会保留变更原因和来源。</p><RouterLink class="button button-secondary button-full" :to="{ path: '/submit', query: { kind: 'update', id: repeater.id } }">提交修改申请</RouterLink><form class="report-form" @submit.prevent="reportChange"><label>变化说明<textarea v-model="reportReason" rows="3" placeholder="例如：台站公告显示已迁移或停用"></textarea></label><p v-if="reportError" class="form-message error-message">{{ reportError }}</p><p v-if="reportMessage" class="form-message success-message">{{ reportMessage }}</p><button class="button button-secondary button-full" type="submit" :disabled="reportBusy">{{ reportBusy ? '提交中…' : '报告数据变化' }}</button></form></div></aside>
    </div>
  </section>
  <section v-else class="page-container empty-state detail-missing"><span>404</span><h1>没有找到这条记录</h1><RouterLink class="button button-primary" to="/repeaters">返回数据目录</RouterLink></section>
</template>
