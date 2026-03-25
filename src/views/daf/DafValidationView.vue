<script setup>
import { ref, computed } from 'vue'
import { Eye, CheckCircle, Search } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import { useAgentsStore } from '@/stores/agents'
import { usePrimesStore } from '@/stores/primes'
import { useSaisiesStore } from '@/stores/saisies'

const toastStore = useToastStore()
const confirmStore = useConfirmStore()
const agentsStore = useAgentsStore()
const primesStore = usePrimesStore()
const saisiesStore = useSaisiesStore()

const columns = [
  { key: 'nom', label: 'Nom & Prénom' },
  { key: 'fonction', label: 'Fonction' },
  { key: 't_score', label: 'Tonnage' },
  { key: 'geo_score', label: 'Bouclage' },
  { key: 'log_score', label: 'Entretien' },
  { key: 'qhse_score', label: 'QHSE' },
  { key: 'scoreGlobal', label: 'Score Global' },
  { key: 'prime_totale', label: 'Prime (XAF)' },
  { key: 'statut', label: 'Statut' },
]

// Mois en cours
const moisCourant = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})()

// Calcul live depuis les stores
const resultats = computed(() => {
  return agentsStore.agents
    .filter(a => ['CHAUFFEUR', 'EQUIPIER'].includes(a.role))
    .map(agent => {
      const agregation = saisiesStore.getAgregationMensuelle(agent.matricule, moisCourant)
      const typeAgent = agent.role === 'EQUIPIER' ? 'RIPEUR_COLLECTE' : 'CHAUFFEUR_COLLECTE'
      const fiche = primesStore.calculerFicheAgent({
        typeVehicule: agregation.typeVehicule,
        typeAgent,
        joursPresents: 28,
        tonnageMoyen: agregation.tonnageMoyen,
        rotationsMoyennes: agregation.rotationsMoyennes,
        statutsBouclage: agregation.statutsBouclage,
        noteEntretienMoyenne: agregation.noteEntretienMoyenne,
        qhseData: agregation.qhseData,
      })
      return {
        id: agent.id,
        nom: agent.nom,
        fonction: agent.fonction || agent.role,
        t_score: fiche.scores.tonnage.toFixed(0) + '%',
        geo_score: fiche.scores.bouclage.toFixed(0) + '%',
        log_score: agregation.noteEntretienMoyenne !== null ? agregation.noteEntretienMoyenne.toFixed(1) + '/10' : 'N/A',
        qhse_score: agregation.qhseData.checklistSur5.toFixed(1) + '/5',
        scoreGlobal: fiche.scoreGlobal.toFixed(1) + '%',
        prime_totale: fiche.prime.montant.toLocaleString('fr-FR'),
        prime_montant: fiche.prime.montant,
        statut: isValide.value ? 'VALIDE' : 'BROUILLON',
        eligible: fiche.prime.eligible,
      }
    })
})

const isValide = ref(false)

const totalPrimes = computed(() =>
  resultats.value.reduce((sum, r) => sum + r.prime_montant, 0).toLocaleString('fr-FR')
)

async function marquerValider() {
  const confirmed = await confirmStore.open({
    title: 'Validation définitive',
    message: 'Êtes-vous sûr de vouloir valider définitivement ce mois ? Cette action gèlera les données.',
    confirmText: 'Valider',
    cancelText: 'Annuler',
    variant: 'danger'
  })
  if (confirmed) {
    isValide.value = true
    resultats.value.forEach(r => r.statut = 'VALIDE')
    toastStore.addToast('Mois validé définitivement. Les données sont clôturées.', 'success')
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
        <BaseButton @click="$router.push('/daf/rapports')" variant="primary">
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
          <span class="text-xl font-bold text-gray-900">{{ totalPrimes }} XAF</span>
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
