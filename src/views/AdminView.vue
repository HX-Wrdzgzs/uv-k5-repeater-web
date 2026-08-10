<script setup lang="ts">
import { onMounted, ref } from 'vue'
import StatusBadge from '../components/StatusBadge.vue'

interface ReviewItem { id: string; callsign: string; province: string; city: string; risk: 'low' | 'high'; submittedAt: string; sourceUrl: string; status: 'pending' }
interface ReportItem { id: string; repeater_id: string; reason: string; status: 'open'; created_at: number; email?: string }
const queue = ref<ReviewItem[]>([])
const reports = ref<ReportItem[]>([])
const error = ref('')
const loading = ref(true)
const busy = ref<string | null>(null)
onMounted(async () => { try { const [reviewResponse, reportResponse] = await Promise.all([fetch('/api/v1/admin/review', { credentials: 'include' }), fetch('/api/v1/admin/reports', { credentials: 'include' })]); if (!reviewResponse.ok) throw new Error(reviewResponse.status === 403 ? '此页面需要 Cloudflare Access 和网站管理员权限。' : '无法读取审核队列'); const reviewBody = await reviewResponse.json(); queue.value = reviewBody.data || []; if (reportResponse.ok) { const reportBody = await reportResponse.json(); reports.value = reportBody.data || [] } } catch (exception) { error.value = exception instanceof Error ? exception.message : '无法读取审核队列' } finally { loading.value = false } })

async function review(id: string, action: 'publish' | 'reject' | 'retire') {
  busy.value = id
  try {
    const response = await fetch(`/api/v1/admin/submissions/${encodeURIComponent(id)}/${action}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } })
    if (!response.ok) throw new Error('审核动作失败')
    queue.value = queue.value.filter((item) => item.id !== id)
  } catch (exception) { error.value = exception instanceof Error ? exception.message : '审核动作失败' }
  finally { busy.value = null }
}

async function reviewReport(id: string, action: 'resolve' | 'dismiss') {
  busy.value = id
  try {
    const response = await fetch(`/api/v1/admin/reports/${encodeURIComponent(id)}/${action}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } })
    if (!response.ok) throw new Error('举报处理失败')
    reports.value = reports.value.filter((item) => item.id !== id)
  } catch (exception) { error.value = exception instanceof Error ? exception.message : '举报处理失败' }
  finally { busy.value = null }
}
</script>

<template>
  <section class="admin-page">
    <div class="admin-container">
      <div class="admin-heading">
        <div><span class="admin-eyebrow">REVIEW CONSOLE / ACCESS PROTECTED</span><h1>审核队列</h1><p>先处理高风险和冲突记录，低风险提交可以批量放行。</p></div>
        <div class="admin-stat"><strong>{{ queue.length + reports.length }}</strong><span>待处理</span></div>
      </div>
      <div v-if="loading" class="admin-panel admin-loading">正在读取审核队列…</div>
      <div v-else-if="error" class="admin-panel admin-error"><strong>无法打开审核队列</strong><p>{{ error }}</p><a href="https://admin.repeater.mizuki.top" class="admin-button">重新验证 Access</a></div>
      <div v-else>
        <div class="admin-panel review-panel">
          <div class="review-toolbar"><span>中继提交 <b>{{ queue.length }}</b></span><span class="admin-muted">按风险排序 · 最近更新优先</span></div>
          <div v-if="!queue.length" class="admin-empty">没有待处理的中继提交。</div>
          <article v-for="item in queue" :key="item.id" class="review-row">
            <div class="review-risk" :class="`risk-${item.risk}`">{{ item.risk === 'high' ? '高风险' : '低风险' }}</div>
            <div class="review-primary"><strong>{{ item.callsign }}</strong><span>{{ item.province }} · {{ item.city }}</span></div>
            <div><StatusBadge status="pending" /></div>
            <a :href="item.sourceUrl" target="_blank" rel="noreferrer" class="review-source">来源 ↗</a>
            <div class="review-actions"><button type="button" :disabled="busy === item.id" @click="review(item.id, 'publish')">通过</button><button type="button" class="reject" :disabled="busy === item.id" @click="review(item.id, 'reject')">退回</button></div>
          </article>
        </div>
        <div class="admin-panel review-panel report-panel">
          <div class="review-toolbar"><span>变化报告 <b>{{ reports.length }}</b></span><span class="admin-muted">用户提交的公开数据问题</span></div>
          <div v-if="!reports.length" class="admin-empty">没有待处理的变化报告。</div>
          <article v-for="report in reports" :key="report.id" class="review-row report-row">
            <div class="review-risk risk-high">报告</div>
            <div class="review-primary"><strong>{{ report.repeater_id }}</strong><span>{{ report.reason }}</span></div>
            <small class="admin-muted">{{ report.email || '匿名' }}</small>
            <div class="review-actions"><button type="button" :disabled="busy === report.id" @click="reviewReport(report.id, 'resolve')">已处理</button><button type="button" class="reject" :disabled="busy === report.id" @click="reviewReport(report.id, 'dismiss')">忽略</button></div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
