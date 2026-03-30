<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Search, X, User, Hash } from 'lucide-vue-next'
import { useAgentsStore } from '@/stores/agents'

const props = defineProps({
  modelValue: { type: String, default: '' },
  date: { type: String, default: '' },
  filterPresents: { type: Boolean, default: false },
  serviceFilter: { type: String, default: '' },
  excludeRole: { type: String, default: '' },
  label: { type: String, default: 'Agent (Matricule ou Nom)' },
  required: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Tapez un matricule ou un nom...' },
})

const emit = defineEmits(['update:modelValue', 'agent-selected'])

const agentsStore = useAgentsStore()
agentsStore.ensureLoaded()
const query = ref('')
const isOpen = ref(false)
const selectedAgent = ref(null)
const highlightIndex = ref(-1)
const containerRef = ref(null)

// Résultats filtrés
const results = computed(() => {
  let list = agentsStore.searchAgents(query.value)

  // Filtrer par service si demandé (ex: 'TRI', 'COLLECTE')
  if (props.serviceFilter) {
    list = list.filter(a => a.service === props.serviceFilter)
  }

  // Exclure un rôle (ex: 'CHAUFFEUR' pour ne garder que les ripeurs)
  if (props.excludeRole) {
    list = list.filter(a => a.role !== props.excludeRole)
  }

  // Si on filtre par présence et qu'une date est définie
  if (props.filterPresents && props.date) {
    const presents = agentsStore.getPresents(props.date)
    const presentIds = new Set(presents.map(a => a.id))
    list = list.map(a => ({ ...a, present: presentIds.has(a.id) }))
    // Présents en premier
    list.sort((a, b) => (b.present ? 1 : 0) - (a.present ? 1 : 0))
  } else {
    list = list.map(a => ({ ...a, present: true }))
  }

  return list
})

// Sync quand modelValue change de l'extérieur
watch(() => props.modelValue, (val) => {
  if (val && val !== selectedAgent.value?.matricule) {
    const agent = agentsStore.getAgentByMatricule(val)
    if (agent) {
      selectedAgent.value = agent
      query.value = ''
    }
  } else if (!val) {
    selectedAgent.value = null
    query.value = ''
  }
}, { immediate: true })

function selectAgent(agent) {
  selectedAgent.value = agent
  query.value = ''
  isOpen.value = false
  highlightIndex.value = -1
  emit('update:modelValue', agent.matricule)
  emit('agent-selected', agent)
}

function clearSelection() {
  selectedAgent.value = null
  query.value = ''
  emit('update:modelValue', '')
  emit('agent-selected', null)
}

function onInputFocus() {
  isOpen.value = true
  highlightIndex.value = -1
}

function onKeydown(e) {
  if (!isOpen.value) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightIndex.value = Math.min(highlightIndex.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightIndex.value = Math.max(highlightIndex.value - 1, 0)
  } else if (e.key === 'Enter' && highlightIndex.value >= 0) {
    e.preventDefault()
    const agent = results.value[highlightIndex.value]
    if (agent.present !== false) selectAgent(agent)
  } else if (e.key === 'Escape') {
    isOpen.value = false
  }
}

// Fermer le dropdown quand on clique ailleurs
function handleClickOutside(e) {
  if (containerRef.value && !containerRef.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="space-y-1.5" ref="containerRef">
    <label v-if="label" class="flex items-center gap-1.5 text-sm font-medium text-gray-700">
      <User class="w-3.5 h-3.5 text-gray-400" />
      {{ label }}
      <span v-if="required" class="text-red-400">*</span>
    </label>

    <!-- Agent sélectionné -->
    <div v-if="selectedAgent" class="flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {{ selectedAgent.nom.charAt(0) }}
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-gray-900 truncate">{{ selectedAgent.nom }}</p>
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span class="flex items-center gap-1">
              <Hash class="w-3 h-3" />
              {{ selectedAgent.matricule }}
            </span>
            <span class="text-gray-300">|</span>
            <span>{{ selectedAgent.role }}</span>
            <span class="text-gray-300">|</span>
            <span>{{ selectedAgent.zone }}</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        @click="clearSelection"
        class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Champ de recherche -->
    <div v-else class="relative">
      <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <Search class="w-4 h-4 text-gray-400" />
      </div>
      <input
        type="text"
        v-model="query"
        :placeholder="placeholder"
        :required="required && !selectedAgent"
        @focus="onInputFocus"
        @keydown="onKeydown"
        class="block w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors duration-200"
      />

      <!-- Dropdown résultats -->
      <div
        v-if="isOpen && results.length > 0"
        class="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto"
      >
        <button
          v-for="(agent, i) in results"
          :key="agent.id"
          type="button"
          @click="agent.present !== false && selectAgent(agent)"
          class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100"
          :class="[
            highlightIndex === i ? 'bg-emerald-50' : 'hover:bg-gray-50',
            agent.present === false ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          ]"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            :class="agent.present !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'"
          >
            {{ agent.nom.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ agent.nom }}</p>
            <p class="text-xs text-gray-500">
              {{ agent.matricule }} · {{ agent.role }} · {{ agent.zone }}
            </p>
          </div>
          <div v-if="filterPresents && date">
            <span
              v-if="agent.present"
              class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-700"
            >Présent</span>
            <span
              v-else
              class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-400"
            >Absent</span>
          </div>
        </button>
      </div>

      <!-- Aucun résultat -->
      <div
        v-if="isOpen && query.length > 0 && results.length === 0"
        class="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center"
      >
        <p class="text-sm text-gray-500">Aucun agent trouvé pour "{{ query }}"</p>
      </div>
    </div>
  </div>
</template>
