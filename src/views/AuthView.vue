<script setup lang="ts">
import { ref } from 'vue'
import { requestEmailCode, startGithubLogin, verifyEmailCode } from '../lib/api'

const email = ref('')
const code = ref('')
const codeSent = ref(false)
const message = ref('')
const error = ref('')
const loading = ref(false)

async function sendCode() {
  message.value = ''
  error.value = ''
  if (!email.value.includes('@')) { error.value = '请输入有效的邮箱地址'; return }
  loading.value = true
  try {
    await requestEmailCode(email.value)
    codeSent.value = true
    message.value = '如果该邮箱可以接收邮件，6 位验证码已经发送。验证码 10 分钟内有效且只能使用一次。'
  } catch (exception) { error.value = exception instanceof Error ? exception.message : '暂时无法发送验证码' }
  finally { loading.value = false }
}

async function verifyCode() {
  message.value = ''
  error.value = ''
  if (!/^\d{6}$/.test(code.value)) { error.value = '请输入 6 位数字验证码'; return }
  loading.value = true
  try {
    await verifyEmailCode(email.value, code.value)
    window.location.assign('/?auth=success')
  } catch (exception) { error.value = exception instanceof Error ? exception.message : '验证码校验失败' }
  finally { loading.value = false }
}

function submitEmail() {
  return codeSent.value ? verifyCode() : sendCode()
}

function changeEmail() {
  codeSent.value = false
  code.value = ''
  message.value = ''
  error.value = ''
}
</script>

<template>
  <section class="auth-page"><div class="auth-card data-card"><div class="auth-logo">⌁</div><span class="eyebrow">MEMBER ACCESS</span><h1>登录，开始维护数据。</h1><p>注册用户可以提交新增、修改和停用申请。公开浏览不需要登录。</p><form @submit.prevent="submitEmail"><label>邮箱地址<input v-model="email" type="email" autocomplete="email" placeholder="you@example.com" :readonly="codeSent" required /></label><label v-if="codeSent" class="auth-code-field">邮箱验证码<input v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="输入 6 位验证码" required /></label><button v-if="!codeSent" class="button button-primary button-full" type="submit" :disabled="loading">{{ loading ? '发送中…' : '发送验证码' }}</button><button v-else class="button button-primary button-full" type="submit" :disabled="loading">{{ loading ? '验证中…' : '登录' }}</button></form><div v-if="codeSent" class="auth-code-actions"><button class="button button-secondary button-full" type="button" :disabled="loading" @click="sendCode">重新发送验证码</button><button class="auth-change-email" type="button" @click="changeEmail">更换邮箱</button></div><p v-if="message" class="form-message success-message">{{ message }}</p><p v-if="error" class="form-message error-message">{{ error }}</p><div class="auth-divider"><span>或者</span></div><button class="button github-button button-full" type="button" @click="startGithubLogin"><span class="github-mark">●</span> 使用 GitHub 登录</button><small class="auth-legal">继续即表示你同意只提交真实、可核验的台站信息。我们不保存邮箱密码。</small></div></section>
</template>
