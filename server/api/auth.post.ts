import { createHash } from 'node:crypto'
import { database } from '../utils/store'
import { checkOrigin, hashPassword, verifyPassword, startSession } from '../utils/auth'
const attempts = new Map<string, { count: number; until: number }>()
/** 处理当前路由请求并执行相应的权限与数据规则。
 * @param event 当前 H3 请求事件。
 * @returns 当前接口的响应数据。
 * @throws 参数无效、权限不足或存储失败时返回相应错误。
 */
export default defineEventHandler(async event => {
  checkOrigin(event)
  // Nuxt 开发服务器通过本机 IPC 代理请求，底层 socket 不保留地址。
  // 仅开发环境使用其转发地址；生产环境禁止信任客户端提供的转发头。
  const ip = getRequestIP(event) || (import.meta.dev ? getRequestIP(event, { xForwardedFor: true }) : undefined) || 'unknown'
  const now = Date.now()
  let bucket = attempts.get(ip)
  if (!bucket || bucket.until < now) { bucket = { count: 0, until: now + 600000 }; attempts.set(ip, bucket) }
  if (++bucket.count > 10) throw createError({ statusCode: 429, statusMessage: '尝试次数过多，请稍后重试' })
  const body = await readBody(event)
  if (typeof body?.password !== 'string' || body.password.length < 12 || body.password.length > 256) throw createError({ statusCode: 400, statusMessage: '密码长度须为 12 至 256 个字符' })
  const db = database()
  const stored = db.prepare('SELECT value FROM config WHERE key = ?').get('password') as { value: string } | undefined
  if (!stored) {
    // 首次设置仅允许本机请求，禁止公开部署时被远程抢占。
    const host = getRequestURL(event).hostname
    const setupSecret = event.context.cloudflare?.env?.ADMIN_SETUP_TOKEN || event.context._platform?.cloudflare?.env?.ADMIN_SETUP_TOKEN as string | undefined
    const supplied = typeof body.setupToken === 'string' ? body.setupToken : ''
    const authorizedSetup = setupSecret && supplied.length >= 32 && createHash('sha256').update(supplied).digest('hex') === createHash('sha256').update(setupSecret).digest('hex')
    const localSetup = ['localhost', '127.0.0.1', '[::1]'].includes(host) && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip)
    if (!localSetup && !authorizedSetup) throw createError({ statusCode: 403, statusMessage: '请在服务器本机初始化，或提供部署时生成的初始化密钥' })
    db.prepare('INSERT INTO config VALUES (?, ?)').run('password', hashPassword(body.password))
  } else if (!verifyPassword(body.password, stored.value)) throw createError({ statusCode: 401, statusMessage: '密码不正确' })
  attempts.delete(ip)
  startSession(event)
  return { authenticated: true }
})
