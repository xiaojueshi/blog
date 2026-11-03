<script setup lang="ts">
const props = defineProps<{ source: string; initialHtml?: string; live?: boolean }>()
const html = ref(props.initialHtml || '')
const renderKey = ref(0)
const { isDark } = useTheme()
const root = ref<HTMLElement>()
let version = 0
async function update() {
  if (!props.live && props.initialHtml && html.value) return
  const current = ++version
  const { renderMarkdown } = await import('#shared/markdown')
  const result = await renderMarkdown(props.source)
  if (current !== version) return
  html.value = result; renderKey.value++
  if (import.meta.client) { await nextTick(); await diagrams() }
}
async function diagrams() {
  const blocks = root.value?.querySelectorAll('code.language-mermaid')
  if (!blocks?.length) return
  try {
    const { default: mermaid } = await import('mermaid')
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: isDark.value ? 'dark' : 'neutral', fontFamily: 'sans-serif' })
    for (const block of blocks) {
      const container = document.createElement('div'); container.className = 'mermaid'
      container.textContent = block.textContent
      block.parentElement?.replaceWith(container)
      try { await mermaid.run({ nodes: [container] }) } catch { container.textContent = '图表语法无效，请检查 Mermaid 源码。' }
    }
  } catch { /* 图表模块不可用时保留可读源码。 */ }
}
if (!props.initialHtml) await update()
watch(() => props.initialHtml, async value => {
  if (!value || props.live) return
  version++
  html.value = value
  renderKey.value++
  await nextTick()
  await diagrams()
})
watch([() => props.source, isDark], () => { if (props.live || !props.initialHtml) void update() })
onMounted(async () => { await nextTick(); await diagrams() })
</script>
<template><div :key="renderKey" ref="root" class="prose" v-html="html" /></template>
