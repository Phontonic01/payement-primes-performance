<script setup>
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Eye, MapPin, Clock } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'agent', label: 'Agent' },
  { key: 'circuit', label: 'Circuit' },
  { key: 'declare', label: 'Déclaration (Terrain)' },
  { key: 'statut', label: 'Statut' },
]

const files = [
  { id: 1, date: '2025-12-10', agent: 'Jean MOUSSAVOU', circuit: 'PK8 - PK12', declare: 'OUI', statut: 'ATTENTE' },
  { id: 2, date: '2025-12-10', agent: 'Paul ONDO', circuit: 'Owendo Port', declare: 'OUI', statut: 'ATTENTE' }
]

function voirDetails(id) {
  router.push(`/geo/detail/${id}`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50">
          <MapPin class="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">File de validation (E20)</h1>
          <p class="text-sm text-gray-500">Service Geolocalisation</p>
        </div>
      </div>
      <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
        <Clock class="w-4 h-4 text-amber-600" />
        <span class="text-sm font-medium text-amber-700">{{ files.length }} en attente</span>
      </div>
    </div>

    <!-- Validation Queue Table -->
    <BaseCard class="bg-white rounded-xl border border-gray-100">
      <BaseTable :columns="columns" :rows="files">
        <template #cell-declare="{ value }">
          <span class="font-semibold text-emerald-600">{{ value }}</span>
        </template>
        <template #cell-statut>
          <BaseBadge status="warning" text="En attente GEO" />
        </template>
        <template #actions="{ row }">
          <BaseButton @click="voirDetails(row.id)" variant="primary" size="sm" class="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors duration-150">
            <Eye class="w-4 h-4" />
            Analyser Trajet
          </BaseButton>
        </template>
      </BaseTable>
    </BaseCard>
  </div>
</template>
