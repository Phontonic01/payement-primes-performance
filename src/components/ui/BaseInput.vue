<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  id: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  min: { type: [String, Number], default: undefined },
  max: { type: [String, Number], default: undefined },
  step: { type: [String, Number], default: undefined },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const inputId = computed(() => props.id || 'input-' + props.label.toLowerCase().replace(/[^a-z0-9]/g, '-'))
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="inputId" class="block text-[13px] font-medium text-gray-600">
      {{ label }}
      <span v-if="required" class="text-red-400 ml-0.5">*</span>
    </label>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :aria-required="required || undefined"
      @input="emit('update:modelValue', $event.target.value)"
      class="block w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400
             shadow-sm shadow-gray-900/[0.02]
             focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none
             disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
             transition-colors duration-150"
    />
  </div>
</template>
