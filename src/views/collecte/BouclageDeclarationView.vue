<script setup>
import { ref } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Check, X, MapPin, Calendar, Route } from 'lucide-vue-next'

const dateFiltre = ref(new Date().toISOString().split('T')[0])

const columns = [
  { key: 'agent', label: 'Agent (Chauffeur)' },
  { key: 'vehicule', label: 'Vehicule' },
  { key: 'circuit', label: 'Circuit' },
  { key: 'statut_geo', label: 'Statut GPS' }
]

const circuits = ref([
  { id: 1, agent: 'Medza Ondo Scheila', vehicule: 'BOM (1234AB)', circuit: 'PK8 - PK12', statut_geo: 'EN_ATTENTE_GEO', bouclage_declare: null },
  { id: 2, agent: 'Mamfoumbi Muriella', vehicule: 'Plateaux (5678CD)', circuit: 'Owendo Port', statut_geo: 'NON_SAISI', bouclage_declare: null },
  { id: 3, agent: 'Maduka Tiburce', vehicule: 'Canter (9012EF)', circuit: 'Akanda Centre', statut_geo: 'VALIDE', bouclage_declare: true },
])

function declarer(id, estBoucle) {
  const c = circuits.value.find(c => c.id === id)
  if (c) {
    c.bouclage_declare = estBoucle
    c.statut_geo = 'EN_ATTENTE_GEO'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Declaration Bouclage</h1>
        <p class="text-sm text-gray-500 mt-0.5">Module E11 — Validation des circuits de collecte</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
          <MapPin class="w-4 h-4 text-emerald-600" />
          <span class="text-sm font-medium text-gray-700">Service Collecte</span>
        </div>
      </div>
    </div>

    <!-- Date filter bar -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Route class="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900">Circuits du jour</h3>
          <p class="text-xs text-gray-500">{{ circuits.length }} circuits a traiter</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Calendar class="w-4 h-4 text-gray-400" />
        <input
          type="date"
          v-model="dateFiltre"
          class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-200"
        />
      </div>
    </div>

    <!-- Circuits table -->
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <BaseTable :columns="columns" :rows="circuits">
        <!-- Statut GEO Cell Override -->
        <template #cell-statut_geo="{ value }">
          <BaseBadge v-if="value === 'VALIDE'" status="success" text="Valide (100%)" />
          <BaseBadge v-else-if="value === 'EN_ATTENTE_GEO'" status="warning" text="En attente GEO" />
          <BaseBadge v-else-if="value === 'PARTIEL'" status="warning" text="Partiel (50%)" />
          <BaseBadge v-else-if="value === 'REFUSE'" status="danger" text="Refuse (0%)" />
          <BaseBadge v-else status="neutral" text="Non saisi" />
        </template>

        <!-- Actions (OUI/NON) -->
        <template #actions="{ row }">
          <div v-if="row.statut_geo === 'NON_SAISI' || row.bouclage_declare === null" class="flex items-center gap-2 justify-end">
            <button
              @click="declarer(row.id, true)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors duration-200"
            >
              <Check class="w-3.5 h-3.5" />
              Oui
            </button>
            <button
              @click="declarer(row.id, false)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors duration-200"
            >
              <X class="w-3.5 h-3.5" />
              Non
            </button>
          </div>
          <div v-else class="flex justify-end items-center">
            <span
              v-if="row.bouclage_declare"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg"
            >
              <Check class="w-3.5 h-3.5" />
              Declare OUI
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 px-3 py-1.5 rounded-lg"
            >
              <X class="w-3.5 h-3.5" />
              Declare NON
            </span>
          </div>
        </template>
      </BaseTable>
    </div>
  </div>
</template>
