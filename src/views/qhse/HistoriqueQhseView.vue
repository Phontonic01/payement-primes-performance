<script setup>
import { ref, computed } from 'vue'
import { AlertTriangle, History, Eye } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'

const agentFilter = ref('')

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'agent', label: 'Agent' },
  { key: 'type', label: 'Type de Contrôle' },
  { key: 'resultat', label: 'Résultat / Score' },
  { key: 'impact', label: 'Impact / Pénalité' },
]

const historiques = [
  { id: 1, date: '2025-12-10', agent: 'Medza Ondo Scheila', matricule: '2823', type: 'Checklist Terrain', resultat: '5.0 / 5', impact: 'Aucun' },
  { id: 2, date: '2025-12-10', agent: 'Medza Ondo Scheila', matricule: '2823', type: 'Alcootest', resultat: 'Négatif', impact: 'Aucun' },
  { id: 3, date: '2025-12-09', agent: 'Mamfoumbi Muriella', matricule: '2948', type: 'Alcootest', resultat: 'Positif (0.5g/l)', impact: '-5 pts (Pénalité globale)' },
  { id: 4, date: '2025-12-08', agent: 'Mbatsi Davy', matricule: '0946', type: 'Checklist Terrain', resultat: '3.5 / 5', impact: 'EPI manquant' },
  { id: 5, date: '2025-12-10', agent: 'Tengou Joram', matricule: '2768', type: 'Checklist Terrain', resultat: '5.0 / 5', impact: 'Aucun' },
  { id: 6, date: '2025-12-10', agent: 'Tengou Joram', matricule: '2768', type: 'Alcootest', resultat: 'Négatif', impact: 'Aucun' },
]

const filteredHistoriques = computed(() => {
  if (!agentFilter.value) return historiques
  return historiques.filter(h => h.matricule === agentFilter.value)
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50">
          <History class="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Historique des Contrôles QHSE (E43)</h1>
          <p class="text-sm text-gray-500">Suivi des checklist, alcootests et pénalités</p>
        </div>
      </div>
    </div>

    <div class="rounded-xl bg-red-50 border border-red-100 p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <AlertTriangle class="w-5 h-5 text-red-500 shrink-0" />
          <p class="text-sm font-semibold text-red-700">1 pénalité majeure (Alcootest) détectée ce mois-ci.</p>
        </div>
        <BaseButton variant="outline" size="sm" class="text-red-700 border-red-200 hover:bg-red-100">
          <Eye class="w-4 h-4 mr-1.5" /> Voir détails
        </BaseButton>
      </div>
    </div>

    <BaseCard>
      <div class="flex flex-col md:flex-row gap-4 mb-6 items-end">
        <input type="month" class="block text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors" />
        <div class="flex-1 max-w-sm">
          <AgentSearchInput
            v-model="agentFilter"
            label="Filtrer par agent"
            placeholder="Matricule ou nom..."
            :filter-presents="false"
          />
        </div>
        <select class="block text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors">
          <option value="">Tous les types</option>
          <option value="CHECKLIST">Checklist Terrain</option>
          <option value="ALCOOTEST">Alcootest</option>
        </select>
      </div>

      <BaseTable :columns="columns" :rows="filteredHistoriques">
        <template #cell-resultat="{ value }">
          <span class="font-medium" :class="value.includes('Positif') ? 'text-red-600 font-bold' : 'text-gray-900'">{{ value }}</span>
        </template>
        <template #cell-impact="{ value }">
          <BaseBadge v-if="value === 'Aucun'" status="success" text="Aucun" />
          <BaseBadge v-else-if="value.includes('-5 pts')" status="danger" :text="value" />
          <BaseBadge v-else status="warning" :text="value" />
        </template>
      </BaseTable>
    </BaseCard>
  </div>
</template>
