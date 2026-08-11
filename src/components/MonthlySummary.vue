<script setup>
import { ref, watch, onMounted } from 'vue'
import { getMonthSummary } from '../db'
import { formatMoney, getCurrentMonth, shiftMonth, formatMonthLabel } from '../utils/format'

const emit = defineEmits(['changed'])

const summary = ref({ income: 0, expense: 0, balance: 0, count: 0 })
const currentMonth = ref(getCurrentMonth())

async function loadSummary() {
  summary.value = await getMonthSummary(currentMonth.value)
}

function prevMonth() {
  currentMonth.value = shiftMonth(currentMonth.value, -1)
}

function nextMonth() {
  currentMonth.value = shiftMonth(currentMonth.value, 1)
}

watch(currentMonth, loadSummary)
onMounted(loadSummary)

defineExpose({ loadSummary })
</script>

<template>
  <div class="summary-card">
    <div class="summary-header">
      <button class="nav-btn" @click="prevMonth">‹</button>
      <span class="month-title">{{ formatMonthLabel(currentMonth) }}</span>
      <button class="nav-btn" @click="nextMonth">›</button>
    </div>

    <div class="balance-block">
      <span class="balance-label">本月结余</span>
      <span class="balance-amount" :class="{ positive: summary.balance >= 0, negative: summary.balance < 0 }">
        {{ summary.balance >= 0 ? '+' : '' }}{{ formatMoney(summary.balance) }}
      </span>
    </div>

    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-label">收入</span>
        <span class="stat-value income">{{ formatMoney(summary.income) }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-label">支出</span>
        <span class="stat-value expense">{{ formatMoney(summary.expense) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-card {
  background: linear-gradient(135deg, #4b3fe3 0%, #6f6fff 100%);
  color: #fff;
  border-radius: var(--radius-card);
  padding: var(--spacer-20);
}
.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacer-16);
}
.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius);
  font-size: 20px;
  color: rgba(255, 255, 255, 0.8);
  background: transparent;
}
.nav-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
.month-title {
  font-size: 16px;
  font-weight: 500;
}
.balance-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacer-4);
  margin-bottom: var(--spacer-20);
}
.balance-label {
  font-size: 13px;
  opacity: 0.8;
}
.balance-amount {
  font-size: 32px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.balance-amount.negative {
  color: #ffd0cc;
}
.stats-row {
  display: flex;
  align-items: center;
  gap: var(--spacer-16);
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacer-4);
}
.stat-label {
  font-size: 13px;
  opacity: 0.8;
}
.stat-value {
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.stat-value.income {
  color: #c6f7e8;
}
.stat-value.expense {
  color: #ffd0cc;
}
.stat-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
}
</style>
