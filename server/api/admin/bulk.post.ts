import { requireAdmin } from '../../utils/auth'
import { applyBulkAction } from '../../utils/taxonomy-actions'

/** 批量维护内容分类和标签。
 * @param event 当前请求。
 * @returns 更新的内容数量。
 * @throws 鉴权、参数校验或版本冲突时返回错误。
 */
export default defineEventHandler(async event => {
  requireAdmin(event)
  return applyBulkAction(await readBody(event))
})
