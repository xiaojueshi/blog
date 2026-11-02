<script setup lang="ts">
import { ArrowLeft, Plus, FolderPlus, FilePlus2, Link2, Folder, FileText, ArrowUp, ArrowDown, Pencil, X, Undo2, Save, ArrowUpRight, LockKeyhole, BookOpen } from 'lucide-vue-next'
import type { Draft } from '#shared/content'
import type { KnowledgeBase, KnowledgeNode } from '#shared/workspace'
import { flattenNodes } from '#shared/workspace'
const route = useRoute(); const { data: workspace, refresh } = await useAdminWorkspace()
const { data: content } = await useAdminData<Draft[]>('/api/admin/content', [])
const base = ref<KnowledgeBase | null>(null); const dirty = ref(false); const busy = ref(false); const message = ref(''); const selectedId = ref(''); const adding = ref(false); const contentId = ref(''); const search = ref(''); const confirmRemove = ref(false); const undoNodes = ref<KnowledgeNode[] | null>(null)
watch(workspace, value => { const found = value?.bases.find(b => b.id === route.params.id); if (found && !dirty.value) base.value = structuredClone(toRaw(found)) }, { immediate: true })
const rows = computed(() => flattenNodes(base.value?.nodes || []))
const selected = computed(() => base.value?.nodes.find(n => n.id === selectedId.value))
const selectedContent = computed(() => content.value?.find(d => d.id === selected.value?.contentId))
const parents = computed(() => { const forbidden = new Set([selectedId.value, ...flattenNodes(base.value?.nodes || [], selectedId.value).map(n => n.id)]); return rows.value.filter(n => !n.contentId && !forbidden.has(n.id)) })
const candidates = computed(() => content.value?.filter(d => `${d.title} ${d.category}`.toLowerCase().includes(search.value.toLowerCase())) || [])
const targetParent = computed(() => selected.value ? selected.value.contentId ? selected.value.parentId : selected.value.id : null)
function changed() { dirty.value = true; message.value = '' }
function choose(id: string) { selectedId.value = id; confirmRemove.value = false; adding.value = false }
function addChapter() { if (!base.value) return; const id = crypto.randomUUID(); base.value.nodes.push({ id, title: '新章节', parentId: targetParent.value, contentId: null, position: base.value.nodes.filter(n => n.parentId === targetParent.value).length }); selectedId.value = id; changed() }
function addExisting() {
  if (!base.value || !contentId.value) return
  const item = content.value?.find(d => d.id === contentId.value); if (!item) return
  const id = crypto.randomUUID(); base.value.nodes.push({ id, title: item.title, parentId: targetParent.value, contentId: item.id, position: base.value.nodes.filter(n => n.parentId === targetParent.value).length }); selectedId.value = id; adding.value = false; contentId.value = ''; changed()
}
function move(direction: number) {
  if (!base.value || !selected.value) return
  const peers = base.value.nodes.filter(n => n.parentId === selected.value!.parentId).sort((a,b) => a.position - b.position); const index = peers.findIndex(n => n.id === selectedId.value); const next = index + direction
  if (next < 0 || next >= peers.length) return
  ;[peers[index], peers[next]] = [peers[next]!, peers[index]!]; peers.forEach((n, position) => { n.position = position }); changed()
}
function remove() {
  if (!base.value || !selected.value) return
  undoNodes.value = structuredClone(toRaw(base.value.nodes)); const removeIds = new Set([selectedId.value, ...flattenNodes(base.value.nodes, selectedId.value).map(n => n.id)])
  base.value.nodes = base.value.nodes.filter(n => !removeIds.has(n.id)); selectedId.value = ''; confirmRemove.value = false; changed()
}
function undo() { if (base.value && undoNodes.value) { base.value.nodes = undoNodes.value; undoNodes.value = null; changed() } }
async function save(): Promise<boolean> {
  if (!base.value) return false
  busy.value = true; message.value = ''
  try { const result = await $fetch('/api/admin/knowledge', { method: 'POST', body: base.value }); dirty.value = false; base.value = result; await refresh(); message.value = '目录已保存。私密内容不会出现在公开目录中。'; return true }
  catch (e: any) { message.value = e.data?.statusMessage || '保存失败'; return false } finally { busy.value = false }
}
async function createNote() { const parent = targetParent.value; if (dirty.value && !await save()) return; await navigateTo({ path: '/admin/write', query: { base: base.value!.id, parent: parent || undefined, kind: 'note' } }) }
function leave(event: BeforeUnloadEvent) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
onMounted(() => window.addEventListener('beforeunload', leave)); onBeforeUnmount(() => window.removeEventListener('beforeunload', leave))
onBeforeRouteLeave(() => { if (dirty.value) { message.value = '目录尚未保存，请先保存；或撤销更改后离开。'; return false } })
function discard() { dirty.value = false; const original = workspace.value?.bases.find(b => b.id === base.value?.id); if (original) base.value = structuredClone(toRaw(original)); message.value = '已撤销未保存的更改' }
useSeoMeta({ title: () => `${base.value?.title || '知识库'} — 目录管理` })
</script>
<template><AdminShell><main v-if="base" class="workspace-page knowledge-editor-page"><NuxtLink to="/admin/knowledge" class="text-link back-link"><ArrowLeft :size="14" />全部知识库</NuxtLink><div class="workspace-page-heading"><div><div class="page-eyebrow">KNOWLEDGE STRUCTURE</div><h1>{{ base.title }}</h1><p>章节负责组织结构，内容引用已有正文。目录调整不会改变文章的发布状态。</p></div><div class="heading-actions"><NuxtLink v-if="base.visibility === 'public' && !base.archived" :to="`/garden?collection=${base.slug}`" target="_blank" class="button button-outline">公开预览 <ArrowUpRight :size="14" /></NuxtLink><button class="button button-dark" :disabled="busy || !dirty" @click="save"><Save :size="15" />保存目录</button></div></div><p v-if="message" class="notice" role="status">{{ message }}</p><p v-if="base.archived" class="notice">此知识库已归档，不会公开。可在知识库列表中恢复。</p>
<details class="workspace-panel base-properties"><summary>知识库信息与公开设置</summary><div class="base-settings-grid"><label class="form-field">知识库名称<input v-model="base.title" aria-label="知识库名称" maxlength="100" required @input="changed" /></label><label class="form-field">链接标识<input v-model="base.slug" aria-label="知识库链接" maxlength="120" @input="changed" /></label><label class="form-field base-description">简介<textarea v-model="base.description" rows="2" maxlength="500" @input="changed" /></label><label class="settings-check"><input v-model="base.visibility" type="checkbox" true-value="public" false-value="private" @change="changed" /><span><strong>公开知识库</strong><small>目录只展示已公开内容；未公开的笔记和空章节会自动隐藏。</small></span></label></div></details>
<div class="knowledge-builder"><section class="knowledge-tree-panel"><div class="panel-heading"><h2>目录</h2><button class="subtle-button" @click="selectedId = ''; adding = false">根目录</button></div><div class="tree-toolbar"><button :disabled="busy" @click="addChapter"><FolderPlus :size="14" />新建章节</button><button :disabled="busy" @click="createNote"><FilePlus2 :size="14" />新建笔记</button><button @click="adding = true; confirmRemove = false"><Link2 :size="14" />收录内容</button></div><nav class="admin-directory" aria-label="知识库编辑目录"><button v-for="node in rows" :key="node.id" class="directory-row" :class="{ selected: selectedId === node.id }" :style="{ '--depth': Math.min(node.depth, 6) }" @click="choose(node.id)"><FileText v-if="node.contentId" :size="15" /><Folder v-else :size="15" /><span>{{ node.contentId ? content?.find(d => d.id === node.contentId)?.title || node.title : node.title }}</span><LockKeyhole v-if="node.contentId && content?.find(d => d.id === node.contentId)?.visibility !== 'public'" :size="11" /></button></nav><div v-if="!rows.length" class="directory-empty"><FolderPlus :size="25" /><p>先创建章节，或直接收录已有内容。</p></div><button v-if="undoNodes" class="text-link undo-directory" @click="undo"><Undo2 :size="14" />撤销上次移除</button></section>
<section class="knowledge-node-panel"><template v-if="adding"><div class="panel-heading"><h2>收录已有内容</h2><button class="icon-button" aria-label="取消收录" @click="adding = false"><X :size="16" /></button></div><p>目标章节：{{ targetParent ? base.nodes.find(n => n.id === targetParent)?.title : '根目录' }}。收录只建立引用，不复制内容。</p><label class="form-field">搜索内容<input v-model="search" placeholder="输入标题或分类" /></label><label class="form-field">选择内容<select v-model="contentId" aria-label="收录内容"><option value="">请选择</option><option v-for="item in candidates" :key="item.id" :value="item.id">{{ item.title }}{{ item.visibility === 'private' ? '（私密）' : '' }}</option></select></label><button class="button button-dark" :disabled="!contentId" @click="addExisting"><Plus :size="15" />加入目录</button></template>
<template v-else-if="selected"><div class="panel-heading"><h2>{{ selected.contentId ? '内容引用' : '章节设置' }}</h2><div><button class="icon-button" aria-label="节点上移" @click="move(-1)"><ArrowUp :size="16" /></button><button class="icon-button" aria-label="节点下移" @click="move(1)"><ArrowDown :size="16" /></button></div></div><label v-if="!selected.contentId" class="form-field">章节名称<input v-model="selected.title" aria-label="章节名称" maxlength="200" @input="changed" /></label><div v-else class="referenced-content"><h3>{{ selectedContent?.title || selected.title }}</h3><span class="visibility-badge" :class="selectedContent?.visibility">{{ selectedContent?.visibility === 'public' ? '已公开' : '私密内容' }}</span><p>{{ selectedContent?.summary || '暂无摘要' }}</p><NuxtLink :to="`/admin/write?id=${selected.contentId}`" class="button button-outline">编辑正文 <Pencil :size="14" /></NuxtLink></div><label class="form-field">所属章节<select v-model="selected.parentId" aria-label="所属章节" @change="changed"><option :value="null">根目录</option><option v-for="parent in parents" :key="parent.id" :value="parent.id">{{ '　'.repeat(parent.depth) }}{{ parent.title }}</option></select></label><div class="node-remove"><button v-if="!confirmRemove" class="subtle-button" @click="confirmRemove = true">从目录移除{{ selected.contentId ? '此引用' : '此章节' }}</button><template v-else><p>将移除此节点及其子目录引用，正文仍保留。移除后可撤销。</p><button class="button button-outline" @click="confirmRemove = false">取消</button><button class="button button-dark" @click="remove">确认移除引用</button></template></div></template>
<template v-else><div class="directory-welcome"><BookOpen :size="32" :stroke-width="1.3" /><h2>组织你的知识目录</h2><p>从左侧选择章节或内容，修改归属与顺序。也可以新建笔记或收录已有文章。</p><span>当前目标：根目录</span></div></template></section></div><div v-if="dirty" class="directory-save-hint"><span>目录有未保存的更改</span><button class="subtle-button" @click="discard">撤销更改</button><button class="button button-dark" :disabled="busy" @click="save">保存目录</button></div></main><div v-else class="empty-state"><p>知识库不存在，或正在加载。</p><NuxtLink to="/admin/knowledge">返回知识库</NuxtLink></div></AdminShell></template>
