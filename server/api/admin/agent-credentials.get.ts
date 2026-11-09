import { requireAdmin } from '../../utils/auth'
import { listAgentCredentials } from '../../utils/agent-auth'

/** 查询当前实例的 Agent 凭据列表。
 * @param event 当前请求。
 * @returns 不含密钥的凭据资料。
 * @throws 未登录或数据库读取失败时返回错误。
 */
export default defineEventHandler(event => {
  requireAdmin(event)
  return listAgentCredentials()
})
