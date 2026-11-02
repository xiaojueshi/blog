import type { WorkspaceDatabase } from '../server/utils/storage-types'
/** 读取 Durable Object 内的持久化连接，禁止回退到临时磁盘。
 * @returns 同步 SQL 存储适配器。
 * @throws 请求未经过工作台对象时抛出异常。
 */
export function openDatabase(): WorkspaceDatabase {
  type Storage = { sql: { exec(query: string, ...bindings: (string | number | null)[]): { toArray(): Record<string, unknown>[] } }; transactionSync<T>(work: () => T): T }
  const current = (): Storage => {
    const storage = (globalThis as typeof globalThis & { __xjsStorageContext?: { getStore(): Storage | undefined } }).__xjsStorageContext?.getStore()
    if (!storage) throw new Error('请求必须经过 Workspace Durable Object')
    return storage
  }
  // 每次查询读取请求上下文，防止对象重启或并发请求复用过期的 I/O 句柄。
  const storage = { get sql() { return current().sql }, transactionSync<T>(work: () => T): T { return current().transactionSync(work) } }
  storage.sql.exec('CREATE TABLE IF NOT EXISTS asset_chunks (asset_id TEXT NOT NULL, position INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(asset_id, position))')
  const queryRows = (query: string, bindings: (string | number | null)[]) => {
    if (/^INSERT(?: OR (?:IGNORE|REPLACE))? INTO assets VALUES/i.test(query) && typeof bindings[1] === 'string' && bindings[1].length > 512 * 1024) {
      return storage.transactionSync(() => {
        const [id, data, mime, contentId] = bindings as [string, string, string, string]
        if (/OR IGNORE/i.test(query) && storage.sql.exec('SELECT id FROM assets WHERE id = ?', id).toArray().length) return []
        storage.sql.exec('DELETE FROM asset_chunks WHERE asset_id = ?', id)
        // 分片避免平台的单行 2MB 上限，原始图片和备份格式保持兼容。
        for (let position = 0; position < data.length; position += 512 * 1024) storage.sql.exec('INSERT INTO asset_chunks VALUES (?, ?, ?)', id, position, data.slice(position, position + 512 * 1024))
        storage.sql.exec(query, id, '@chunks', mime, contentId)
        return []
      })
    }
    const adjusted = query.replace(/length\(data\) AS size/ig, "CASE WHEN data = '@chunks' THEN (SELECT sum(length(data)) FROM asset_chunks WHERE asset_id = assets.id) ELSE length(data) END AS size")
    const rows = storage.sql.exec(adjusted, ...bindings).toArray()
    if (/^SELECT \* FROM assets/i.test(query)) for (const row of rows) {
      if (row.data === '@chunks') row.data = storage.sql.exec('SELECT data FROM asset_chunks WHERE asset_id = ? ORDER BY position', row.id as string).toArray().map(chunk => chunk.data).join('')
    }
    return rows
  }
  return {
    close: () => {},
    exec: query => { storage.sql.exec(query) },
    prepare: query => ({
      all: (...bindings) => queryRows(query, bindings),
      get: (...bindings) => queryRows(query, bindings)[0],
      run: (...bindings) => queryRows(query, bindings),
    }),
    transaction: work => storage.transactionSync(work),
  }
}
