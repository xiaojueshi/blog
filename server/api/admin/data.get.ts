import { requireAdmin } from '../../utils/auth'
import { allDrafts, database } from '../../utils/store'
import { workspace } from '../../utils/workspace'
/** 获取数据概览及操作记录。
 * @param event 当前请求。
 * @returns 统计和最近操作。
 * @throws 未登录时返回 401。
 */
export default defineEventHandler(event => {
  requireAdmin(event); const state = workspace()
  return { content: allDrafts().length, bases: state.bases.length, terms: state.terms.length, assets: Number((database().prepare('SELECT count(*) AS n FROM assets').get() as { n: number }).n), operations: (database().prepare('SELECT data FROM operations ORDER BY rowid DESC LIMIT 30').all() as { data: string }[]).map(r => JSON.parse(r.data)) }
})
