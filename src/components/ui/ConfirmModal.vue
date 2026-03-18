<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useConfirmStore } from '@/stores/confirm'
import { AlertTriangle } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'

const confirmStore = useConfirmStore()

function onKeydown(e) {
  if (!confirmStore.isOpen) return
  if (e.key === 'Escape') {
    confirmStore.cancel()
  } else if (e.key === 'Enter') {
    confirmStore.confirm()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="confirmStore.isOpen"
        class="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          @click="confirmStore.cancel()"
        ></div>

        <!-- Modal -->
        <div class="relative bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-md overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
          <div class="p-6">
            <!-- Icon -->
            <div
              class="mx-auto mb-4 w-12 h-12 rounded-xl flex items-center justify-center"
              :class="confirmStore.variant === 'danger' ? 'bg-red-50' : 'bg-emerald-50'"
            >
              <AlertTriangle
                class="w-6 h-6"
                :class="confirmStore.variant === 'danger' ? 'text-red-600' : 'text-emerald-600'"
              />
            </div>

            <!-- Content -->
            <h3 id="confirm-modal-title" class="text-lg font-semibold text-gray-900 text-center mb-2">
              {{ confirmStore.title }}
            </h3>
            <p class="text-sm text-gray-500 text-center leading-relaxed">
              {{ confirmStore.message }}
            </p>
          </div>

          <!-- Actions -->
          <div class="px-6 pb-6 flex gap-3">
            <BaseButton
              variant="outline"
              class="flex-1"
              @click="confirmStore.cancel()"
            >
              {{ confirmStore.cancelText }}
            </BaseButton>
            <BaseButton
              :variant="confirmStore.variant === 'danger' ? 'danger' : 'primary'"
              class="flex-1"
              @click="confirmStore.confirm()"
            >
              {{ confirmStore.confirmText }}
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
