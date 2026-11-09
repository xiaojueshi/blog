<script setup lang="ts">
interface KnowledgeBaseOption {
  id: string
  slug: string
  title: string
}

const props = withDefaults(defineProps<{
  bases: KnowledgeBaseOption[]
  selected: string
  label?: string
  accessibleLabel?: string
}>(), {
  label: '知识库',
  accessibleLabel: '选择知识库',
})

const emit = defineEmits<{ select: [slug: string] }>()
const options = computed(() => props.bases.map(base => ({ value: base.slug, label: base.title })))

/**
 * 将通用选择器的变更转换为知识库切换事件。
 * @param slug 选中的知识库标识。
 * @returns 无。
 * @throws 无。
 */
function changeBase(slug: string | null) {
  if (slug) emit('select', slug)
}
</script>

<template>
  <SelectField
    :model-value="selected"
    :options="options"
    :label="label"
    :accessible-label="accessibleLabel"
    @change="changeBase"
  />
</template>
