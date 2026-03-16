<script setup>
import { ref, computed } from 'vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import { Calendar, ClipboardList } from 'lucide-vue-next'

const agentFilter = ref('')
const monthFilter = ref('2025-12')

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'agent', label: 'Agent' },
  { key: 'vehicule', label: 'Vehicule' },
  { key: 'tonnage', label: 'Tonnage' },
  { key: 'score', label: 'Score Tonnage' },
  { key: 'bouclage', label: 'Bouclage GPS' }
]

const historiques = [
  { id: 1, date: '2025-12-10', agent: 'Medza Ondo Scheila', matricule: '2823', vehicule: 'BOM', tonnage: '22 t (2 rot.)', score: '100%', bouclage: 'VALIDE' },
  { id: 2, date: '2025-12-09', agent: 'Medza Ondo Scheila', matricule: '2823', vehicule: 'BOM', tonnage: '16 t (2 rot.)', score: '75%', bouclage: 'VALIDE' },
  { id: 3, date: '2025-12-09', agent: 'Mamfoumbi Muriella', matricule: '2948', vehicule: 'Plateaux', tonnage: '7.5 t (3 rot.)', score: '75%', bouclage: 'PARTIEL' },
  { id: 4, date: '2025-12-09', agent: 'Maduka Tiburce', matricule: '1495', vehicule: 'Canter', tonnage: '1.2 t (3 rot.)', score: '50%', bouclage: 'VALIDE' },
  { id: 5, date: '2025-12-10', agent: 'Tengou Joram', matricule: '2768', vehicule: 'BOM', tonnage: '22 t (2 rot.)', score: '100%', bouclage: 'VALIDE' },
]

const filteredHistoriques = computed(() => {
  if (!agentFilter.value) return historiques
  return historiques.filter(h => h.matricule === agentFilter.value)
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Historique des Saisies</h1>
        <p class="text-sm text-gray-500 mt-0.5">Module E12 — Consultation des releves de collecte</p>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
        <ClipboardList class="w-4 h-4 text-emerald-600" />
        <span class="text-sm font-medium text-gray-700">{{ filteredHistoriques.length }} enregistrements</span>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-end gap-4">
        <div class="flex-1 max-w-sm">
          <AgentSearchInput
            v-model="agentFilter"
            label="Filtrer par agent"
            placeholder="Matricule ou nom..."
            :filter-presents="false"
          />
        </div>
        <div class="flex items-center gap-2">
          <Calendar class="w-4 h-4 text-gray-400" />
          <input
            v-model="monthFilter"
            type="month"
            class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-200"
          />
        </div>
      </div>

      <BaseTable :columns="columns" :rows="filteredHistoriques">
        <template #cell-score="{ value }">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono"
            :class="{
              'text-emerald-700 bg-emerald-50': value === '100%',
              'text-emerald-600 bg-emerald-50/70': value === '75%',
              'text-amber-700 bg-amber-50': value === '50%',
              'text-red-700 bg-red-50': value === '0%'
            }"
          >
            {{ value }}
          </span>
        </template>
        <template #cell-bouclage="{ value }">
          <BaseBadge v-if="value === 'VALIDE'" status="success" text="100%" />
          <BaseBadge v-else-if="value === 'PARTIEL'" status="warning" text="50%" />
          <BaseBadge v-else status="neutral" text="En attente" />
        </template>
      </BaseTable>
    </div>
  </div>
</template>
