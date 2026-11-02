<script setup lang="ts">
const tilt = ref({ x: -20, y: -32 })
const reduced = ref(true)
onMounted(() => { reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches })
function move(event: PointerEvent) {
  if (reduced.value || event.pointerType === 'touch') return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  tilt.value = { x: -20 + ((event.clientY - rect.top) / rect.height - .5) * 16, y: -32 + ((event.clientX - rect.left) / rect.width - .5) * 24 }
}
</script>
<template>
  <div class="signal-scene" aria-hidden="true" @pointermove="move" @pointerleave="tilt = { x: -20, y: -32 }">
    <div class="signal-grid" />
    <div class="signal-cube" :style="{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }">
      <div v-for="face in ['front', 'back', 'left', 'right', 'top', 'bottom']" :key="face" class="cube-face" :class="face"><span /></div>
    </div>
    <div class="signal-shadow" />
    <span class="signal-coordinate">01 — EXPLORING POSSIBILITIES</span>
    <span class="signal-cross first">+</span><span class="signal-cross second">+</span>
  </div>
</template>
<style scoped>
.signal-scene{height:360px;position:relative;perspective:950px;isolation:isolate;overflow:hidden}
.signal-grid{position:absolute;inset:30px;background-image:linear-gradient(var(--art-grid) 1px,transparent 1px),linear-gradient(90deg,var(--art-grid) 1px,transparent 1px);background-size:32px 32px;mask-image:radial-gradient(ellipse,#000 8%,transparent 68%)}
.signal-cube{--edge:146px;--half:73px;position:absolute;left:calc(50% - var(--half));top:calc(50% - var(--half) - 12px);width:var(--edge);height:var(--edge);transform-style:preserve-3d;transition:transform .4s ease-out;z-index:2}
.cube-face{position:absolute;inset:0;border:1px solid var(--art-border);background:var(--art-face);backface-visibility:visible;display:grid;place-items:center}
.cube-face span{width:53%;height:53%;border:1px solid var(--art-inner-border);background:var(--art-inner)}
.front{transform:translateZ(var(--half));background:var(--art-front)}.back{transform:rotateY(180deg) translateZ(var(--half))}.left{transform:rotateY(-90deg) translateZ(var(--half));background:var(--art-side)}.right{transform:rotateY(90deg) translateZ(var(--half))}.top{transform:rotateX(90deg) translateZ(var(--half));background:var(--art-top)}.bottom{transform:rotateX(-90deg) translateZ(var(--half));background:var(--art-bottom)}
.signal-shadow{position:absolute;left:calc(50% - 76px);top:270px;width:160px;height:15px;background:var(--art-shadow);border-radius:50%;filter:blur(14px)}
.signal-coordinate{position:absolute;bottom:13px;left:50%;transform:translateX(-50%);white-space:nowrap;font:9px monospace;letter-spacing:1.1px;color:var(--text-muted)}
.signal-cross{position:absolute;font:17px monospace;color:var(--text-faint)}.first{top:52px;right:43px}.second{bottom:50px;left:43px}
@media(max-width:800px){.signal-cube{--edge:120px;--half:60px}.signal-scene{height:320px}.signal-cross{display:none}.signal-coordinate{font-size:7px;letter-spacing:.5px}}
@media(max-width:600px){.signal-scene{display:none}}
@media(prefers-reduced-motion:reduce){.signal-cube{transition:none!important;transform:rotateX(-20deg) rotateY(-32deg)!important}}
</style>
