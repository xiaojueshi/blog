<script setup lang="ts">
import { Plus, ArrowUp, ArrowDown, Pencil, Check, X, Tags, Shapes, LayoutList } from 'lucide-vue-next'
import type { TaxonomyTerm } from '#shared/workspace'
import type { Draft } from '#shared/content'
const route = useRoute(); const router = useRouter()
const { data: workspace, error: workspaceError, status: workspaceStatus, refresh } = await useAdminWorkspace()
const { data: content, error: contentError, refresh: refreshContent } = await useAdminData<Draft[]>('/api/admin/content', [])
const tab = computed(() => ['type','category','tag'].includes(String(route.query.tab)) ? String(route.query.tab) : 'type')
const list = computed(() => workspace.value?.terms.filter(t => t.kind === tab.value) || [])
const name = ref(''); const editing = ref(''); const editName = ref(''); const busy = ref(false); const message = ref(''); const removal = ref<TaxonomyTerm | null>(null); const target = ref('')
const activeAction = ref(''); const activeId = ref('')
const peers = computed(() => workspace.value?.terms.filter(t => t.kind === removal.value?.kind && t.id !== removal.value?.id) || [])
const peerOptions = computed(() => [{ value: '', label: '不关联其他项' }, ...peers.value.map(peer => ({ value: peer.id, label: peer.name }))])
function count(term: TaxonomyTerm) { return content.value?.filter(d => term.kind === 'type' ? d.kind === term.id : term.kind === 'category' ? d.categoryId === term.id || d.published?.categoryId === term.id : d.tagIds?.includes(term.id) || d.published?.tagIds?.includes(term.id)).length || 0 }
async function mutate(action: string, values: Record<string, unknown> = {}) {
  if (!workspace.value || busy.value) return
  busy.value = true; activeAction.value = action; activeId.value = String(values.id || ''); message.value = ''
  try { const result = await $fetch('/api/admin/terms', { method: 'POST', body: { revision: workspace.value.revision, action, ...values } }); workspace.value = result.workspace; name.value = ''; editing.value = ''; removal.value = null; message.value = result.affected ? `已完成，更新了 ${result.affected} 项内容的关联。` : '已保存'; await refreshContent(); await refreshNuxtData('site-workspace') }
  catch (e: any) { message.value = e.data?.statusMessage || '操作结果暂不确定，请检查当前内容后再试'; await refresh(); await refreshContent() }
  finally { busy.value = false; activeAction.value = ''; activeId.value = '' }
}
function beforeUnload(event: BeforeUnloadEvent) { if (busy.value) { event.preventDefault(); event.returnValue = '' } }
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
onBeforeRouteLeave(() => { if (busy.value && !window.confirm('内容组织操作仍在进行，离开后操作可能继续。确定离开吗？')) return false })
function changeTab(value: string) { editing.value = ''; removal.value = null; message.value = ''; void router.replace({ query: { tab: value } }) }
useSeoMeta({ title: '内容组织 — XIAOJUESHI' })
</script>
<template>
  <AdminShell>
    <main class="workspace-page">
      <div class="workspace-page-heading">
        <div>
          <div class="page-eyebrow">ORGANIZATION</div>
          <h1>内容组织</h1>
          <p>类型决定形式，分类划分主题，标签补充关键词。</p>
        </div>
      </div>
      <div class="settings-tabs" role="tablist" aria-label="内容组织">
        <button v-for="option in [{ id: 'type', name: '类型管理', icon: LayoutList }, { id: 'category', name: '分类管理', icon: Shapes }, { id: 'tag', name: '标签管理', icon: Tags }]" :key="option.id" role="tab" :aria-selected="tab === option.id" :class="{ active: tab === option.id }" @click="changeTab(option.id)">
          <component :is="option.icon" :size="15" />{{ option.name }}
        </button>
      </div>
      <div class="section-description organization-explanation">{{ tab === 'type' ? '三种内置类型支持改名、排序与停用。停用后不能新建该类型，已有内容保留。' : tab === 'category' ? '每项内容最多一个分类。移除分类时，可将关联内容迁移到其他分类。' : '每项内容可有多个标签。相似标签可以合并，避免重复维护。' }}</div>
      <p v-if="message" class="notice" role="status">{{ message }}</p>
      <p v-if="workspaceStatus === 'pending'" class="notice loading-inline" role="status"><span class="loading-spinner" aria-hidden="true" />正在加载内容组织…</p>
      <div v-else-if="workspaceError" class="notice" role="alert">内容组织加载失败。<button @click="refresh()">重新加载</button></div>
      <div v-if="contentError" class="notice" role="alert">内容列表加载失败。<button @click="refreshContent()">重新加载</button></div>
      <form v-if="tab !== 'type'" class="inline-create" @submit.prevent="mutate('create', { kind: tab, name })">
        <input v-model="name" :aria-label="tab === 'category' ? '新分类名称' : '新标签名称'" :placeholder="tab === 'category' ? '输入分类名称' : '输入标签名称'" maxlength="50" required />
        <button class="button button-dark" :disabled="busy || !name.trim()"><span v-if="activeAction === 'create'" class="loading-spinner" aria-hidden="true" /><Plus v-else :size="15" />{{ activeAction === 'create' ? '正在新增…' : tab === 'category' ? '新增分类' : '新增标签' }}</button>
      </form>
      <div class="organization-list">
        <div v-for="(term, index) in list" :key="term.id" class="organization-row">
          <div class="organization-term">
            <template v-if="editing === term.id">
              <input v-model="editName" aria-label="修改名称" maxlength="50" />
              <button class="icon-button" aria-label="保存名称" :disabled="busy || !editName.trim()" @click="mutate('rename', { id: term.id, name: editName })"><span v-if="activeAction === 'rename' && activeId === term.id" class="loading-spinner" aria-hidden="true" /><Check v-else :size="16" /></button>
              <button class="icon-button" aria-label="取消改名" :disabled="busy" @click="editing = ''"><X :size="15" /></button>
            </template>
            <template v-else>
              <strong>{{ term.name }}</strong>
              <span v-if="term.kind === 'type' && workspace?.settings.defaultKind === term.id" class="small-pill">默认</span>
              <span v-if="!term.enabled" class="small-pill">已停用</span>
              <button class="icon-button" :aria-label="`重命名${term.name}`" :disabled="busy" @click="editing = term.id; editName = term.name"><Pencil :size="14" /></button>
            </template>
          </div>
          <span class="term-count">{{ count(term) }} 项关联内容</span>
          <div class="term-actions">
            <span v-if="busy && activeId === term.id && !removal" class="loading-inline" role="status">正在处理…</span>
            <button class="icon-button" :aria-label="`上移${term.name}`" :disabled="busy || index === 0" @click="mutate('move', { id: term.id, direction: 'up' })"><ArrowUp :size="15" /></button>
            <button class="icon-button" :aria-label="`下移${term.name}`" :disabled="busy || index === list.length - 1" @click="mutate('move', { id: term.id, direction: 'down' })"><ArrowDown :size="15" /></button>
            <button v-if="term.kind === 'type'" class="subtle-button" :disabled="busy || workspace?.settings.defaultKind === term.id" @click="mutate('toggle', { id: term.id })">{{ term.enabled ? '停用' : '启用' }}</button>
            <button v-else class="subtle-button" :disabled="busy" @click="removal = term; target = ''">{{ term.kind === 'tag' ? '合并 / 移除' : '迁移 / 移除' }}</button>
          </div>
        </div>
        <div v-if="!list.length && !workspaceError && workspaceStatus !== 'pending'" class="empty-state"><p>还没有{{ tab === 'tag' ? '标签' : '分类' }}，可以从上方新增。</p></div>
      </div>
      <section v-if="removal" class="workspace-panel migration-panel" role="dialog" aria-label="迁移或移除术语">
        <div class="panel-heading">
          <h2>{{ removal.name }} · {{ count(removal) }} 项关联内容</h2>
          <button class="icon-button" aria-label="取消移除" :disabled="busy" @click="removal = null"><X :size="18" /></button>
        </div>
        <p>选择目标后会更新内容的组织关联，正文与发布状态不变。选择“不关联其他项”会移除这个{{ removal.kind === 'tag' ? '标签' : '分类' }}关联。</p>
        <SelectField v-model="target" class="form-field" label="迁移目标" accessible-label="迁移目标" :options="peerOptions" />
        <div class="panel-actions">
          <button class="button button-outline" :disabled="busy" @click="removal = null">取消</button>
          <button class="button button-dark" :disabled="busy" @click="mutate(target ? 'merge' : 'remove', { id: removal.id, targetId: target || null })"><span v-if="busy && (activeAction === 'merge' || activeAction === 'remove')" class="loading-spinner" aria-hidden="true" />{{ busy && (activeAction === 'merge' || activeAction === 'remove') ? '正在处理…' : target ? '迁移关联并移除原项' : '移除并清空关联' }}</button>
        </div>
      </section>
      <p v-if="tab === 'type'" class="workspace-help">默认类型在 <NuxtLink to="/admin/settings?tab=editor">设置 → 编辑与发布</NuxtLink> 中调整。</p>
    </main>
  </AdminShell>
</template>
