<script setup lang="ts">
import { onMounted, ref } from 'vue'
import StatusBadge from '../components/StatusBadge.vue'

interface ReviewItem { id: string; callsign: string; province: string; city: string; risk: 'low' | 'high'; submittedAt: string; sourceUrl: string; status: 'pending' }
const queue = ref<ReviewItem[]>([])
const error = ref('')
const loading = ref(true)
const busy = ref<string | null>(null)
onMounted(async () => { try { const response = await fetch('/api/v1/admin/review', { credentials: 'include' }); if (!response.ok) throw new Error(response.status === 403 ? '此页面需要 Cloudflare Access 和网站管理员权限。' : '无法读取审核队列'); const body = await response.json(); queue.value = body.data || [] } catch (exception) { error.value = exception instanceof Error ? exception.message : '无法读取审核队列' } finally { loading.value = false } })

async function review(id: string, action: 'publish' | 'reject' | 'retire') {
  busy.value = id
  try {
    const response = await fetch(`/api/v1/admin/submissions/${encodeURIComponent(id)}/${action}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } })
    if (!response.ok) throw new Error('审核动作失败')
    queue.value = queue.value.filter((item) => item.id !== id)
  } catch (exception) { error.value = exception instanceof Error ? exception.message : '审核动作失败' }
  finally { busy.value = null }
}
</script>

<template>
  <section class="admin-page"><div class="admin-container"><div class="admin-heading"><div><span class="admin-eyebrow">REVIEW CONSOLE / ACCESS PROTECTED</span><h1>审核队列</h1><p>先处理高风险和冲突记录，低风险提交可以批量放行。</p></div><div class="admin-stat"><strong>{{ queue.length }}</strong><span>待处理</span></div></div><div v-if="loading" class="admin-panel admin-loading">正在读取审核队列…</div><div v-else-if="error" class="admin-panel admin-error"><strong>无法打开审核队列</strong><p>{{ error }}</p><a href="https://admin.repeater.mizuki.top" class="admin-button">重新验证 Access</a></div><div v-else class="admin-panel review-panel"><div class="review-toolbar"><span>全部提交 <b>{{ queue.length }}</b></span><span class="admin-muted">按风险排序 · 最近更新优先</span></div><div v-if="!queue.length" class="admin-empty">队列干净，暂时没有需要处理的提交。</div><article v-for="item in queue" :key="item.id" class="review-row"><div class="review-risk" :class="`risk-${item.risk}`">{{ item.risk === 'high' ? '高风险' : '低风险' }}</div><div class="review-primary"><strong>{{ item.callsign }}</strong><span>{{ item.province }} · {{ item.city }}</span></div><div><StatusBadge status="pending" /></div><a :href="item.sourceUrl" target="_blank" rel="noreferrer" class="review-source">来源 ↗</a><div class="review-actions"><button type="button" :disabled="busy === item.id" @click="review(item.id, 'publish')">通过</button><button type="button" class="reject" :disabled="busy === item.id" @click="review(item.id, 'reject')">退回</button></div></article></div></div></section>
</template>
