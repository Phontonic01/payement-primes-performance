<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import TableSkeleton from '@/components/ui/TableSkeleton.vue'
import GeoAlertBanner from '@/components/ui/GeoAlertBanner.vue'
import { Calendar, ClipboardList, Pencil, X, Save, AlertTriangle } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

const toastStore = useToastStore()
const loading = ref(true)
onMounted(() => { setTimeout(() => { loading.value = false }, 800) })
const confirmStore = useConfirmStore()

const agentFilter = ref('')
const monthFilter = ref('2025-12')

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'agent', label: 'Agent' },
  { key: 'vehicule', label: 'Véhicule' },
  { key: 'tonnage', label: 'Tonnage' },
  { key: 'score', label: 'Score Tonnage' },
  { key: 'bouclage', label: 'Bouclage GPS' },
  { key: 'statut', label: 'Statut' },
]

// Importer le store saisies pour lire les données réelles
import { useSaisiesStore } from '@/stores/saisies'
import { usePrimesStore } from '@/stores/primes'
import { formatDateFr } from '@/utils/formatDate'
const saisiesStore = useSaisiesStore()
const primesStore = usePrimesStore()

const historiques = computed(() => {
  return saisiesStore.historiqueTonnages.map((t, i) => {
    const scoreTonnage = primesStore.calculerScoreTonnage(t.vehicule, t.tonnage, t.rotations)
    const bouclage = saisiesStore.getBouclage(t.matricule, t.date)
    return {
      id: i + 1,
      date: formatDateFr(t.date),
      agent: t.agent,
      matricule: t.matricule,
      vehicule: t.vehicule,
      tonnageVal: t.tonnage,
      rotationsVal: t.rotations,
      tonnage: `${t.tonnage} t (${t.rotations} rot.)`,
      score: scoreTonnage + '%',
      bouclage: bouclage?.statutGeo || 'NON_SAISI',
      statut: 'MODIFIABLE',
    }
  })
})

const filteredHistoriques = computed(() => {
  if (!agentFilter.value) return historiques.value
  return historiques.value.filter(h => h.matricule === agentFilter.value)
})

// --- Edit modal ---
const editModal = ref(false)
const editForm = ref({ id: null, tonnage: 0, rotations: 0, vehicule: '', motif: '' })
const vehicules = ['BOM', 'Plateaux', 'Bennes', 'Movi', 'Canter']

function ouvrirModification(row) {
  if (row.statut === 'CLOTURE') {
    toastStore.addToast('Ce mois est clôturé par la DAF. Modification impossible.', 'warning')
    return
  }
  editForm.value = {
    id: row.id,
    tonnage: row.tonnageVal,
    rotations: row.rotationsVal,
    vehicule: row.vehicule,
    motif: ''
  }
  editModal.value = true
}

function recalculerScore(vehicule, tonnage, rotations) {
  if (!rotations || rotations <= 0) return '0%'
  const avg = tonnage / rotations
  if (vehicule === 'BOM') {
    if (avg >= 11) return '100%'
    if (avg >= 8) return '75%'
    if (avg >= 7) return '50%'
    return '0%'
  }
  if (avg >= 5) return '100%'
  if (avg >= 3) return '75%'
  if (avg >= 1) return '50%'
  return '0%'
}

async function sauvegarderModification() {
  if (!editForm.value.motif.trim()) {
    toastStore.addToast('Le motif de correction est obligatoire.', 'warning')
    return
  }

  const confirmed = await confirmStore.open({
    title: 'Confirmer la correction',
    message: `Motif : "${editForm.value.motif}". Cette modification sera tracée dans l'historique.`,
    confirmText: 'Corriger',
    cancelText: 'Annuler',
    variant: 'danger'
  })

  if (confirmed) {
    const row = historiques.value.find(h => h.id === editForm.value.id)
    if (row) {
      row.tonnageVal = editForm.value.tonnage
      row.rotationsVal = editForm.value.rotations
      row.vehicule = editForm.value.vehicule
      row.tonnage = `${editForm.value.tonnage} t (${editForm.value.rotations} rot.)`
      row.score = recalculerScore(editForm.value.vehicule, editForm.value.tonnage, editForm.value.rotations)
      row.statut = 'CORRIGE'
    }
    editModal.value = false
    toastStore.addToast('Saisie corrigée avec succès. Le motif a été enregistré.', 'success')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Historique des Saisies</h1>
        <p class="text-sm text-gray-500 mt-0.5">Module E12 — Consultation et correction des relevés de collecte</p>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
        <ClipboardList class="w-4 h-4 text-emerald-600" />
        <span class="text-sm font-medium text-gray-700">{{ filteredHistoriques.length }} enregistrements</span>
      </div>
    </div>

    <!-- Alertes GEO (autorité terrain) -->
    <GeoAlertBanner service="Collecte" />
    <GeoAlertBanner service="Tonnage" />

    <!-- Info correction -->
    <div class="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-center gap-3">
      <AlertTriangle class="w-4 h-4 text-blue-500 flex-shrink-0" />
      <p class="text-xs text-blue-700">Les saisies sont modifiables tant que le mois n'est pas clôturé par la DAF. Toute correction nécessite un motif.</p>
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

      <!-- Skeleton loading -->
      <TableSkeleton v-if="loading" :rows="5" :cols="7" />

      <BaseTable v-else :columns="columns" :rows="filteredHistoriques">
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
        <template #cell-statut="{ value }">
          <BaseBadge v-if="value === 'MODIFIABLE'" status="neutral" text="Modifiable" />
          <BaseBadge v-else-if="value === 'CORRIGE'" status="warning" text="Corrigé" />
          <BaseBadge v-else-if="value === 'CLOTURE'" status="success" text="Clôturé" />
        </template>
        <template #actions="{ row }">
          <button
            v-if="row.statut !== 'CLOTURE'"
            @click="ouvrirModification(row)"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer"
            title="Corriger cette saisie"
          >
            <Pencil class="w-3.5 h-3.5" />
            Corriger
          </button>
          <span v-else class="text-xs text-gray-400 italic">Verrouillé</span>
        </template>
      </BaseTable>
    </div>

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
              <h3 class="text-lg font-semibold text-gray-900">Corriger la saisie</h3>
              <button @click="editModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="p-6 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Tonnage (t)</label>
                  <input v-model.number="editForm.tonnage" type="number" step="0.1"
                    class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Rotations</label>
                  <input v-model.number="editForm.rotations" type="number"
                    class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Type de véhicule</label>
                <select v-model="editForm.vehicule"
                  class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                  <option v-for="v in vehicules" :key="v" :value="v">{{ v }}</option>
                </select>
              </div>

              <!-- Nouveau score estimé -->
              <div v-if="editForm.rotations > 0" class="rounded-xl bg-gray-50 border border-gray-200 p-3 flex items-center justify-between">
                <span class="text-sm text-gray-600">Nouveau score estimé :</span>
                <span class="text-lg font-bold text-emerald-600">{{ recalculerScore(editForm.vehicule, editForm.tonnage, editForm.rotations) }}</span>
              </div>

              <!-- Motif obligatoire -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  Motif de correction <span class="text-red-500">*</span>
                </label>
                <textarea
                  v-model="editForm.motif"
                  rows="2"
                  required
                  placeholder="Ex : Erreur de pesée au pont-bascule, ticket corrigé..."
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
