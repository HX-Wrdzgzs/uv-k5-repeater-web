<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { submitRepeater } from '../lib/api'
import { validateRepeater } from '../lib/validation'

const route = useRoute()
const form = reactive({ kind: (String(route.query.kind || 'create') as 'create' | 'update' | 'retire'), repeaterId: String(route.query.id || ''), province: '', city: '', district: '', callsign: '', stationName: '', rxMhz: 439.5, txMhz: 434.5, ctcssHz: 88.5 as number | null, mode: 'FM', rxOnly: false, sourceUrl: '', sourceDate: null as number | null, note: '' })
const errors = ref<string[]>([])
const message = ref('')
const submitting = ref(false)

async function submit() {
  errors.value = validateRepeater(form)
  if (form.kind !== 'create' && !form.repeaterId.trim()) errors.value.push('修改或停用申请需要填写记录 ID')
  message.value = ''
  if (errors.value.length) return
  submitting.value = true
  try { const result = await submitRepeater(form); message.value = `已收到提交（${result.status}）。基础校验通过后会先公开标记为待核验。` }
  catch (exception) { errors.value = [exception instanceof Error ? exception.message : '提交失败，请稍后再试'] }
  finally { submitting.value = false }
}
</script>

<template>
  <section class="page-container form-page"><div class="form-heading"><div><span class="eyebrow">COMMUNITY UPDATE</span><h1>提交一条中继更新</h1><p>登录后即可提交。请尽量附上台站公告、维护者说明或实际核验来源。</p></div><div class="form-policy"><span class="policy-icon">✓</span><span><strong>自动校验优先</strong><small>明显错误会在提交前提示</small></span></div></div><div class="form-layout"><form class="data-card repeater-form" @submit.prevent="submit"><div class="form-section"><h2>申请类型</h2><div class="form-grid two"><label>动作<select v-model="form.kind"><option value="create">新增中继</option><option value="update">修改已有记录</option><option value="retire">申请停用</option></select></label><label v-if="form.kind !== 'create'">记录 ID<input v-model="form.repeaterId" placeholder="从详情页链接复制 ID" :required="form.kind !== 'create'" /></label></div></div><div class="form-section"><h2>台站信息</h2><div class="form-grid three"><label>省份<input v-model="form.province" placeholder="例如：广东" required /></label><label>城市<input v-model="form.city" placeholder="例如：广州" required /></label><label>区县（可选）<input v-model="form.district" placeholder="例如：番禺" /></label></div><div class="form-grid two"><label>呼号<input v-model="form.callsign" placeholder="BR7XXX" required /></label><label>台站名称<input v-model="form.stationName" placeholder="例如：某某山中继" /></label></div></div><div class="form-section"><h2>频率参数</h2><div class="form-grid four"><label>接收 RX（MHz）<input v-model.number="form.rxMhz" type="number" step="0.0001" required /></label><label>发射 TX（MHz）<input v-model.number="form.txMhz" type="number" step="0.0001" :disabled="form.rxOnly" required /></label><label>CTCSS（Hz）<input v-model.number="form.ctcssHz" type="number" step="0.1" placeholder="无则留空" /></label><label>模式<select v-model="form.mode"><option>FM</option><option>AM</option></select></label></div><label class="check-control large"><input v-model="form.rxOnly" type="checkbox" /> 只收频率（禁止发射）</label></div><div class="form-section"><h2>来源和备注</h2><label>来源链接<input v-model="form.sourceUrl" type="url" placeholder="https://…" required /></label><div class="form-grid two"><label>来源日期（YYYYMMDD）<input v-model.number="form.sourceDate" type="number" placeholder="20260801" /></label><label>补充说明<input v-model="form.note" placeholder="覆盖范围、变更原因、核验方式…" /></label></div></div><div v-if="errors.length" class="form-errors"><strong>请先修正：</strong><ul><li v-for="error in errors" :key="error">{{ error }}</li></ul></div><p v-if="message" class="form-message success-message">{{ message }}</p><div class="form-actions"><span>提交后会记录你的账号和变更原因</span><button class="button button-primary" type="submit" :disabled="submitting">{{ submitting ? '提交中…' : '提交审核' }} <span>→</span></button></div></form><aside class="form-side"><div class="data-card"><span class="eyebrow">WORKFLOW</span><h3>你提交之后</h3><ol class="workflow"><li><span>01</span><div><strong>自动校验</strong><small>频率、偏移、格式和重复项</small></div></li><li><span>02</span><div><strong>公开待核验</strong><small>有来源的低风险记录会先展示</small></div></li><li><span>03</span><div><strong>人工处理</strong><small>高风险变更进入维护者队列</small></div></li></ol></div><div class="data-card caution-card"><strong>请不要提交个人敏感信息</strong><p>来源只需要能证明频率状态的公开链接或简短说明。</p></div></aside></div></section>
</template>
