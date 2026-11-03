<script setup lang="ts">
import { BookOpen, ArrowLeft, ArrowRight, ChevronRight, ListTree } from 'lucide-vue-next'
import 'katex/dist/katex.min.css'
import { flattenNodes } from '#shared/workspace'
import type { PublicKnowledgeBase } from '#shared/workspace'
import type { PublishedContent } from '#shared/content'
interface GardenEntry extends PublishedContent { html: string }
interface GardenBase extends PublicKnowledgeBase { entries: GardenEntry[] }
const route = useRoute(); const router = useRouter()
const { data: bases, error } = await useFetch<GardenBase[]>('/api/knowledge?html=1')
const base = computed(() => bases.value?.find(b => b.id === route.query.collection || b.slug === route.query.collection) || bases.value?.[0])
const nodes = computed(() => flattenNodes(base.value?.nodes || []))
const ordered = computed(() => nodes.value.filter(n => n.contentId))
const entryNode = computed(() => base.value?.nodes.find(n => n.id === route.query.entry && n.contentId))
const entry = computed(() => base.value?.entries.find(e => e.id === entryNode.value?.contentId))
const position = computed(() => ordered.value.findIndex(n => n.id === entryNode.value?.id))
const previous = computed(() => position.value > 0 ? ordered.value[position.value - 1] : null)
const next = computed(() => position.value >= 0 ? ordered.value[position.value + 1] : null)
const crumbs = computed(() => { const parents: string[] = []; let id = entryNode.value?.parentId; let depth = 0; while (id && depth++ < 21) { const parent = base.value?.nodes.find(n => n.id === id); if (!parent) break; parents.unshift(parent.title); id = parent.parentId } return parents })
const directory = ref<HTMLDetailsElement>(); watch(() => route.query.entry, () => { if (directory.value) directory.value.open = false })
function changeBase(event: Event) { void router.push({ query: { collection: (event.target as HTMLSelectElement).value } }) }
const siteUrl = useSiteUrl()
const canonicalPath = computed(() => {
  if (entry.value) return `/articles/${encodeURIComponent(entry.value.slug)}`
  if (!base.value) return '/garden'
  const params = new URLSearchParams({ collection: base.value.slug })
  return `/garden?${params.toString()}`
})
const gardenJsonLd = computed(() => {
  if (!base.value) return undefined
  const collectionUrl = `${siteUrl.value}/garden?collection=${encodeURIComponent(base.value.slug)}`
  if (!entry.value) return { '@context': 'https://schema.org', '@type': 'CollectionPage', name: base.value.title, description: base.value.description, url: collectionUrl, inLanguage: 'zh-CN' }
  const url = `${siteUrl.value}${canonicalPath.value}`
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: entry.value.title,
      description: entry.value.summary,
      datePublished: entry.value.publishedAt,
      dateModified: entry.value.publishedAt,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      author: { '@type': 'Person', name: 'xiaojueshi', url: `${siteUrl.value}/about` },
      publisher: { '@type': 'Organization', name: 'XIAOJUESHI', url: `${siteUrl.value}/` },
      image: [`${siteUrl.value}/og-cover.png`],
      articleSection: entry.value.category,
      keywords: entry.value.tags.join(', '),
      isPartOf: { '@type': 'CollectionPage', name: base.value.title, url: collectionUrl },
      inLanguage: 'zh-CN',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: `${siteUrl.value}/` },
        { '@type': 'ListItem', position: 2, name: '知识库', item: `${siteUrl.value}/garden` },
        { '@type': 'ListItem', position: 3, name: base.value.title, item: collectionUrl },
        { '@type': 'ListItem', position: 4, name: entry.value.title, item: url },
      ],
    },
  ]
})
usePageSeo({
  title: () => `${entry.value?.title || base.value?.title || '知识库'} — XIAOJUESHI`,
  description: () => entry.value?.summary || base.value?.description || '按章节整理的技术笔记与学习资料。',
  path: canonicalPath,
  jsonLd: gardenJsonLd,
})
</script>
<template><div><SiteHeader /><main id="main" class="shell public-knowledge-page"><div v-if="!bases?.length" class="empty-state"><BookOpen :size="30" /><h1>知识库</h1><p>{{ error ? '暂时无法加载，请稍后重试。' : '暂时没有公开知识库。' }}</p></div><div v-else-if="base" class="public-knowledge-layout"><aside class="public-knowledge-sidebar"><label class="knowledge-selector">知识库<select :value="base.slug" aria-label="选择知识库" @change="changeBase"><option v-for="collection in bases" :key="collection.id" :value="collection.slug">{{ collection.title }}</option></select></label><NuxtLink :to="{ path: '/garden', query: { collection: base.slug } }" class="knowledge-overview-link"><BookOpen :size="15" />概览</NuxtLink><KnowledgeTree :base="base" :active="entryNode?.id" /></aside><div class="knowledge-reading"><div class="knowledge-breadcrumb"><NuxtLink to="/garden">知识库</NuxtLink><ChevronRight :size="12" /><NuxtLink :to="{ query: { collection: base.slug } }">{{ base.title }}</NuxtLink><template v-for="crumb in crumbs" :key="crumb"><ChevronRight :size="12" /><span>{{ crumb }}</span></template></div><details ref="directory" class="knowledge-mobile-directory"><summary><ListTree :size="17" />目录 · {{ base.title }}</summary><label class="knowledge-selector">切换知识库<select :value="base.slug" aria-label="手机选择知识库" @change="changeBase"><option v-for="collection in bases" :key="collection.id" :value="collection.slug">{{ collection.title }}</option></select></label><KnowledgeTree :base="base" :active="entryNode?.id" /></details><article v-if="entry"><div class="article-meta"><span>{{ entry.category || '笔记' }}</span><span>·</span><time>{{ entry.publishedAt.slice(0,10) }}</time></div><h1 class="knowledge-entry-title">{{ entry.title }}</h1><p v-if="entry.summary" class="article-intro">{{ entry.summary }}</p><div class="article-tags"><span v-for="tag in entry.tags" :key="tag"># {{ tag }}</span></div><div class="reading-rule" /><MarkdownBody :key="entryNode?.id" :source="entry.body.replace(/^# .*\n+/, '')" :initial-html="entry.html" /><nav class="knowledge-pagination" aria-label="章节阅读导航"><NuxtLink v-if="previous" :to="{ query: { collection: base.slug, entry: previous.id } }"><span><ArrowLeft :size="14" />上一篇</span><strong>{{ previous.title }}</strong></NuxtLink><span v-else /><NuxtLink v-if="next" :to="{ query: { collection: base.slug, entry: next.id } }"><span>下一篇<ArrowRight :size="14" /></span><strong>{{ next.title }}</strong></NuxtLink></nav></article><section v-else class="knowledge-overview"><div class="page-eyebrow">KNOWLEDGE BASE</div><h1>{{ base.title }}</h1><p>{{ base.description }}</p><div class="knowledge-overview-meta">{{ base.items.length }} 项公开内容 · 按目录顺序阅读</div><div v-for="node in nodes" :key="node.id" class="knowledge-overview-node" :style="{ '--depth': node.depth }"><NuxtLink v-if="node.contentId" :to="{ query: { collection: base.slug, entry: node.id } }"><span>{{ node.title }}</span><ArrowRight :size="15" /></NuxtLink><h2 v-else>{{ node.title }}</h2></div><p v-if="!nodes.length" class="empty-state">暂无公开章节。</p></section></div></div></main><SiteFooter /></div></template>
