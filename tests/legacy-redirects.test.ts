import { describe, expect, it } from 'vitest'
import { legacyRedirectTarget } from '../server/utils/legacy-redirects'

describe('旧 Astro 地址 301 映射', () => {
  it.each([
    ['/zh/', '/'],
    ['/zh', '/'],
    ['/blog/', '/articles'],
    ['/blog', '/articles'],
    ['/zh/blog/', '/articles'],
    ['/zh/blog', '/articles'],
    ['/zh/blog/markdown-style-guide/', '/articles/markdown-guide'],
    ['/zh/blog/markdown-style-guide', '/articles/markdown-guide'],
  ])('%s 映射到 %s', (source, target) => {
    expect(legacyRedirectTarget(source)).toBe(target)
  })

  it.each(['/', '/articles', '/articles/markdown-guide', '/zh/blog/other'])('不改写当前或未知路径 %s', source => {
    expect(legacyRedirectTarget(source)).toBeNull()
  })
})
