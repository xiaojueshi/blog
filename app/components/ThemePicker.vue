<script setup lang="ts">
import { Sun, Moon, Monitor, Check } from 'lucide-vue-next'
import type { ThemePreference } from '#shared/workspace'
const { selection, isDark, setTheme } = useTheme()
const menu = ref<HTMLDetailsElement>()
const choices: { id: ThemePreference; name: string; icon: typeof Sun }[] = [{ id: 'light', name: '浅色', icon: Sun }, { id: 'dark', name: '深色', icon: Moon }, { id: 'system', name: '跟随系统', icon: Monitor }]
function outside(event: PointerEvent) { if (menu.value?.open && !menu.value.contains(event.target as Node)) menu.value.open = false }
onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
function choose(value: ThemePreference) { setTheme(value); if (menu.value) menu.value.open = false }
</script>
<template><details ref="menu" class="theme-picker" @keydown.esc="menu && (menu.open = false)"><summary class="icon-button" aria-label="主题设置" title="主题设置"><Moon v-if="isDark" :size="17" /><Sun v-else :size="17" /></summary><div class="theme-popover" role="group" aria-label="主题选择"><button v-for="choice in choices" :key="choice.id" :aria-pressed="selection === choice.id" :aria-label="choice.name" @click="choose(choice.id)"><component :is="choice.icon" :size="15" />{{ choice.name }}<Check v-if="selection === choice.id" :size="14" /></button></div></details></template>
