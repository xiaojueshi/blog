<script setup lang="ts">
import { ArrowUpRight, Menu, X, Search } from 'lucide-vue-next'
const { data: site } = useNuxtData<{ settings: { name: string; github: string } }>('site-workspace')
const open = ref(false)
const route = useRoute()
watch(() => route.path, () => { open.value = false })
</script>
<template>
  <a href="#main" class="skip-link">跳到主要内容</a>
  <header class="site-header shell">
    <NuxtLink to="/" class="wordmark" aria-label="XIAOJUESHI 首页"><span>{{ site?.settings.name || 'XIAOJUESHI' }}</span></NuxtLink>
    <nav class="desktop-nav" aria-label="主导航"><NuxtLink to="/articles">文章<span class="nav-dot" /></NuxtLink><NuxtLink to="/garden" :prefetch="false">知识库</NuxtLink><NuxtLink to="/projects">项目</NuxtLink><NuxtLink to="/about">关于</NuxtLink></nav>
    <div class="header-tools"><ThemePicker /><NuxtLink to="/articles?focus=search" aria-label="搜索内容" class="icon-button"><Search :size="18" /></NuxtLink><span class="tool-divider" /><a :href="site?.settings.github || 'https://github.com/xiaojueshi'" target="_blank" rel="noopener noreferrer" class="github-link">GitHub <ArrowUpRight :size="14" /></a><button class="icon-button mobile-menu" :aria-expanded="open" aria-controls="mobile-nav" :aria-label="open ? '收起导航' : '展开导航'" @click="open = !open"><X v-if="open" :size="20" /><Menu v-else :size="20" /></button></div>
    <nav v-if="open" id="mobile-nav" class="mobile-nav" aria-label="移动导航"><NuxtLink to="/articles">文章</NuxtLink><NuxtLink to="/garden" :prefetch="false">知识库</NuxtLink><NuxtLink to="/projects">项目</NuxtLink><NuxtLink to="/about">关于</NuxtLink><NuxtLink to="/admin" :prefetch="false">内容工作台 <ArrowUpRight :size="16" /></NuxtLink></nav>
  </header>
</template>
