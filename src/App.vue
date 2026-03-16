<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

const route = useRoute()

const layout = computed(() => {
  if (route.meta.layout === 'DashboardLayout') return DashboardLayout
  if (route.meta.layout === 'AuthLayout') return AuthLayout
  return 'div' // Fallback
})
</script>

<template>
  <component :is="layout">
    <router-view />
  </component>
  <ToastContainer />
  <ConfirmModal />
</template>
