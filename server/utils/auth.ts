import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { database } from './store'
/** 验证同源写请求，防止跨站表单或脚本提交。
 * @param event 当前请求。
 * @returns 无。
 * @throws 来源不匹配时返回 403。
 */
export function checkOrigin(event: H3Event): void {
  const origin = getHeader(event, 'origin')
  if (!origin || origin !== getRequestURL(event).origin) throw createError({ statusCode: 403, statusMessage: '请求来源无效' })
}
/** 判断当前请求是否属于管理员。
 * @param event 当前请求。
 * @returns 是否拥有有效会话。
 * @throws 数据库错误时抛出异常。
 */
export function isAdmin(event: H3Event): boolean {
  const token = getCookie(event, 'xjs_session')
  if (!token) return false
  const hash = createHash('sha256').update(token).digest('hex')
  return Boolean(database().prepare('SELECT token FROM sessions WHERE token = ? AND expires > ?').get(hash, Date.now()))
}
/** 强制管理接口鉴权。
 * @param event 当前请求。
 * @returns 无。
 * @throws 未登录时返回 401，跨站写入时返回 403。
 */
export function requireAdmin(event: H3Event): void {
  if (!isAdmin(event)) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  if (!['GET', 'HEAD'].includes(event.method)) checkOrigin(event)
  setHeader(event, 'Cache-Control', 'no-store')
}
/** 创建安全密码摘要。
 * @param password 原始密码。
 * @returns 带盐密码摘要。
 * @throws 加密失败时抛出异常。
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}
/** 验证密码摘要。
 * @param password 输入密码。
 * @param stored 带盐摘要。
 * @returns 是否匹配。
 * @throws 加密失败时抛出异常。
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, digest] = stored.split(':')
  if (!salt || !digest) return false
  const expected = Buffer.from(digest, 'hex')
  const actual = scryptSync(password, salt, 64)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
/** 创建具有过期时间的管理员会话。
 * @param event 当前请求。
 * @returns 无。
 * @throws 数据库写入失败时抛出异常。
 */
export function startSession(event: H3Event): void {
  const token = randomBytes(32).toString('hex')
  const db = database()
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now())
  db.prepare('INSERT INTO sessions VALUES (?, ?)').run(createHash('sha256').update(token).digest('hex'), Date.now() + 86400000)
  setCookie(event, 'xjs_session', token, { httpOnly: true, sameSite: 'strict', secure: getRequestURL(event).protocol === 'https:', path: '/', maxAge: 86400 })
}
