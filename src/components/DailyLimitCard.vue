<script setup>
import { ref, computed, onMounted } from 'vue'
import { getDailyLimit, getDayExpense } from '../db'
import { formatMoney, getTodayStr } from '../utils/format'

const limit = ref(0)
const spent = ref(0)
const today = getTodayStr()

const percent = computed(() => {
  if (!limit.value || limit.value <= 0) return 0
  return Math.min(100, (spent.value / limit.value) * 100)
})

const remaining = computed(() => Math.max(0, limit.value - spent.value))

const status = computed(() => {
  if (!limit.value) return 'none'
  if (spent.value >= limit.value) return 'over'
  if (percent.value >= 80) return 'warn'
  return 'ok'
})

const statusText = computed(() => {
  switch (status.value) {
    case 'none': return '未设置限额'
    case 'over': return '已超出限额'
    case 'warn': return '接近限额,注意控制'
    default: return '今日预算充足'
  }
})

async function load() {
  limit.value = await getDailyLimit()
  spent.value = await getDayExpense(today)
}

defineExpose({ load })
onMounted(load)
</script>

<template>
  <div v-if="limit > 0" class="limit-card" :class="`status-${status}`">
    <div class="limit-header">
      <span class="limit-title">🎯 今日支出</span>
      <span class="limit-status">{{ statusText }}</span>
    </div>

    <div class="limit-amounts">
      <span class="spent">¥{{ formatMoney(spent) }}</span>
      <span class="separator">/</span>
      <span class="limit">¥{{ formatMoney(limit) }}</span>
    </div>

    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: percent + '%' }"></div>
    </div>

    <div class="limit-footer">
      <template v-if="status === 'over'">
        <span class="over-text">已超支 ¥{{ formatMoney(spent - limit) }}</span>
      </template>
      <template v-else>
        <span class="remaining-text">剩余 ¥{{ formatMoney(remaining) }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.limit-card {
  background: var(--color-surface);
  border-radius: var(--radius-card);
  padding: var(--spacer-16);
  border-left: 4px solid var(--color-brand);
}
.limit-card.status-warn {
  border-left-color: #f59e0b;
}
.limit-card.status-over {
  border-left-color: var(--color-expense);
  background: #fef2f2;
}
.limit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacer-8);
}
.limit-title {
  font-size: 14px;
  font-weight: 600;
}
.limit-status {
  font-size: 12px;
  color: var(--color-text-muted);
}
.status-over .limit-status {
  color: var(--color-expense);
  font-weight: 600;
}
.status-warn .limit-status {
  color: #f59e0b;
  font-weight: 600;
}
.limit-amounts {
  display: flex;
  align-items: baseline;
  gap: var(--spacer-4);
  margin-bottom: var(--spacer-12);
}
.spent {
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.separator {
  color: var(--color-text-muted);
  font-size: 14px;
}
.limit {
  font-size: 14px;
  color: var(--color-text-muted);
}
.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--color-surface-muted);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: var(--spacer-8);
}
.progress-fill {
  height: 100%;
  background: var(--color-brand);
  border-radius: 4px;
  transition: width 0.3s ease;
}
.status-warn .progress-fill {
  background: #f59e0b;
}
.status-over .progress-fill {
  background: var(--color-expense);
}
.limit-footer {
  font-size: 12px;
  color: var(--color-text-muted);
}
.over-text {
  color: var(--color-expense);
  font-weight: 600;
}
</style>
