<script setup>
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FileText, Plus, Search } from 'lucide-vue-next'

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'agent', label: 'Chauffeur' },
  { key: 'vehicule', label: 'Vehicule' },
  { key: 'score', label: 'Score Moyen' },
  { key: 'observations', label: 'Observations' },
]

const historiques = [
  { id: 1, date: '2025-12-10', agent: 'Jean MOUSSAVOU', vehicule: 'GA-123-AB', score: 9.5, observations: 'RAS' },
  { id: 2, date: '2025-12-09', agent: 'Paul ONDO', vehicule: 'GA-456-CD', score: 6.0, observations: 'Pneu AVG use, signale.' },
  { id: 3, date: '2025-12-08', agent: 'Marie NDONG', vehicule: 'GA-123-AB', score: 4.5, observations: 'Manque huile moteur.' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Historique des fiches d'entretien (E31)</h1>
        <p class="text-sm text-gray-500 mt-1">Consultez et filtrez l'ensemble des fiches d'entretien</p>
      </div>
      <BaseButton @click="$router.push('/logistique/entretien')" variant="primary" size="sm">
        <Plus class="w-4 h-4 mr-1.5" />
        Nouvelle Fiche
      </BaseButton>
    </div>

    <!-- Filters + Table Card -->
    <div class="bg-white rounded-xl border border-gray-100">

      <!-- Filters -->
      <div class="p-5 border-b border-gray-100">
        <div class="flex items-center gap-2 mb-3">
          <Search class="w-4 h-4 text-gray-400" />
          <span class="text-sm font-medium text-gray-900">Filtres</span>
        </div>
        <div class="flex flex-col md:flex-row gap-3">
          <input
            type="month"
            class="block text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
          />
          <select
            class="block text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
          >
            <option value="">Tous les chauffeurs</option>
            <option value="ID_1">Jean MOUSSAVOU</option>
          </select>
          <select
            class="block text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
          >
            <option value="">Tous les vehicules</option>
            <option value="GA-123-AB">GA-123-AB</option>
          </select>
        </div>
      </div>

      <!-- Table -->
      <div>
        <BaseTable :columns="columns" :rows="historiques">
          <template #cell-score="{ value }">
            <span
              class="font-bold text-sm"
              :class="value >= 7 ? 'text-emerald-600' : (value >= 5 ? 'text-amber-500' : 'text-red-500')"
            >
              {{ value.toFixed(1) }}/10
            </span>
          </template>
          <template #cell-observations="{ value }">
            <span class="text-xs text-gray-500 italic max-w-xs truncate block" :title="value">{{ value }}</span>
          </template>
          <template #actions="{ row }">
            <button
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              <FileText class="w-4 h-4" />
            </button>
          </template>
        </BaseTable>
      </div>

      <!-- Footer Summary -->
      <div class="p-5 border-t border-gray-100">
        <div class="bg-gray-50/50 rounded-xl p-4 flex items-center justify-between">
          <span class="text-sm text-gray-500">{{ historiques.length }} fiche(s) affichee(s)</span>
          <span class="text-sm font-medium text-gray-900">
            Score moyen global :
            <span class="text-emerald-600 font-bold">
              {{ (historiques.reduce((sum, h) => sum + h.score, 0) / historiques.length).toFixed(1) }}/10
            </span>
          </span>
        </div>
      </div>

    </div>
  </div>
</template>
