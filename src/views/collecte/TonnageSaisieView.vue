<script setup>
import { ref, computed, watch } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import { Truck, Weight, RotateCcw, Calendar, User, Gauge, Hash } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useSaisiesStore } from '@/stores/saisies'
import { useAgentsStore } from '@/stores/agents'
import { useAuthStore } from '@/stores/auth'
import { useVehiculesStore } from '@/stores/vehicules'
import ReadOnlyBanner from '@/components/ui/ReadOnlyBanner.vue'

const toastStore = useToastStore()
const saisiesStore = useSaisiesStore()
const agentsStore = useAgentsStore()
const authStore = useAuthStore()
const vehiculesStore = useVehiculesStore()
const readOnly = computed(() => authStore.isReadOnly())

const agent = ref('')
const selectedAgent = ref(null)
const selectedVehiculeNoParc = ref('')
const date = ref(new Date().toISOString().split('T')[0])
const tonnage = ref('')
const rotations = ref('')
const vehiculeQuery = ref('')

function onAgentSelected(agentObj) {
  selectedAgent.value = agentObj
}

// Véhicule sélectionné (objet complet)
const selectedVehicule = computed(() => {
  if (!selectedVehiculeNoParc.value) return null
  return vehiculesStore.getByNoParc(selectedVehiculeNoParc.value)
})

// Type de véhicule déduit automatiquement
const vehiculeType = computed(() => selectedVehicule.value?.type || 'BOM')

// Recherche de véhicule
const vehiculesFiltered = computed(() => {
  return vehiculesStore.search(vehiculeQuery.value)
})

// Score estimé basé sur le type de véhicule sélectionné
const scoreEstime = computed(() => {
  if (!tonnage.value || !rotations.value || !selectedVehicule.value) return null

  const t = parseFloat(tonnage.value)
  const r = parseInt(rotations.value)
  if (r <= 0) return null
  const avg = t / r

  const type = vehiculeType.value
  let score, label

  if (type === 'BOM') {
    if (avg >= 11) { score = 100; label = 'Excellent' }
    else if (avg >= 8) { score = 75; label = 'Bien' }
    else if (avg >= 7) { score = 50; label = 'Passable' }
    else { score = 0; label = 'Insuffisant' }
  } else if (type === 'Plateaux') {
    if (t >= 7.5 || r >= 4) { score = 100; label = 'Excellent' }
    else if (r >= 3) { score = 75; label = 'Bien' }
    else if (r >= 2) { score = 50; label = 'Passable' }
    else { score = 0; label = 'Insuffisant' }
  } else if (type === 'Bennes') {
    if (avg >= 7 && r > 2) { score = 100; label = 'Excellent' }
    else if (avg >= 7 && r >= 2) { score = 50; label = 'Passable' }
    else { score = 0; label = 'Insuffisant' }
  } else if (type === 'Movi') {
    if (r > 4) { score = 100; label = 'Excellent' }
    else if (r >= 4) { score = 50; label = 'Passable' }
    else { score = 0; label = 'Insuffisant' }
  } else {
    if (avg >= 5) { score = 100; label = 'Excellent' }
    else if (avg >= 3) { score = 75; label = 'Bien' }
    else if (avg >= 1) { score = 50; label = 'Passable' }
    else { score = 0; label = 'Insuffisant' }
  }

  const color = score >= 75 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'
  const bg = score >= 75 ? 'bg-emerald-50' : score >= 50 ? 'bg-amber-50' : 'bg-red-50'
  const border = score >= 75 ? 'border-emerald-200' : score >= 50 ? 'border-amber-200' : 'border-red-200'

  return { score, label, color, bg, border }
})

function submit() {
  if (!selectedAgent.value) {
    toastStore.addToast('Veuillez sélectionner un agent.', 'warning')
    return
  }
  if (!selectedVehicule.value) {
    toastStore.addToast('Veuillez sélectionner un véhicule du parc.', 'warning')
    return
  }
  const vLabel = vehiculesStore.label(selectedVehicule.value)
  saisiesStore.enregistrerTonnage({
    matricule: selectedAgent.value.matricule,
    date: date.value,
    agent: selectedAgent.value.nom,
    vehicule: vehiculeType.value,
    noParc: selectedVehicule.value.noParc,
    immatriculation: selectedVehicule.value.immatriculation,
    vehiculeLabel: vLabel,
    tonnage: parseFloat(tonnage.value),
    rotations: parseInt(rotations.value),
  })
  toastStore.addToast(`Tonnage enregistré : ${selectedAgent.value.nom} sur ${vLabel} — ${tonnage.value}t, ${rotations.value} rot.`, 'success')
  tonnage.value = ''
  rotations.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Saisie Tonnage</h1>
        <p class="text-sm text-gray-500 mt-0.5">Module E10 — Chauffeur PL + Ripeurs</p>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
        <Truck class="w-4 h-4 text-emerald-600" />
        <span class="text-sm font-medium text-gray-700">Service Collecte</span>
      </div>
    </div>

    <ReadOnlyBanner service="Collecte" />

    <!-- Main form card -->
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden" :class="{ 'opacity-60 pointer-events-none': readOnly }">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Weight class="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900">Nouveau relevé</h3>
          <p class="text-xs text-gray-500">Saisie du tonnage journalier et nombre de rotations</p>
        </div>
      </div>

      <form @submit.prevent="submit" class="p-6 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Agent selector -->
          <div>
            <AgentSearchInput
              v-model="agent"
              :date="date"
              :filter-presents="false"
              label="Agent (Chauffeur)"
              required
              @agent-selected="onAgentSelected"
            />
          </div>

          <!-- Date -->
          <div>
            <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <Calendar class="w-3.5 h-3.5 text-gray-400" />
              Date du relevé
            </label>
            <input
              v-model="date"
              type="date"
              required
              class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-200"
            />
          </div>

          <!-- Véhicule du parc (N° Parc + Type auto) -->
          <div class="md:col-span-2">
            <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <Truck class="w-3.5 h-3.5 text-gray-400" />
              Véhicule du parc <span class="text-red-400">*</span>
            </label>
            <select
              v-model="selectedVehiculeNoParc"
              required
              class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-200"
            >
              <option value="">— Sélectionner un véhicule —</option>
              <optgroup v-for="type in vehiculesStore.typesPL" :key="type" :label="type">
                <option
                  v-for="v in vehiculesStore.vehiculesOperationnels.filter(vv => vv.type === type)"
                  :key="v.noParc"
                  :value="v.noParc"
                >
                  N°{{ v.noParc }} — {{ v.immatriculation || 'Sans immat' }} ({{ v.marque }} {{ v.modele }})
                </option>
              </optgroup>
            </select>

            <!-- Info véhicule sélectionné -->
            <div v-if="selectedVehicule" class="mt-2 flex items-center gap-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Hash class="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div class="text-sm">
                <span class="font-semibold text-emerald-800">{{ selectedVehicule.type }}</span>
                <span class="text-emerald-700"> — N° Parc {{ selectedVehicule.noParc }}</span>
                <span class="text-emerald-600"> · {{ selectedVehicule.marque }} {{ selectedVehicule.modele }}</span>
                <span v-if="selectedVehicule.immatriculation" class="text-emerald-600"> · {{ selectedVehicule.immatriculation }}</span>
              </div>
            </div>
          </div>

          <!-- Tonnage -->
          <div>
            <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <Weight class="w-3.5 h-3.5 text-gray-400" />
              Tonnage total (tonnes)
            </label>
            <input
              v-model="tonnage"
              type="number"
              step="0.1"
              placeholder="Ex: 8.5"
              required
              class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-200"
            />
          </div>

          <!-- Rotations -->
          <div>
            <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <RotateCcw class="w-3.5 h-3.5 text-gray-400" />
              Nombre de rotations
            </label>
            <input
              v-model="rotations"
              type="number"
              placeholder="Ex: 2"
              required
              class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-200"
            />
          </div>
        </div>

        <!-- Score estimate panel -->
        <div
          v-if="scoreEstime"
          class="rounded-xl border p-5 transition-all duration-300"
          :class="[scoreEstime.bg, scoreEstime.border]"
        >
          <div class="flex items-center gap-2 mb-3">
            <Gauge class="w-4 h-4" :class="scoreEstime.color" />
            <h4 class="text-sm font-semibold text-gray-900">Estimation du score journalier</h4>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-gray-500 mb-1">Moyenne calculée</p>
              <p class="text-xl font-bold font-mono text-gray-900">{{ (tonnage / rotations).toFixed(2) }} <span class="text-sm font-normal text-gray-500">t / rotation</span></p>
            </div>
            <div class="text-right">
              <p class="text-xs font-medium text-gray-500 mb-1">Score estimé ({{ vehiculeType }})</p>
              <p class="text-3xl font-bold font-mono tracking-tight" :class="scoreEstime.color">{{ scoreEstime.score }} %</p>
              <p class="text-xs font-semibold uppercase tracking-wider mt-0.5" :class="scoreEstime.color">{{ scoreEstime.label }}</p>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div class="flex justify-end pt-4 border-t border-gray-100">
          <BaseButton type="submit" variant="primary">Enregistrer le tonnage</BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
