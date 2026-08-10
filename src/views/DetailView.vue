<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import StatusBadge from '../components/StatusBadge.vue'
import { seedRepeaters } from '../data/repeaters'
import { formatDate, formatFrequency, formatOffset, sourceLabel } from '../lib/format'

const route = useRoute()
const repeater = computed(() => seedRepeaters.find((item) => item.id === decodeURIComponent(String(route.params.id))))
</script>

<template>
  <section v-if="repeater" class="page-container detail-page">
    <RouterLink class="back-link" to="/repeaters">← 返回全国数据</RouterLink>
    <div class="detail-layout">
      <article class="detail-main data-card">
        <div class="detail-top"><span class="source-chip">{{ repeater.sourceLabel }}</span><StatusBadge :status="repeater.status" /></div>
        <div class="detail-title"><div><span class="eyebrow">{{ repeater.province }} / {{ repeater.city }}</span><h1>{{ repeater.callsign }}</h1><p>{{ repeater.stationName || '未填写台站名称' }}<template v-if="repeater.district"> · {{ repeater.district }}</template></p></div><span class="detail-mode">{{ repeater.mode }}</span></div>
        <div v-if="repeater.status === 'pending'" class="pending-banner"><strong>这是一条待核验记录</strong><span>它可以作为线索查看，但不会进入固件导出。</span></div>
        <div class="detail-frequency-grid"><div><span>接收频率 RX</span><strong>{{ formatFrequency(repeater.rxMhz) }} <small>MHz</small></strong></div><div><span>发射频率 TX</span><strong>{{ repeater.rxOnly ? '只收' : `${formatFrequency(repeater.txMhz)} MHz` }}</strong></div><div><span>收发差</span><strong>{{ formatOffset(repeater.offsetMhz, repeater.offsetDirection) }}</strong></div><div><span>CTCSS / DCS</span><strong>{{ repeater.ctcssHz ? `${repeater.ctcssHz} Hz` : '无亚音' }}</strong></div></div>
        <div class="detail-notes"><h2>使用提示</h2><p>{{ repeater.note || (repeater.rxOnly ? '此记录仅供接收，请勿发射。' : '请在实际使用前确认台站状态、覆盖范围和发射许可。') }}</p></div>
      </article>
      <aside class="detail-side"><div class="data-card source-card"><span class="eyebrow">TRACEABILITY</span><h2>数据从哪里来</h2><dl><div><dt>来源类型</dt><dd>{{ sourceLabel(repeater.sourceType) }}</dd></div><div><dt>来源标记</dt><dd>{{ repeater.sourceLabel }}</dd></div><div><dt>来源日期</dt><dd>{{ formatDate(repeater.sourceDate) }}</dd></div><div><dt>最近核验</dt><dd>{{ formatDate(repeater.verifiedAt) }}</dd></div></dl><a v-if="repeater.sourceUrl" class="source-link" :href="repeater.sourceUrl" target="_blank" rel="noreferrer">打开来源链接 ↗</a></div><div class="data-card report-card"><span class="eyebrow">KEEP IT CURRENT</span><h3>发现这条记录有变化？</h3><p>登录后提交修改或停用申请，系统会保留变更原因和来源。</p><RouterLink class="button button-secondary button-full" to="/submit">提交修改申请</RouterLink></div></aside>
    </div>
  </section>
  <section v-else class="page-container empty-state detail-missing"><span>404</span><h1>没有找到这条记录</h1><RouterLink class="button button-primary" to="/repeaters">返回数据目录</RouterLink></section>
</template>
