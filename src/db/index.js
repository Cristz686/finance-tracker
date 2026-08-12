import Dexie from 'dexie'

// 离线理财工具数据库
// 数据全部存储在浏览器 IndexedDB 中,断网可读写
export const db = new Dexie('FinanceDB')

// v1: 初始版本(transactions + categories)
// v2: 新增 settings 表(键值对存储每日限额等设置)
// v3: 新增 piggyBanks 表 + 流水支持 transfer 类型(存钱罐存取)
db.version(1).stores({
  // 流水表:自增主键 id, 索引 [type+date] 用于按类型+日期范围查询
  transactions: '++id, type, date, category, [type+date]',
  // 分类表:自增主键 id, 索引 type 区分收入/支出分类
  categories: '++id, type, name'
})

db.version(2).stores({
  // 设置表:key 唯一,如 'dailyLimit'
  settings: 'key'
})

db.version(3).stores({
  // 存钱罐表:自增主键 id, name 唯一
  // 字段:id, name, target(目标金额), balance(当前余额), icon, createdAt
  piggyBanks: '++id, name',
  // 流水表追加 piggyBankId 索引,用于按存钱罐查询其存取记录
  transactions: '++id, type, date, category, [type+date], piggyBankId'
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

// 获取某天的支出总额(仅 type=expense,不含 transfer)
export async function getDayExpense(dateStr) {
  const list = await db.transactions
    .where('date')
    .equals(dateStr)
    .toArray()
  return list
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
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

// === 设置 ===

export async function getSetting(key, defaultValue = null) {
  const row = await db.settings.get(key)
  return row ? row.value : defaultValue
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value })
  return value
}

// 每日支出限额快捷方法
export async function getDailyLimit() {
  return getSetting('dailyLimit', 0) // 0 表示未设置限额
}

export async function setDailyLimit(amount) {
  return setSetting('dailyLimit', Number(amount) || 0)
}

// === 存钱罐 CRUD ===

export async function getAllPiggyBanks() {
  return db.piggyBanks.toArray()
}

export async function addPiggyBank({ name, target = 0, icon = '🐷' }) {
  const id = await db.piggyBanks.add({
    name,
    target: Number(target) || 0,
    balance: 0,
    icon,
    createdAt: new Date().toISOString()
  })
  return id
}

export async function updatePiggyBank(id, changes) {
  return db.piggyBanks.update(id, changes)
}

export async function deletePiggyBank(id) {
  // 同时删除关联的流水记录
  await db.transaction('rw', db.piggyBanks, db.transactions, async () => {
    await db.transactions.where('piggyBankId').equals(id).delete()
    await db.piggyBanks.delete(id)
  })
}

// 获取存钱罐所有存取记录
export async function getPiggyBankTransactions(piggyBankId) {
  return db.transactions
    .where('piggyBankId')
    .equals(piggyBankId)
    .reverse()
    .sortBy('date')
}

// 存入存钱罐:从主余额扣减,存钱罐余额增加,流水表记一笔 transfer
export async function depositToPiggyBank(piggyBankId, amount, note = '') {
  amount = Number(amount)
  if (!amount || amount <= 0) throw new Error('金额必须大于 0')

  return db.transaction('rw', db.piggyBanks, db.transactions, async () => {
    const bank = await db.piggyBanks.get(piggyBankId)
    if (!bank) throw new Error('存钱罐不存在')

    // 增加存钱罐余额
    await db.piggyBanks.update(piggyBankId, {
      balance: bank.balance + amount
    })

    // 记流水:transfer 类型,transferType=deposit 表示存入存钱罐
    await db.transactions.add({
      type: 'transfer',
      transferType: 'deposit',
      piggyBankId,
      amount,
      category: bank.name,
      date: getTodayStrLocal(),
      note: note || `存入「${bank.name}」`,
      createdAt: new Date().toISOString()
    })
  })
}

// 从存钱罐取出:存钱罐余额减少,主余额增加,流水表记一笔 transfer
export async function withdrawFromPiggyBank(piggyBankId, amount, note = '') {
  amount = Number(amount)
  if (!amount || amount <= 0) throw new Error('金额必须大于 0')

  return db.transaction('rw', db.piggyBanks, db.transactions, async () => {
    const bank = await db.piggyBanks.get(piggyBankId)
    if (!bank) throw new Error('存钱罐不存在')
    if (bank.balance < amount) throw new Error('存钱罐余额不足')

    await db.piggyBanks.update(piggyBankId, {
      balance: bank.balance - amount
    })

    await db.transactions.add({
      type: 'transfer',
      transferType: 'withdraw',
      piggyBankId,
      amount,
      category: bank.name,
      date: getTodayStrLocal(),
      note: note || `从「${bank.name}」取出`,
      createdAt: new Date().toISOString()
    })
  })
}

// 所有存钱罐总余额
export async function getPiggyBanksTotalBalance() {
  const list = await db.piggyBanks.toArray()
  return list.reduce((sum, b) => sum + b.balance, 0)
}

// === 统计 ===

// 计算某月汇总:总收入、总支出、结余
// 注意:transfer 类型不计入收支统计,只影响存钱罐和主余额
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
    // 跳过 transfer 类型,不计入收支
    if (tx.type === 'transfer') continue

    const key = `${tx.type}:${tx.category}`
    if (!byCategory[key]) {
      byCategory[key] = { type: tx.type, category: tx.category, amount: 0, count: 0 }
    }
    byCategory[key].amount += tx.amount
    byCategory[key].count += 1

    if (tx.type === 'income') income += tx.amount
    else if (tx.type === 'expense') expense += tx.amount
  }

  // 计算主余额(可自由支配的钱)
  // 主余额 = 全部收入 - 全部支出 - 存入存钱罐的金额 + 从存钱罐取出的金额
  // transfer 不计入收支统计,但会影响主余额
  const allTxs = await db.transactions.toArray()
  let mainBalance = 0
  for (const tx of allTxs) {
    if (tx.type === 'income') mainBalance += tx.amount
    else if (tx.type === 'expense') mainBalance -= tx.amount
    else if (tx.type === 'transfer') {
      // deposit:钱从主余额流向存钱罐,主余额减少
      // withdraw:钱从存钱罐流回主余额,主余额增加
      mainBalance += tx.transferType === 'withdraw' ? tx.amount : -tx.amount
    }
  }

  // 存钱罐总余额
  const piggyBanksTotal = await getPiggyBanksTotalBalance()

  return {
    income,
    expense,
    balance: income - expense, // 本月结余
    count: list.length,
    byCategory: Object.values(byCategory).sort((a, b) => b.amount - a.amount),
    mainBalance, // 主余额(全局可支配)
    piggyBanksTotal, // 存钱罐总额
    totalAssets: mainBalance + piggyBanksTotal // 总资产
  }
}

// 工具:本地时区的 YYYY-MM-DD
function getTodayStrLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
