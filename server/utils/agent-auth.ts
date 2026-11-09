import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import { database } from './store'

export const agentScopes = ['content:read', 'content:write', 'content:publish', 'taxonomy:write'] as const

/** Agent 凭据可授予的内容管理权限。
 * @returns 无。
 * @throws 无。
 */
export type AgentScope = typeof agentScopes[number]

/** 可展示的凭据资料，不包含凭据原文或摘要。
 * @returns 无。
 * @throws 无。
 */
export interface AgentCredential {
  id: string
  name: string
  scopes: AgentScope[]
  createdAt: number
  expiresAt: number
  revokedAt: number | null
}

type CredentialRow = { id: string; name: string; scopes: string; created_at: number; expires_at: number; revoked_at: number | null }
const credentialLifetime = 90 * 24 * 60 * 60 * 1000

function metadata(row: CredentialRow): AgentCredential {
  return { id: row.id, name: row.name, scopes: JSON.parse(row.scopes) as AgentScope[], createdAt: row.created_at, expiresAt: row.expires_at, revokedAt: row.revoked_at }
}

/** 列出当前实例的 Agent 凭据，不返回密钥。
 * @returns 可展示的凭据资料。
 * @throws 数据库读取失败时抛出异常。
 */
export function listAgentCredentials(): AgentCredential[] {
  const rows = database().prepare('SELECT id, name, scopes, created_at, expires_at, revoked_at FROM agent_credentials ORDER BY created_at DESC').all() as CredentialRow[]
  return rows.map(metadata)
}

/** 创建独立凭据，原文只随创建结果返回一次。
 * @param name 用于区分设备或 Agent 的名称。
 * @param scopes 授予的内容管理权限。
 * @returns 凭据资料与首次展示的密钥。
 * @throws 名称或权限无效、数据库写入失败时抛出异常。
 */
export function createAgentCredential(name: unknown, scopes: unknown): { credential: AgentCredential; token: string } {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 || !Array.isArray(scopes) || !scopes.length || scopes.some(scope => !agentScopes.includes(scope))) {
    throw createError({ statusCode: 400, statusMessage: '请输入凭据名称并选择有效权限' })
  }
  const now = Date.now()
  const credential: AgentCredential = { id: randomUUID(), name: name.trim(), scopes: [...new Set(scopes)] as AgentScope[], createdAt: now, expiresAt: now + credentialLifetime, revokedAt: null }
  const token = `xjs_${randomBytes(32).toString('base64url')}`
  const hash = createHash('sha256').update(token).digest('hex')
  database().prepare('INSERT INTO agent_credentials VALUES (?, ?, ?, ?, ?, ?, ?)').run(credential.id, credential.name, hash, JSON.stringify(credential.scopes), credential.createdAt, credential.expiresAt, null)
  return { credential, token }
}

/** 撤销指定凭据，使后续请求立即失效。
 * @param id 要撤销的凭据身份。
 * @returns 撤销后的凭据资料。
 * @throws 凭据不存在或数据库写入失败时抛出异常。
 */
export function revokeAgentCredential(id: unknown): AgentCredential {
  if (typeof id !== 'string' || !id) throw createError({ statusCode: 400, statusMessage: '请选择凭据' })
  const db = database()
  const row = db.prepare('SELECT id, name, scopes, created_at, expires_at, revoked_at FROM agent_credentials WHERE id = ?').get(id) as CredentialRow | undefined
  if (!row) throw createError({ statusCode: 404, statusMessage: '凭据不存在' })
  if (row.revoked_at === null) {
    row.revoked_at = Date.now()
    db.prepare('UPDATE agent_credentials SET revoked_at = ? WHERE id = ?').run(row.revoked_at, id)
  }
  return metadata(row)
}

/** 验证 Agent 专用凭据的有效期和撤销状态。
 * @param event 当前请求。
 * @returns 已验证的凭据资料。
 * @throws 凭据无效、到期或已撤销时返回 401。
 */
export function authenticateAgent(event: H3Event): AgentCredential {
  const authorization = getHeader(event, 'authorization') || ''
  const match = /^Bearer (xjs_[A-Za-z0-9_-]{43})$/.exec(authorization)
  if (!match) throw createError({ statusCode: 401, statusMessage: 'Agent 凭据无效' })
  const hash = createHash('sha256').update(match[1]!).digest('hex')
  const row = database().prepare('SELECT id, name, scopes, created_at, expires_at, revoked_at FROM agent_credentials WHERE token_hash = ?').get(hash) as CredentialRow | undefined
  if (!row || row.revoked_at !== null || row.expires_at <= Date.now()) throw createError({ statusCode: 401, statusMessage: 'Agent 凭据无效、已撤销或已过期' })
  const credential = metadata(row)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return credential
}

/** 检查已验证凭据是否拥有指定操作权限。
 * @param credential 已验证的凭据资料。
 * @param scope 该操作所需的权限。
 * @returns 无。
 * @throws 权限不足时返回 403。
 */
export function requireAgentScope(credential: AgentCredential, scope: AgentScope): void {
  if (!credential.scopes.includes(scope)) throw createError({ statusCode: 403, statusMessage: 'Agent 凭据没有此操作的权限' })
}

/** 验证 Agent 凭据及当前操作的权限。
 * @param event 当前请求。
 * @param scope 该操作所需的权限。
 * @returns 已验证的凭据资料。
 * @throws 凭据无效或权限不足时返回 401 或 403。
 */
export function requireAgent(event: H3Event, scope: AgentScope): AgentCredential {
  const credential = authenticateAgent(event)
  requireAgentScope(credential, scope)
  return credential
}
