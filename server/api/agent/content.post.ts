import { authenticateAgent, requireAgentScope } from '../../utils/agent-auth'
import { applyAgentContentAction } from '../../utils/agent-content'

/** 保存编辑稿，或对已有内容执行发布、撤回和恢复。
 * @param event 当前请求。
 * @returns 保存后的编辑稿。
 * @throws 凭据无效、权限不足或版本冲突时返回错误。
 */
export default defineEventHandler(async event => {
  const credential = authenticateAgent(event)
  const input = await readBody(event)
  requireAgentScope(credential, ['publish', 'withdraw'].includes(input?.action) ? 'content:publish' : 'content:write')
  return applyAgentContentAction(input)
})
