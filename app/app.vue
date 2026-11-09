<script setup lang="ts">
import { defineComponent, h, Transition } from 'vue'
const ready = ref(false)
// 独立渲染状态提示，避免加载状态变化使 NuxtPage 提前结束等待。
const NavigationLoading = defineComponent({
  setup() {
    const { isLoading, finish } = useLoadingIndicator({ throttle: 150, hideDelay: 150 })
    const nuxtApp = useNuxtApp()
    const router = useRouter()
    const pagePending = ref(false)
    const waiting = computed(() => isLoading.value || pagePending.value)
    const visible = ref(false)
    const loadingSlow = ref(false)
    const returnButton = ref<HTMLButtonElement | null>(null)
    let showTimer: ReturnType<typeof setTimeout> | undefined
    let slowTimer: ReturnType<typeof setTimeout> | undefined
    let previousPath = ''
    let previousFocus: HTMLElement | null = null
    let returning = false
    let removeGuard: (() => void) | undefined
    // 页面组件仍在等待数据时，不能仅凭路由加载事件结束提示。
    const unhooks = [
      nuxtApp.hook('page:start', () => { if (!nuxtApp.isHydrating) pagePending.value = true }),
      nuxtApp.hook('page:finish', () => { pagePending.value = false }),
      nuxtApp.hook('app:error', () => { pagePending.value = false }),
      nuxtApp.hook('vue:error', () => { pagePending.value = false }),
    ]
    onMounted(() => {
      removeGuard = router.beforeEach((to, from) => {
        if (!returning && to.fullPath !== from.fullPath) previousPath = from.fullPath
      })
    })
    watch(waiting, pending => {
      clearTimeout(showTimer); clearTimeout(slowTimer)
      loadingSlow.value = false
      if (pending) {
        showTimer = setTimeout(async () => {
          previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
          visible.value = true
          await nextTick()
          if (visible.value) returnButton.value?.focus()
        }, 200)
        slowTimer = setTimeout(() => { loadingSlow.value = true }, 10000)
      } else {
        visible.value = false
        if (previousFocus?.isConnected) previousFocus.focus()
        previousFocus = null
      }
    })
    async function returnToPrevious() {
      if (returning) return
      returning = true
      const destination = previousPath || '/'
      pagePending.value = false
      finish({ force: true })
      try { await router.replace(destination) }
      finally { returning = false }
    }
    function onKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); void returnToPrevious() }
      if (event.key === 'Tab') { event.preventDefault(); returnButton.value?.focus() }
    }
    onBeforeUnmount(() => { clearTimeout(showTimer); clearTimeout(slowTimer); removeGuard?.(); unhooks.forEach(unhook => unhook()) })
    return () => h(Transition, { name: 'navigation-loading' }, {
      default: () => visible.value ? h('div', { class: 'navigation-loading', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'navigation-loading-message', onKeydown }, [
        h('div', { class: 'navigation-loading-panel' }, [
          h('span', { class: 'navigation-loading-shape', 'aria-hidden': 'true' }),
          h('span', { id: 'navigation-loading-message', role: 'status', 'aria-live': 'polite' }, loadingSlow.value ? '加载较慢，请稍候或检查网络' : '页面加载中…'),
          h('button', { ref: returnButton, type: 'button', class: 'navigation-loading-return', onClick: returnToPrevious }, '返回上一页'),
        ]),
      ]) : null,
    })
  },
})
const { data: site } = await useSiteWorkspace()
const { selection, isDark } = useTheme()
// Nuxt 会在页面切换期间暂缓 head 更新，主题仍需即时响应。
watch(selection, value => { if (import.meta.client) document.documentElement.dataset.theme = value }, { flush: 'sync' })
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
<template>
  <div :data-app-ready="ready">
    <NuxtRouteAnnouncer />
    <NavigationLoading />
    <NuxtPage />
  </div>
</template>
