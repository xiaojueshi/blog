import { requireAdmin } from '../../utils/auth'
import { database } from '../../utils/store'
/** 处理当前路由请求并执行相应的权限与数据规则。
 * @param event 当前 H3 请求事件。
 * @returns 当前接口的响应数据。
 * @throws 参数无效、权限不足或存储失败时返回相应错误。
 */
export default defineEventHandler(event => {
  requireAdmin(event)
  return (database().prepare('SELECT revision, data FROM history WHERE id = ? ORDER BY revision DESC LIMIT 30').all(String(getQuery(event).id || '')) as { revision: number; data: string }[]).map(row => { const d = JSON.parse(row.data); return { revision: row.revision, title: d.title, updatedAt: d.updatedAt } })
})
