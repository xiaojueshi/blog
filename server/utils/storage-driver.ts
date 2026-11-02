import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { WorkspaceDatabase } from './storage-types'
/** 打开普通服务器 SQLite。@returns 存储连接。@throws 文件或数据库访问失败。 */
export function openDatabase(): WorkspaceDatabase {
  const directory = resolve(process.env.DATA_DIR || '.data')
  mkdirSync(directory, { recursive: true })
  const db = new DatabaseSync(resolve(directory, 'workspace.sqlite'))
  db.exec('PRAGMA journal_mode=WAL')
  return {
    close: () => db.close(),
    exec: sql => { db.exec(sql) }, prepare: sql => db.prepare(sql),
    transaction<T>(work: () => T): T {
      db.exec('BEGIN IMMEDIATE')
      try { const result = work(); db.exec('COMMIT'); return result }
      catch (error) { db.exec('ROLLBACK'); throw error }
    },
  }
}
