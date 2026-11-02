<script setup lang="ts">
const ready = ref(false)
const { data: site } = await useSiteWorkspace()
const { selection, isDark } = useTheme()
useHead(() => ({ htmlAttrs: { 'data-theme': selection.value, 'data-code-wrap': String(site.value?.settings.codeWrap || false) }, meta: [{ name: 'theme-color', content: isDark.value ? '#171717' : '#ffffff' }] }))
useSeoMeta({ title: () => site.value?.settings.seoTitle || 'XIAOJUESHI', description: () => site.value?.settings.description })
onMounted(() => { ready.value = true })
</script>
<template><div :data-app-ready="ready"><NuxtRouteAnnouncer /><NuxtPage /></div></template>
