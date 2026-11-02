<script setup lang="ts">
import { ArrowLeft, ArrowUpRight, Plus, FileText, BookOpen, Shapes, Image, Settings2, Menu, X, LogOut, LockKeyhole, ChevronRight } from 'lucide-vue-next'
const { data: session, refresh: refreshSession } = await useAdminSession()
const { data: workspace } = await useAdminWorkspace()
const mobile = ref(false); const sidebar = ref<HTMLElement>(); const menuButton = ref<HTMLButtonElement>(); let viewport: MediaQueryList | undefined
const syncViewport = () => { mobile.value = Boolean(viewport?.matches); if (!mobile.value) drawer.value = false }
onMounted(() => { viewport = window.matchMedia('(max-width: 700px)'); syncViewport(); viewport.addEventListener('change', syncViewport) })
onBeforeUnmount(() => viewport?.removeEventListener('change', syncViewport))
const route = useRoute(); const drawer = ref(false); const setupToken = ref(''); const password = ref(''); const error = ref(''); const busy = ref(false)
watch(() => route.fullPath, () => { drawer.value = false })
watch(drawer, async open => { if (!mobile.value) return; await nextTick(); if (open) sidebar.value?.querySelector('button')?.focus(); else menuButton.value?.focus() })
useHead(() => ({ bodyAttrs: { class: mobile.value && drawer.value ? 'workspace-drawer-open' : '' } }))
const types = computed(() => workspace.value?.terms.filter(t => t.kind === 'type' && t.enabled) || [])
async function login() {
  busy.value = true; error.value = ''
  try { await $fetch('/api/auth', { method: 'POST', body: { password: password.value, setupToken: setupToken.value } }); password.value = ''; await refreshSession(); await refreshNuxtData() }
  catch (e: any) { error.value = e.data?.statusMessage || '登录失败，请重试' }
  finally { busy.value = false }
}
async function logout() { await $fetch('/api/auth', { method: 'DELETE' }); await refreshSession(); clearNuxtData(key => key.startsWith('/api/admin/')); await navigateTo('/admin') }
useSeoMeta({ robots: 'noindex, nofollow' })
</script>
<template>
  <div v-if="!session?.authenticated" class="login-page"><NuxtLink to="/" class="wordmark">XIAOJUESHI</NuxtLink><main class="login-card"><div class="login-icon"><LockKeyhole :size="24" :stroke-width="1.5" /></div><div class="page-eyebrow">CONTENT WORKSPACE</div><h1>{{ session?.configured ? '欢迎回来。' : '设置管理员' }}</h1><p>{{ session?.configured ? '登录后管理文章、知识库和站点设置。' : '首次使用，请设置管理员密码。远程部署需填写初始化密钥。' }}</p><form @submit.prevent="login"><label class="form-field">{{ session?.configured ? '管理员密码' : '设置管理员密码' }}<input v-model="password" type="password" minlength="12" maxlength="256" required :autocomplete="session?.configured ? 'current-password' : 'new-password'" placeholder="至少 12 个字符" /></label><label v-if="!session?.configured" class="form-field">初始化密钥（本机可留空）<input v-model="setupToken" type="password" autocomplete="off" placeholder="部署时生成的初始化密钥" /></label><p v-if="error" role="alert" class="error-message">{{ error }}</p><button class="button button-dark" :disabled="busy">{{ busy ? '正在验证…' : session?.configured ? '进入工作台' : '设置密码并进入' }}<ArrowUpRight :size="17" /></button></form><NuxtLink to="/" class="text-link"><ArrowLeft :size="14" /> 返回博客</NuxtLink></main><div class="login-theme"><ThemePicker /><span>浅色 / 深色 / 跟随系统</span></div></div>
  <div v-else class="workspace-layout">
    <button v-if="drawer" class="workspace-scrim" aria-label="关闭导航" @click="drawer = false" />
    <aside ref="sidebar" class="workspace-sidebar" :class="{ open: drawer }" :inert="mobile && !drawer" :aria-hidden="mobile && !drawer" @keydown.esc="drawer = false">
      <div class="workspace-brand"><NuxtLink to="/" class="wordmark">{{ workspace?.settings.name || 'XIAOJUESHI' }}</NuxtLink><button class="icon-button workspace-close" aria-label="关闭导航" @click="drawer = false"><X :size="19" /></button></div>
      <p class="workspace-caption">个人内容工作台</p>
      <button class="button button-dark workspace-new" @click="navigateTo('/admin/write')"><Plus :size="16" /> 新建记录</button>
      <div class="workspace-section-label">内容</div>
      <NuxtLink to="/admin" class="workspace-nav-item" :class="{ selected: route.path === '/admin' && !route.query.kind }"><FileText :size="17" />全部内容</NuxtLink>
      <NuxtLink v-for="type in types" :key="type.id" :to="`/admin?kind=${type.id}`" class="workspace-nav-item subtype" :class="{ selected: route.path === '/admin' && route.query.kind === type.id }"><span class="nav-bullet" />{{ type.name }}</NuxtLink>
      <NuxtLink to="/admin/knowledge" class="workspace-nav-item" :class="{ selected: route.path.startsWith('/admin/knowledge') }"><BookOpen :size="17" />知识库<ChevronRight :size="13" /></NuxtLink>
      <div v-if="workspace?.bases.some(b => !b.archived)" class="sidebar-bases"><NuxtLink v-for="base in workspace.bases.filter(b => !b.archived).slice(0, 6)" :key="base.id" :to="`/admin/knowledge/${base.id}`" :class="{ active: route.params.id === base.id }">{{ base.title }}</NuxtLink></div>
      <div class="workspace-section-label">管理</div>
      <NuxtLink to="/admin/organize" class="workspace-nav-item" :class="{ selected: route.path === '/admin/organize' }"><Shapes :size="17" />内容组织</NuxtLink>
      <NuxtLink to="/admin/assets" class="workspace-nav-item" :class="{ selected: route.path === '/admin/assets' }"><Image :size="17" />附件</NuxtLink>
      <NuxtLink to="/admin/settings" class="workspace-nav-item" :class="{ selected: route.path === '/admin/settings' }"><Settings2 :size="17" />设置</NuxtLink>
      <div class="workspace-sidebar-bottom"><NuxtLink to="/" class="workspace-nav-item"><ArrowUpRight :size="16" />查看公开博客</NuxtLink><button class="workspace-nav-item" @click="logout"><LogOut :size="16" />退出登录</button><div class="workspace-theme"><ThemePicker /><span>外观</span><span class="workspace-owner">xiaojueshi</span></div></div>
    </aside>
    <div class="workspace-body"><header class="workspace-topbar"><button ref="menuButton" class="icon-button workspace-menu" aria-label="展开工作台导航" @click="drawer = true"><Menu :size="19" /></button><NuxtLink to="/admin" class="workspace-mobile-brand">XIAOJUESHI</NuxtLink><span class="workspace-breadcrumb">工作台 <span>/</span> {{ route.path.includes('settings') ? '设置' : route.path.includes('organize') ? '内容组织' : route.path.includes('knowledge') ? '知识库' : route.path.includes('assets') ? '附件' : route.path.includes('write') ? '编辑内容' : '内容' }}</span><div class="workspace-topbar-right"><span class="workspace-private"><LockKeyhole :size="12" />个人空间</span><ThemePicker /></div></header><slot /></div>
  </div>
</template>
