import { AsyncLocalStorage } from 'node:async_hooks'
import app from '../.output/server/index.mjs'
import { isCacheableResponse, isPublicCacheablePath } from './cache-policy.ts'
const storageContext = new AsyncLocalStorage()
globalThis.__xjsStorageContext = storageContext

/** 复制响应并标记边缘缓存命中状态。
 * @param response 原始响应。
 * @param status 缓存状态。
 * @returns 带诊断标头的新响应。
 * @throws 无。
 */
function withCacheStatus(response, status) {
  const headers = new Headers(response.headers)
  headers.set('x-xjs-cache', status)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

/** 唯一工作台对象，使用 Cloudflare 托管 SQLite 保留同步事务。 */
export class Workspace {
  /** 绑定存储。@param ctx 对象上下文。@param env 环境绑定。@returns 对象实例。@throws 无。 */
  constructor(ctx, env) { this.ctx = ctx; this.env = env }
  /** 将请求转交 Nuxt SSR。@param request HTTP 请求。@returns HTTP 响应。@throws 应用处理失败。 */
  async fetch(request) {
    return storageContext.run(this.ctx.storage, () => app.fetch(request, this.env, { waitUntil: promise => this.ctx.waitUntil(promise), passThroughOnException() {} }))
  }
}
export default {
  /** 为公开 GET 响应提供边缘缓存，再路由到唯一持久化对象。
   * @param request HTTP 请求。
   * @param env 环境绑定。
   * @param ctx Worker 执行上下文。
   * @returns HTTP 响应。
   * @throws 存储不可用。
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const cacheable = request.method === 'GET' && isPublicCacheablePath(url.pathname)
    if (cacheable) {
      const hit = await caches.default.match(request)
      if (hit) return withCacheStatus(hit, 'HIT')
    }

    const response = await env.WORKSPACE.get(env.WORKSPACE.idFromName('xiaojueshi-main')).fetch(request)
    if (!cacheable || !isCacheableResponse(response)) return response

    const cacheResponse = withCacheStatus(response, 'MISS')
    ctx.waitUntil(caches.default.put(request, cacheResponse.clone()))
    return cacheResponse
  },
}
