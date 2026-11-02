<script setup lang="ts">
import { ArrowLeft, ArrowUpRight } from 'lucide-vue-next'
const route = useRoute()
const { data: site } = useNuxtData<{ settings: { showReadingTime: boolean } }>('site-workspace')
const { data: item, error } = await useFetch(`/api/content/${encodeURIComponent(String(route.params.slug))}`)
if (error.value || !item.value) throw createError({ statusCode: 404, statusMessage: '这篇内容还没有公开', fatal: true })
useSeoMeta({ title: () => `${item.value?.title} — XIAOJUESHI`, description: () => item.value?.summary })
const headings = computed(() => item.value?.body.split('\n').filter(l => /^## /.test(l)).map(l => l.replace(/^## /, '')) || [])
function scrollHeading(text: string) { const el = [...document.querySelectorAll('.prose h2')].find(e => e.textContent === text); el?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }) }
</script>
<template><div><SiteHeader /><main v-if="item" id="main" class="shell reading-page"><NuxtLink to="/articles" class="text-link back-link"><ArrowLeft :size="15" /> 返回全部记录</NuxtLink><div class="reading-layout"><article><div class="article-meta"><span>{{ item.category }}</span><span>·</span><time>{{ item.publishedAt.slice(0,10) }}</time><template v-if="site?.settings.showReadingTime !== false"><span>·</span><span>{{ Math.max(1, Math.ceil(item.body.length / 400)) }} 分钟阅读</span></template></div><h1 class="article-title">{{ item.title }}</h1><p class="article-intro">{{ item.summary }}</p><div class="article-tags"><span v-for="tag in item.tags" :key="tag"># {{ tag }}</span></div><div class="reading-rule" /><MarkdownBody :source="item.body.replace(/^# .*\n+/, '')" /><div class="article-end"><span>感谢阅读，愿你有所收获。</span><NuxtLink to="/articles" class="text-link">继续探索 <ArrowUpRight :size="16" /></NuxtLink></div></article><aside v-if="headings.length" class="article-toc"><p>ON THIS PAGE / 本文目录</p><button v-for="heading in headings" :key="heading" @click="scrollHeading(heading)">{{ heading }}</button></aside></div></main><SiteFooter /></div></template>
