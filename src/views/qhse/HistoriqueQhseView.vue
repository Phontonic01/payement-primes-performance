<script setup>
import { ref, computed, onMounted } from 'vue'
import { AlertTriangle, History, Eye, Pencil, X, Save } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import TableSkeleton from '@/components/ui/TableSkeleton.vue'
import GeoAlertBanner from '@/components/ui/GeoAlertBanner.vue'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import { useSaisiesStore } from '@/stores/saisies'
import { formatDateFr } from '@/utils/formatDate'

const toastStore = useToastStore()
const loading = ref(true)
onMounted(() => { setTimeout(() => { loading.value = false }, 500) })
const confirmStore = useConfirmStore()
const saisiesStore = useSaisiesStore()

const agentFilter = ref('')

const columns = [
  { key: 'dateFr', label: 'Date' },
  { key: 'agent', label: 'Agent' },
  { key: 'type', label: 'Type de Contrôle' },
  { key: 'resultat', label: 'Résultat / Score' },
  { key: 'impact', label: 'Impact / Pénalité' },
  { key: 'etat', label: 'État' },
]

// Lire depuis le store saisies QHSE
const historiques = computed(() => {
  return Object.values(saisiesStore.qhseEvals)
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((q, i) => {
      const entries = []
      // Checklist
      entries.push({
        id: i * 2 + 1,
        date: q.date,
        dateFr: formatDateFr(q.date),
        agent: q.agent,
        matricule: q.matricule,
        type: 'Checklist Terrain',
        resultat: `${q.checklistSur5.toFixed(1)} / 5`,
        impact: q.epiConforme ? 'Aucun' : 'EPI non conforme',
        etat: 'MODIFIABLE',
      })
      // Alcootest
      entries.push({
        id: i * 2 + 2,
        date: q.date,
        dateFr: formatDateFr(q.date),
        agent: q.agent,
        matricule: q.matricule,
        type: 'Alcootest',
        resultat: q.alcootestPositif ? 'Positif' : 'Négatif',
        impact: q.alcootestPositif ? '-5 pts (Pénalité globale)' : 'Aucun',
        etat: 'MODIFIABLE',
      })
      return entries
    })
})

const filteredHistoriques = computed(() => {
  if (!agentFilter.value) return historiques.value
  return historiques.value.filter(h => h.matricule === agentFilter.value)
})

const nbPenalites = computed(() => historiques.value.filter(h => h.impact.includes('-5 pts')).length)

// --- Edit modal ---
const editModal = ref(false)
const editForm = ref({ id: null, type: '', checklistScore: 5, alcooResultat: 'NEGATIF', alcooTaux: 0, motif: '' })

function ouvrirModification(row) {
  if (row.etat === 'CLOTURE') {
    toastStore.addToast('Ce mois est clôturé par la DAF. Modification impossible.', 'warning')
    return
  }
  editForm.value = {
    id: row.id,
    type: row.type,
    checklistScore: row.checklistScore ?? 5,
    alcooResultat: row.alcooResultat ?? 'NEGATIF',
    alcooTaux: row.alcooTaux ?? 0,
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
    title: 'Confirmer la correction QHSE',
    message: `Motif : "${editForm.value.motif}". Cette modification sera tracée.`,
    confirmText: 'Corriger',
    cancelText: 'Annuler',
    variant: 'danger'
  })

  if (confirmed) {
    const row = historiques.value.find(h => h.id === editForm.value.id)
    if (row) {
      if (editForm.value.type === 'Checklist Terrain') {
        row.checklistScore = editForm.value.checklistScore
        row.resultat = `${editForm.value.checklistScore.toFixed(1)} / 5`
        row.impact = editForm.value.checklistScore >= 4 ? 'Aucun' : 'Score insuffisant'
      } else {
        row.alcooResultat = editForm.value.alcooResultat
        row.alcooTaux = editForm.value.alcooTaux
        if (editForm.value.alcooResultat === 'POSITIF') {
          row.resultat = `Positif (${editForm.value.alcooTaux}g/l)`
          row.impact = '-5 pts (Pénalité globale)'
        } else {
          row.resultat = 'Négatif'
          row.impact = 'Aucun'
        }
      }
      row.etat = 'CORRIGE'
    }
    editModal.value = false
    toastStore.addToast('Contrôle QHSE corrigé avec succès.', 'success')
  }
}
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
          <p class="text-sm text-gray-500">Suivi, correction des checklists, alcootests et pénalités</p>
        </div>
      </div>
    </div>

    <!-- Alerte pénalités -->
    <div v-if="nbPenalites > 0" class="rounded-xl bg-red-50 border border-red-100 p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <AlertTriangle class="w-5 h-5 text-red-500 shrink-0" />
          <p class="text-sm font-semibold text-red-700">{{ nbPenalites }} pénalité(s) majeure(s) (Alcootest) détectée(s) ce mois-ci.</p>
        </div>
        <BaseButton variant="outline" size="sm" class="text-red-700 border-red-200 hover:bg-red-100">
          <Eye class="w-4 h-4 mr-1.5" /> Voir détails
        </BaseButton>
      </div>
    </div>

    <!-- Alertes GEO (autorité terrain) -->
    <GeoAlertBanner service="QHSE" />

    <!-- Info correction -->
    <div class="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-center gap-3">
      <AlertTriangle class="w-4 h-4 text-blue-500 flex-shrink-0" />
      <p class="text-xs text-blue-700">Les contrôles sont modifiables tant que le mois n'est pas clôturé par la DAF. Toute correction nécessite un motif.</p>
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

      <TableSkeleton v-if="loading" :rows="6" :cols="6" />
      <BaseTable v-else :columns="columns" :rows="filteredHistoriques">
        <template #cell-resultat="{ value }">
          <span class="font-medium" :class="value.includes('Positif') ? 'text-red-600 font-bold' : 'text-gray-900'">{{ value }}</span>
        </template>
        <template #cell-impact="{ value }">
          <BaseBadge v-if="value === 'Aucun'" status="success" text="Aucun" />
          <BaseBadge v-else-if="value.includes('-5 pts')" status="danger" :text="value" />
          <BaseBadge v-else status="warning" :text="value" />
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
            title="Corriger ce contrôle"
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
              <h3 class="text-lg font-semibold text-gray-900">Corriger le contrôle {{ editForm.type }}</h3>
              <button @click="editModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="p-6 space-y-4">
              <!-- Checklist Terrain -->
              <template v-if="editForm.type === 'Checklist Terrain'">
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-gray-700">Score Checklist</label>
                    <span class="text-sm font-bold" :class="editForm.checklistScore >= 4 ? 'text-emerald-600' : (editForm.checklistScore >= 2.5 ? 'text-amber-500' : 'text-red-500')">
                      {{ editForm.checklistScore.toFixed(1) }} / 5
                    </span>
                  </div>
                  <input type="range" v-model.number="editForm.checklistScore" min="0" max="5" step="0.5" class="w-full accent-emerald-600" />
                </div>
              </template>

              <!-- Alcootest -->
              <template v-else>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Résultat</label>
                  <div class="grid grid-cols-2 gap-3">
                    <label
                      class="flex items-center justify-center px-3 py-2.5 rounded-xl border-2 cursor-pointer text-sm font-medium transition-all"
                      :class="editForm.alcooResultat === 'NEGATIF' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
                    >
                      <input type="radio" v-model="editForm.alcooResultat" value="NEGATIF" class="sr-only" />
                      Négatif (0 g/l)
                    </label>
                    <label
                      class="flex items-center justify-center px-3 py-2.5 rounded-xl border-2 cursor-pointer text-sm font-medium transition-all"
                      :class="editForm.alcooResultat === 'POSITIF' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
                    >
                      <input type="radio" v-model="editForm.alcooResultat" value="POSITIF" class="sr-only" />
                      Positif (> 0 g/l)
                    </label>
                  </div>
                </div>

                <div v-if="editForm.alcooResultat === 'POSITIF'">
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Taux relevé (g/l)</label>
                  <input v-model.number="editForm.alcooTaux" type="number" step="0.01" min="0"
                    class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                  <p class="text-xs text-red-600 mt-1">Pénalité de -5 pts maintenue sur l'axe QHSE.</p>
                </div>
              </template>

              <!-- Motif -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  Motif de correction <span class="text-red-500">*</span>
                </label>
                <textarea
                  v-model="editForm.motif"
                  rows="2"
                  required
                  placeholder="Ex : Erreur de saisie, éthylotest défectueux, re-contrôle effectué..."
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
