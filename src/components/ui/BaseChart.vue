<script setup>
import { computed } from 'vue'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, Filler,
  BarElement, CategoryScale, LinearScale,
  ArcElement,
  PointElement, LineElement,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'

ChartJS.register(
  Title, Tooltip, Legend, Filler,
  BarElement, CategoryScale, LinearScale,
  ArcElement,
  PointElement, LineElement,
)

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (v) => ['bar', 'line', 'doughnut'].includes(v),
  },
  data: {
    type: Object,
    required: true,
  },
  options: {
    type: Object,
    default: () => ({}),
  },
  height: {
    type: Number,
    default: null,
  },
})

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: false,
      labels: {
        font: { family: 'Inter, system-ui, sans-serif', size: 12 },
        color: '#6b7280',
        usePointStyle: true,
        pointStyleWidth: 8,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: '#111827',
      titleFont: { family: 'Inter, system-ui, sans-serif', size: 12, weight: '600' },
      bodyFont: { family: 'Inter, system-ui, sans-serif', size: 11 },
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
      boxPadding: 4,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { family: 'Inter, system-ui, sans-serif', size: 11 },
        color: '#9ca3af',
      },
    },
    y: {
      grid: { color: '#f3f4f6' },
      ticks: {
        font: { family: 'Inter, system-ui, sans-serif', size: 11 },
        color: '#9ca3af',
      },
    },
  },
}

const mergedOptions = computed(() => {
  const base = JSON.parse(JSON.stringify(defaultOptions))
  const custom = props.options

  // For doughnut, remove scales
  if (props.type === 'doughnut') {
    delete base.scales
  }

  // Deep merge custom into base
  return deepMerge(base, custom)
})

function deepMerge(target, source) {
  if (!source) return target
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

const chartComponent = computed(() => {
  switch (props.type) {
    case 'bar': return Bar
    case 'doughnut': return Doughnut
    case 'line': return Line
    default: return Bar
  }
})
</script>

<template>
  <component
    :is="chartComponent"
    :data="data"
    :options="mergedOptions"
    :style="height ? { height: height + 'px' } : {}"
  />
</template>
