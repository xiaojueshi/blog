import { requireAdmin } from '../../utils/auth'
import { createAgentCredential, revokeAgentCredential } from '../../utils/agent-auth'

/** 创建或撤销当前实例的 Agent 凭据。
 * @param event 当前请求。
 * @returns 凭据资料；创建时还返回一次密钥。
 * @throws 鉴权失败、参数无效或数据库写入失败时返回错误。
 */
export default defineEventHandler(async event => {
  requireAdmin(event)
  const input = await readBody(event)
  if (input?.action === 'create') return createAgentCredential(input.name, input.scopes)
  if (input?.action === 'revoke') return { credential: revokeAgentCredential(input.id) }
  throw createError({ statusCode: 400, statusMessage: '凭据操作无效' })
})
