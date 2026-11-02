import { AsyncLocalStorage } from 'node:async_hooks'
import app from '../.output/server/index.mjs'
const storageContext = new AsyncLocalStorage()
globalThis.__xjsStorageContext = storageContext
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
  /** 路由到唯一持久化对象。@param request HTTP 请求。@param env 环境绑定。@returns HTTP 响应。@throws 存储不可用。 */
  fetch(request, env) {
    return env.WORKSPACE.get(env.WORKSPACE.idFromName('xiaojueshi-main')).fetch(request)
  },
}
