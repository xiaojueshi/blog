import { requireAdmin } from '../../utils/auth'
import { applyContentAction } from '../../utils/content-actions'

/** 保存、发布、撤回或恢复内容。
 * @param event 当前请求。
 * @returns 保存后的编辑稿。
 * @throws 鉴权、参数校验或版本冲突时返回错误。
 */
export default defineEventHandler(async event => {
  requireAdmin(event)
  return applyContentAction(await readBody(event))
})
