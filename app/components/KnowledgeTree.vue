<script setup lang="ts">
import type { KnowledgeNode, PublicKnowledgeBase } from '#shared/workspace'

interface KnowledgeTreeBranch {
  node: KnowledgeNode
  children: KnowledgeTreeBranch[]
}

const props = defineProps<{ base: PublicKnowledgeBase; active?: string }>()

/**
 * 将扁平目录整理为递归树，以保留章节与内容的真实父子关系。
 * @param parentId 当前父章节身份。
 * @returns 已按顺序排列的目录树。
 * @throws 无。
 */
function buildTree(parentId: string | null = null): KnowledgeTreeBranch[] {
  return props.base.nodes
    .filter(node => node.parentId === parentId)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
    .map(node => ({ node, children: buildTree(node.id) }))
}

const tree = computed(() => buildTree())
const contentCount = computed(() => props.base.items.length)
const chapterCount = computed(() => props.base.nodes.filter(node => !node.contentId).length)
</script>

<template>
  <nav class="public-directory" aria-label="知识库目录">
    <div class="public-directory-heading">
      <span>目录</span>
      <span>{{ chapterCount }} 章 · {{ contentCount }} 篇</span>
    </div>
    <ul v-if="tree.length" class="public-directory-list">
      <KnowledgeTreeNode
        v-for="item in tree"
        :key="item.node.id"
        :item="item"
        :base-slug="base.slug"
        :active="active"
      />
    </ul>
    <p v-else class="directory-no-entries">暂时没有公开内容。</p>
  </nav>
</template>
