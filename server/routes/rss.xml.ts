import { publishedContent, workspace } from '../utils/workspace'
/** 处理当前路由请求并执行相应的权限与数据规则。
 * @param event 当前 H3 请求事件。
 * @returns 当前接口的响应数据。
 * @throws 非 GET/HEAD 请求返回 405；存储失败时返回相应错误。
 */
export default defineEventHandler(event => {
  if (event.method !== 'GET' && event.method !== 'HEAD') throw createError({ statusCode: 405 })
  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400')
  const configured = String(useRuntimeConfig(event).public.siteUrl || '').replace(/\/+$/, '')
  const base = configured || getRequestURL(event).origin
  const escape = (s: string) => s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!))
  const items = publishedContent()
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escape(workspace().settings.name)}</title><link>${escape(base)}</link><description>构建，也思考。</description>${items.map(p => `<item><title>${escape(p.title)}</title><link>${escape(base)}/articles/${encodeURIComponent(p.slug)}</link><guid>${escape(base)}/articles/${encodeURIComponent(p.slug)}</guid><description>${escape(p.summary)}</description><pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`
})
