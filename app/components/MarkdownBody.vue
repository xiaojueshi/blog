<script setup lang="ts">
import { renderMarkdown } from '#shared/markdown'
const props = defineProps<{ source: string }>()
const html = ref('')
const renderKey = ref(0)
const { isDark } = useTheme()
const root = ref<HTMLElement>()
let version = 0
async function update() {
  const current = ++version
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
await update()
watch([() => props.source, isDark], update)
onMounted(diagrams)
</script>
<template><div :key="renderKey" ref="root" class="prose" v-html="html" /></template>
