<script setup>
import { ref, computed, onMounted } from 'vue'
import { History, Recycle } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import TableSkeleton from '@/components/ui/TableSkeleton.vue'

const loading = ref(true)
onMounted(() => { setTimeout(() => { loading.value = false }, 500) })

const agentFilter = ref('')

const columns = [
  { key: 'dateFr', label: 'Date' },
  { key: 'agent', label: 'Agent' },
  { key: 'circuit', label: 'Zone / Circuit' },
  { key: 'plastique', label: 'Plastiques (kg)' },
  { key: 'carton', label: 'Cartons (kg)' },
  { key: 'autre', label: 'Autres (kg)' },
  { key: 'total', label: 'Total (kg)' },
  { key: 'etat', label: 'État' },
]

// Placeholder — les données seront alimentées depuis le store saisies
const historiques = computed(() => [])

const filteredHistoriques = computed(() => {
  if (!agentFilter.value) return historiques.value
  return historiques.value.filter(h => h.matricule === agentFilter.value)
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50">
        <History class="w-5 h-5 text-teal-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Historique Collecte Sélective</h1>
        <p class="text-sm text-gray-500">Service TRI - Suivi des pesées et bonus recyclage</p>
      </div>
    </div>

    <!-- Info -->
    <div class="rounded-xl bg-teal-50 border border-teal-100 p-4 flex items-start gap-3">
      <Recycle class="w-5 h-5 text-teal-500 mt-0.5 shrink-0" />
      <p class="text-sm text-teal-700">
        Ce tableau recense toutes les pesées de collecte sélective effectuées par le service TRI.
        Les bonus sont calculés automatiquement selon le barème en vigueur.
      </p>
    </div>

    <BaseCard>
      <div class="flex flex-col md:flex-row gap-4 mb-6 items-end">
        <input type="month" class="block text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors" />
        <div class="flex-1 max-w-sm">
          <AgentSearchInput
            v-model="agentFilter"
            label="Filtrer par agent"
            placeholder="Matricule ou nom..."
            :filter-presents="false"
          />
        </div>
      </div>

      <TableSkeleton v-if="loading" :rows="5" :cols="8" />
      <template v-else>
        <BaseTable v-if="historiques.length > 0" :columns="columns" :rows="filteredHistoriques">
          <template #cell-total="{ value }">
            <span class="font-semibold text-teal-700">{{ value }} kg</span>
          </template>
          <template #cell-etat="{ value }">
            <BaseBadge v-if="value === 'ENREGISTRE'" status="success" text="Enregistré" />
            <BaseBadge v-else status="neutral" :text="value" />
          </template>
        </BaseTable>
        <div v-else class="text-center py-12 text-gray-400">
          <Recycle class="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p class="text-sm font-medium">Aucune pesée enregistrée pour cette période</p>
          <p class="text-xs mt-1">Les saisies de collecte sélective apparaîtront ici.</p>
        </div>
      </template>
    </BaseCard>
  </div>
</template>
