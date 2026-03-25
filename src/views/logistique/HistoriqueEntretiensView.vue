<script setup>
import { ref, computed, onMounted } from 'vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import TableSkeleton from '@/components/ui/TableSkeleton.vue'
import GeoAlertBanner from '@/components/ui/GeoAlertBanner.vue'
import { FileText, Plus, Search, Pencil, X, Save, AlertTriangle } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import { useSaisiesStore } from '@/stores/saisies'
import { formatDateFr } from '@/utils/formatDate'

const toastStore = useToastStore()
const confirmStore = useConfirmStore()
const saisiesStore = useSaisiesStore()
const loading = ref(true)
onMounted(() => { setTimeout(() => { loading.value = false }, 500) })

const agentFilter = ref('')

const columns = [
  { key: 'dateFr', label: 'Date' },
  { key: 'agent', label: 'Chauffeur' },
  { key: 'vehicule', label: 'Véhicule' },
  { key: 'score', label: 'Score Moyen' },
  { key: 'observations', label: 'Observations' },
  { key: 'etat', label: 'État' },
]

// Lire les données réelles depuis le store saisies
const historiques = computed(() => {
  return Object.values(saisiesStore.entretiens)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e, i) => ({
      id: i + 1,
      date: e.date,
      dateFr: formatDateFr(e.date),
      agent: e.agent,
      matricule: e.matricule,
      vehicule: e.vehicule || '—',
      score: e.note,
      etatMecanique: e.etatMecanique || 10,
      proprete: e.proprete || 10,
      respectControles: e.respectControles || 10,
      observations: e.degradations || 'RAS',
      etat: 'MODIFIABLE',
    }))
})

const filteredHistoriques = computed(() => {
  if (!agentFilter.value) return historiques.value
  return historiques.value.filter(h => h.matricule === agentFilter.value)
})

// --- Edit modal ---
const editModal = ref(false)
const editForm = ref({ id: null, etatMecanique: 10, proprete: 10, respectControles: 10, observations: '', motif: '' })

const editScoreEstime = computed(() => {
  return ((editForm.value.etatMecanique + editForm.value.proprete + editForm.value.respectControles) / 3).toFixed(1)
})

function ouvrirModification(row) {
  if (row.etat === 'CLOTURE') {
    toastStore.addToast('Ce mois est clôturé par la DAF. Modification impossible.', 'warning')
    return
  }
  editForm.value = {
    id: row.id,
    etatMecanique: row.etatMecanique,
    proprete: row.proprete,
    respectControles: row.respectControles,
    observations: row.observations,
    motif: ''
  }
  editModal.value = true
}

async function sauvegarderModification() {
  if (!editForm.value.motif.trim()) {
    toastStore.addToast('Le motif de correction est obligatoire.', 'warning')
    return
  }

  const confirmed = await confirmStore.open({
    title: 'Confirmer la correction',
    message: `Motif : "${editForm.value.motif}". Le score d'entretien sera recalculé.`,
    confirmText: 'Corriger',
    cancelText: 'Annuler',
    variant: 'danger'
  })

  if (confirmed) {
    editModal.value = false
    toastStore.addToast('Fiche d\'entretien corrigée avec succès.', 'success')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Historique des fiches d'entretien (E31)</h1>
        <p class="text-sm text-gray-500 mt-1">Consultez, filtrez et corrigez les fiches d'entretien</p>
      </div>
      <BaseButton @click="$router.push('/logistique/entretien')" variant="primary" size="sm">
        <Plus class="w-4 h-4 mr-1.5" /> Nouvelle Fiche
      </BaseButton>
    </div>

    <!-- Alertes GEO -->
    <GeoAlertBanner service="Logistique" />

    <!-- Info correction -->
    <div class="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-center gap-3">
      <AlertTriangle class="w-4 h-4 text-blue-500 flex-shrink-0" />
      <p class="text-xs text-blue-700">Les fiches sont modifiables tant que le mois n'est pas clôturé par la DAF.</p>
    </div>

    <!-- État vide -->
    <div v-if="historiques.length === 0 && !loading" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <h3 class="text-lg font-semibold text-gray-900">Aucune fiche d'entretien</h3>
      <p class="text-sm text-gray-500 mt-1">Les fiches apparaîtront ici après saisie via le formulaire d'entretien.</p>
    </div>

    <div v-else class="bg-white rounded-xl border border-gray-100">
      <div class="p-5 border-b border-gray-100">
        <div class="flex flex-col md:flex-row gap-3 items-end">
          <div class="flex-1 max-w-sm">
            <AgentSearchInput
              v-model="agentFilter"
              label="Filtrer par chauffeur"
              placeholder="Matricule ou nom..."
              :filter-presents="false"
            />
          </div>
        </div>
      </div>

      <div>
        <TableSkeleton v-if="loading" :rows="4" :cols="6" />
        <BaseTable v-else :columns="columns" :rows="filteredHistoriques">
          <template #cell-score="{ value }">
            <span class="font-bold text-sm" :class="value >= 7 ? 'text-emerald-600' : (value >= 5 ? 'text-amber-500' : 'text-red-500')">
              {{ typeof value === 'number' ? value.toFixed(1) : value }}/10
            </span>
          </template>
          <template #cell-observations="{ value }">
            <span class="text-xs text-gray-500 italic max-w-xs truncate block" :title="value">{{ value }}</span>
          </template>
          <template #cell-etat="{ value }">
            <BaseBadge v-if="value === 'MODIFIABLE'" status="neutral" text="Modifiable" />
            <BaseBadge v-else-if="value === 'CORRIGE'" status="warning" text="Corrigé" />
            <BaseBadge v-else-if="value === 'CLOTURE'" status="success" text="Clôturé" />
          </template>
          <template #actions="{ row }">
            <button
              v-if="row.etat !== 'CLOTURE'"
              @click="ouvrirModification(row)"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <Pencil class="w-3.5 h-3.5" />
              Corriger
            </button>
          </template>
        </BaseTable>
      </div>

      <div class="p-5 border-t border-gray-100">
        <div class="bg-gray-50/50 rounded-xl p-4 flex items-center justify-between">
          <span class="text-sm text-gray-500">{{ filteredHistoriques.length }} fiche(s)</span>
          <span class="text-sm font-medium text-gray-900">
            Score moyen :
            <span class="text-emerald-600 font-bold">
              {{ filteredHistoriques.length ? (filteredHistoriques.reduce((sum, h) => sum + h.score, 0) / filteredHistoriques.length).toFixed(1) : '—' }}/10
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- Modal de correction -->
    <Teleport to="body">
      <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-150" leave-to-class="opacity-0">
        <div v-if="editModal" class="fixed inset-0 z-[9997] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" @click="editModal = false"></div>
          <div class="relative bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-lg overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 class="text-lg font-semibold text-gray-900">Corriger la fiche d'entretien</h3>
              <button @click="editModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer"><X class="w-5 h-5" /></button>
            </div>
            <div class="p-6 space-y-4">
              <div class="grid grid-cols-3 gap-4">
                <div v-for="critere in [{ key: 'etatMecanique', label: 'État mécanique' }, { key: 'proprete', label: 'Propreté' }, { key: 'respectControles', label: 'Contrôles' }]" :key="critere.key" class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="text-xs font-medium text-gray-700">{{ critere.label }}</label>
                    <span class="text-sm font-bold" :class="editForm[critere.key] >= 7 ? 'text-emerald-600' : 'text-amber-500'">{{ editForm[critere.key] }}/10</span>
                  </div>
                  <input type="range" v-model.number="editForm[critere.key]" min="0" max="10" class="w-full accent-emerald-600" />
                </div>
              </div>
              <div class="rounded-xl bg-gray-50 border border-gray-200 p-3 flex items-center justify-between">
                <span class="text-sm text-gray-600">Nouveau score :</span>
                <span class="text-lg font-bold text-emerald-600">{{ editScoreEstime }}/10</span>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Motif de correction <span class="text-red-500">*</span></label>
                <textarea v-model="editForm.motif" rows="2" required placeholder="Raison de la correction..."
                  class="block w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"></textarea>
              </div>
            </div>
            <div class="px-6 pb-6 flex gap-3">
              <BaseButton variant="outline" class="flex-1" @click="editModal = false">Annuler</BaseButton>
              <BaseButton variant="primary" class="flex-1" @click="sauvegarderModification"><Save class="w-4 h-4 mr-1.5" />Corriger</BaseButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
