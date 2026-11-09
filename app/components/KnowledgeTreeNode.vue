<script setup lang="ts">
import { FileText, Folder } from 'lucide-vue-next'
import type { KnowledgeNode } from '#shared/workspace'

interface KnowledgeTreeBranch {
  node: KnowledgeNode
  children: KnowledgeTreeBranch[]
}

defineOptions({ name: 'KnowledgeTreeNode' })
defineProps<{
  item: KnowledgeTreeBranch
  baseSlug: string
  active?: string
}>()
</script>

<template>
  <li
    class="public-directory-item"
    :class="{
      'is-chapter': !item.node.contentId,
      'has-children': item.children.length > 0,
      'is-active': item.node.id === active,
    }"
  >
    <NuxtLink
      v-if="item.node.contentId"
      :to="{ path: '/garden', query: { collection: baseSlug, entry: item.node.id } }"
      class="public-directory-link"
      :class="{ active: item.node.id === active }"
      :aria-current="item.node.id === active ? 'page' : undefined"
    >
      <FileText :size="13" />
      <span>{{ item.node.title }}</span>
    </NuxtLink>
    <div v-else class="public-chapter">
      <Folder :size="13" />
      <span>{{ item.node.title }}</span>
    </div>

    <ul v-if="item.children.length" class="public-directory-children">
      <KnowledgeTreeNode
        v-for="child in item.children"
        :key="child.node.id"
        :item="child"
        :base-slug="baseSlug"
        :active="active"
      />
    </ul>
  </li>
</template>
