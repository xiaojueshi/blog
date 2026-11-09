<script setup lang="ts">
import { ArrowLeft, ArrowUpRight } from 'lucide-vue-next'
import 'katex/dist/katex.min.css'
import type { PublishedContent } from '#shared/content'
interface ArticleView extends PublishedContent { html: string }
const route = useRoute()
const slug = String(route.params.slug || '')
const { data: site } = useNuxtData<{ settings: { showReadingTime: boolean } }>('site-workspace')
const { data: item, error, status: loadStatus, refresh } = await useFetch<ArticleView>(`/api/content/${encodeURIComponent(slug)}`, { immediate: Boolean(slug), lazy: true })
const loading = computed(() => loadStatus.value === 'idle' || loadStatus.value === 'pending')
// 服务端保留真实状态码；客户端在骨架消失后就地显示错误。
if (import.meta.server && error.value) {
  const missing = error.value.statusCode === 404
  if (!missing) {
    useResponseHeader('cache-control').value = 'no-store'
    useResponseHeader('cdn-cache-control').value = 'no-store'
  }
  throw createError({ statusCode: missing ? 404 : 503, message: missing ? '这篇内容还没有公开' : '内容暂时无法加载', fatal: true })
}
if (import.meta.server && !item.value) throw createError({ statusCode: 404, message: '这篇内容还没有公开', fatal: true })
const siteUrl = useSiteUrl()
const bodySource = computed(() => item.value?.body.replace(/^# .*\n+/, '') || '')
const canonicalPath = computed(() => `/articles/${encodeURIComponent(item.value?.slug || String(route.params.slug))}`)
const articleJsonLd = computed(() => {
  if (!item.value) return undefined
  const url = `${siteUrl.value}${canonicalPath.value}`
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: item.value.title,
      description: item.value.summary,
      datePublished: item.value.publishedAt,
      dateModified: item.value.publishedAt,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      author: { '@type': 'Person', name: 'xiaojueshi', url: `${siteUrl.value}/about` },
      publisher: { '@type': 'Organization', name: 'XIAOJUESHI', url: `${siteUrl.value}/` },
      image: [`${siteUrl.value}/og-cover.png`],
      articleSection: item.value.category,
      keywords: item.value.tags.join(', '),
      inLanguage: 'zh-CN',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: `${siteUrl.value}/` },
        { '@type': 'ListItem', position: 2, name: '文章', item: `${siteUrl.value}/articles` },
        { '@type': 'ListItem', position: 3, name: item.value.title, item: url },
      ],
    },
  ]
})
usePageSeo({
  title: () => item.value ? `${item.value.title} — XIAOJUESHI` : error.value ? '页面暂不可用 — XIAOJUESHI' : '正在加载文章 — XIAOJUESHI',
  description: () => item.value?.summary || '',
  path: canonicalPath,
  type: 'article',
  publishedAt: () => item.value?.publishedAt,
  updatedAt: () => item.value?.publishedAt,
  tags: () => item.value?.tags,
  jsonLd: articleJsonLd,
})
const headings = computed(() => item.value?.body.split('\n').filter(l => /^## /.test(l)).map(l => l.replace(/^## /, '')) || [])
function scrollHeading(text: string) { const el = [...document.querySelectorAll('.prose h2')].find(e => e.textContent === text); el?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }) }
</script>
<template><div><SiteHeader /><main v-if="loading" id="main" class="shell reading-page"><NuxtLink to="/articles" class="text-link back-link"><ArrowLeft :size="15" /> 返回全部记录</NuxtLink><LoadingSkeleton variant="article" label="正在加载文章正文" /></main><main v-else-if="error || !item" id="main" class="shell inner-page error-page"><h1 class="page-title">页面暂不可用</h1><p class="page-description">{{ error?.statusCode === 404 ? '内容可能尚未公开，或者链接已经改变。' : '页面加载失败，请检查网络后重试。' }}</p><div class="loading-inline"><button v-if="error?.statusCode !== 404" class="button button-dark" @click="refresh()">重新加载</button><NuxtLink to="/articles" class="button button-outline">返回文章列表</NuxtLink></div></main><main v-else id="main" class="shell reading-page"><NuxtLink to="/articles" class="text-link back-link"><ArrowLeft :size="15" /> 返回全部记录</NuxtLink><div class="reading-layout"><article><div class="article-meta"><span>{{ item.category }}</span><span>·</span><time>{{ item.publishedAt.slice(0,10) }}</time><template v-if="site?.settings.showReadingTime !== false"><span>·</span><span>{{ Math.max(1, Math.ceil(item.body.length / 400)) }} 分钟阅读</span></template></div><h1 class="article-title">{{ item.title }}</h1><p class="article-intro">{{ item.summary }}</p><div class="article-tags"><span v-for="tag in item.tags" :key="tag"># {{ tag }}</span></div><div class="reading-rule" /><MarkdownBody :source="bodySource" :initial-html="item.html" /><div class="article-end"><span>感谢阅读，愿你有所收获。</span><NuxtLink to="/articles" class="text-link">继续探索 <ArrowUpRight :size="16" /></NuxtLink></div></article><aside v-if="headings.length" class="article-toc"><p>ON THIS PAGE / 本文目录</p><button v-for="heading in headings" :key="heading" @click="scrollHeading(heading)">{{ heading }}</button></aside></div></main><SiteFooter /></div></template>
