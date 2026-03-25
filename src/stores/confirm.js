import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConfirmStore = defineStore('confirm', () => {
  const isOpen = ref(false)
  const title = ref('')
  const message = ref('')
  const confirmText = ref('Confirmer')
  const cancelText = ref('Annuler')
  const variant = ref('primary')

  let resolvePromise = null

  function open(options = {}) {
    title.value = options.title || 'Confirmation'
    message.value = options.message || ''
    confirmText.value = options.confirmText || 'Confirmer'
    cancelText.value = options.cancelText || 'Annuler'
    variant.value = options.variant || 'primary'
    isOpen.value = true

    return new Promise((resolve) => {
      resolvePromise = resolve
    })
  }

  function confirm() {
    isOpen.value = false
    if (resolvePromise) resolvePromise(true)
    resolvePromise = null
  }

  function cancel() {
    isOpen.value = false
    if (resolvePromise) resolvePromise(false)
    resolvePromise = null
  }

  return { isOpen, title, message, confirmText, cancelText, variant, open, confirm, cancel }
})
