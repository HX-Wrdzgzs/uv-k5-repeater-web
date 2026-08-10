<script setup lang="ts">
import { computed, ref } from 'vue'
import ReleaseStatus from './components/ReleaseStatus.vue'

const hostname = window.location.hostname
const isAdminHost = computed(() => hostname.startsWith('admin.'))
const menuOpen = ref(false)
</script>

<template>
  <div :class="['app-shell', { 'admin-shell': isAdminHost }]">
    <header class="site-header">
      <div class="header-inner">
        <RouterLink class="brand" to="/" @click="menuOpen = false">
          <span class="brand-mark" aria-hidden="true">⌁</span>
          <span>
            <strong>全国中继</strong>
            <small>REPEATER DATA</small>
          </span>
        </RouterLink>
        <button class="mobile-menu" type="button" aria-label="打开导航" @click="menuOpen = !menuOpen">☰</button>
        <nav :class="['site-nav', { open: menuOpen }]" aria-label="主导航">
          <RouterLink to="/repeaters" @click="menuOpen = false">浏览数据</RouterLink>
          <RouterLink to="/submit" @click="menuOpen = false">提交更新</RouterLink>
          <RouterLink to="/account" @click="menuOpen = false">我的提交</RouterLink>
          <RouterLink to="/exports" @click="menuOpen = false">导出</RouterLink>
          <RouterLink v-if="isAdminHost" class="nav-admin" to="/admin" @click="menuOpen = false">审核后台</RouterLink>
          <RouterLink class="header-login" to="/auth" @click="menuOpen = false">登录 / 注册</RouterLink>
        </nav>
      </div>
    </header>

    <ReleaseStatus />

    <main>
      <RouterView />
    </main>

    <footer class="site-footer">
      <div>
        <span class="footer-title">全国中继数据协作站</span>
        <span class="footer-muted">数据会变化，发射前请结合当地管理部门与台站公告复核。</span>
      </div>
      <div class="footer-links">
        <a href="https://github.com/HX-Wrdzgzs/uv-k5-losehu132-wrdzgzs" target="_blank" rel="noreferrer">固件项目</a>
        <RouterLink to="/repeaters">数据目录</RouterLink>
        <RouterLink to="/exports">数据导出</RouterLink>
        <span>mizuki.top</span>
      </div>
    </footer>
  </div>
</template>
