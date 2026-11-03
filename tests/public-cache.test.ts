import { describe, expect, it } from 'vitest'
import { isCacheableResponse, isPublicCacheablePath } from '../cloudflare/cache-policy'

describe('Cloudflare 公开边缘缓存策略', () => {
  it.each(['/', '/articles', '/articles/markdown-guide', '/garden', '/projects', '/about', '/rss.xml', '/sitemap.xml'])('允许缓存 %s', pathname => {
    expect(isPublicCacheablePath(pathname)).toBe(true)
  })

  it.each(['/admin', '/admin/write', '/api/content/markdown-guide', '/zh/blog', '/404'])('拒绝缓存非公开路径 %s', pathname => {
    expect(isPublicCacheablePath(pathname)).toBe(false)
  })

  it('只缓存成功且公开的响应', () => {
    const publicResponse = new Response('ok', { status: 200, headers: { 'cache-control': 'public, s-maxage=300' } })
    const privateResponse = new Response('private', { headers: { 'cache-control': 'private, no-store' } })
    const cookieResponse = new Response('ok', { headers: { 'cache-control': 'public', 'set-cookie': 'session=1' } })
    expect(isCacheableResponse(publicResponse)).toBe(true)
    expect(isCacheableResponse(privateResponse)).toBe(false)
    expect(isCacheableResponse(cookieResponse)).toBe(false)
  })
})
