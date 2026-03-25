<script setup>
import { ref, computed } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Check, X, MapPin, Calendar, Route, RotateCcw, Search } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import { useSaisiesStore } from '@/stores/saisies'
import { useAgentsStore } from '@/stores/agents'
import { useAuthStore } from '@/stores/auth'
import ReadOnlyBanner from '@/components/ui/ReadOnlyBanner.vue'

const toastStore = useToastStore()
const confirmStore = useConfirmStore()
const saisiesStore = useSaisiesStore()
const agentsStore = useAgentsStore()
const authStore = useAuthStore()
const readOnly = computed(() => authStore.isReadOnly())

const dateFiltre = ref(new Date().toISOString().split('T')[0])
const circuitInput = ref('')
const searchQuery = ref('')

const columns = [
  { key: 'agent', label: 'Agent (Chauffeur)' },
  { key: 'vehicule', label: 'Véhicule' },
  { key: 'circuit', label: 'Circuit' },
  { key: 'statut_geo', label: 'Statut GPS' }
]

// Construire la liste des circuits depuis les agents enregistrés
const circuits = computed(() => {
  return agentsStore.agents
    .filter(a => ['CHAUFFEUR', 'EQUIPIER'].includes(a.role))
    .map(a => {
      const bouclage = saisiesStore.getBouclage(a.matricule, dateFiltre.value)
      return {
        id: a.id,
        matricule: a.matricule,
        agent: a.nom,
        vehicule: a.vehicule || 'Non assigné',
        circuit: bouclage?.circuit || '',
        statut_geo: bouclage?.statutGeo || 'NON_SAISI',
        bouclage_declare: bouclage?.bouclageDeclare ?? null,
      }
    })
})

// Filtrage par recherche nom/matricule
const circuitsFiltres = computed(() => {
  if (!searchQuery.value.trim()) return circuits.value
  const q = searchQuery.value.toLowerCase().trim()
  return circuits.value.filter(c =>
    c.agent.toLowerCase().includes(q) || c.matricule.toLowerCase().includes(q)
  )
})

function declarer(id, estBoucle) {
  const a = agentsStore.getAgentById(id)
  if (!a) return
  saisiesStore.enregistrerBouclage({
    matricule: a.matricule,
    date: dateFiltre.value,
    agent: a.nom,
    circuit: circuitInput.value || `Circuit ${a.zone}`,
    vehicule: a.vehicule || '',
    bouclageDeclare: estBoucle,
  })
  toastStore.addToast(`Bouclage déclaré ${estBoucle ? 'OUI' : 'NON'} pour ${a.nom}`, 'success')
}

async function annulerDeclaration(id) {
  const a = agentsStore.getAgentById(id)
  if (!a) return

  const confirmed = await confirmStore.open({
    title: 'Annuler la déclaration',
    message: `Voulez-vous annuler la déclaration de bouclage pour "${a.nom}" afin de la corriger ?`,
    confirmText: 'Annuler la déclaration',
    cancelText: 'Retour',
    variant: 'danger'
  })

  if (confirmed) {
    const key = `${a.matricule}-${dateFiltre.value}`
    delete saisiesStore.bouclages[key]
    toastStore.addToast(`Déclaration annulée pour ${a.nom}. Vous pouvez re-déclarer.`, 'info')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Déclaration Bouclage</h1>
        <p class="text-sm text-gray-500 mt-0.5">Module E11 — Validation des circuits de collecte</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
          <MapPin class="w-4 h-4 text-emerald-600" />
          <span class="text-sm font-medium text-gray-700">Service Collecte</span>
        </div>
      </div>
    </div>

    <ReadOnlyBanner service="Collecte" />

    <!-- Filter bar: recherche + date -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Route class="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-900">Circuits du jour</h3>
            <p class="text-xs text-gray-500">{{ circuitsFiltres.length }}/{{ circuits.length }} circuits affichés</p>
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
      <!-- Barre de recherche agent -->
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search class="w-4 h-4 text-gray-400" />
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher un agent par nom ou matricule..."
          class="block w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors duration-200"
        />
      </div>
    </div>

    <!-- Circuits table -->
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <BaseTable :columns="columns" :rows="circuitsFiltres">
        <!-- Statut GEO Cell Override -->
        <template #cell-statut_geo="{ value }">
          <BaseBadge v-if="value === 'VALIDE'" status="success" text="Validé (100%)" />
          <BaseBadge v-else-if="value === 'EN_ATTENTE_GEO'" status="warning" text="En attente GEO" />
          <BaseBadge v-else-if="value === 'PARTIEL'" status="warning" text="Partiel (50%)" />
          <BaseBadge v-else-if="value === 'REFUSE'" status="danger" text="Refusé (0%)" />
          <BaseBadge v-else status="neutral" text="Non saisi" />
        </template>

        <!-- Actions (OUI/NON + Correction) -->
        <template #actions="{ row }">
          <!-- Pas encore déclaré → boutons OUI / NON -->
          <div v-if="row.bouclage_declare === null" class="flex items-center gap-2 justify-end">
            <button
              @click="declarer(row.id, true)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors duration-200 cursor-pointer"
            >
              <Check class="w-3.5 h-3.5" />
              Oui
            </button>
            <button
              @click="declarer(row.id, false)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors duration-200 cursor-pointer"
            >
              <X class="w-3.5 h-3.5" />
              Non
            </button>
          </div>

          <!-- Déjà déclaré → afficher + bouton corriger -->
          <div v-else class="flex justify-end items-center gap-2">
            <span
              v-if="row.bouclage_declare"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg"
            >
              <Check class="w-3.5 h-3.5" />
              Déclaré OUI
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 px-3 py-1.5 rounded-lg"
            >
              <X class="w-3.5 h-3.5" />
              Déclaré NON
            </span>

            <!-- Bouton corriger (si pas encore validé par GEO) -->
            <button
              v-if="row.statut_geo !== 'VALIDE'"
              @click="annulerDeclaration(row.id)"
              class="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer"
              title="Annuler pour corriger"
            >
              <RotateCcw class="w-3 h-3" />
              Corriger
            </button>
          </div>
        </template>
      </BaseTable>
    </div>
  </div>
</template>
