<script setup>
defineProps({
  status: { type: String, default: 'neutral' },
  text: { type: String, required: true }
})
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
    :class="{
      'bg-emerald-50 text-emerald-700': status === 'success',
      'bg-amber-50 text-amber-700': status === 'warning',
      'bg-red-50 text-red-700': status === 'danger',
      'bg-blue-50 text-blue-700': status === 'info',
      'bg-gray-100 text-gray-600': status === 'neutral',
    }"
  >
    <span
      class="w-1.5 h-1.5 rounded-full mr-1.5"
      :class="{
        'bg-emerald-500': status === 'success',
        'bg-amber-500': status === 'warning',
        'bg-red-500': status === 'danger',
        'bg-blue-500': status === 'info',
        'bg-gray-400': status === 'neutral',
      }"
    ></span>
    {{ text }}
  </span>
</template>
