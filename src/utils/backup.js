import { db } from '../db'

// 导出全部数据为 JSON 文件
export async function exportData() {
  const [transactions, categories] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray()
  ])

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    categories
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
export async function importData(file, mode = 'replace') {
  const text = await file.text()
  const data = JSON.parse(text)

  if (!data.transactions || !data.categories) {
    throw new Error('备份文件格式不正确')
  }

  await db.transaction('rw', db.transactions, db.categories, async () => {
    if (mode === 'replace') {
      await db.transactions.clear()
      await db.categories.clear()
    }
    // 导入时去掉原有的自增 id,让数据库重新分配
    const txs = data.transactions.map(({ id, ...rest }) => rest)
    const cats = data.categories.map(({ id, ...rest }) => rest)
    await db.transactions.bulkAdd(txs)
    await db.categories.bulkAdd(cats)
  })
}
