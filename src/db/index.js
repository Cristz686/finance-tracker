import Dexie from 'dexie'

// 离线理财工具数据库
// 数据全部存储在浏览器 IndexedDB 中,断网可读写
export const db = new Dexie('FinanceDB')

db.version(1).stores({
  // 流水表:自增主键 id, 索引 [type+date] 用于按类型+日期范围查询
  transactions: '++id, type, date, category, [type+date]',
  // 分类表:自增主键 id, 索引 type 区分收入/支出分类
  categories: '++id, type, name'
})

// 默认分类,首次使用时插入
const defaultCategories = [
  { name: '工资', type: 'income', icon: '💰' },
  { name: '兼职', type: 'income', icon: '🔧' },
  { name: '理财收益', type: 'income', icon: '📈' },
  { name: '其他收入', type: 'income', icon: '➕' },
  { name: '餐饮', type: 'expense', icon: '🍽️' },
  { name: '交通', type: 'expense', icon: '🚇' },
  { name: '购物', type: 'expense', icon: '🛒' },
  { name: '住房', type: 'expense', icon: '🏠' },
  { name: '娱乐', type: 'expense', icon: '🎮' },
  { name: '医疗', type: 'expense', icon: '💊' },
  { name: '教育', type: 'expense', icon: '📚' },
  { name: '其他支出', type: 'expense', icon: '➖' }
]

// 初始化默认分类(仅在表为空时)
export async function initDefaultCategories() {
  const count = await db.categories.count()
  if (count === 0) {
    await db.categories.bulkAdd(defaultCategories)
  }
}

// === 流水 CRUD ===

// 添加一笔流水
export async function addTransaction(tx) {
  return db.transactions.add({
    ...tx,
    createdAt: new Date().toISOString()
  })
}

// 更新流水
export async function updateTransaction(id, changes) {
  return db.transactions.update(id, changes)
}

// 删除流水
export async function deleteTransaction(id) {
  return db.transactions.delete(id)
}

// 查询某月流水(格式 YYYY-MM)
export async function getTransactionsByMonth(yearMonth) {
  const start = `${yearMonth}-01`
  const end = `${yearMonth}-31`
  return db.transactions
    .where('[type+date]')
    .between(['income', start], ['expense', end], true, true)
    .toArray()
    .then(list => list.sort((a, b) => b.date.localeCompare(a.date)))
}

// 实际上更简单的查询:按日期范围
export async function getTransactionsByDateRange(startDate, endDate) {
  return db.transactions
    .where('date')
    .between(startDate, endDate, true, true)
    .reverse()
    .sortBy('date')
}

// === 分类 CRUD ===

export async function getCategoriesByType(type) {
  return db.categories.where('type').equals(type).toArray()
}

export async function getAllCategories() {
  return db.categories.toArray()
}

export async function addCategory(cat) {
  return db.categories.add(cat)
}

export async function updateCategory(id, changes) {
  return db.categories.update(id, changes)
}

export async function deleteCategory(id) {
  return db.categories.delete(id)
}

// === 统计 ===

// 计算某月汇总:总收入、总支出、结余
export async function getMonthSummary(yearMonth) {
  const start = `${yearMonth}-01`
  const end = `${yearMonth}-31`
  const list = await db.transactions
    .where('date')
    .between(start, end, true, true)
    .toArray()

  let income = 0
  let expense = 0
  const byCategory = {} // { 'expense:餐饮': { amount, count } }

  for (const tx of list) {
    const key = `${tx.type}:${tx.category}`
    if (!byCategory[key]) {
      byCategory[key] = { type: tx.type, category: tx.category, amount: 0, count: 0 }
    }
    byCategory[key].amount += tx.amount
    byCategory[key].count += 1

    if (tx.type === 'income') income += tx.amount
    else expense += tx.amount
  }

  return {
    income,
    expense,
    balance: income - expense,
    count: list.length,
    byCategory: Object.values(byCategory).sort((a, b) => b.amount - a.amount)
  }
}
