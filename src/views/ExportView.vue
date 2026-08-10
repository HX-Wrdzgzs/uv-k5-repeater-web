<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface ExportSummary { version: string; source: string; recordCount: number; records?: unknown[] }
const summary = ref<ExportSummary | null>(null)
const error = ref('')
const loading = ref(true)

onMounted(async () => {
  try {
    const response = await fetch('/api/v1/exports/latest.json')
    const body = await response.json() as { data?: ExportSummary; error?: string }
    if (!response.ok || !body.data) throw new Error(body.error || '无法读取导出信息')
    summary.value = body.data
  } catch (exception) { error.value = exception instanceof Error ? exception.message : '无法读取导出信息' }
  finally { loading.value = false }
})
</script>

<template>
  <section class="page-container export-page">
    <div class="account-heading"><div><span class="eyebrow">DATA EXPORTS</span><h1>数据版本与导出</h1><p>只有已发布记录会进入导出；待核验数据不会进入固件候选。</p></div><RouterLink class="button button-secondary" to="/repeaters">返回数据目录</RouterLink></div>
    <div v-if="loading" class="loading-state">正在读取当前版本…</div>
    <div v-else-if="error" class="login-callout data-card"><span>!</span><div><h2>暂时无法读取导出信息</h2><p>{{ error }}</p></div></div>
    <div v-else-if="summary" class="export-grid">
      <article class="data-card export-card"><span class="eyebrow">CURRENT SNAPSHOT</span><h2>{{ summary.version }}</h2><dl><div><dt>来源</dt><dd>{{ summary.source }}</dd></div><div><dt>记录数</dt><dd>{{ summary.recordCount }}</dd></div><div><dt>导出范围</dt><dd>已发布</dd></div></dl><div class="export-actions"><a class="button button-primary" href="/api/v1/exports/latest.json" download>下载 JSON</a><a class="button button-secondary" href="/api/v1/exports/latest.csv" download>下载 CSV</a></div></article>
      <article class="data-card export-card export-note"><span class="eyebrow">FIRMWARE HANDOFF</span><h2>固件候选边界</h2><p>网站导出不包含个人自定义尾音资源。生成固件前仍需在固件仓库中执行格式校验、容量校验和人工确认。</p><RouterLink class="text-link" to="/">查看版本提示 ↗</RouterLink></article>
    </div>
  </section>
</template>
