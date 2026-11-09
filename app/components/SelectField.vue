<script setup lang="ts" generic="T extends string | null">
import { Check, ChevronDown } from 'lucide-vue-next'

interface SelectOption {
  value: T
  label: string
  depth?: number
}

const props = withDefaults(defineProps<{
  modelValue: T
  options: SelectOption[]
  label?: string
  accessibleLabel?: string
  placeholder?: string
  size?: 'default' | 'compact'
  disabled?: boolean
}>(), {
  label: '',
  accessibleLabel: '',
  placeholder: '请选择',
  size: 'default',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: T]
  change: [value: T]
}>()

const fieldId = useId()
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const open = ref(false)
const activeIndex = ref(0)
const menuStyle = ref<Record<string, string>>({})
const listboxId = computed(() => `${fieldId}-listbox`)
const activeOptionId = computed(() => `${fieldId}-option-${activeIndex.value}`)
const currentIndex = computed(() => props.options.findIndex(option => option.value === props.modelValue))
const current = computed(() => props.options.find(option => option.value === props.modelValue))
const accessibleName = computed(() => props.accessibleLabel || props.label || props.placeholder)

/**
 * 根据触发器的位置计算弹层坐标，避免滚动容器裁切菜单。
 * @returns 无。
 * @throws 无。
 */
function updateMenuPosition() {
  if (!open.value) return
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  if (rect.bottom < 0 || rect.top > window.innerHeight) {
    open.value = false
    return
  }

  const viewportGap = 12
  const desiredHeight = Math.min(props.options.length * 38 + 12, 300)
  const spaceBelow = Math.max(window.innerHeight - rect.bottom - viewportGap, 0)
  const spaceAbove = Math.max(rect.top - viewportGap, 0)
  const placeAbove = spaceBelow < desiredHeight && spaceAbove > spaceBelow
  const availableHeight = placeAbove ? spaceAbove : spaceBelow
  const width = Math.min(rect.width, window.innerWidth - viewportGap * 2)
  const left = Math.min(Math.max(rect.left, viewportGap), window.innerWidth - width - viewportGap)
  const top = placeAbove
    ? Math.max(viewportGap, rect.top - Math.min(desiredHeight, availableHeight) - 8)
    : rect.bottom + 8

  menuStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    maxHeight: `${Math.min(desiredHeight, availableHeight)}px`,
  }
}

/**
 * 将活动选项滚动到菜单可视区域。
 * @returns 无。
 * @throws 无。
 */
function revealActiveOption() {
  const options = menu.value?.querySelectorAll<HTMLElement>('[role="option"]')
  options?.[activeIndex.value]?.scrollIntoView({ block: 'nearest' })
}

/**
 * 打开菜单并从当前值开始导航。
 * @param index 可选初始活动项。
 * @returns 无。
 * @throws 无。
 */
function openPicker(index = currentIndex.value) {
  if (props.disabled || !props.options.length) return
  activeIndex.value = index >= 0 ? index : 0
  open.value = true
  nextTick(() => {
    updateMenuPosition()
    revealActiveOption()
  })
}

/**
 * 关闭菜单，可选择将焦点归还触发器。
 * @param restoreFocus 是否重新聚焦触发器。
 * @returns 无。
 * @throws 无。
 */
function closePicker(restoreFocus = false) {
  open.value = false
  if (restoreFocus) nextTick(() => trigger.value?.focus())
}

/**
 * 切换菜单展开状态。
 * @returns 无。
 * @throws 无。
 */
function togglePicker() {
  if (open.value) closePicker()
  else openPicker()
}

/**
 * 选择选项并同步表单值。
 * @param index 选项索引。
 * @returns 无。
 * @throws 无。
 */
function selectOption(index: number) {
  const option = props.options[index]
  if (!option) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  closePicker(true)
}

/**
 * 移动活动选项。
 * @param offset 相对位移。
 * @returns 无。
 * @throws 无。
 */
function moveActive(offset: number) {
  const total = props.options.length
  if (!total) return
  activeIndex.value = (activeIndex.value + offset + total) % total
  nextTick(revealActiveOption)
}

/**
 * 处理触发器上的键盘交互。
 * @param event 键盘事件。
 * @returns 无。
 * @throws 无。
 */
function onTriggerKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (open.value) moveActive(1)
      else openPicker(currentIndex.value >= 0 ? currentIndex.value : 0)
      break
    case 'ArrowUp':
      event.preventDefault()
      if (open.value) moveActive(-1)
      else openPicker(currentIndex.value >= 0 ? currentIndex.value : props.options.length - 1)
      break
    case 'Home':
      if (!open.value) return
      event.preventDefault()
      activeIndex.value = 0
      nextTick(revealActiveOption)
      break
    case 'End':
      if (!open.value) return
      event.preventDefault()
      activeIndex.value = props.options.length - 1
      nextTick(revealActiveOption)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (open.value) selectOption(activeIndex.value)
      else openPicker()
      break
    case 'Escape':
      if (!open.value) return
      event.preventDefault()
      closePicker(true)
      break
    case 'Tab':
      if (open.value) closePicker()
      break
  }
}

/**
 * 点击组件外部时关闭菜单。
 * @param event 指针事件。
 * @returns 无。
 * @throws 无。
 */
function onDocumentPointerDown(event: PointerEvent) {
  if (!open.value) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (root.value?.contains(target) || menu.value?.contains(target)) return
  closePicker()
}

watch(open, value => {
  if (!value) menuStyle.value = {}
})

watch(() => props.modelValue, () => closePicker())

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  window.addEventListener('resize', updateMenuPosition)
  document.addEventListener('scroll', updateMenuPosition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  window.removeEventListener('resize', updateMenuPosition)
  document.removeEventListener('scroll', updateMenuPosition, true)
})
</script>

<template>
  <div
    ref="root"
    class="app-select"
    :class="[`is-${size}`, { 'is-open': open }]"
  >
    <span v-if="label" class="app-select-label">{{ label }}</span>
    <button
      ref="trigger"
      type="button"
      class="app-select-trigger"
      role="combobox"
      aria-haspopup="listbox"
      :aria-label="accessibleName"
      :aria-controls="listboxId"
      :aria-expanded="open"
      :aria-activedescendant="open ? activeOptionId : undefined"
      :disabled="disabled"
      :data-value="modelValue ?? ''"
      @click="togglePicker"
      @keydown="onTriggerKeydown"
    >
      <span class="app-select-value">{{ current?.label || placeholder }}</span>
      <span class="app-select-chevron" aria-hidden="true"><ChevronDown :size="14" /></span>
    </button>

    <Teleport to="body">
      <Transition name="app-select-pop">
        <div
          v-if="open"
          ref="menu"
          class="app-select-menu"
          :style="menuStyle"
          @keydown.esc.prevent="closePicker(true)"
        >
          <div
            :id="listboxId"
            role="listbox"
            :aria-label="`${accessibleName}选项`"
          >
            <button
              v-for="(option, index) in options"
              :id="`${fieldId}-option-${index}`"
              :key="`${String(option.value)}-${index}`"
              type="button"
              class="app-select-option"
              :class="{ 'is-active': index === activeIndex }"
              role="option"
              tabindex="-1"
              :aria-selected="option.value === modelValue"
              :data-value="option.value ?? ''"
              :style="{ paddingLeft: `${10 + Math.min(option.depth || 0, 8) * 10}px` }"
              @mouseenter="activeIndex = index"
              @click="selectOption(index)"
            >
              <span>{{ option.label }}</span>
              <Check v-if="option.value === modelValue" :size="14" aria-hidden="true" />
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
