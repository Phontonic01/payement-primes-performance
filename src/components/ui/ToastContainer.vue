<script setup>
import { useToastStore } from '@/stores/toast'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'

const toastStore = useToastStore()

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
}

const styleMap = {
  success: {
    bg: 'bg-white border-emerald-200 shadow-emerald-100/50',
    icon: 'text-emerald-500',
    text: 'text-gray-800',
    bar: 'bg-emerald-500',
    close: 'text-gray-400 hover:text-gray-600'
  },
  error: {
    bg: 'bg-white border-red-200 shadow-red-100/50',
    icon: 'text-red-500',
    text: 'text-gray-800',
    bar: 'bg-red-500',
    close: 'text-gray-400 hover:text-gray-600'
  },
  warning: {
    bg: 'bg-white border-amber-200 shadow-amber-100/50',
    icon: 'text-amber-500',
    text: 'text-gray-800',
    bar: 'bg-amber-500',
    close: 'text-gray-400 hover:text-gray-600'
  },
  info: {
    bg: 'bg-white border-blue-200 shadow-blue-100/50',
    icon: 'text-blue-500',
    text: 'text-gray-800',
    bar: 'bg-blue-500',
    close: 'text-gray-400 hover:text-gray-600'
  }
}
</script>

<template>
  <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none" role="status" aria-live="polite">
    <TransitionGroup
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-x-full opacity-0 scale-95"
      enter-to-class="translate-x-0 opacity-100 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-x-0 opacity-100 scale-100"
      leave-to-class="translate-x-full opacity-0 scale-95"
    >
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="pointer-events-auto w-80 max-w-sm rounded-xl border px-4 py-3.5 shadow-lg flex items-start gap-3 relative overflow-hidden"
        :class="styleMap[toast.type]?.bg"
      >
        <!-- Color bar -->
        <div class="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" :class="styleMap[toast.type]?.bar"></div>

        <component
          :is="iconMap[toast.type]"
          class="w-5 h-5 flex-shrink-0 mt-0.5 ml-1"
          :class="styleMap[toast.type]?.icon"
        />
        <p class="text-sm flex-1 leading-relaxed" :class="styleMap[toast.type]?.text">
          {{ toast.message }}
        </p>
        <button
          @click="toastStore.removeToast(toast.id)"
          class="flex-shrink-0 cursor-pointer transition-colors p-0.5 rounded-md hover:bg-gray-100"
          :class="styleMap[toast.type]?.close"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
