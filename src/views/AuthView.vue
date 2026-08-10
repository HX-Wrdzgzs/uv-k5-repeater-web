<script setup lang="ts">
import { ref } from 'vue'
import { requestMagicLink, startGithubLogin } from '../lib/api'

const email = ref('')
const message = ref('')
const error = ref('')
const loading = ref(false)

async function sendLink() {
  message.value = ''
  error.value = ''
  if (!email.value.includes('@')) { error.value = '请输入有效的邮箱地址'; return }
  loading.value = true
  try {
    await requestMagicLink(email.value)
    message.value = '如果该邮箱可以接收邮件，登录链接已经发送。链接 15 分钟内有效且只能使用一次。'
  } catch (exception) { error.value = exception instanceof Error ? exception.message : '暂时无法发送登录链接' }
  finally { loading.value = false }
}
</script>

<template>
  <section class="auth-page"><div class="auth-card data-card"><div class="auth-logo">⌁</div><span class="eyebrow">MEMBER ACCESS</span><h1>登录，开始维护数据。</h1><p>注册用户可以提交新增、修改和停用申请。公开浏览不需要登录。</p><form @submit.prevent="sendLink"><label>邮箱地址<input v-model="email" type="email" autocomplete="email" placeholder="you@example.com" required /></label><button class="button button-primary button-full" type="submit" :disabled="loading">{{ loading ? '发送中…' : '发送魔术链接' }}</button></form><p v-if="message" class="form-message success-message">{{ message }}</p><p v-if="error" class="form-message error-message">{{ error }}</p><div class="auth-divider"><span>或者</span></div><button class="button github-button button-full" type="button" @click="startGithubLogin"><span class="github-mark">●</span> 使用 GitHub 登录</button><small class="auth-legal">继续即表示你同意只提交真实、可核验的台站信息。我们不保存邮箱密码。</small></div></section>
</template>
