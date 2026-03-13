<script setup>
defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})
</script>

<template>
  <button
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center font-semibold rounded-xl cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1"
    :class="[
      {
        'px-5 py-2.5 text-sm': size === 'md',
        'px-3.5 py-1.5 text-xs': size === 'sm',
        'px-6 py-3 text-sm': size === 'lg',
      },
      variant === 'primary' && 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 hover:shadow-emerald-700/30 focus:ring-emerald-500 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed',
      variant === 'danger' && 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 focus:ring-red-500 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed',
      variant === 'outline' && 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed',
      variant === 'ghost' && 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-emerald-500',
    ]"
  >
    <svg v-if="loading" class="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
      <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" class="opacity-75" />
    </svg>
    <slot></slot>
  </button>
</template>
