<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MapPanel from '../components/MapPanel.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { formatDate, formatFrequency, formatOffset } from '../lib/format'
import { fetchRepeaters } from '../lib/api'
import { seedMeta, seedRepeaters } from '../data/repeaters'
import type { Repeater } from '../types/repeater'

const router = useRouter()
const repeaters = ref<Repeater[]>(seedRepeaters)
onMounted(async () => { try { repeaters.value = await fetchRepeaters() } catch { /* Keep the bundled snapshot as a read-only fallback. */ } })
const recent = computed(() => [...repeaters.value].sort((a, b) => (b.sourceDate || 0) - (a.sourceDate || 0)).slice(0, 6))
const provinceCount = computed(() => new Set(repeaters.value.map((item) => item.province)).size)
const cityCount = computed(() => new Set(repeaters.value.map((item) => item.city)).size)
const dataDate = computed(() => Math.max(seedMeta.sourceDate, ...repeaters.value.map((item) => item.sourceDate || 0)))

function openRepeater(id: string) {
  router.push(`/repeaters/${encodeURIComponent(id)}`)
}
</script>

<template>
  <section class="hero-section">
    <div class="page-container hero-grid">
      <div class="hero-copy">
        <div class="eyebrow"><span class="eyebrow-line"></span> 公开中继数据目录</div>
        <h1>把分散的中继数据，<br /><em>变成一张能更新的地图。</em></h1>
        <p class="hero-lede">一份可搜索、可追溯、由无线电爱好者共同维护的频率目录。先查清楚，再上车。</p>
        <div class="hero-actions">
          <RouterLink class="button button-primary" to="/repeaters">浏览数据目录 <span>→</span></RouterLink>
          <RouterLink class="button button-secondary" to="/submit">提交一条更新</RouterLink>
        </div>
        <p class="hero-note"><span class="pulse-dot"></span> 当前数据快照：{{ formatDate(dataDate) }} · K5DB v{{ seedMeta.version.split('-v')[1]?.split('-')[0] || '3' }}</p>
      </div>
      <div class="hero-snapshot">
        <div class="snapshot-head"><span>LIVE SNAPSHOT</span><span class="snapshot-state">● SYNCED</span></div>
        <div class="snapshot-map-wrap"><MapPanel :repeaters="repeaters" @select="openRepeater" /></div>
        <div class="snapshot-foot"><span>每个点代表一个省级数据聚合</span><RouterLink to="/repeaters">打开地图 →</RouterLink></div>
      </div>
    </div>
  </section>

  <section class="stats-section">
    <div class="page-container stat-grid">
      <div><strong>{{ repeaters.filter((item) => item.status === 'published').length }}</strong><span>已发布记录</span></div>
      <div><strong>{{ provinceCount }}</strong><span>省级区域</span></div>
      <div><strong>{{ cityCount }}</strong><span>城市覆盖</span></div>
      <div><strong>v{{ seedMeta.formatVersion || 3 }}</strong><span>K5DB 数据格式</span></div>
    </div>
  </section>

  <section class="page-container section-block">
    <div class="section-heading">
      <div><span class="eyebrow">DATA DIRECTORY</span><h2>今天能查到什么</h2></div>
      <RouterLink class="text-link" to="/repeaters">查看全部记录 <span>↗</span></RouterLink>
    </div>
    <div class="recent-grid">
      <button v-for="repeater in recent" :key="repeater.id" class="data-card recent-card" type="button" @click="openRepeater(repeater.id)">
        <div class="card-topline"><span class="source-chip">{{ repeater.sourceLabel }}</span><StatusBadge :status="repeater.status" /></div>
        <div class="recent-title"><strong>{{ repeater.callsign }}</strong><span>{{ repeater.stationName || '未填写台站名' }}</span></div>
        <div class="frequency-pair"><span>{{ formatFrequency(repeater.rxMhz) }}</span><b>RX</b><span>{{ formatFrequency(repeater.txMhz) }}</span><b>TX</b></div>
        <div class="card-meta"><span>{{ repeater.province }} · {{ repeater.city }}</span><span>{{ formatOffset(repeater.offsetMhz, repeater.offsetDirection) }}</span></div>
      </button>
    </div>
  </section>

  <section class="page-container section-block why-section">
    <div class="why-intro"><span class="eyebrow">WHY THIS EXISTS</span><h2>频率不是一次性数据。</h2><p>中继会迁移、停用、改频。这里把来源、核验时间和修改记录放在同一个页面，方便下一位值守的人继续维护。</p></div>
    <div class="principle-grid">
      <article><span class="principle-number">01</span><h3>来源在场</h3><p>每条记录保留来源链接和采集日期，不用在群聊里翻旧消息。</p></article>
      <article><span class="principle-number">02</span><h3>待核验也透明</h3><p>社区提交会标记为“待核验”，可供参考但不会直接进入固件导出。</p></article>
      <article><span class="principle-number">03</span><h3>维护者有工具</h3><p>自动校验先挡住明显错误，管理员按风险批量处理，减少重复劳动。</p></article>
    </div>
  </section>

  <section class="cta-section">
    <div class="page-container cta-inner"><div><span class="eyebrow">KEEP IT CURRENT</span><h2>你发现的下一条变化，值得被记录。</h2></div><RouterLink class="button button-primary button-light" to="/submit">提交数据 <span>↗</span></RouterLink></div>
  </section>
</template>
