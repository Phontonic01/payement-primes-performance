<script setup>
import BaseSkeleton from './BaseSkeleton.vue'

defineProps({
  rows: { type: Number, default: 5 },
  cols: { type: Number, default: 5 },
})
</script>

<template>
  <div class="overflow-hidden" role="status" aria-label="Chargement du tableau...">
    <!-- Header skeleton -->
    <div class="flex gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
      <BaseSkeleton v-for="c in cols" :key="'h-' + c" height="0.75rem" :width="c === 1 ? '40%' : '15%'" />
    </div>
    <!-- Row skeletons -->
    <div
      v-for="r in rows"
      :key="'r-' + r"
      class="flex items-center gap-4 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800"
    >
      <BaseSkeleton v-for="c in cols" :key="'c-' + c" height="0.875rem" :width="c === 1 ? '50%' : '18%'" />
    </div>
  </div>
</template>
