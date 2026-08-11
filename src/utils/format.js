export function formatMoney(num) {
  return Number(num || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function getTodayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getCurrentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthLabel(yearMonth) {
  const [y, m] = yearMonth.split('-')
  return `${y}年${parseInt(m, 10)}月`
}

// 根据日期获取归属月份
export function dateToMonth(dateStr) {
  return dateStr.slice(0, 7)
}

// 月份加减:yearMonth 格式 YYYY-MM,返回 YYYY-MM
export function shiftMonth(yearMonth, delta) {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
