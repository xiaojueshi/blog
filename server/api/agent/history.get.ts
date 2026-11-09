import { requireAgent } from '../../utils/agent-auth'
import { agentHistory } from '../../utils/agent-content'

/** 读取内容历史版本。
 * @param event 当前请求。
 * @returns 历史摘要或指定历史版本。
 * @throws 凭据无效、权限不足或版本不存在时返回错误。
 */
export default defineEventHandler(event => {
  requireAgent(event, 'content:read')
  const query = getQuery(event)
  return agentHistory(typeof query.id === 'string' ? query.id : '', typeof query.revision === 'string' ? Number(query.revision) : undefined)
})
