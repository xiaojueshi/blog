import { requireAdmin } from '../../utils/auth'
import { applyTermAction } from '../../utils/taxonomy-actions'

/** 管理分类、标签和内置内容类型。
 * @param event 当前请求。
 * @returns 最新配置和受影响内容数。
 * @throws 鉴权、参数校验或版本冲突时返回错误。
 */
export default defineEventHandler(async event => {
  requireAdmin(event)
  return applyTermAction(await readBody(event))
})
