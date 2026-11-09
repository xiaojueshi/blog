import { requireAgent } from '../../utils/agent-auth'
import { agentWorkspace } from '../../utils/agent-content'

/** 读取 Agent 可使用的内容组织信息。
 * @param event 当前请求。
 * @returns 分类、标签和修订信息。
 * @throws 凭据无效或没有读取权限时返回错误。
 */
export default defineEventHandler(event => {
  requireAgent(event, 'content:read')
  return agentWorkspace()
})
