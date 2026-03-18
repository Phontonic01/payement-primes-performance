<script setup>
import { computed } from 'vue'
import { Eye } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  service: { type: String, default: 'ce service' }
})

const authStore = useAuthStore()
const show = computed(() => authStore.isReadOnly())

defineExpose({ show })
</script>

<template>
  <div v-if="show" class="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-center gap-3">
    <Eye class="w-5 h-5 text-blue-500 flex-shrink-0" />
    <p class="text-sm text-blue-700">
      <strong>Mode consultation</strong> — En tant que DAF, vous consultez les données de {{ service }}. Les saisies sont réservées au service concerné.
    </p>
  </div>
</template>
