<script setup lang="ts">
import { computed, ref } from 'vue'
import { cities, provinces, seedRepeaters } from '../data/repeaters'
import { formatDate, formatFrequency, formatOffset } from '../lib/format'
import StatusBadge from '../components/StatusBadge.vue'

const query = ref('')
const province = ref('')
const city = ref('')
const mode = ref('')
const showPending = ref(true)

const filtered = computed(() => {
  const search = query.value.trim().toLowerCase()
  return seedRepeaters.filter((item) => {
    const text = `${item.callsign} ${item.stationName} ${item.province} ${item.city} ${item.district}`.toLowerCase()
    return (!search || text.includes(search)) && (!province.value || item.province === province.value) && (!city.value || item.city === city.value) && (!mode.value || item.mode.includes(mode.value)) && (showPending.value || item.status !== 'pending')
  })
})

const cityOptions = computed(() => city.value && province.value ? cities.filter((item) => seedRepeaters.some((row) => row.province === province.value && row.city === item)) : cities)
</script>

<template>
  <section class="page-container directory-page">
    <div class="directory-heading"><div><span class="eyebrow">NATIONWIDE DIRECTORY</span><h1>全国中继数据</h1><p>以当前 K5DB v3 快照为起点，按地区、频率和模式查找。</p></div><RouterLink class="button button-primary" to="/submit">＋ 提交更新</RouterLink></div>
    <div class="filter-bar">
      <label class="search-field"><span aria-hidden="true">⌕</span><input v-model="query" type="search" placeholder="搜索呼号、台站名、城市…" /></label>
      <select v-model="province" aria-label="省份"><option value="">全部省份</option><option v-for="item in provinces" :key="item">{{ item }}</option></select>
      <select v-model="city" aria-label="城市"><option value="">全部城市</option><option v-for="item in cityOptions" :key="item">{{ item }}</option></select>
      <select v-model="mode" aria-label="模式"><option value="">全部模式</option><option value="FM">FM</option><option value="AM">AM</option></select>
      <label class="check-control"><input v-model="showPending" type="checkbox" /> 显示待核验</label>
    </div>
    <div class="result-toolbar"><span><strong>{{ filtered.length }}</strong> 条结果</span><span class="result-note">数据源：{{ seedRepeaters.length }} 条 K5DB v3 构建记录</span></div>
    <div class="directory-table-wrap">
      <table class="directory-table"><thead><tr><th>台站</th><th>位置</th><th>接收 / 发射</th><th>亚音</th><th>模式</th><th>状态</th><th>核验</th></tr></thead>
        <tbody><tr v-for="item in filtered" :key="item.id"><td><RouterLink class="station-link" :to="`/repeaters/${encodeURIComponent(item.id)}`"><strong>{{ item.callsign }}</strong><small>{{ item.stationName || '未填写台站名' }}</small></RouterLink></td><td><span>{{ item.province }}</span><small>{{ item.city }}<template v-if="item.district"> · {{ item.district }}</template></small></td><td><span class="freq-inline">{{ formatFrequency(item.rxMhz) }} <i>RX</i></span><small>{{ formatFrequency(item.txMhz) }} TX · {{ formatOffset(item.offsetMhz, item.offsetDirection) }}</small></td><td>{{ item.ctcssHz ? `${item.ctcssHz} Hz` : '无' }}</td><td><span class="mode-chip">{{ item.mode }}</span></td><td><StatusBadge :status="item.status" /></td><td><small>{{ formatDate(item.verifiedAt || item.sourceDate) }}</small></td></tr></tbody>
      </table>
    </div>
    <div v-if="!filtered.length" class="empty-state"><span>⌁</span><h3>没有匹配的记录</h3><p>换一个呼号、城市或清空筛选再试试。</p></div>
    <p class="directory-disclaimer">频率、收发差、亚音和覆盖范围都可能变化。发射前请遵守当地无线电管理规定，并向台站维护者确认。</p>
  </section>
</template>
