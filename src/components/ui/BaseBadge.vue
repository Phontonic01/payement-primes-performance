<script setup>
defineProps({
  status: { type: String, default: 'neutral' },
  text: { type: String, required: true }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide"
    :class="{
      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10': status === 'success',
      'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10': status === 'warning',
      'bg-red-50 text-red-700 ring-1 ring-red-600/10': status === 'danger',
      'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10': status === 'info',
      'bg-gray-50 text-gray-500 ring-1 ring-gray-500/10': status === 'neutral',
    }"
  >
    <span
      class="w-1.5 h-1.5 rounded-full"
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
