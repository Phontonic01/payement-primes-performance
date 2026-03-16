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
    bg: 'bg-emerald-50 border-emerald-200',
    icon: 'text-emerald-600',
    text: 'text-emerald-800',
    close: 'text-emerald-400 hover:text-emerald-600'
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-600',
    text: 'text-red-800',
    close: 'text-red-400 hover:text-red-600'
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-600',
    text: 'text-amber-800',
    close: 'text-amber-400 hover:text-amber-600'
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-600',
    text: 'text-blue-800',
    close: 'text-blue-400 hover:text-blue-600'
  }
}
</script>

<template>
  <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
    <TransitionGroup
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="translate-x-full opacity-0"
    >
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="pointer-events-auto w-80 max-w-sm rounded-xl border px-4 py-3 shadow-lg flex items-start gap-3"
        :class="styleMap[toast.type]?.bg"
      >
        <component
          :is="iconMap[toast.type]"
          class="w-5 h-5 flex-shrink-0 mt-0.5"
          :class="styleMap[toast.type]?.icon"
        />
        <p class="text-sm font-medium flex-1" :class="styleMap[toast.type]?.text">
          {{ toast.message }}
        </p>
        <button
          @click="toastStore.removeToast(toast.id)"
          class="flex-shrink-0 cursor-pointer transition-colors"
          :class="styleMap[toast.type]?.close"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
