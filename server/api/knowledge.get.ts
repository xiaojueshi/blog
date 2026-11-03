import { publicBases } from '../utils/workspace'
import { renderContentHtml } from '../utils/markdown'
/** 获取经过权限过滤的知识库目录。
 * @param event 当前请求。
 * @returns 带服务端渲染正文的公开知识库。
 * @throws 数据库失败时返回错误。
 */
export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
  const bases = publicBases()
  if (getQuery(event).html !== '1') return bases
  return Promise.all(bases.map(async base => ({
    ...base,
    entries: await Promise.all(base.entries.map(async entry => ({ ...entry, html: await renderContentHtml(entry.body) }))),
  })))
})
