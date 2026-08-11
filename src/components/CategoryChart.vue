<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Chart from 'chart.js/auto'
import { getMonthSummary } from '../db'
import { formatMoney, getCurrentMonth, formatMonthLabel } from '../utils/format'

const props = defineProps({
  month: { type: String, default: () => getCurrentMonth() }
})

const currentMonth = ref(props.month)
const type = ref('expense') // 默认展示支出占比
const summary = ref({ byCategory: [] })
const canvasRef = ref(null)
const hasData = ref(false)
let chart = null

const colors = [
  '#4B3FE3', '#6F6FFF', '#A9AEFF', '#22A5F7',
  '#27D2BF', '#1DC981', '#EFAA17', '#F87454',
  '#E8463A', '#D3D4DA'
]

async function loadData() {
  summary.value = await getMonthSummary(currentMonth.value)
  const items = summary.value.byCategory.filter(i => i.type === type.value)
  hasData.value = items.length > 0
  await nextTick()
  renderChart(items)
}

function renderChart(items) {
  if (chart) {
    chart.destroy()
    chart = null
  }
  if (!canvasRef.value || items.length === 0) return

  chart = new Chart(canvasRef.value, {
    type: 'doughnut',
    data: {
      labels: items.map(i => i.category),
      datasets: [{
        data: items.map(i => i.amount),
        backgroundColor: colors.slice(0, items.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { size: 12 },
            padding: 8,
            boxWidth: 12,
            boxHeight: 12
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = items.reduce((s, i) => s + i.amount, 0)
              const pct = ((ctx.parsed / total) * 100).toFixed(1)
              return `${ctx.label}: ¥${formatMoney(ctx.parsed)} (${pct}%)`
            }
          }
        }
      }
    }
  })
}

watch(type, loadData)
watch(() => props.month, (v) => { currentMonth.value = v; loadData() })
onMounted(loadData)
onUnmounted(() => { if (chart) chart.destroy() })

defineExpose({ loadData })
</script>

<template>
  <div class="chart-card">
    <div class="chart-header">
      <span class="chart-title">{{ formatMonthLabel(currentMonth) }} · {{ type === 'expense' ? '支出' : '收入' }}占比</span>
      <div class="type-switch">
        <button :class="{ active: type === 'expense' }" @click="type = 'expense'">支出</button>
        <button :class="{ active: type === 'income' }" @click="type = 'income'">收入</button>
      </div>
    </div>
    <div class="chart-body" v-if="hasData">
      <canvas ref="canvasRef"></canvas>
    </div>
    <div class="chart-empty" v-else>
      <span>本月暂无{{ type === 'expense' ? '支出' : '收入' }}数据</span>
    </div>
  </div>
</template>

<style scoped>
.chart-card {
  background: var(--color-surface);
  border-radius: var(--radius-card);
  padding: var(--spacer-16);
}
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacer-12);
}
.chart-title {
  font-size: 15px;
  font-weight: 600;
}
.type-switch {
  display: flex;
  gap: var(--spacer-4);
}
.type-switch button {
  padding: var(--spacer-4) var(--spacer-12);
  border-radius: var(--radius-full);
  font-size: 12px;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
}
.type-switch button.active {
  background: var(--color-brand);
  color: #fff;
}
.chart-body {
  position: relative;
  height: 220px;
}
.chart-empty {
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 14px;
}
</style>
