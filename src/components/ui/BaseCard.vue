<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  noPadding: { type: Boolean, default: false }
})
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
    <div v-if="title || $slots.header" class="px-5 py-4 border-b border-gray-100">
      <slot name="header">
        <h3 class="text-sm font-semibold text-gray-900">{{ title }}</h3>
        <p v-if="subtitle" class="text-xs text-gray-400 mt-0.5">{{ subtitle }}</p>
      </slot>
    </div>
    <div :class="noPadding ? '' : 'p-5'">
      <slot></slot>
    </div>
  </div>
</template>
