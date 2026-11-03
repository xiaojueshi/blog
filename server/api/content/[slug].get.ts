import { publishedContent } from '../../utils/workspace'
import { renderContentHtml } from '../../utils/markdown'
/** 处理当前路由请求并执行相应的权限与数据规则。
 * @param event 当前 H3 请求事件。
 * @returns 公开内容及其服务端渲染 HTML。
 * @throws 参数无效、权限不足或存储失败时返回相应错误。
 */
export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
  const item = publishedContent().find(p => p.slug === getRouterParam(event, 'slug'))
  if (!item) throw createError({ statusCode: 404, statusMessage: '内容不存在或未公开' })
  return { ...item, html: await renderContentHtml(item.body) }
})
