<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import type { PublishedContent } from '#shared/content'
defineProps<{ item: PublishedContent; compact?: boolean }>()
const { data: site } = useNuxtData<{ settings: { showReadingTime: boolean }; terms: { id: string; name: string }[] }>('site-workspace')
const label = { article: '文章', thought: '随笔', note: '笔记' }
</script>
<template><NuxtLink :to="`/articles/${item.slug}`" class="article-row" :class="{ compact }"><div class="article-row-main"><div class="article-meta"><span>{{ item.category || site?.terms.find(t => t.id === item.kind)?.name || label[item.kind] }}</span><span class="meta-dot">·</span><time :datetime="item.publishedAt">{{ item.publishedAt.slice(0,10).replaceAll('-', '.') }}</time><span v-if="item.kind === 'thought'" class="kind-badge">随笔</span></div><h3>{{ item.title }} <ArrowUpRight :size="20" class="row-arrow" /></h3><p v-if="!compact">{{ item.summary }}</p><div v-if="!compact" class="article-tags"><span v-for="tag in item.tags" :key="tag"># {{ tag }}</span></div></div><span v-if="site?.settings.showReadingTime !== false" class="reading-time">{{ Math.max(1, Math.ceil(item.body.length / 400)) }} 分钟阅读</span></NuxtLink></template>
