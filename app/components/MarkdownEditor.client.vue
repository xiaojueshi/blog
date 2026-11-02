<script setup lang="ts">
import { EditorView } from '@codemirror/view'
import { Compartment } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const container = ref<HTMLElement>()
const { isDark } = useTheme()
const themeCompartment = new Compartment()
let editor: EditorView | undefined
function editorTheme() {
  return EditorView.theme({
    '&': { height: '100%', fontSize: '14px', backgroundColor: 'var(--paper)', color: 'var(--ink)' },
    '.cm-content': { fontFamily: '"SFMono-Regular", Consolas, monospace', padding: '24px 18px', lineHeight: '1.9', minHeight: '440px' },
    '.cm-gutters': { backgroundColor: 'var(--surface)', border: 'none', color: 'var(--text-faint)' },
    '&.cm-focused': { outline: 'none' }, '.cm-scroller': { overflow: 'auto' },
  }, { dark: isDark.value })
}
// 异步布局插槽完成 hydration 后再挂载，避免编辑器被后续 DOM 更新清空。
onMounted(async () => {
  await nextTick()
  if (!container.value) return
  editor = new EditorView({ parent: container.value, doc: props.modelValue, extensions: [basicSetup, markdown(), EditorView.lineWrapping,
    EditorView.contentAttributes.of({ 'aria-label': 'Markdown 正文', spellcheck: 'false' }),
    EditorView.updateListener.of(update => { if (update.docChanged) emit('update:modelValue', update.state.doc.toString()) }),
    themeCompartment.of(editorTheme()),
  ] })
})
// 只重配主题分区，保留文档、光标、选区与撤销历史。
watch(isDark, () => { editor?.dispatch({ effects: themeCompartment.reconfigure(editorTheme()) }) })
watch(() => props.modelValue, value => { if (editor && editor.state.doc.toString() !== value) editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } }) })
onBeforeUnmount(() => editor?.destroy())
</script>
<template><div ref="container" class="code-editor" /></template>
