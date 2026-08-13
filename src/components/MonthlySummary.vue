<script setup>
import { ref, watch, onMounted } from 'vue'
import { getMonthSummary } from '../db'
import { formatMoney, getCurrentMonth, shiftMonth, formatMonthLabel } from '../utils/format'

const emit = defineEmits(['changed'])

const summary = ref({ income: 0, expense: 0, balance: 0, count: 0 })
const currentMonth = ref(getCurrentMonth())

// 收缩/展开状态,持久化到 localStorage
const LS_KEY = 'monthly-summary-collapsed'
const collapsed = ref(false)

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

watch(collapsed, (v) => {
  localStorage.setItem(LS_KEY, v ? '1' : '0')
})

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

onMounted(() => {
  collapsed.value = localStorage.getItem(LS_KEY) === '1'
  loadSummary()
})

defineExpose({ loadSummary })
</script>

<template>
  <div class="summary-card" :class="{ collapsed }">
    <!-- 顶部栏:月份导航 + 收缩按钮,空白区域点击切换 -->
    <div class="summary-header" @click="toggleCollapse">
      <button class="nav-btn" @click.stop="prevMonth">‹</button>
      <div class="header-middle">
        <span class="month-title">{{ formatMonthLabel(currentMonth) }}</span>
        <!-- 折叠时在标题行直接显示结余摘要 -->
        <span
          v-if="collapsed"
          class="collapsed-balance"
          :class="{ positive: summary.balance >= 0, negative: summary.balance < 0 }"
        >
          {{ summary.balance >= 0 ? '+' : '' }}{{ formatMoney(summary.balance) }}
        </span>
      </div>
      <div class="header-right">
        <button class="nav-btn" @click.stop="nextMonth">›</button>
        <button
          class="collapse-btn"
          @click.stop="toggleCollapse"
          :title="collapsed ? '展开详情' : '收起详情'"
        >
          <!-- 展开状态 ▲ 提示"点我收起" / 收起状态 ▼ 提示"点我展开" -->
          <span class="arrow">{{ collapsed ? '▼' : '▲' }}</span>
        </button>
      </div>
    </div>

    <!-- 展开态:完整内容 -->
    <template v-if="!collapsed">
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

      <!-- 主余额 / 存钱罐 / 总资产 -->
      <div v-if="summary.piggyBanksTotal > 0" class="assets-row">
        <div class="asset-item">
          <span class="asset-label">主余额</span>
          <span class="asset-value">¥{{ formatMoney(summary.mainBalance) }}</span>
        </div>
        <div class="asset-divider"></div>
        <div class="asset-item">
          <span class="asset-label">存钱罐</span>
          <span class="asset-value">¥{{ formatMoney(summary.piggyBanksTotal) }}</span>
        </div>
        <div class="asset-divider"></div>
        <div class="asset-item">
          <span class="asset-label">总资产</span>
          <span class="asset-value strong">¥{{ formatMoney(summary.totalAssets) }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.summary-card {
  background: linear-gradient(135deg, #4b3fe3 0%, #6f6fff 100%);
  color: #fff;
  border-radius: var(--radius-card);
  padding: var(--spacer-20);
  transition: padding 0.2s ease;
}
.summary-card.collapsed {
  padding: var(--spacer-12) var(--spacer-16);
}
.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  margin-bottom: 0;
  padding-bottom: 0;
}
.summary-card:not(.collapsed) .summary-header {
  margin-bottom: var(--spacer-16);
}
.header-middle {
  display: flex;
  align-items: baseline;
  gap: var(--spacer-8);
  flex: 1;
  justify-content: center;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 2px;
}
.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius);
  font-size: 20px;
  color: rgba(255, 255, 255, 0.8);
  background: transparent;
  flex-shrink: 0;
}
.nav-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
.month-title {
  font-size: 16px;
  font-weight: 500;
}
.collapsed-balance {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.collapsed-balance.negative {
  color: #ffd0cc;
}
.collapse-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.18);
}
.arrow {
  font-size: 11px;
  transition: transform 0.25s ease;
  opacity: 0.92;
  display: inline-block;
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
.assets-row {
  display: flex;
  align-items: center;
  gap: var(--spacer-8);
  margin-top: var(--spacer-16);
  padding-top: var(--spacer-16);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}
.asset-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.asset-label {
  font-size: 11px;
  opacity: 0.75;
}
.asset-value {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.asset-value.strong {
  font-size: 16px;
  font-weight: 700;
}
.asset-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.15);
}
</style>
