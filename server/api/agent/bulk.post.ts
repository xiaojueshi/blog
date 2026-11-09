import { requireAgent } from '../../utils/agent-auth'
import { applyAgentBulkAction } from '../../utils/agent-content'

/** 批量修改内容分类或标签。
 * @param event 当前请求。
 * @returns 成功更新的内容数。
 * @throws 凭据无效、权限不足或修订冲突时返回错误。
 */
export default defineEventHandler(async event => {
  requireAgent(event, 'taxonomy:write')
  return applyAgentBulkAction(await readBody(event))
})
