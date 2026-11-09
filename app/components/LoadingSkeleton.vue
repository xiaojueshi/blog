<script setup lang="ts">
withDefaults(defineProps<{
  variant: 'article-list' | 'article' | 'featured' | 'home-knowledge' | 'knowledge' | 'admin-content' | 'admin-knowledge' | 'assets'
  label?: string
}>(), { label: '正在加载内容' })

const slow = ref(false)
let slowTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => { slowTimer = setTimeout(() => { slow.value = true }, 10000) })
onBeforeUnmount(() => clearTimeout(slowTimer))
</script>

<template>
  <span class="loading-sr-only" role="status" aria-live="polite">{{ slow ? '加载较慢，请稍候或检查网络。' : label }}</span>
  <div class="loading-skeleton" :data-skeleton="variant" aria-busy="true">
    <div v-if="variant === 'article-list'" class="skeleton-article-list" aria-hidden="true">
      <div v-for="row in 4" :key="row" class="article-row skeleton-article-row">
        <div class="skeleton-stack">
          <span class="skeleton-block skeleton-meta" />
          <span class="skeleton-block skeleton-row-title" />
          <span class="skeleton-block skeleton-row-summary" />
          <span class="skeleton-block skeleton-tags" />
        </div>
        <span class="skeleton-block skeleton-reading-time" />
      </div>
    </div>
    <div v-else-if="variant === 'featured'" class="featured-card skeleton-featured" aria-hidden="true">
      <div class="featured-copy skeleton-stack">
        <span class="skeleton-block skeleton-meta" />
        <span class="skeleton-block skeleton-featured-title" />
        <span class="skeleton-block skeleton-row-summary" />
        <span class="skeleton-block skeleton-row-summary short" />
        <span class="skeleton-block skeleton-tags" />
      </div>
      <div class="featured-art skeleton-featured-art"><span class="skeleton-featured-frame" /></div>
    </div>
    <div v-else-if="variant === 'home-knowledge'" class="garden-grid" aria-hidden="true">
      <div v-for="card in 3" :key="card" class="garden-card skeleton-card">
        <span class="skeleton-block skeleton-card-icon" />
        <span class="skeleton-block skeleton-card-title" />
        <span class="skeleton-block skeleton-card-line" />
        <span class="skeleton-block skeleton-card-line short" />
        <span class="skeleton-block skeleton-card-meta" />
      </div>
    </div>
    <div v-else-if="variant === 'article'" class="reading-layout skeleton-reading" aria-hidden="true">
      <article class="skeleton-stack">
        <span class="skeleton-block skeleton-meta" />
        <span class="skeleton-block skeleton-heading" />
        <span class="skeleton-block skeleton-heading short" />
        <span class="skeleton-block skeleton-intro" />
        <div class="reading-rule" />
        <div v-for="paragraph in 3" :key="paragraph" class="skeleton-paragraph">
          <span class="skeleton-block" /><span class="skeleton-block" /><span class="skeleton-block short" />
        </div>
      </article>
      <aside class="article-toc skeleton-toc"><span class="skeleton-block" /><span class="skeleton-block" /><span class="skeleton-block short" /></aside>
    </div>
    <div v-else-if="variant === 'knowledge'" class="public-knowledge-layout skeleton-knowledge" aria-hidden="true">
      <aside class="public-knowledge-sidebar skeleton-toc"><span class="skeleton-block skeleton-card-title" /><span v-for="row in 6" :key="row" class="skeleton-block" /></aside>
      <div class="skeleton-stack"><span class="skeleton-block skeleton-meta" /><span class="skeleton-block skeleton-heading" /><span class="skeleton-block skeleton-intro" /><div class="reading-rule" /><div v-for="row in 4" :key="row" class="skeleton-paragraph"><span class="skeleton-block" /><span class="skeleton-block short" /></div></div>
    </div>
    <div v-else-if="variant === 'admin-content'" class="workspace-content-list" aria-hidden="true">
      <div v-for="row in 5" :key="row" class="workspace-content-row skeleton-workspace-row"><span class="skeleton-block skeleton-record-icon" /><div class="skeleton-stack"><span class="skeleton-block skeleton-row-title" /><span class="skeleton-block skeleton-meta" /></div><span class="skeleton-block skeleton-badge" /></div>
    </div>
    <div v-else-if="variant === 'admin-knowledge'" class="knowledge-admin-grid" aria-hidden="true">
      <div v-for="card in 4" :key="card" class="knowledge-admin-card skeleton-card"><span class="skeleton-block skeleton-card-icon" /><span class="skeleton-block skeleton-card-title" /><span class="skeleton-block skeleton-card-line" /><span class="skeleton-block skeleton-card-line short" /><span class="skeleton-block skeleton-card-meta" /></div>
    </div>
    <div v-else class="asset-grid" aria-hidden="true">
      <div v-for="card in 6" :key="card" class="asset-card"><div class="asset-preview skeleton-asset-preview" /><div class="asset-info skeleton-stack"><span class="skeleton-block skeleton-meta" /><span class="skeleton-block skeleton-card-title" /><span class="skeleton-block skeleton-card-line" /></div></div>
    </div>
    <p v-if="slow" class="skeleton-slow" aria-hidden="true">加载较慢，请稍候或检查网络。</p>
  </div>
</template>
