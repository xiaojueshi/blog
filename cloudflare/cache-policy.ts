/** 判断路径是否属于可公开缓存的页面或 SEO 文件。
 * @param pathname 请求路径。
 * @returns 可以进入边缘缓存时返回 true。
 * @throws 无。
 */
export function isPublicCacheablePath(pathname: string): boolean {
  return pathname === '/'
    || pathname === '/articles'
    || pathname.startsWith('/articles/')
    || pathname === '/garden'
    || pathname === '/projects'
    || pathname === '/about'
    || pathname === '/rss.xml'
    || pathname === '/sitemap.xml'
}

/** 判断响应是否允许写入边缘缓存。
 * @param response 源站响应。
 * @returns 允许缓存时返回 true。
 * @throws 无。
 */
export function isCacheableResponse(response: Response): boolean {
  const cacheControl = response.headers.get('cache-control') || ''
  return response.ok
    && !response.headers.has('set-cookie')
    && /\bpublic\b/i.test(cacheControl)
    && !/\bno-store\b/i.test(cacheControl)
}
