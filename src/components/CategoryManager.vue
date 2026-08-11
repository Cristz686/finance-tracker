<script setup>
import { ref, onMounted } from 'vue'
import { getAllCategories, addCategory, deleteCategory } from '../db'

const categories = ref([])
const showAdd = ref(false)
const newName = ref('')
const newType = ref('expense')
const newIcon = ref('📝')

async function load() {
  categories.value = await getAllCategories()
}

async function handleAdd() {
  if (!newName.value.trim()) {
    alert('请输入分类名称')
    return
  }
  await addCategory({
    name: newName.value.trim(),
    type: newType.value,
    icon: newIcon.value || '📝'
  })
  newName.value = ''
  newIcon.value = '📝'
  showAdd.value = false
  await load()
}

async function handleDelete(id) {
  if (!confirm('删除该分类?已记录的流水不受影响。')) return
  await deleteCategory(id)
  await load()
}

const iconOptions = ['📝', '💰', '🔧', '📈', '➕', '🍽️', '🚇', '🛒', '🏠', '🎮', '💊', '📚', '➖', '✈️', '👔', '🎁']

onMounted(load)
</script>

<template>
  <div class="cat-manager">
    <div class="mgr-header">
      <span class="mgr-title">分类管理</span>
      <button class="add-btn" @click="showAdd = !showAdd">{{ showAdd ? '取消' : '+ 新增' }}</button>
    </div>

    <div v-if="showAdd" class="add-form">
      <div class="form-row">
        <label>类型</label>
        <select v-model="newType">
          <option value="expense">支出</option>
          <option value="income">收入</option>
        </select>
      </div>
      <div class="form-row">
        <label>名称</label>
        <input v-model="newName" type="text" placeholder="分类名称" maxlength="10" />
      </div>
      <div class="form-row">
        <label>图标</label>
        <div class="icon-pick">
          <button
            v-for="ic in iconOptions"
            :key="ic"
            class="icon-opt"
            :class="{ active: newIcon === ic }"
            @click="newIcon = ic"
          >{{ ic }}</button>
        </div>
      </div>
      <button class="save-btn" @click="handleAdd">保存</button>
    </div>

    <div class="cat-groups">
      <div class="cat-group">
        <div class="group-label">支出分类</div>
        <div class="cat-list">
          <span v-for="cat in categories.filter(c => c.type === 'expense')" :key="cat.id" class="cat-tag">
            <span class="cat-icon">{{ cat.icon }}</span>
            <span class="cat-name">{{ cat.name }}</span>
            <button class="cat-del" @click="handleDelete(cat.id)">✕</button>
          </span>
        </div>
      </div>
      <div class="cat-group">
        <div class="group-label">收入分类</div>
        <div class="cat-list">
          <span v-for="cat in categories.filter(c => c.type === 'income')" :key="cat.id" class="cat-tag">
            <span class="cat-icon">{{ cat.icon }}</span>
            <span class="cat-name">{{ cat.name }}</span>
            <button class="cat-del" @click="handleDelete(cat.id)">✕</button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cat-manager {
  background: var(--color-surface);
  border-radius: var(--radius-card);
  padding: var(--spacer-16);
}
.mgr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacer-12);
}
.mgr-title {
  font-size: 16px;
  font-weight: 600;
}
.add-btn {
  padding: var(--spacer-4) var(--spacer-12);
  border-radius: var(--radius);
  font-size: 13px;
  color: var(--color-brand);
  background: var(--color-brand-soft);
}
.add-form {
  background: var(--color-surface-muted);
  border-radius: var(--radius);
  padding: var(--spacer-12);
  margin-bottom: var(--spacer-12);
}
.form-row {
  margin-bottom: var(--spacer-8);
}
.form-row label {
  display: block;
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: var(--spacer-4);
}
.form-row input, .form-row select {
  width: 100%;
  padding: var(--spacer-8);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}
.icon-pick {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacer-4);
}
.icon-opt {
  width: 32px;
  height: 32px;
  border-radius: var(--radius);
  font-size: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
.icon-opt.active {
  border-color: var(--color-brand);
  background: var(--color-brand-soft);
}
.save-btn {
  width: 100%;
  padding: var(--spacer-8);
  background: var(--color-brand);
  color: #fff;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  margin-top: var(--spacer-4);
}
.cat-groups {
  display: flex;
  flex-direction: column;
  gap: var(--spacer-12);
}
.group-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: var(--spacer-8);
}
.cat-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacer-8);
}
.cat-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--spacer-4);
  padding: var(--spacer-4) var(--spacer-8);
  padding-right: var(--spacer-4);
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
  font-size: 13px;
}
.cat-icon {
  font-size: 16px;
}
.cat-del {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  font-size: 10px;
  color: var(--color-text-muted);
  background: rgba(0, 0, 0, 0.05);
}
.cat-del:hover {
  color: var(--color-expense);
  background: rgba(232, 70, 58, 0.1);
}
</style>
