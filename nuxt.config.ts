import { resolve } from 'node:path'
const cloudflare = process.env.DEPLOY_TARGET === 'cloudflare'
export default defineNuxtConfig({
  compatibilityDate: '2026-10-24',
  buildDir: process.env.NUXT_BUILD_DIR || '.nuxt',
  devtools: { enabled: false },
  vite: { optimizeDeps: { include: ['lucide-vue-next', 'codemirror', '@codemirror/view', '@codemirror/lang-markdown', 'mermaid', 'unified', 'remark-parse', 'remark-gfm', 'remark-math', 'remark-rehype', 'rehype-sanitize', 'rehype-katex', 'rehype-highlight', 'rehype-stringify'] } },
  css: ['~/assets/main.css', '~/assets/workspace.css', '~/assets/theme.css', 'katex/dist/katex.min.css'],
  app: { head: { htmlAttrs: { lang: 'zh-CN' }, title: 'XIAOJUESHI — 永远相信美好的事情即将发生', meta: [{ name: 'description', content: 'xiaojueshi 的个人博客，分享技术实践、学习笔记与日常。' }], link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }] } },
  nitro: { preset: cloudflare ? 'cloudflare_module' : 'node-server', ...(cloudflare ? { rollupConfig: { plugins: [{ name: 'workspace-cloudflare-storage', resolveId(source: string) { if (source === './storage-driver') return resolve('cloudflare/storage-driver.ts') } }] }, externals: { inline: [resolve('cloudflare')] } } : { externals: { external: ['node:sqlite'] } }) },
  routeRules: { '/admin': { headers: { 'cache-control': 'private, no-store' } }, '/admin/**': { headers: { 'cache-control': 'private, no-store' } } },
  typescript: { strict: true },
})
