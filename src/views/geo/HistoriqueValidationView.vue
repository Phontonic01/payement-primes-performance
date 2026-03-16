<script setup>
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import { History, Filter } from 'lucide-vue-next'

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'agent', label: 'Agent' },
  { key: 'circuit', label: 'Circuit' },
  { key: 'statut', label: 'Statut Valide' },
  { key: 'justification', label: 'Justification' },
]

const historiques = [
  { id: 1, date: '2025-12-09', agent: 'Medza Ondo Scheila', circuit: 'PK8 - PK12', statut: 'VALIDE', justification: '-' },
  { id: 2, date: '2025-12-09', agent: 'Mamfoumbi Muriella', circuit: 'Owendo Port', statut: 'PARTIEL', justification: 'Deviation rue 3 non couverte' },
  { id: 3, date: '2025-12-08', agent: 'Maduka Tiburce', circuit: 'Akanda', statut: 'REFUSE', justification: 'Panne GPS signalee a 10h' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center gap-3">
      <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50">
        <History class="w-5 h-5 text-emerald-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Historique des Validations GPS (E22)</h1>
        <p class="text-sm text-gray-500">Consultez les validations passees</p>
      </div>
    </div>

    <!-- Filters + Table -->
    <BaseCard class="bg-white rounded-xl border border-gray-100">
      <!-- Filter Bar -->
      <div class="flex items-center gap-4 mb-6">
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <Filter class="w-4 h-4" />
          <span class="font-medium">Filtres</span>
        </div>
        <input
          type="date"
          class="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-150"
        />
        <select
          class="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-150"
        >
          <option value="">Tous les statuts</option>
          <option value="VALIDE">Valides</option>
          <option value="PARTIEL">Partiels</option>
          <option value="REFUSE">Refuses</option>
        </select>
      </div>

      <!-- Table -->
      <BaseTable :columns="columns" :rows="historiques">
        <template #cell-statut="{ value }">
          <BaseBadge v-if="value === 'VALIDE'" status="success" text="Valide (100%)" />
          <BaseBadge v-else-if="value === 'PARTIEL'" status="warning" text="Partiel (50%)" />
          <BaseBadge v-else-if="value === 'REFUSE'" status="danger" text="Refuse (0%)" />
        </template>
        <template #cell-justification="{ value }">
          <span class="text-xs text-gray-500 italic">{{ value }}</span>
        </template>
      </BaseTable>
    </BaseCard>
  </div>
</template>
