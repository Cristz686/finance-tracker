<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { addTransaction, getCategoriesByType, getDailyLimit, getDayExpense } from '../db'
import { formatMoney, getTodayStr } from '../utils/format'

const emit = defineEmits(['saved'])

const type = ref('expense') // income / expense
const amount = ref('')
const category = ref('')
const date = ref(getTodayStr())
const note = ref('')
const categories = ref([])
const saving = ref(false)

// 每日限额展示状态
const dailyLimit = ref(0)
const todaySpent = ref(0)

const limitPercent = computed(() => {
  if (!dailyLimit.value || dailyLimit.value <= 0) return 0
  return Math.min(100, (todaySpent.value / dailyLimit.value) * 100)
})

const limitRemaining = computed(() =>
  Math.max(0, dailyLimit.value - todaySpent.value)
)

const limitStatus = computed(() => {
  if (!dailyLimit.value) return 'none'
  if (todaySpent.value >= dailyLimit.value) return 'over'
  if (limitPercent.value >= 80) return 'warn'
  return 'ok'
})

const limitStatusText = computed(() => {
  switch (limitStatus.value) {
    case 'none': return '未设置 → 设置'
    case 'over': return `已超支 ¥${formatMoney(todaySpent.value - dailyLimit.value)}`
    case 'warn': return `剩余 ¥${formatMoney(limitRemaining.value)}`
    default: return `剩余 ¥${formatMoney(limitRemaining.value)} / ¥${formatMoney(dailyLimit.value)}`
  }
})

async function loadDailyLimit() {
  dailyLimit.value = await getDailyLimit()
  todaySpent.value = await getDayExpense(getTodayStr())
}

async function loadCategories() {
  categories.value = await getCategoriesByType(type.value)
  // 切换类型时默认选第一个分类
  if (categories.value.length > 0) {
    category.value = categories.value[0].name
  }
}

watch(type, loadCategories, { immediate: true })
onMounted(loadDailyLimit)

// 当 form 外部触发 saved 事件时由 App.vue 调,这里也提供刷新方法
defineExpose({ loadDailyLimit })

// 每日限额提示(只在支出且为今天时检查)
// 阈值:已用 >= 80% 提醒,>= 100% 警告,均不阻断记账
async function checkDailyLimit(amt) {
  if (type.value !== 'expense' || date.value !== getTodayStr()) {
    return null
  }
  const limit = dailyLimit.value
  if (!limit || limit <= 0) return null

  const after = todaySpent.value + amt
  const percent = (after / limit) * 100

  if (after >= limit) {
    return {
      type: 'warning',
      msg: `今日支出将达 ¥${after.toFixed(2)}(限额 ¥${limit.toFixed(2)}),已超出 ¥${(after - limit).toFixed(2)}`,
      spent: after,
      limit
    }
  } else if (percent >= 80) {
    return {
      type: 'reminder',
      msg: `今日支出将达 ¥${after.toFixed(2)},接近限额 ¥${limit.toFixed(2)}(剩余 ¥${(limit - after).toFixed(2)})`,
      spent: after,
      limit
    }
  }
  return null
}

async function handleSubmit() {
  const amt = parseFloat(amount.value)
  if (!amt || amt <= 0) {
    alert('请输入有效金额')
    return
  }
  if (!category.value) {
    alert('请选择分类')
    return
  }

  // 提前检查限额,提示但不阻断
  const limitInfo = await checkDailyLimit(amt)
  if (limitInfo) {
    const prefix = limitInfo.type === 'warning' ? '⚠️ 提醒' : '💡 提醒'
    const confirmContinue = confirm(`${prefix}\n\n${limitInfo.msg}\n\n仍要记录这笔支出吗?`)
    if (!confirmContinue) return
  }

  saving.value = true
  try {
    await addTransaction({
      type: type.value,
      amount: amt,
      category: category.value,
      date: date.value,
      note: note.value.trim()
    })
    // 重置表单
    amount.value = ''
    note.value = ''
    date.value = getTodayStr()
    // 如果是今天的支出,立即更新限额显示
    if (type.value === 'expense' && date.value === getTodayStr()) {
      todaySpent.value += amt
    }
    emit('saved')
  } finally {
    saving.value = false
  }
}

function jumpToSettings() {
  window.__jumpTab?.('settings')
}
</script>

<template>
  <div class="tx-form">
    <div class="type-tabs">
      <button
        class="type-tab"
        :class="{ active: type === 'expense', expense: true }"
        @click="type = 'expense'"
      >支出</button>
      <button
        class="type-tab"
        :class="{ active: type === 'income', income: true }"
        @click="type = 'income'"
      >收入</button>
    </div>

    <!-- 每日限额条:仅支出类型显示,用户一进来就看得到 -->
    <div
      v-if="type === 'expense'"
      class="daily-limit-bar"
      :class="`status-${limitStatus}`"
      @click="limitStatus === 'none' && jumpToSettings()"
    >
      <div class="limit-left">
        <span class="limit-icon">🎯</span>
        <span class="limit-title">今日支出</span>
        <span class="limit-spent">¥{{ formatMoney(todaySpent) }}</span>
        <span v-if="dailyLimit > 0" class="limit-total">/ ¥{{ formatMoney(dailyLimit) }}</span>
      </div>
      <span
        class="limit-status"
        :class="{ clickable: limitStatus === 'none' }"
      >{{ limitStatusText }}</span>
    </div>

    <!-- 进度条:只在已设置限额时显示 -->
    <div v-if="dailyLimit > 0 && type === 'expense'" class="daily-progress">
      <div class="progress-fill" :style="{ width: limitPercent + '%' }"></div>
    </div>

    <div class="amount-row">
      <span class="currency">¥</span>
      <input
        v-model="amount"
        type="number"
        inputmode="decimal"
        placeholder="0.00"
        step="0.01"
        min="0"
        class="amount-input"
      />
    </div>

    <div class="field">
      <label>分类</label>
      <div class="category-chips">
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="chip"
          :class="{ active: category === cat.name }"
          @click="category = cat.name"
        >
          <span class="chip-icon">{{ cat.icon }}</span>
          <span>{{ cat.name }}</span>
        </button>
      </div>
    </div>

    <div class="field-row">
      <div class="field">
        <label>日期</label>
        <input v-model="date" type="date" class="input" />
      </div>
      <div class="field note-field">
        <label>备注</label>
        <input v-model="note" type="text" placeholder="选填" class="input" maxlength="50" />
      </div>
    </div>

    <button class="submit-btn" :disabled="saving" @click="handleSubmit">
      {{ saving ? '保存中...' : '记一笔' }}
    </button>
  </div>
</template>

<style scoped>
.tx-form {
  background: var(--color-surface);
  border-radius: var(--radius-card);
  padding: var(--spacer-16);
}
.type-tabs {
  display: flex;
  gap: var(--spacer-8);
  margin-bottom: var(--spacer-16);
}
.type-tab {
  flex: 1;
  padding: var(--spacer-12);
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  transition: all 0.15s;
}
.type-tab.active.expense {
  background: var(--color-expense);
  color: #fff;
}
.type-tab.active.income {
  background: var(--color-income);
  color: #fff;
}
.daily-limit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacer-10) var(--spacer-12);
  border-radius: var(--radius);
  margin-bottom: var(--spacer-8);
  background: var(--color-surface-muted);
  transition: all 0.2s;
}
.daily-limit-bar.status-warn {
  background: #fff7ed;
}
.daily-limit-bar.status-over {
  background: #fef2f2;
}
.daily-limit-bar.status-none {
  background: var(--color-brand-soft);
  cursor: pointer;
}
.daily-limit-bar.status-none:hover {
  background: #e6e2ff;
}
.limit-left {
  display: flex;
  align-items: center;
  gap: var(--spacer-6);
  font-size: 13px;
}
.limit-icon {
  font-size: 14px;
}
.limit-title {
  color: var(--color-text-muted);
}
.limit-spent {
  font-weight: 600;
  color: var(--color-text);
}
.limit-total {
  color: var(--color-text-muted);
  font-size: 12px;
}
.limit-status {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 500;
}
.limit-status.clickable {
  color: var(--color-brand);
}
.status-warn .limit-status {
  color: #b45309;
  font-weight: 600;
}
.status-over .limit-status {
  color: var(--color-expense);
  font-weight: 600;
}
.daily-progress {
  height: 4px;
  background: var(--color-surface-muted);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: var(--spacer-12);
}
.daily-progress .progress-fill {
  height: 100%;
  background: var(--color-brand);
  border-radius: 2px;
  transition: width 0.3s ease;
}
.daily-limit-bar.status-warn + .daily-progress .progress-fill {
  background: #f59e0b;
}
.daily-limit-bar.status-over + .daily-progress .progress-fill {
  background: var(--color-expense);
}
.amount-row {
  display: flex;
  align-items: center;
  gap: var(--spacer-8);
  padding: var(--spacer-12) 0;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--spacer-16);
}
.currency {
  font-size: 28px;
  font-weight: 600;
  color: var(--color-text-muted);
}
.amount-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 32px;
  font-weight: 600;
  background: transparent;
  width: 100%;
}
.field {
  margin-bottom: var(--spacer-16);
}
.field label {
  display: block;
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: var(--spacer-8);
}
.field-row {
  display: flex;
  gap: var(--spacer-12);
}
.field-row .field {
  flex: 1;
}
.note-field {
  flex: 1.5;
}
.input {
  width: 100%;
  padding: var(--spacer-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  outline: none;
  background: var(--color-surface);
}
.input:focus {
  border-color: var(--color-brand);
}
.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacer-8);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacer-4);
  padding: var(--spacer-8) var(--spacer-12);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-surface);
  transition: all 0.15s;
}
.chip.active {
  background: var(--color-brand-soft);
  border-color: var(--color-brand);
  color: var(--color-brand);
}
.chip-icon {
  font-size: 16px;
}
.submit-btn {
  width: 100%;
  padding: var(--spacer-16);
  background: var(--color-brand);
  color: #fff;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 600;
  transition: opacity 0.15s;
}
.submit-btn:disabled {
  opacity: 0.6;
}
</style>
