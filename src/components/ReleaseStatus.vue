<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface LatestRelease {
  version: string
  releaseDate: string
  database: { format: string; sourceDate: string; records: number; sha256: string }
  website: { version: string; sourceDate: string; records: number; scope: string }
  firmware: { recommended: string; sha256: string; repositoryPath: string }
  tailResourceIncluded: boolean
  tailEntryPoint: boolean
  source: string
}

const release = ref<LatestRelease | null>(null)
const failed = ref(false)

onMounted(async () => {
  try {
    const response = await fetch('/releases/latest.json', { credentials: 'same-origin' })
    if (!response.ok) throw new Error(`release manifest: ${response.status}`)
    release.value = (await response.json()) as LatestRelease
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <aside v-if="release && !failed" class="release-status" aria-label="固件和数据库版本">
    <div class="release-status-main">
      <span class="pulse-dot" aria-hidden="true"></span>
      <span>最新公版 {{ release.version }} · {{ release.database.format }}</span>
    </div>
    <span class="release-status-meta">固件数据库 {{ release.database.sourceDate }} · {{ release.database.records }} 条；网站已发布 {{ release.website.records }} 条 · 不含私人尾音资源</span>
    <a :href="release.source" target="_blank" rel="noreferrer">查看 GitHub 文件 →</a>
  </aside>
</template>
