<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getMySubmissions } from '../lib/api'
import type { Repeater } from '../types/repeater'
import { formatDate, formatFrequency } from '../lib/format'
import StatusBadge from '../components/StatusBadge.vue'

const submissions = ref<Repeater[]>([])
const error = ref('')
const loading = ref(true)
onMounted(async () => { try { submissions.value = await getMySubmissions() } catch (exception) { error.value = exception instanceof Error ? exception.message : '请先登录查看个人提交' } finally { loading.value = false } })
</script>

<template>
  <section class="page-container account-page"><div class="account-heading"><div><span class="eyebrow">YOUR CONTRIBUTIONS</span><h1>我的提交</h1><p>查看你提交过的新增、修改和停用申请。</p></div><RouterLink class="button button-primary" to="/submit">＋ 新建提交</RouterLink></div><div v-if="loading" class="loading-state">正在读取你的提交…</div><div v-else-if="error" class="login-callout data-card"><span>⌁</span><div><h2>登录后查看个人记录</h2><p>{{ error }}</p></div><RouterLink class="button button-primary" to="/auth">登录 / 注册</RouterLink></div><div v-else-if="!submissions.length" class="empty-state data-card"><span>⌁</span><h2>还没有提交</h2><p>如果你发现某个台站的频率发生变化，可以从这里开始记录。</p><RouterLink class="button button-secondary" to="/submit">提交第一条</RouterLink></div><div v-else class="submission-list"><article v-for="item in submissions" :key="item.id" class="data-card submission-row"><div><strong>{{ item.callsign }}</strong><span>{{ item.province }} · {{ item.city }}</span></div><div>{{ formatFrequency(item.rxMhz) }} / {{ formatFrequency(item.txMhz) }} MHz</div><StatusBadge :status="item.status" /><small>{{ formatDate(item.sourceDate) }}</small></article></div></section>
</template>
