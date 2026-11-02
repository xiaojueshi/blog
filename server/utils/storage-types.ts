/** 同步 SQL 存储边界，Node.js 与 Cloudflare 共用。 */
export interface WorkspaceDatabase {
  /** 执行 SQL。@param sql SQL 语句。@returns 无。@throws SQL 执行失败。 */
  /** 关闭本地连接。@returns 无。@throws 关闭失败。 */
  close(): void
  exec(sql: string): void
  /** 创建参数化查询。@param sql SQL 语句。@returns 查询接口。@throws SQL 无效。 */
  prepare(sql: string): {
    all(...bindings: (string | number | null)[]): Record<string, unknown>[]
    get(...bindings: (string | number | null)[]): Record<string, unknown> | undefined
    run(...bindings: (string | number | null)[]): unknown
  }
  /** 同步事务。@param work 事务内操作。@returns 操作结果。@throws 失败时回滚。 */
  transaction<T>(work: () => T): T
}
