<script setup lang="ts">
import { Folder, FileText } from 'lucide-vue-next'
import type { PublicKnowledgeBase } from '#shared/workspace'
import { flattenNodes } from '#shared/workspace'
const props = defineProps<{ base: PublicKnowledgeBase; active?: string }>()
const nodes = computed(() => flattenNodes(props.base.nodes))
</script>
<template><nav class="public-directory" aria-label="知识库目录"><template v-for="node in nodes" :key="node.id"><NuxtLink v-if="node.contentId" :to="{ path: '/garden', query: { collection: base.slug, entry: node.id } }" :class="{ active: node.id === active }" :style="{ '--depth': Math.min(node.depth, 6) }"><FileText :size="14" /><span>{{ node.title }}</span></NuxtLink><div v-else class="public-chapter" :style="{ '--depth': Math.min(node.depth, 6) }"><Folder :size="14" /><span>{{ node.title }}</span></div></template><p v-if="!nodes.length" class="directory-no-entries">暂时没有公开内容。</p></nav></template>
