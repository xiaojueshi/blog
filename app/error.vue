<script setup lang="ts">
defineProps<{ error: { statusCode?: number; statusMessage?: string } }>()
function retry() { window.location.reload() }
useSeoMeta({ title: '页面暂不可用 — XIAOJUESHI', robots: 'noindex, nofollow' })
</script>
<template><div><SiteHeader /><main id="main" class="shell inner-page error-page"><div class="page-eyebrow">{{ error.statusCode || 500 }} / A LITTLE DETOUR</div><h1 class="page-title">页面暂不可用</h1><p class="page-description">{{ error.statusCode === 404 ? '内容可能尚未公开，或者链接已经改变。' : '页面加载失败，请检查网络后重试。' }}</p><div class="loading-inline"><button v-if="error.statusCode !== 404" class="button button-dark" @click="retry">重新加载</button><button class="button button-outline" @click="clearError({ redirect: '/' })">回到首页 ↗</button></div></main><SiteFooter /></div></template>
