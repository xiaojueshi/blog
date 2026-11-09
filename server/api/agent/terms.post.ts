import { requireAgent } from '../../utils/agent-auth'
import { applyAgentTermAction } from '../../utils/agent-content'

/** 管理分类和标签，并检查预览是否过期。
 * @param event 当前请求。
 * @returns 最新分类信息和受影响数量。
 * @throws 凭据无效、权限不足或预览过期时返回错误。
 */
export default defineEventHandler(async event => {
  requireAgent(event, 'taxonomy:write')
  return applyAgentTermAction(await readBody(event))
})
