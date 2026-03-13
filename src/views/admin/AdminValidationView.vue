<script setup>
import { ref } from 'vue'
import { Eye, CheckCircle, Search } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const columns = [
  { key: 'nom', label: 'Nom & Prénom' },
  { key: 'role', label: 'Profil' },
  { key: 't_score', label: 'Tonnage (FCFA)' },
  { key: 'geo_score', label: 'Bouclage' },
  { key: 'log_score', label: 'Entretien' },
  { key: 'qhse_score', label: 'QHSE' },
  { key: 'prime_totale', label: 'Prime Totale (FCFA)' },
  { key: 'statut', label: 'Statut' },
]

const resultats = ref([
  { id: 1, nom: 'Jean MOUSSAVOU', role: 'CHAUFFEUR', t_score: '45,000', geo_score: '98%', log_score: '8.5/10', qhse_score: '5/5', prime_totale: '75,000', statut: 'BROUILLON' },
  { id: 2, nom: 'Paul ONDO', role: 'CHAUFFEUR', t_score: '42,000', geo_score: '95%', log_score: '6.0/10', qhse_score: '0/5 (Pénalité)', prime_totale: '32,000', statut: 'BROUILLON' },
  { id: 3, nom: 'Kevin MVOUMA', role: 'EQUIPIER', t_score: '35,000', geo_score: '98%', log_score: 'N/A', qhse_score: '4/5', prime_totale: '55,000', statut: 'BROUILLON' },
])

const isValide = ref(false)

function marquerValider() {
  if(confirm('Êtes-vous sûr de vouloir valider définitivement ce mois ? Cette action gèlera les données.')) {
    isValide.value = true
    resultats.value.forEach(r => r.statut = 'VALIDE')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Validation Finale (E53)</h1>
        <p class="text-sm text-gray-500 mt-1">Review des primes calculées avant clôture</p>
      </div>
      <div v-if="isValide">
        <BaseButton @click="$router.push('/admin/rapports')" variant="primary">
          Aller aux Rapports & Exports &rarr;
        </BaseButton>
      </div>
      <div v-else>
        <BaseButton @click="marquerValider" variant="primary">
          Valider Définitivement le Mois
        </BaseButton>
      </div>
    </div>

    <!-- Alert Success Validation -->
    <div v-if="isValide" class="rounded-xl bg-emerald-50 p-4 flex items-start gap-3">
      <CheckCircle class="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
      <p class="text-sm text-emerald-700 font-medium">
        Le mois de Décembre 2025 a été validé. Les données sont clôturées et les exports sont disponibles.
      </p>
    </div>

    <BaseCard>
      <div class="flex flex-col md:flex-row gap-4 mb-4 justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
        <div class="flex gap-4 items-center">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher un agent..."
              class="block w-64 pl-10 text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>
        </div>
        <div class="text-right">
          <span class="text-sm text-gray-500 mr-2">Total Primes:</span>
          <span class="text-xl font-bold text-gray-900">162,000 FCFA</span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <BaseTable :columns="columns" :rows="resultats">
          <template #cell-prime_totale="{ value }">
            <span class="font-bold text-emerald-600">{{ value }}</span>
          </template>
          <template #cell-qhse_score="{ value }">
            <span :class="value.includes('Pénalité') ? 'text-red-600 font-semibold' : ''">{{ value }}</span>
          </template>
          <template #cell-statut="{ value }">
            <BaseBadge :status="value === 'VALIDE' ? 'success' : 'warning'" :text="value" />
          </template>
          <template #actions>
            <button class="text-gray-400 hover:text-emerald-600 cursor-pointer mx-1 transition" title="Voir Détails Calcul">
              <Eye class="w-4 h-4" />
            </button>
          </template>
        </BaseTable>
      </div>
    </BaseCard>
  </div>
</template>
