import { resolve } from 'node:path'
const cloudflare = process.env.DEPLOY_TARGET === 'cloudflare'
const securityHeaders = {
  'strict-transport-security': 'max-age=31536000',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
}
const publicPageHeaders = {
  ...securityHeaders,
  // 让回访优先使用浏览器缓存，同时把边缘缓存窗口延长到 10 分钟。
  'cache-control': 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400',
  'cdn-cache-control': 'public, s-maxage=600, stale-while-revalidate=86400',
}
export default defineNuxtConfig({
  compatibilityDate: '2026-10-24',
  buildDir: process.env.NUXT_BUILD_DIR || '.nuxt',
  devtools: { enabled: false },
  vite: { optimizeDeps: { include: ['lucide-vue-next', 'codemirror', '@codemirror/view', '@codemirror/lang-markdown', 'mermaid', 'unified', 'remark-parse', 'remark-gfm', 'remark-math', 'remark-rehype', 'rehype-sanitize', 'rehype-katex', 'rehype-highlight', 'rehype-stringify'] } },
  css: ['~/assets/main.css', '~/assets/workspace.css', '~/assets/theme.css'],
  app: { head: { htmlAttrs: { lang: 'zh-CN' }, title: 'XIAOJUESHI — 永远相信美好的事情即将发生', meta: [{ name: 'description', content: 'xiaojueshi 的个人博客，分享技术实践、学习笔记与日常。' }], link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }] } },
  runtimeConfig: { public: { siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://www.xiaojueshi.top' } },
  nitro: { preset: cloudflare ? 'cloudflare_module' : 'node-server', ...(cloudflare ? { rollupConfig: { plugins: [{ name: 'workspace-cloudflare-storage', resolveId(source: string) { if (source === './storage-driver') return resolve('cloudflare/storage-driver.ts') } }] }, externals: { inline: [resolve('cloudflare')] } } : { externals: { external: ['node:sqlite'] } }) },
  routeRules: {
    '/**': { headers: securityHeaders },
    '/': { headers: publicPageHeaders },
    '/articles': { headers: publicPageHeaders },
    '/articles/**': { headers: publicPageHeaders },
    '/garden': { headers: publicPageHeaders },
    '/projects': { headers: publicPageHeaders },
    '/about': { headers: publicPageHeaders },
    '/rss.xml': { headers: { ...securityHeaders, 'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400', 'cdn-cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    '/sitemap.xml': { headers: { ...securityHeaders, 'cache-control': 'public, max-age=3600, s-maxage=86400', 'cdn-cache-control': 'public, s-maxage=86400' } },
    '/admin': { headers: { ...securityHeaders, 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' } },
    '/admin/**': { headers: { ...securityHeaders, 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' } },
    '/api/admin/**': { headers: { ...securityHeaders, 'cache-control': 'private, no-store' } },
    '/api/agent/**': { headers: { ...securityHeaders, 'cache-control': 'private, no-store' } },
    '/api/auth': { headers: { ...securityHeaders, 'cache-control': 'private, no-store' } },
    '/api/auth/**': { headers: { ...securityHeaders, 'cache-control': 'private, no-store' } },
  },
  typescript: { strict: true },
})
