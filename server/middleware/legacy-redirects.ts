import { legacyRedirectTarget } from '../utils/legacy-redirects'

/** 将旧站地址永久重定向到当前页面，并保留查询参数。
 * @param event 当前 H3 请求事件。
 * @returns 重定向响应；非旧站地址返回空值继续处理。
 * @throws 无。
 */
export default defineEventHandler(event => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return
  const url = getRequestURL(event)
  const target = legacyRedirectTarget(url.pathname)
  if (!target) return
  return sendRedirect(event, `${target}${url.search}`, 301)
})
