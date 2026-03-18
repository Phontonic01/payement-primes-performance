<script setup>
defineProps({
  width: {
    type: String,
    default: '100%',
  },
  height: {
    type: String,
    default: '1rem',
  },
  rounded: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <div
    class="animate-pulse bg-gray-200 dark:bg-gray-700"
    :class="rounded ? 'rounded-full' : 'rounded-lg'"
    :style="{ width, height }"
    role="status"
    aria-label="Chargement..."
  ></div>
</template>
