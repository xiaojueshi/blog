/** 将 HTTP 与非 www 的公开主机请求永久重定向到规范站点。
 * @param event 当前 H3 请求事件。
 * @returns 重定向响应；规范请求返回空值继续处理。
 * @throws 无。
 */
export default defineEventHandler(event => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return
  const url = getRequestURL(event)
  const target = new URL(String(useRuntimeConfig(event).public.siteUrl || ''))
  const forwardedHost = getRequestHeader(event, 'x-forwarded-host')
  const host = (forwardedHost || getRequestHeader(event, 'host') || url.host).split(',')[0].trim().split(':')[0]
  const forwardedProto = getRequestHeader(event, 'x-forwarded-proto')
  const proto = (forwardedProto || url.protocol.replace(':', '')).split(',')[0].trim().toLowerCase()
  if (host !== 'xiaojueshi.top' && host !== target.hostname) return
  if (host === target.hostname && proto === target.protocol.replace(':', '')) return
  return sendRedirect(event, `${target.origin}${url.pathname}${url.search}`, 301)
})
