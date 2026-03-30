<script setup>
import { ref, computed, onMounted } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import DateInput from '@/components/ui/DateInput.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import TableSkeleton from '@/components/ui/TableSkeleton.vue'
import { History, Filter, Pencil, X, Save, AlertTriangle } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import { useGeoStore } from '@/stores/geo'
import { formatDateFr } from '@/utils/formatDate'

const toastStore = useToastStore()
const confirmStore = useConfirmStore()
const geoStore = useGeoStore()
const loading = ref(true)
onMounted(() => { setTimeout(() => { loading.value = false }, 500) })

const columns = [
  { key: 'dateFr', label: 'Date' },
  { key: 'matricule', label: 'Matricule' },
  { key: 'agent', label: 'Chauffeur' },
  { key: 'vehicule', label: 'Vehicule' },
  { key: 'circuit', label: 'Circuit' },
  { key: 'statut', label: 'Statut' },
  { key: 'justification', label: 'Justification' },
  { key: 'etat', label: 'Etat' },
]

// Lire depuis le store GEO (décisions rendues)
const historiques = computed(() => {
  return geoStore.toutesDecisions
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((d, i) => ({
      id: i + 1,
      date: d.date,
      dateFr: formatDateFr(d.date),
      matricule: d.matricule || '—',
      agent: d.agent,
      vehicule: d.gpsData?.vehicule || d.circuit || '—',
      circuit: d.circuit,
      statut: d.statut,
      justification: d.justification || '—',
      etat: 'CLOTURE',
    }))
})

const dateFilter = ref('')
const statutFilter = ref('')

// --- Edit modal ---
const editModal = ref(false)
const editForm = ref({ id: null, statut: '', justification: '', motif: '' })

function ouvrirModification(row) {
  if (row.etat === 'CLOTURE') {
    toastStore.addToast('Ce mois est clôturé par la DAF. Modification impossible.', 'warning')
    return
  }
  editForm.value = {
    id: row.id,
    statut: row.statut,
    justification: row.justification === '-' ? '' : row.justification,
    motif: ''
  }
  editModal.value = true
}

async function sauvegarderModification() {
  if (!editForm.value.motif.trim()) {
    toastStore.addToast('Le motif de correction est obligatoire.', 'warning')
    return
  }
  if (editForm.value.statut !== 'VALIDE' && !editForm.value.justification.trim()) {
    toastStore.addToast('Une justification est obligatoire pour un statut Partiel ou Refusé.', 'warning')
    return
  }

  const confirmed = await confirmStore.open({
    title: 'Confirmer la correction GEO',
    message: `Motif : "${editForm.value.motif}". Le statut sera modifié et la correction tracée.`,
    confirmText: 'Corriger',
    cancelText: 'Annuler',
    variant: 'danger'
  })

  if (confirmed) {
    const row = historiques.value.find(h => h.id === editForm.value.id)
    if (row) {
      row.statut = editForm.value.statut
      row.justification = editForm.value.justification || '-'
      row.etat = 'CORRIGE'
    }
    editModal.value = false
    toastStore.addToast('Validation GPS corrigée avec succès.', 'success')
  }
}
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
        <p class="text-sm text-gray-500">Consultez et corrigez les validations passées</p>
      </div>
    </div>

    <!-- Info correction -->
    <div class="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-center gap-3">
      <AlertTriangle class="w-4 h-4 text-blue-500 flex-shrink-0" />
      <p class="text-xs text-blue-700">Les validations sont modifiables tant que le mois n'est pas clôturé par la DAF. Toute correction nécessite un motif.</p>
    </div>

    <!-- Filters + Table -->
    <BaseCard class="bg-white rounded-xl border border-gray-100">
      <!-- Filter Bar -->
      <div class="flex items-center gap-4 mb-6">
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <Filter class="w-4 h-4" />
          <span class="font-medium">Filtres</span>
        </div>
        <DateInput v-model="dateFilter" />
        <select
          v-model="statutFilter"
          class="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-150"
        >
          <option value="">Tous les statuts</option>
          <option value="VALIDE">Validés</option>
          <option value="PARTIEL">Partiels</option>
          <option value="REFUSE">Refusés</option>
        </select>
      </div>

      <!-- Table -->
      <TableSkeleton v-if="loading" :rows="3" :cols="6" />
      <BaseTable v-else :columns="columns" :rows="historiques">
        <template #cell-statut="{ value }">
          <BaseBadge v-if="value === 'VALIDE'" status="success" text="Validé (100%)" />
          <BaseBadge v-else-if="value === 'PARTIEL'" status="warning" text="Partiel (50%)" />
          <BaseBadge v-else-if="value === 'REFUSE'" status="danger" text="Refusé (0%)" />
        </template>
        <template #cell-justification="{ value }">
          <span class="text-xs text-gray-500 italic">{{ value }}</span>
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
            title="Corriger cette validation"
          >
            <Pencil class="w-3.5 h-3.5" />
            Corriger
          </button>
          <span v-else class="text-xs text-gray-400 italic">Verrouillé</span>
        </template>
      </BaseTable>
    </BaseCard>

    <!-- Modal de correction -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="editModal" class="fixed inset-0 z-[9997] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" @click="editModal = false"></div>
          <div class="relative bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-lg overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 class="text-lg font-semibold text-gray-900">Corriger la validation GPS</h3>
              <button @click="editModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="p-6 space-y-4">
              <!-- Nouveau statut -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nouveau statut</label>
                <div class="grid grid-cols-3 gap-3">
                  <label
                    class="flex items-center justify-center px-3 py-2.5 rounded-xl border-2 cursor-pointer text-sm font-medium transition-all"
                    :class="editForm.statut === 'VALIDE' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
                  >
                    <input type="radio" v-model="editForm.statut" value="VALIDE" class="sr-only" />
                    Validé (100%)
                  </label>
                  <label
                    class="flex items-center justify-center px-3 py-2.5 rounded-xl border-2 cursor-pointer text-sm font-medium transition-all"
                    :class="editForm.statut === 'PARTIEL' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
                  >
                    <input type="radio" v-model="editForm.statut" value="PARTIEL" class="sr-only" />
                    Partiel (50%)
                  </label>
                  <label
                    class="flex items-center justify-center px-3 py-2.5 rounded-xl border-2 cursor-pointer text-sm font-medium transition-all"
                    :class="editForm.statut === 'REFUSE' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
                  >
                    <input type="radio" v-model="editForm.statut" value="REFUSE" class="sr-only" />
                    Refusé (0%)
                  </label>
                </div>
              </div>

              <!-- Justification -->
              <div v-if="editForm.statut !== 'VALIDE'">
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Justification <span class="text-red-500">*</span></label>
                <textarea
                  v-model="editForm.justification"
                  rows="2"
                  placeholder="Raison du statut partiel ou refusé..."
                  class="block w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                ></textarea>
              </div>

              <!-- Motif de correction -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  Motif de correction <span class="text-red-500">*</span>
                </label>
                <textarea
                  v-model="editForm.motif"
                  rows="2"
                  required
                  placeholder="Ex : Erreur de lecture GPS, trace vérifiée manuellement..."
                  class="block w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                ></textarea>
              </div>
            </div>

            <div class="px-6 pb-6 flex gap-3">
              <BaseButton variant="outline" class="flex-1" @click="editModal = false">Annuler</BaseButton>
              <BaseButton variant="primary" class="flex-1" @click="sauvegarderModification">
                <Save class="w-4 h-4 mr-1.5" />
                Enregistrer la correction
              </BaseButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
