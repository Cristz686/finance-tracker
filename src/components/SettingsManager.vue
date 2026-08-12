<script setup>
import { ref, onMounted } from 'vue'
import { getDailyLimit, setDailyLimit, getDayExpense } from '../db'
import { formatMoney, getTodayStr } from '../utils/format'

const emit = defineEmits(['changed'])

const limit = ref('')
const savedLimit = ref(0)
const todaySpent = ref(0)
const saving = ref(false)

async function load() {
  const v = await getDailyLimit()
  savedLimit.value = v || 0
  limit.value = v > 0 ? String(v) : ''
  todaySpent.value = await getDayExpense(getTodayStr())
}

async function handleSave() {
  const amt = parseFloat(limit.value)
  if (isNaN(amt) || amt < 0) {
    alert('请输入有效金额')
    return
  }
  saving.value = true
  try {
    await setDailyLimit(amt)
    savedLimit.value = amt
    if (amt === 0) {
      alert('已关闭每日限额')
    } else {
      alert(`每日限额已设置为 ¥${amt.toFixed(2)}`)
    }
    await load()
    // 通知父组件限额变化,让首页表单刷新
    emit('changed')
  } finally {
    saving.value = false
  }
}

function handleDisable() {
  limit.value = ''
  handleSave()
}

onMounted(load)
</script>

<template>
  <div class="settings-card">
    <h3 class="settings-title">每日支出限额</h3>
    <p class="settings-desc">
      设置每天的支出预算,记账时如果接近或超出限额会给出友好提醒(仅提醒,不阻断记账)。
    </p>

    <div v-if="savedLimit > 0" class="current-status">
      <div class="status-row">
        <span>当前限额</span>
        <span class="limit-value">¥{{ formatMoney(savedLimit) }}</span>
      </div>
      <div class="status-row">
        <span>今日已支出</span>
        <span class="spent-value" :class="{ over: todaySpent >= savedLimit }">¥{{ formatMoney(todaySpent) }}</span>
      </div>
      <div class="status-row">
        <span>今日剩余</span>
        <span class="remaining-value">¥{{ formatMoney(Math.max(0, savedLimit - todaySpent)) }}</span>
      </div>
    </div>

    <div class="form-field">
      <label>设置新限额(填 0 关闭)</label>
      <input
        v-model="limit"
        type="number"
        inputmode="decimal"
        placeholder="如 100"
        step="0.01"
        min="0"
        class="input"
      />
    </div>

    <div class="btn-row">
      <button class="save-btn" :disabled="saving" @click="handleSave">
        {{ saving ? '保存中...' : '保存' }}
      </button>
      <button v-if="savedLimit > 0" class="disable-btn" @click="handleDisable">关闭限额</button>
    </div>
  </div>
</template>

<style scoped>
.settings-card {
  background: var(--color-surface);
  border-radius: var(--radius-card);
  padding: var(--spacer-16);
}
.settings-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: var(--spacer-8);
}
.settings-desc {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.6;
  margin-bottom: var(--spacer-16);
}
.current-status {
  background: var(--color-surface-muted);
  border-radius: var(--radius);
  padding: var(--spacer-12);
  margin-bottom: var(--spacer-16);
}
.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacer-4) 0;
  font-size: 14px;
}
.limit-value {
  font-weight: 600;
  color: var(--color-brand);
}
.spent-value {
  font-weight: 600;
  color: var(--color-text);
}
.spent-value.over {
  color: var(--color-expense);
}
.remaining-value {
  font-weight: 600;
  color: var(--color-income);
}
.form-field {
  margin-bottom: var(--spacer-16);
}
.form-field label {
  display: block;
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: var(--spacer-8);
}
.input {
  width: 100%;
  padding: var(--spacer-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  outline: none;
  background: var(--color-surface);
  font-size: 16px;
}
.input:focus {
  border-color: var(--color-brand);
}
.btn-row {
  display: flex;
  gap: var(--spacer-12);
}
.save-btn {
  flex: 1;
  padding: var(--spacer-12);
  background: var(--color-brand);
  color: #fff;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
}
.save-btn:disabled {
  opacity: 0.6;
}
.disable-btn {
  padding: var(--spacer-12) var(--spacer-16);
  background: transparent;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 14px;
}
</style>
