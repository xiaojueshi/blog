import { openDatabase } from './storage-driver'
import type { WorkspaceDatabase } from './storage-types'
import type { Draft } from '../../shared/content'
import { createSeed } from '../../shared/seed'
import { initializeWorkspace } from './schema'
let instance: WorkspaceDatabase | undefined
/** 获取本地 SQLite 存储；平台访问集中在本模块。
 * @returns 数据库连接。
 * @throws 文件系统或数据库初始化失败时抛出异常。
 */
export function database(): WorkspaceDatabase {
  if (!instance) {
    instance = openDatabase()
    instance.exec('CREATE TABLE IF NOT EXISTS content (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS history (id TEXT NOT NULL, revision INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(id, revision)); CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, data TEXT NOT NULL, mime TEXT NOT NULL, content_id TEXT NOT NULL);')
    if (!instance.prepare('SELECT value FROM config WHERE key = ?').get('seeded')) {
      const insert = instance.prepare('INSERT OR IGNORE INTO content VALUES (?, ?)')
      for (const item of createSeed()) insert.run(item.id, JSON.stringify(item))
      instance.prepare('INSERT INTO config VALUES (?, ?)').run('seeded', 'true')
    }
    initializeWorkspace(instance)
  }
  return instance
}
/** 读取所有编辑稿，仅供已授权的管理逻辑使用。
 * @returns 内容记录。
 * @throws 数据损坏或查询失败时抛出异常。
 */
export function allDrafts(): Draft[] {
  return (database().prepare('SELECT data FROM content').all() as { data: string }[]).map(row => JSON.parse(row.data))
}
/** 读取单项内容。
 * @param id 内容身份。
 * @returns 内容或空值。
 * @throws 数据损坏或查询失败时抛出异常。
 */
export function getDraft(id: string): Draft | null {
  const row = database().prepare('SELECT data FROM content WHERE id = ?').get(id) as { data: string } | undefined
  return row ? JSON.parse(row.data) : null
}
/** 以事务及修订号比较保存内容，防止静默覆盖。
 * @param draft 新内容。
 * @param expectedRevision 客户端读取的修订号，新建时为零。
 * @returns 已保存内容。
 * @throws 修订冲突时返回 409，数据库失败时抛出异常。
 */
export function saveDraft(draft: Draft, expectedRevision: number): Draft {
  const db = database()
  return atomic(() => {
    const previous = getDraft(draft.id)
    if ((previous?.revision || 0) !== expectedRevision) throw createError({ statusCode: 409, statusMessage: '内容已在其他窗口更新，请刷新后重试' })
    if (previous) db.prepare('INSERT OR IGNORE INTO history VALUES (?, ?, ?)').run(previous.id, previous.revision, JSON.stringify(previous))
    const result = { ...draft, revision: expectedRevision + 1, updatedAt: new Date().toISOString() }
    db.prepare('INSERT OR REPLACE INTO content VALUES (?, ?)').run(result.id, JSON.stringify(result))
    return result
  })
}

let transactionDepth = 0
/** 在同步事务中执行关联操作；嵌套调用共享同一事务。
 * @param work 同步数据库操作。
 * @returns 操作结果。
 * @throws 任一操作失败时回滚并抛出原始错误。
 */
export function atomic<T>(work: () => T): T {
  const db = database(); const outer = transactionDepth === 0
  const execute = () => {
    transactionDepth++
    try { return work() } finally { transactionDepth-- }
  }
  return outer ? db.transaction(execute) : execute()
}
