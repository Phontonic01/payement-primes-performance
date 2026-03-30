<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  inputClass: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

// Formater YYYY-MM-DD → DD/MM/YYYY pour l'affichage
const displayValue = computed(() => {
  if (!props.modelValue) return ''
  const [y, m, d] = props.modelValue.split('-')
  if (!y || !m || !d) return props.modelValue
  return `${d}/${m}/${y}`
})

function onChange(e) {
  emit('update:modelValue', e.target.value)
}
</script>

<template>
  <div class="relative inline-flex items-center">
    <!-- Texte affiché en JJ/MM/AAAA par-dessus l'input -->
    <span
      class="absolute left-4 text-sm pointer-events-none z-10"
      :class="displayValue ? 'text-gray-900' : 'text-gray-400'"
    >
      {{ displayValue || 'JJ/MM/AAAA' }}
    </span>
    <!-- Input date natif (texte rendu invisible via color transparent) -->
    <input
      type="date"
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      @change="onChange"
      :class="[
        'rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-200',
        'disabled:bg-gray-50 disabled:cursor-not-allowed',
        'text-transparent',
        inputClass
      ]"
    />
  </div>
</template>
