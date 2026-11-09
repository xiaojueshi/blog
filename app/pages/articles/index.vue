<script setup lang="ts">
import { Search, ArrowUpRight } from 'lucide-vue-next'
const route = useRoute()
const q = ref('')
const category = ref('')
const { data: items, error, status: loadStatus, refresh } = await useFetch('/api/content', { lazy: true })
if (import.meta.server && error.value) {
  setResponseStatus(503)
  useResponseHeader('cache-control').value = 'no-store'
  useResponseHeader('cdn-cache-control').value = 'no-store'
}
const loading = computed(() => loadStatus.value === 'idle' || loadStatus.value === 'pending')
const categories = computed(() => [...new Set(items.value?.map(a => a.category).filter(Boolean) || [])])
const { searchContent } = await import('#shared/content')
const filtered = computed(() => searchContent(items.value || [], q.value, category.value))
const searchInput = ref<HTMLInputElement>()
onMounted(() => { if (route.query.focus === 'search') searchInput.value?.focus() })
usePageSeo({ title: '文章与随笔 — XIAOJUESHI', description: '浏览 xiaojueshi 的文章与随笔，涵盖 Vue、TypeScript、Cloudflare、学习笔记与日常观察。', path: '/articles' })
</script>
<template><div><SiteHeader /><main id="main" class="shell inner-page"><div class="page-eyebrow">THE WRITING DESK / 文字记录</div><h1 class="page-title">文章与随笔</h1><p class="page-description">技术实践、学习笔记与日常记录。</p><div class="filter-bar"><div class="category-tabs" aria-label="分类筛选"><button :class="{ active: !category }" @click="category = ''">全部 <span v-if="!loading && !error">{{ items?.length || 0 }}</span></button><button v-for="cat in categories" :key="cat" :class="{ active: category === cat }" @click="category = cat">{{ cat }}</button></div><label class="search-field"><Search :size="17" /><input ref="searchInput" v-model="q" type="search" placeholder="搜索记录…" aria-label="搜索文章" /></label></div><p v-if="!loading && !error" class="search-results" aria-live="polite">{{ q || category ? `找到 ${filtered.length} 篇记录` : '按发布时间排序' }}</p><LoadingSkeleton v-if="loading" variant="article-list" label="正在加载文章" /><div v-else-if="error" class="empty-state" role="alert">文章加载失败。 <button class="text-link" @click="refresh()">重新加载</button></div><template v-else><ArticleRow v-for="item in filtered" :key="item.id" :item="item" /><div v-if="!filtered.length" class="empty-state"><Search :size="28" /><h2>暂时没有找到记录</h2><p>换一个关键词，或看看其他分类。</p><button class="text-link" @click="q = ''; category = ''">查看全部记录 <ArrowUpRight :size="16" /></button></div></template></main><SiteFooter /></div></template>
