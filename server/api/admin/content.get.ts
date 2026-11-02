import { requireAdmin } from '../../utils/auth'
import { allDrafts } from '../../utils/store'
import { resolveTerms } from '../../utils/workspace'
/** 处理当前路由请求并执行相应的权限与数据规则。
 * @param event 当前 H3 请求事件。
 * @returns 当前接口的响应数据。
 * @throws 参数无效、权限不足或存储失败时返回相应错误。
 */
export default defineEventHandler(event => { requireAdmin(event); return allDrafts().map(d => ({ ...resolveTerms(d), published: d.published ? resolveTerms(d.published) : null })).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)) })
