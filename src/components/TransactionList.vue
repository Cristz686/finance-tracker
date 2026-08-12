<script setup>
import { ref, watch, onMounted } from 'vue'
import { getTransactionsByDateRange, deleteTransaction } from '../db'
import { formatMoney, getCurrentMonth, shiftMonth } from '../utils/format'

const emit = defineEmits(['changed'])

const list = ref([])
const loading = ref(false)
const currentMonth = ref(getCurrentMonth())

async function loadList() {
  loading.value = true
  try {
    const start = `${currentMonth.value}-01`
    const end = `${currentMonth.value}-31`
    list.value = await getTransactionsByDateRange(start, end)
  } finally {
    loading.value = false
  }
}

function prevMonth() {
  currentMonth.value = shiftMonth(currentMonth.value, -1)
}

function nextMonth() {
  currentMonth.value = shiftMonth(currentMonth.value, 1)
}

// transfer 类型记录不能直接删除,会破坏存钱罐余额一致性
async function handleDelete(tx) {
  if (tx.type === 'transfer') {
    alert('此记录为存钱罐操作,不能直接删除\n请前往「存钱」页面通过反向操作调整')
    return
  }
  if (!confirm('确认删除这笔记录?')) return
  await deleteTransaction(tx.id)
  await loadList()
  emit('changed')
}

function txIcon(tx) {
  if (tx.type === 'transfer') {
    return tx.transferType === 'deposit' ? '↓' : '↑'
  }
  return tx.category?.slice(0, 1) || '·'
}

function txAmountText(tx) {
  const sign = tx.type === 'income' ? '+' :
               tx.type === 'expense' ? '-' :
               tx.transferType === 'deposit' ? '-' : '+'
  return sign + formatMoney(tx.amount)
}

watch(currentMonth, loadList)
onMounted(loadList)

defineExpose({ loadList })
</script>

<template>
  <div class="tx-list">
    <div class="month-nav">
      <button class="nav-btn" @click="prevMonth">‹</button>
      <span class="month-label">{{ currentMonth }}</span>
      <button class="nav-btn" @click="nextMonth">›</button>
    </div>

    <div v-if="loading" class="empty">加载中...</div>
    <div v-else-if="list.length === 0" class="empty">本月暂无记录</div>
    <div v-else class="list-body">
      <div v-for="tx in list" :key="tx.id" class="tx-item">
        <div class="tx-icon" :class="{ transfer: tx.type === 'transfer' }">{{ txIcon(tx) }}</div>
        <div class="tx-info">
          <span class="tx-category">{{ tx.category }}</span>
          <span class="tx-meta">{{ tx.date }}<template v-if="tx.note"> · {{ tx.note }}</template></span>
        </div>
        <div class="tx-amount" :class="tx.type + (tx.type === 'transfer' ? ' ' + tx.transferType : '')">
          {{ txAmountText(tx) }}
        </div>
        <button
          class="del-btn"
          :class="{ disabled: tx.type === 'transfer' }"
          @click="handleDelete(tx)"
        >✕</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tx-list {
  background: var(--color-surface);
  border-radius: var(--radius-card);
  overflow: hidden;
}
.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacer-12) var(--spacer-16);
  border-bottom: 1px solid var(--color-border);
}
.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius);
  font-size: 20px;
  color: var(--color-text-muted);
  background: transparent;
}
.nav-btn:hover {
  background: var(--color-surface-muted);
}
.month-label {
  font-size: 16px;
  font-weight: 600;
}
.empty {
  padding: var(--spacer-24);
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}
.list-body {
  max-height: 400px;
  overflow-y: auto;
}
.tx-item {
  display: flex;
  align-items: center;
  gap: var(--spacer-12);
  padding: var(--spacer-12) var(--spacer-16);
  border-bottom: 1px solid var(--color-border);
}
.tx-item:last-child {
  border-bottom: none;
}
.tx-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-muted);
  flex-shrink: 0;
}
.tx-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.tx-category {
  font-size: 15px;
  font-weight: 500;
}
.tx-meta {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tx-amount {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.tx-amount.income {
  color: var(--color-income);
}
.tx-amount.expense {
  color: var(--color-expense);
}
.tx-amount.transfer {
  color: #f59e0b;
}
.tx-icon.transfer {
  background: #fef3c7;
  color: #92400e;
}
.del-btn.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.del-btn {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  color: var(--color-text-muted);
  font-size: 12px;
  flex-shrink: 0;
}
.del-btn:not(.disabled):hover {
  background: var(--color-surface-muted);
  color: var(--color-expense);
}
</style>
