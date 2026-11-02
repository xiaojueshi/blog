<script setup lang="ts">
import { ArrowLeft, ArrowUpRight, Check, Eye, PenLine, Columns2, History, ImagePlus, LockKeyhole, X, BookOpen, Settings2 } from 'lucide-vue-next'
import type { Draft } from '#shared/content'
const route = useRoute(); const router = useRouter()
const { data: records, refresh: refreshRecords, error: loadError } = await useAdminData<Draft[]>('/api/admin/content', [])
const { data: workspace, refresh: refreshWorkspace } = await useAdminWorkspace()
const selected = ref<Draft | null>(null); const view = ref('split'); const busy = ref(false); const dirty = ref(false)
const status = ref('所有更改已保存'); const message = ref(''); const historyOpen = ref(false)
const history = ref<{ revision: number; title: string; updatedAt: string }[]>([]); const imageInput = ref<HTMLInputElement>()
let loadedId: string | null = null; let timer: ReturnType<typeof setTimeout> | undefined; let saving: Promise<boolean> | null = null
const types = computed(() => workspace.value?.terms.filter(t => t.kind === 'type' && (t.enabled || t.id === selected.value?.kind)) || [])
const categories = computed(() => workspace.value?.terms.filter(t => t.kind === 'category') || [])
const tags = computed(() => workspace.value?.terms.filter(t => t.kind === 'tag') || [])
const related = computed(() => workspace.value?.bases.filter(b => !b.archived && b.nodes.some(n => n.contentId === selected.value?.id)) || [])
function initialize() {
  if (!workspace.value) return
  const id = String(route.query.id || '')
  if (loadedId === id) return
  if (id) { const item = records.value?.find(d => d.id === id); if (!item) return; selected.value = structuredClone(toRaw(item)); loadedId = id }
  else { const kind = types.value.find(t => t.id === route.query.kind)?.id || workspace.value.settings.defaultKind; selected.value = { id: '', title: '', slug: '', summary: '', body: '', kind: kind as Draft['kind'], category: '', categoryId: null, tags: [], tagIds: [], featured: false, visibility: 'private', revision: 0, createdAt: '', updatedAt: '', published: null }; loadedId = ''; status.value = '填写标题后自动保存' }
}
watch([records, workspace, () => route.query.id], initialize, { immediate: true })
function changed() { dirty.value = true; status.value = '有未保存的更改'; clearTimeout(timer); timer = setTimeout(() => { void save() }, (workspace.value?.settings.autosaveSeconds || 1) * 1000) }
async function save(action = 'save', restoreRevision?: number): Promise<boolean> {
  clearTimeout(timer)
  if (saving) { await saving; if (action === 'save' && !dirty.value) return true }
  if (!selected.value?.title.trim()) { status.value = '请先填写标题'; return false }
  const current = selected.value; const before = JSON.stringify(current)
  const payload = JSON.parse(JSON.stringify({ ...current, id: current.id || undefined, slug: current.slug || undefined, action, restoreRevision, knowledgeBaseId: current.id ? undefined : route.query.base, parentNodeId: route.query.parent || null }))
  status.value = '正在保存…'; busy.value = true
  saving = (async () => {
    try {
      const result = await $fetch<Draft>('/api/admin/content', { method: 'POST', body: payload })
      const newer = selected.value === current && JSON.stringify(current) !== before
      if (newer) Object.assign(current, { id: result.id, slug: current.slug || result.slug, revision: result.revision, updatedAt: result.updatedAt, createdAt: result.createdAt, published: result.published, visibility: result.visibility })
      else selected.value = result
      loadedId = result.id; dirty.value = newer; status.value = newer ? '继续保存新更改…' : '所有更改已保存'
      if (!route.query.id) await router.replace({ query: { id: result.id } })
      if (action !== 'save') message.value = action === 'publish' ? '已发布，读者现在可以看到这个版本。' : action === 'withdraw' ? '已撤回，内容与附件不再公开。' : '历史内容已恢复为编辑稿，尚未发布。'
      await refreshRecords(); await refreshWorkspace()
      if (newer) timer = setTimeout(() => { void save() }, 500)
      return true
    } catch (e: any) { status.value = '保存失败，更改仍保留在编辑器中'; message.value = e.data?.statusMessage || '网络请求失败，请重试'; return false }
    finally { busy.value = false; saving = null }
  })()
  return saving
}
function toggleTag(id: string) { if (!selected.value) return; const set = new Set(selected.value.tagIds || []); set.has(id) ? set.delete(id) : set.add(id); selected.value.tagIds = [...set]; changed() }
async function upload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !selected.value || !await save()) return
  const data = new FormData(); data.append('file', file); data.append('contentId', selected.value.id)
  try { const result = await $fetch('/api/admin/upload', { method: 'POST', body: data }); selected.value.body += `\n\n![${file.name.replace(/[\[\]]/g, '')}](${result.url})\n`; changed() } catch (e: any) { message.value = e.data?.statusMessage || '上传失败' }
  if (imageInput.value) imageInput.value.value = ''
}
async function showHistory() { if (!selected.value?.id) return; history.value = await $fetch<{ revision: number; title: string; updatedAt: string }[], string>('/api/admin/history', { query: { id: selected.value.id } }); historyOpen.value = !historyOpen.value }
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
function shortcut(event: KeyboardEvent) { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void save() } }
onMounted(() => { window.addEventListener('beforeunload', beforeUnload); window.addEventListener('keydown', shortcut) })
onBeforeUnmount(() => { clearTimeout(timer); window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('keydown', shortcut) })
onBeforeRouteLeave(async () => { if (dirty.value) return await save() })
useSeoMeta({ title: () => `${selected.value?.title || '新建记录'} — 内容工作台` })
</script>
<template><AdminShell><main v-if="selected" class="workspace-editor"><header class="editor-topbar"><NuxtLink to="/admin" class="text-link"><ArrowLeft :size="16" /><span>全部内容</span></NuxtLink><span class="save-status" role="status"><Check v-if="!dirty && selected.id" :size="14" />{{ status }}</span><div class="editor-actions"><button class="button button-outline" :disabled="busy" @click="save()">保存</button><button class="button button-dark" :disabled="busy || !selected.title.trim()" @click="save('publish')">{{ selected.visibility === 'public' ? '更新发布' : '发布' }}<ArrowUpRight :size="14" /></button></div></header>
<div class="editor-heading"><div class="editor-state"><span class="visibility-badge" :class="selected.visibility"><LockKeyhole v-if="selected.visibility === 'private'" :size="12" />{{ selected.visibility === 'private' ? '私人编辑稿' : '已发布 · 修改需重新发布' }}</span><button v-if="selected.visibility === 'public'" class="subtle-button" :disabled="busy" @click="save('withdraw')">撤回发布</button><NuxtLink v-if="selected.published" :to="`/articles/${selected.published.slug}`" target="_blank" class="subtle-button">查看公开版本 ↗</NuxtLink></div><textarea v-model="selected.title" rows="1" class="title-input" aria-label="内容标题" placeholder="输入标题…" maxlength="200" @input="changed" /><textarea v-model="selected.summary" class="summary-input" aria-label="内容摘要" placeholder="摘要（可选）" rows="2" @input="changed" />
<details class="content-properties" open><summary><Settings2 :size="14" />内容属性</summary><div class="property-grid"><label>类型<select v-model="selected.kind" aria-label="内容类型" @change="changed"><option v-for="type in types" :key="type.id" :value="type.id">{{ type.name }}{{ type.enabled ? '' : '（已停用）' }}</option></select></label><label>分类<select v-model="selected.categoryId" aria-label="内容分类" @change="changed"><option :value="null">未分类</option><option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option></select></label><label>链接标识<input v-model="selected.slug" placeholder="自动生成" @input="changed" /></label><label class="checkbox-label"><input v-model="selected.featured" type="checkbox" @change="changed" />设为精选</label></div><div class="property-tags"><span>标签</span><button v-for="tag in tags" :key="tag.id" class="tag-toggle" :class="{ active: selected.tagIds?.includes(tag.id) }" :aria-pressed="selected.tagIds?.includes(tag.id) || false" @click="toggleTag(tag.id)">{{ tag.name }}</button><NuxtLink to="/admin/organize?tab=tag" class="subtle-button">管理标签 ↗</NuxtLink></div><div class="editor-knowledge"><BookOpen :size="14" /><span>知识库</span><NuxtLink v-for="base in related" :key="base.id" :to="`/admin/knowledge/${base.id}`">{{ base.title }} ↗</NuxtLink><span v-if="!related.length">{{ route.query.base ? '首次保存后加入所选章节' : '可从知识库目录中收录此内容' }}</span></div></details></div>
<p v-if="message" class="notice editor-notice" role="status">{{ message }}</p><div class="editor-toolbar"><div class="editor-tabs"><button :class="{ active: view === 'edit' }" @click="view = 'edit'"><PenLine :size="14" />编辑</button><button :class="{ active: view === 'preview' }" @click="view = 'preview'"><Eye :size="14" />预览</button><button class="split-tab" :class="{ active: view === 'split' }" @click="view = 'split'"><Columns2 :size="14" />分栏</button></div><div class="editor-tools"><button class="icon-button" aria-label="上传图片" @click="imageInput?.click()"><ImagePlus :size="17" /></button><input ref="imageInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden @change="upload" /><button class="icon-button" aria-label="查看历史版本" @click="showHistory"><History :size="17" /></button><span>{{ selected.body.length }} 字</span></div></div><div v-if="historyOpen" class="history-panel"><div class="section-heading"><h3>历史版本</h3><button class="icon-button" aria-label="关闭历史" @click="historyOpen = false"><X :size="16" /></button></div><p v-if="!history.length">保存后将在这里留下历史版本。</p><button v-for="h in history" :key="h.revision" class="history-row" :disabled="busy" @click="save('restore', h.revision); historyOpen = false"><span>版本 {{ h.revision }} · {{ h.title }}</span><span>恢复为编辑稿 ↗</span></button></div><div class="editor-panels" :class="`view-${view}`"><div class="editor-source"><ClientOnly><MarkdownEditor v-model="selected.body" @update:model-value="changed" /><template #fallback><textarea v-model="selected.body" aria-label="Markdown 正文" @input="changed" /></template></ClientOnly></div><div class="editor-preview"><MarkdownBody v-if="selected.body" :source="selected.body" /><div v-else class="preview-placeholder"><PenLine :size="24" /><p>预览将在这里显示。</p></div></div></div><div class="editor-bottom"><span>Markdown · 公式 · Mermaid · 脚注</span><span>{{ workspace?.settings.autosaveSeconds }} 秒自动保存 · 默认私密</span></div></main><div v-else class="empty-state"><p>{{ loadError ? '加载失败，请刷新重试。' : route.query.id ? '正在加载内容；若记录已不存在，请返回内容列表。' : '正在准备编辑器…' }}</p><NuxtLink to="/admin" class="text-link">返回内容列表</NuxtLink></div></AdminShell></template>
