<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  getAllPiggyBanks,
  addPiggyBank,
  deletePiggyBank,
  depositToPiggyBank,
  withdrawFromPiggyBank,
  getPiggyBankTransactions
} from '../db'
import { formatMoney } from '../utils/format'

const emit = defineEmits(['changed'])

const banks = ref([])
const showCreate = ref(false)
const showAction = ref(false)
const actionMode = ref('deposit') // deposit | withdraw
const currentBank = ref(null)
const currentBankTx = ref([])

// 防止 mobile 上 touchend 合成 click 立即关闭弹窗
// 记录弹窗打开时间戳,350ms 内忽略背景点击
const createOpenTime = ref(0)
const actionOpenTime = ref(0)

// 新建表单
const newName = ref('')
const newTarget = ref('')
const newIcon = ref('🐷')
const icons = [
  '🐷', '🏠', '🚗', '✈️', '💍', '🎓', '🛍️', '🎁', '💰',
  // 目标/运动类
  '💪', '🏋️', '🏃', '🚴', '🧘', '⚽', '🏀', '🎯',
  // 美妆/穿搭目标类
  '💄', '👗', '👠', '👜', '👒', '💎', '🌸', '🍰'
]

// 存取表单
const actionAmount = ref('')
const actionNote = ref('')

const totalBalance = computed(() =>
  banks.value.reduce((sum, b) => sum + b.balance, 0)
)

const totalTarget = computed(() =>
  banks.value.reduce((sum, b) => sum + (b.target || 0), 0)
)

// 仅加载数据,不通知父组件(避免 onMounted 时触发父组件 refreshKey 变化导致本组件被重建)
async function load() {
  banks.value = await getAllPiggyBanks()
}

// 数据变更后调用:加载并通知父组件刷新汇总
async function reload() {
  await load()
  emit('changed')
}

function getProgress(bank) {
  if (!bank.target || bank.target <= 0) return 0
  return Math.min(100, (bank.balance / bank.target) * 100)
}

function openCreate() {
  showCreate.value = true
  createOpenTime.value = Date.now()
}

function closeCreate() {
  // mobile 防抖:打开后 350ms 内忽略背景点击
  if (Date.now() - createOpenTime.value < 350) return
  showCreate.value = false
}

async function handleCreate() {
  if (!newName.value.trim()) {
    alert('请输入存钱罐名称')
    return
  }
  try {
    await addPiggyBank({
      name: newName.value.trim(),
      target: parseFloat(newTarget.value) || 0,
      icon: newIcon.value
    })
    // 重置
    newName.value = ''
    newTarget.value = ''
    newIcon.value = '🐷'
    showCreate.value = false
    await reload()
  } catch (e) {
    alert('创建失败: ' + e.message)
  }
}

async function handleDelete(bank) {
  if (!confirm(`确定删除「${bank.name}」吗?关联的存取记录也会一并删除。`)) return
  try {
    await deletePiggyBank(bank.id)
    await reload()
  } catch (e) {
    alert('删除失败: ' + e.message)
  }
}

function openAction(bank, mode) {
  currentBank.value = bank
  actionMode.value = mode
  actionAmount.value = ''
  actionNote.value = ''
  showAction.value = true
  actionOpenTime.value = Date.now()
  // 加载该存钱罐的存取记录
  loadBankTransactions(bank.id)
}

function closeAction() {
  // mobile 防抖
  if (Date.now() - actionOpenTime.value < 350) return
  showAction.value = false
}

async function loadBankTransactions(bankId) {
  currentBankTx.value = await getPiggyBankTransactions(bankId)
}

async function handleAction() {
  const amt = parseFloat(actionAmount.value)
  if (!amt || amt <= 0) {
    alert('请输入有效金额')
    return
  }
  try {
    if (actionMode.value === 'deposit') {
      await depositToPiggyBank(currentBank.value.id, amt, actionNote.value.trim())
    } else {
      await withdrawFromPiggyBank(currentBank.value.id, amt, actionNote.value.trim())
    }
    showAction.value = false
    await reload()
  } catch (e) {
    alert(e.message)
  }
}

onMounted(load)
</script>

<template>
  <div class="piggy-section">
    <!-- 总览 -->
    <div class="overview-card">
      <div class="overview-row">
        <div class="overview-item">
          <span class="label">存钱罐总额</span>
          <span class="value">¥{{ formatMoney(totalBalance) }}</span>
        </div>
        <div class="overview-divider"></div>
        <div class="overview-item">
          <span class="label">目标总额</span>
          <span class="value muted">¥{{ formatMoney(totalTarget) }}</span>
        </div>
      </div>
      <button class="add-btn" @click="openCreate">+ 新建存钱罐</button>
    </div>

    <!-- 存钱罐列表 -->
    <div v-if="banks.length === 0" class="empty">
      <p>还没有存钱罐,创建一个开始存钱吧!</p>
    </div>

    <div v-else class="bank-list">
      <div v-for="bank in banks" :key="bank.id" class="bank-card">
        <div class="bank-header">
          <span class="bank-icon">{{ bank.icon }}</span>
          <span class="bank-name">{{ bank.name }}</span>
          <button class="delete-btn" @click="handleDelete(bank)">×</button>
        </div>

        <div class="bank-balance">
          <span class="balance-amount">¥{{ formatMoney(bank.balance) }}</span>
          <span v-if="bank.target > 0" class="balance-target">/ ¥{{ formatMoney(bank.target) }}</span>
        </div>

        <div v-if="bank.target > 0" class="progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: getProgress(bank) + '%' }"></div>
          </div>
          <span class="progress-text">{{ getProgress(bank).toFixed(0) }}%</span>
        </div>

        <div class="bank-actions">
          <button class="action-btn deposit" @click="openAction(bank, 'deposit')">存入</button>
          <button class="action-btn withdraw" @click="openAction(bank, 'withdraw')">取出</button>
        </div>
      </div>
    </div>

    <!-- 新建弹窗 -->
    <div v-if="showCreate" class="modal" @click.self="closeCreate">
      <div class="modal-card">
        <h3 class="modal-title">新建存钱罐</h3>

        <div class="form-field">
          <label>名称</label>
          <input v-model="newName" type="text" placeholder="如:换手机、旅行基金" maxlength="20" class="input" />
        </div>

        <div class="form-field">
          <label>目标金额(选填)</label>
          <input v-model="newTarget" type="number" inputmode="decimal" placeholder="0.00" step="0.01" class="input" />
        </div>

        <div class="form-field">
          <label>图标</label>
          <div class="icon-list">
            <button
              v-for="ic in icons"
              :key="ic"
              class="icon-chip"
              :class="{ active: newIcon === ic }"
              @click="newIcon = ic"
            >{{ ic }}</button>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="showCreate = false">取消</button>
          <button class="btn-confirm" @click="handleCreate">创建</button>
        </div>
      </div>
    </div>

    <!-- 存取弹窗 -->
    <div v-if="showAction && currentBank" class="modal" @click.self="closeAction">
      <div class="modal-card">
        <h3 class="modal-title">
          {{ actionMode === 'deposit' ? '存入' : '取出' }}「{{ currentBank.name }}」
        </h3>

        <div class="bank-info">
          <span>当前余额:¥{{ formatMoney(currentBank.balance) }}</span>
        </div>

        <div class="form-field">
          <label>金额</label>
          <input v-model="actionAmount" type="number" inputmode="decimal" placeholder="0.00" step="0.01" min="0" class="input" autofocus />
        </div>

        <div class="form-field">
          <label>备注(选填)</label>
          <input v-model="actionNote" type="text" placeholder="选填" maxlength="50" class="input" />
        </div>

        <!-- 最近记录 -->
        <div v-if="currentBankTx.length > 0" class="recent-tx">
          <label>最近记录</label>
          <div class="tx-list">
            <div v-for="tx in currentBankTx.slice(0, 5)" :key="tx.id" class="tx-item">
              <span class="tx-type">{{ tx.transferType === 'deposit' ? '↓ 存入' : '↑ 取出' }}</span>
              <span class="tx-amount" :class="tx.transferType">
                {{ tx.transferType === 'deposit' ? '+' : '-' }}¥{{ formatMoney(tx.amount) }}
              </span>
              <span class="tx-date">{{ tx.date }}</span>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="closeAction">取消</button>
          <button class="btn-confirm" :class="actionMode" @click="handleAction">
            {{ actionMode === 'deposit' ? '确认存入' : '确认取出' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.piggy-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacer-12);
}
.overview-card {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  color: #fff;
  border-radius: var(--radius-card);
  padding: var(--spacer-20);
}
.overview-row {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacer-16);
}
.overview-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacer-4);
}
.overview-item .label {
  font-size: 12px;
  opacity: 0.85;
}
.overview-item .value {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.overview-item .value.muted {
  font-size: 16px;
  opacity: 0.85;
}
.overview-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.3);
  margin: 0 var(--spacer-16);
}
.add-btn {
  width: 100%;
  padding: var(--spacer-12);
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 1px dashed rgba(255, 255, 255, 0.6);
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
}
.empty {
  background: var(--color-surface);
  border-radius: var(--radius-card);
  padding: var(--spacer-40) var(--spacer-16);
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}
.bank-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacer-12);
}
.bank-card {
  background: var(--color-surface);
  border-radius: var(--radius-card);
  padding: var(--spacer-16);
}
.bank-header {
  display: flex;
  align-items: center;
  gap: var(--spacer-8);
  margin-bottom: var(--spacer-12);
}
.bank-icon {
  font-size: 24px;
}
.bank-name {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
}
.delete-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: var(--color-text-muted);
  font-size: 18px;
  line-height: 1;
}
.delete-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-expense);
}
.bank-balance {
  display: flex;
  align-items: baseline;
  gap: var(--spacer-4);
  margin-bottom: var(--spacer-12);
}
.balance-amount {
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.balance-target {
  font-size: 13px;
  color: var(--color-text-muted);
}
.progress {
  display: flex;
  align-items: center;
  gap: var(--spacer-8);
  margin-bottom: var(--spacer-12);
}
.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--color-surface-muted);
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  border-radius: 4px;
  transition: width 0.3s ease;
}
.progress-text {
  font-size: 12px;
  color: var(--color-text-muted);
  min-width: 36px;
  text-align: right;
}
.bank-actions {
  display: flex;
  gap: var(--spacer-8);
}
.action-btn {
  flex: 1;
  padding: var(--spacer-10);
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
}
.action-btn.deposit {
  background: #fef3c7;
  color: #92400e;
}
.action-btn.withdraw {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

/* 弹窗 */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacer-16);
  z-index: 100;
}
.modal-card {
  background: var(--color-surface);
  border-radius: var(--radius-card);
  padding: var(--spacer-20);
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  overflow-y: auto;
}
.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: var(--spacer-16);
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
.icon-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacer-8);
}
.icon-chip {
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 20px;
}
.icon-chip.active {
  background: var(--color-brand-soft);
  border-color: var(--color-brand);
}
.modal-actions {
  display: flex;
  gap: var(--spacer-12);
  margin-top: var(--spacer-8);
}
.btn-cancel, .btn-confirm {
  flex: 1;
  padding: var(--spacer-12);
  border-radius: var(--radius);
  font-size: 15px;
  font-weight: 500;
}
.btn-cancel {
  background: var(--color-surface-muted);
  color: var(--color-text);
}
.btn-confirm {
  background: var(--color-brand);
  color: #fff;
}
.btn-confirm.deposit {
  background: #f59e0b;
}
.btn-confirm.withdraw {
  background: var(--color-text-muted);
}
.bank-info {
  padding: var(--spacer-8) var(--spacer-12);
  background: var(--color-surface-muted);
  border-radius: var(--radius);
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: var(--spacer-16);
}
.recent-tx {
  margin-bottom: var(--spacer-16);
}
.tx-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacer-8);
}
.tx-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacer-8) var(--spacer-12);
  background: var(--color-surface-muted);
  border-radius: var(--radius);
  font-size: 13px;
}
.tx-type {
  color: var(--color-text-muted);
}
.tx-amount.deposit {
  color: #f59e0b;
  font-weight: 600;
}
.tx-amount.withdraw {
  color: var(--color-text);
  font-weight: 600;
}
.tx-date {
  color: var(--color-text-muted);
  font-size: 12px;
}
</style>
