<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { initDefaultCategories } from './db'
import { exportData, importData } from './utils/backup'
import TransactionForm from './components/TransactionForm.vue'
import TransactionList from './components/TransactionList.vue'
import MonthlySummary from './components/MonthlySummary.vue'
import CategoryChart from './components/CategoryChart.vue'
import CategoryManager from './components/CategoryManager.vue'
import PiggyBankManager from './components/PiggyBankManager.vue'
import DailyLimitCard from './components/DailyLimitCard.vue'
import SettingsManager from './components/SettingsManager.vue'
import InstallPrompt from './components/InstallPrompt.vue'

const activeTab = ref('home') // home | stats | piggy | categories | settings
const formRef = ref()
const listRef = ref()
const summaryRef = ref()
const chartRef = ref()
const limitCardRef = ref()
const piggyRef = ref()
const importInput = ref()
const refreshKey = ref(0)

function setActiveTab(tab) {
  activeTab.value = tab
}

onMounted(async () => {
  await initDefaultCategories()
  // 给子组件提供全局跳转方法(如记账表单里「未设置限额 → 设置」的跳转)
  window.__jumpTab = setActiveTab
})

function handleSaved() {
  // 保存后刷新列表、汇总、限额卡片
  listRef.value?.loadList()
  summaryRef.value?.loadSummary()
  chartRef.value?.loadData()
  limitCardRef.value?.load()
  refreshKey.value++
}

function handlePiggyChanged() {
  // 存钱罐操作影响主余额,刷新汇总
  summaryRef.value?.loadSummary()
  refreshKey.value++
}

async function handleExport() {
  try {
    await exportData()
  } catch (e) {
    alert('导出失败: ' + e.message)
  }
}

async function handleImport(e) {
  const file = e.target.files[0]
  if (!file) return
  if (!confirm('导入将覆盖当前所有数据,确定继续?')) {
    e.target.value = ''
    return
  }
  try {
    const { importData } = await import('./utils/backup')
    await importData(file, 'replace')
    alert('导入成功')
    await initDefaultCategories()
    handleSaved()
  } catch (err) {
    alert('导入失败: ' + err.message)
  }
  e.target.value = ''
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <span class="app-title">理财记账本</span>
    </header>

    <main class="app-main">
      <!-- 首页:记账 -->
      <template v-if="activeTab === 'home'">
        <MonthlySummary ref="summaryRef" :key="`summary-${refreshKey}`" />
        <DailyLimitCard ref="limitCardRef" :key="`limit-${refreshKey}`" />
        <TransactionForm ref="formRef" @saved="handleSaved" />
        <TransactionList ref="listRef" :key="`list-${refreshKey}`" @changed="handleSaved" />
      </template>

      <!-- 统计 -->
      <template v-else-if="activeTab === 'stats'">
        <MonthlySummary ref="summaryRef" :key="`summary2-${refreshKey}`" />
        <CategoryChart ref="chartRef" :key="`chart-${refreshKey}`" />
      </template>

      <!-- 存钱罐 -->
      <template v-else-if="activeTab === 'piggy'">
        <PiggyBankManager ref="piggyRef" :key="`piggy-${refreshKey}`" @changed="handlePiggyChanged" />
      </template>

      <!-- 分类管理 -->
      <template v-else-if="activeTab === 'categories'">
        <CategoryManager :key="`cat-${refreshKey}`" />
      </template>

      <!-- 设置 -->
      <template v-else-if="activeTab === 'settings'">
        <SettingsManager :key="`settings-${refreshKey}`" />
        <div class="settings-card">
          <h3 class="settings-title">数据备份</h3>
          <p class="settings-desc">数据存储在本地浏览器,定期导出备份避免丢失。</p>
          <button class="action-btn" @click="handleExport">导出数据 (JSON)</button>
          <button class="action-btn outline" @click="importInput.click()">导入数据</button>
          <input ref="importInput" type="file" accept=".json" style="display:none" @change="handleImport" />
        </div>
        <div class="settings-card">
          <h3 class="settings-title">关于</h3>
          <p class="settings-desc">离线理财记账工具 v0.2.0</p>
          <p class="settings-desc">数据存储在本地 IndexedDB,可安装到手机主屏离线使用。</p>
        </div>
      </template>
    </main>

    <InstallPrompt />

    <nav class="app-tabbar">
      <button class="tab" :class="{ active: activeTab === 'home' }" @click="activeTab = 'home'">
        <span class="tab-icon">✏️</span>
        <span class="tab-label">记账</span>
      </button>
      <button class="tab" :class="{ active: activeTab === 'stats' }" @click="activeTab = 'stats'">
        <span class="tab-icon">📊</span>
        <span class="tab-label">统计</span>
      </button>
      <button class="tab" :class="{ active: activeTab === 'piggy' }" @click="activeTab = 'piggy'">
        <span class="tab-icon">🐷</span>
        <span class="tab-label">存钱</span>
      </button>
      <button class="tab" :class="{ active: activeTab === 'categories' }" @click="activeTab = 'categories'">
        <span class="tab-icon">🏷️</span>
        <span class="tab-label">分类</span>
      </button>
      <button class="tab" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">
        <span class="tab-icon">⚙️</span>
        <span class="tab-label">设置</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(60px + var(--safe-bottom));
}
.app-header {
  padding: var(--spacer-16);
  padding-top: calc(var(--spacer-16) + env(safe-area-inset-top, 0px));
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.app-title {
  font-size: 18px;
  font-weight: 600;
}
.app-main {
  flex: 1;
  padding: var(--spacer-12);
  display: flex;
  flex-direction: column;
  gap: var(--spacer-12);
}
.app-tabbar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 640px;
  display: flex;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding-bottom: var(--safe-bottom);
  z-index: 20;
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--spacer-8) 0;
  color: var(--color-text-muted);
}
.tab.active {
  color: var(--color-brand);
}
.tab-icon {
  font-size: 20px;
}
.tab-label {
  font-size: 11px;
}
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
  margin-bottom: var(--spacer-12);
}
.action-btn {
  display: block;
  width: 100%;
  padding: var(--spacer-12);
  margin-bottom: var(--spacer-8);
  background: var(--color-brand);
  color: #fff;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
}
.action-btn.outline {
  background: transparent;
  color: var(--color-brand);
  border: 1px solid var(--color-brand);
}
</style>
