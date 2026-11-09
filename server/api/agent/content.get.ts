import { requireAgent } from '../../utils/agent-auth'
import { agentContent } from '../../utils/agent-content'

/** 检索内容，或读取一篇编辑稿与发布版本。
 * @param event 当前请求。
 * @returns 匹配摘要或指定内容。
 * @throws 凭据无效、权限不足或内容不存在时返回错误。
 */
export default defineEventHandler(event => {
  requireAgent(event, 'content:read')
  const query = getQuery(event)
  return agentContent(typeof query.id === 'string' ? query.id : undefined, typeof query.q === 'string' ? query.q : '')
})
