<script setup>
import { ref, computed, watch } from 'vue'
import { addTransaction, getCategoriesByType } from '../db'
import { getTodayStr } from '../utils/format'

const emit = defineEmits(['saved'])

const type = ref('expense') // income / expense
const amount = ref('')
const category = ref('')
const date = ref(getTodayStr())
const note = ref('')
const categories = ref([])
const saving = ref(false)

async function loadCategories() {
  categories.value = await getCategoriesByType(type.value)
  // 切换类型时默认选第一个分类
  if (categories.value.length > 0) {
    category.value = categories.value[0].name
  }
}

watch(type, loadCategories, { immediate: true })

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
    emit('saved')
  } finally {
    saving.value = false
  }
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
