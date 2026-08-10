<script setup lang="ts">
defineProps<{ status: 'published' | 'pending' | 'retired' }>()
</script>

<template>
  <span :class="['status-badge', `status-${status}`]">
    <span class="status-dot" aria-hidden="true"></span>
    {{ status === 'published' ? '已发布' : status === 'pending' ? '待核验' : '已停用' }}
  </span>
</template>
