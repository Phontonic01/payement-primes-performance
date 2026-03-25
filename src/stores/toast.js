import { defineStore } from 'pinia'
import { ref } from 'vue'

let nextId = 0

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])

  function addToast(message, type = 'info', duration = 4000) {
    const id = nextId++

    // Limit stack to 3 toasts
    if (toasts.value.length >= 3) {
      toasts.value.shift()
    }

    toasts.value.push({ id, message, type, visible: true })

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  function removeToast(id) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  return { toasts, addToast, removeToast }
})
