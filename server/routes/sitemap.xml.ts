import { publicBases, publishedContent } from '../utils/workspace'

interface SitemapEntry {
  loc: string
  lastmod: string
  changefreq: string
  priority: string
}

/** 转义 XML 文本节点。
 * @param value 原始文本。
 * @returns XML 安全文本。
 * @throws 无。
 */
function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]!))
}

/** 将时间转换为 sitemap 可用的 ISO 字符串。
 * @param value 原始时间。
 * @returns ISO 时间；无效值回退到当前时间。
 * @throws 无。
 */
function isoDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

/** 输出公开页面、文章与知识库目录的 sitemap。
 * @param event 当前 H3 请求事件。
 * @returns XML 格式的 sitemap。
 * @throws 非 GET/HEAD 请求返回 405；数据库读取失败时返回错误。
 */
export default defineEventHandler(event => {
  if (event.method !== 'GET' && event.method !== 'HEAD') throw createError({ statusCode: 405 })
  const config = useRuntimeConfig(event)
  const base = String(config.public.siteUrl || '').replace(/\/+$/, '')
  const now = new Date().toISOString()
  const knowledgeBases = publicBases()
  const entries: SitemapEntry[] = [
    { loc: `${base}/`, lastmod: now, changefreq: 'weekly', priority: '1.0' },
    { loc: `${base}/articles`, lastmod: now, changefreq: 'daily', priority: '0.9' },
    { loc: `${base}/projects`, lastmod: now, changefreq: 'monthly', priority: '0.6' },
    { loc: `${base}/about`, lastmod: now, changefreq: 'monthly', priority: '0.6' },
  ]

  // 无公开知识库时保留入口；有目录时仅提交带 canonical collection 参数的地址。
  if (!knowledgeBases.length) {
    entries.push({ loc: `${base}/garden`, lastmod: now, changefreq: 'weekly', priority: '0.8' })
  }

  for (const item of publishedContent()) {
    entries.push({
      loc: `${base}/articles/${encodeURIComponent(item.slug)}`,
      lastmod: isoDate(item.publishedAt),
      changefreq: 'monthly',
      priority: '0.8',
    })
  }

  for (const knowledge of knowledgeBases) {
    const collection = new URL(`${base}/garden`)
    collection.searchParams.set('collection', knowledge.slug)
    entries.push({ loc: collection.toString(), lastmod: isoDate(knowledge.updatedAt), changefreq: 'weekly', priority: '0.7' })
  }

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=86400')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(entry => `<url><loc>${escapeXml(entry.loc)}</loc><lastmod>${entry.lastmod}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`).join('')}</urlset>`
})
