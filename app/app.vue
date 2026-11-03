<script setup lang="ts">
const ready = ref(false)
const { data: site } = await useSiteWorkspace()
const { selection, isDark } = useTheme()
const siteUrl = useSiteUrl()
const siteTitle = computed(() => site.value?.settings.seoTitle || 'XIAOJUESHI')
const siteDescription = computed(() => site.value?.settings.description || 'xiaojueshi 的个人博客，分享技术实践、学习笔记与日常。')
const structuredData = computed(() => ({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${siteUrl.value}/#website`, url: `${siteUrl.value}/`, name: site.value?.settings.name || 'XIAOJUESHI', description: siteDescription.value, inLanguage: 'zh-CN' },
    { '@type': 'Person', '@id': `${siteUrl.value}/#person`, name: 'xiaojueshi', url: `${siteUrl.value}/about`, ...(site.value?.settings.github ? { sameAs: [site.value.settings.github] } : {}) },
  ],
}))
useHead(() => ({
  htmlAttrs: { 'data-theme': selection.value, 'data-code-wrap': String(site.value?.settings.codeWrap || false) },
  meta: [{ name: 'theme-color', content: isDark.value ? '#171717' : '#ffffff' }],
  link: [{ rel: 'alternate', type: 'application/rss+xml', title: 'XIAOJUESHI RSS', href: `${siteUrl.value}/rss.xml` }],
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(structuredData.value).replace(/</g, '\\u003c') }],
}))
useSeoMeta({
  title: siteTitle,
  description: siteDescription,
  ogTitle: siteTitle,
  ogDescription: siteDescription,
  ogType: 'website',
  ogUrl: () => `${siteUrl.value}/`,
  ogSiteName: 'XIAOJUESHI',
  ogImage: () => `${siteUrl.value}/og-cover.png`,
  twitterCard: 'summary_large_image',
  twitterTitle: siteTitle,
  twitterDescription: siteDescription,
  twitterImage: () => `${siteUrl.value}/og-cover.png`,
})
onMounted(() => { ready.value = true })
</script>
<template><div :data-app-ready="ready"><NuxtRouteAnnouncer /><NuxtPage /></div></template>
