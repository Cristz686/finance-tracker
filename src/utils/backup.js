import { db } from '../db'

// 导出全部数据为 JSON 文件
// 包含:流水、分类、设置(每日限额)、存钱罐
export async function exportData() {
  const [transactions, categories, settings, piggyBanks] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.settings.toArray(),
    db.piggyBanks.toArray()
  ])

  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    transactions,
    categories,
    settings,
    piggyBanks
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// 从 JSON 文件导入数据(覆盖模式:清空后导入)
// 兼容 v1 版本(只有 transactions + categories)的备份文件
export async function importData(file, mode = 'replace') {
  const text = await file.text()
  const data = JSON.parse(text)

  if (!data.transactions || !data.categories) {
    throw new Error('备份文件格式不正确')
  }

  const stores = [db.transactions, db.categories]
  if (data.settings) stores.push(db.settings)
  if (data.piggyBanks) stores.push(db.piggyBanks)

  await db.transaction('rw', stores, async () => {
    if (mode === 'replace') {
      await db.transactions.clear()
      await db.categories.clear()
      if (data.settings) await db.settings.clear()
      if (data.piggyBanks) await db.piggyBanks.clear()
    }
    // 导入时去掉原有的自增 id,让数据库重新分配
    const txs = data.transactions.map(({ id, ...rest }) => rest)
    const cats = data.categories.map(({ id, ...rest }) => rest)
    await db.transactions.bulkAdd(txs)
    await db.categories.bulkAdd(cats)

    // v2 备份才有的数据
    if (data.settings) {
      const settings = data.settings.map(({ key, value }) => ({ key, value }))
      await db.settings.bulkPut(settings)
    }
    if (data.piggyBanks) {
      const banks = data.piggyBanks.map(({ id, ...rest }) => rest)
      await db.piggyBanks.bulkAdd(banks)
    }
  })
}
