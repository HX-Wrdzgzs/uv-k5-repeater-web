<script setup lang="ts">
defineProps<{ status: 'published' | 'pending' | 'retired' | 'rejected' | 'draft' }>()
</script>

<template>
  <span :class="['status-badge', `status-${status}`]">
    <span class="status-dot" aria-hidden="true"></span>
    {{ status === 'published' ? '已发布' : status === 'pending' ? '待核验' : status === 'rejected' ? '已退回' : status === 'draft' ? '草稿' : '已停用' }}
  </span>
</template>
