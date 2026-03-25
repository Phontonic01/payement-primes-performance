<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import { Truck, Weight, RotateCcw, Calendar, User, Gauge, Hash, Users, MapPin, Route, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-vue-next'
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
const router = useRouter()

// ── Onglet actif ──
const activeTab = ref('chauffeur')
const tabs = [
  { id: 'chauffeur', label: 'Chauffeur', icon: User },
  { id: 'ripeur', label: 'Ripeurs', icon: Users },
  { id: 'arrondissement', label: 'Arrondissement', icon: MapPin },
  { id: 'circuit', label: 'Circuit & Tonnage', icon: Route },
]

// ── Données formulaire ──
const date = ref(new Date().toISOString().split('T')[0])

// Chauffeur
const chauffeurMatricule = ref('')
const selectedChauffeur = ref(null)
const selectedVehiculeNoParc = ref('')

// Ripeurs
const ripeur1Matricule = ref('')
const ripeur2Matricule = ref('')
const selectedRipeur1 = ref(null)
const selectedRipeur2 = ref(null)

// Arrondissement
const arrondissement = ref('')
const secteur = ref('')
const arrondissements = [
  '1er Arrondissement — Libreville Centre',
  '2e Arrondissement — Libreville Nord',
  '3e Arrondissement — Libreville Sud',
  '4e Arrondissement — Nzeng-Ayong',
  '5e Arrondissement — Akanda',
  '6e Arrondissement — Owendo',
  'Owendo Port',
  'PK8 — PK12',
  'PK12 — PK18',
  'Bikélé',
]

// Circuit & Tonnage
const circuitNom = ref('')
const tonnage = ref('')
const rotations = ref('')

// ── Computed ──
const selectedVehicule = computed(() => {
  if (!selectedVehiculeNoParc.value) return null
  return vehiculesStore.getByNoParc(selectedVehiculeNoParc.value)
})
const vehiculeType = computed(() => selectedVehicule.value?.type || 'BOM')

// Validation par onglet
const tabValid = computed(() => ({
  chauffeur: !!selectedChauffeur.value && !!selectedVehicule.value && !!date.value,
  ripeur: !!selectedRipeur1.value,
  arrondissement: !!arrondissement.value,
  circuit: !!tonnage.value && !!rotations.value,
}))

// Score estimé
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

// ── Navigation onglets ──
function nextTab() {
  const idx = tabs.findIndex(t => t.id === activeTab.value)
  if (idx < tabs.length - 1) activeTab.value = tabs[idx + 1].id
}
function prevTab() {
  const idx = tabs.findIndex(t => t.id === activeTab.value)
  if (idx > 0) activeTab.value = tabs[idx - 1].id
}

// ── Soumission ──
function submit() {
  if (!selectedChauffeur.value) {
    toastStore.addToast('Veuillez sélectionner le chauffeur.', 'warning')
    activeTab.value = 'chauffeur'
    return
  }
  if (!selectedVehicule.value) {
    toastStore.addToast('Veuillez sélectionner un véhicule du parc.', 'warning')
    activeTab.value = 'chauffeur'
    return
  }
  if (!selectedRipeur1.value) {
    toastStore.addToast('Veuillez sélectionner au moins le Ripeur 1.', 'warning')
    activeTab.value = 'ripeur'
    return
  }
  if (!arrondissement.value) {
    toastStore.addToast('Veuillez sélectionner un arrondissement.', 'warning')
    activeTab.value = 'arrondissement'
    return
  }

  const vLabel = vehiculesStore.label(selectedVehicule.value)
  const saisieBase = {
    date: date.value,
    vehicule: vehiculeType.value,
    noParc: selectedVehicule.value.noParc,
    immatriculation: selectedVehicule.value.immatriculation,
    vehiculeLabel: vLabel,
    tonnage: parseFloat(tonnage.value),
    rotations: parseInt(rotations.value),
    arrondissement: arrondissement.value,
    secteur: secteur.value,
    circuit: circuitNom.value,
  }

  // Enregistrer les tonnages individuels pour chaque membre
  saisiesStore.enregistrerTonnage({ ...saisieBase, matricule: selectedChauffeur.value.matricule, agent: selectedChauffeur.value.nom })
  saisiesStore.enregistrerTonnage({ ...saisieBase, matricule: selectedRipeur1.value.matricule, agent: selectedRipeur1.value.nom })
  if (selectedRipeur2.value) {
    saisiesStore.enregistrerTonnage({ ...saisieBase, matricule: selectedRipeur2.value.matricule, agent: selectedRipeur2.value.nom })
  }

  // Créer la fiche collecte complète (partagée entre tous les services)
  const ficheId = saisiesStore.enregistrerFicheCollecte({
    date: date.value,
    chauffeur: selectedChauffeur.value,
    ripeur1: selectedRipeur1.value,
    ripeur2: selectedRipeur2.value,
    vehiculeType: vehiculeType.value,
    vehiculeLabel: vLabel,
    noParc: selectedVehicule.value.noParc,
    immatriculation: selectedVehicule.value.immatriculation,
    arrondissement: arrondissement.value,
    secteur: secteur.value,
    circuit: circuitNom.value,
    tonnage: parseFloat(tonnage.value),
    rotations: parseInt(rotations.value),
  })

  toastStore.addToast('Fiche collecte enregistrée avec succès !', 'success')

  // Rediriger vers la fiche récapitulative
  router.push(`/collecte/fiche/${ficheId}`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Saisie Collecte</h1>
        <p class="text-sm text-gray-500 mt-0.5">Module E10 — Chauffeur PL + Ripeurs par équipe</p>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
        <Truck class="w-4 h-4 text-emerald-600" />
        <span class="text-sm font-medium text-gray-700">Service Collecte</span>
      </div>
    </div>

    <ReadOnlyBanner service="Collecte" />

    <!-- Date commune -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Calendar class="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900">Date du relevé</h3>
          <p class="text-xs text-gray-500">Commune à toute l'équipe</p>
        </div>
      </div>
      <input
        v-model="date"
        type="date"
        required
        class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-200"
      />
    </div>

    <!-- Onglets -->
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden" :class="{ 'opacity-60 pointer-events-none': readOnly }">
      <!-- Tab bar -->
      <div class="flex border-b border-gray-100 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          @click="activeTab = tab.id"
          class="flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap flex-shrink-0 cursor-pointer"
          :class="activeTab === tab.id
            ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
        >
          <component :is="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
          <CheckCircle
            v-if="tabValid[tab.id]"
            class="w-3.5 h-3.5 text-emerald-500"
          />
        </button>
      </div>

      <!-- Tab content -->
      <div class="p-6">

        <!-- ═══════════ ONGLET CHAUFFEUR ═══════════ -->
        <div v-show="activeTab === 'chauffeur'" class="space-y-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <User class="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-900">Chauffeur PL</h3>
              <p class="text-xs text-gray-500">Sélectionner le chauffeur et son véhicule</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="md:col-span-2">
              <AgentSearchInput
                v-model="chauffeurMatricule"
                :date="date"
                :filter-presents="false"
                label="Chauffeur (Nom ou Matricule)"
                placeholder="Tapez un nom ou un matricule..."
                required
                @agent-selected="(a) => selectedChauffeur = a"
              />
            </div>

            <!-- Véhicule du parc -->
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
          </div>

          <div class="flex justify-end pt-4 border-t border-gray-100">
            <BaseButton @click="nextTab" variant="primary" type="button">
              Suivant — Ripeurs
              <ChevronRight class="w-4 h-4 ml-1.5" />
            </BaseButton>
          </div>
        </div>

        <!-- ═══════════ ONGLET RIPEURS ═══════════ -->
        <div v-show="activeTab === 'ripeur'" class="space-y-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-900">Ripeurs de l'équipe</h3>
              <p class="text-xs text-gray-500">Sélectionner les 2 ripeurs affectés à ce véhicule</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Ripeur 1 -->
            <div>
              <AgentSearchInput
                v-model="ripeur1Matricule"
                :date="date"
                :filter-presents="false"
                label="Ripeur 1 (Nom ou Matricule)"
                placeholder="Tapez un nom ou un matricule..."
                required
                @agent-selected="(a) => selectedRipeur1 = a"
              />
            </div>

            <!-- Ripeur 2 -->
            <div>
              <AgentSearchInput
                v-model="ripeur2Matricule"
                :date="date"
                :filter-presents="false"
                label="Ripeur 2 (Nom ou Matricule)"
                placeholder="Tapez un nom ou un matricule..."
                @agent-selected="(a) => selectedRipeur2 = a"
              />
              <p class="text-[11px] text-gray-400 mt-1.5">Optionnel si l'équipe n'a qu'un seul ripeur</p>
            </div>
          </div>

          <!-- Résumé équipe -->
          <div v-if="selectedChauffeur || selectedRipeur1" class="rounded-xl bg-gray-50 border border-gray-200 p-4">
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Équipe du jour</h4>
            <div class="flex flex-wrap gap-3">
              <div v-if="selectedChauffeur" class="flex items-center gap-2 px-3 py-2 bg-white border border-emerald-200 rounded-lg">
                <div class="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">{{ selectedChauffeur.nom.charAt(0) }}</div>
                <div>
                  <p class="text-xs font-semibold text-gray-900">{{ selectedChauffeur.nom }}</p>
                  <p class="text-[10px] text-emerald-600 font-medium">Chauffeur · {{ selectedChauffeur.matricule }}</p>
                </div>
              </div>
              <div v-if="selectedRipeur1" class="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg">
                <div class="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">{{ selectedRipeur1.nom.charAt(0) }}</div>
                <div>
                  <p class="text-xs font-semibold text-gray-900">{{ selectedRipeur1.nom }}</p>
                  <p class="text-[10px] text-blue-600 font-medium">Ripeur 1 · {{ selectedRipeur1.matricule }}</p>
                </div>
              </div>
              <div v-if="selectedRipeur2" class="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg">
                <div class="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">{{ selectedRipeur2.nom.charAt(0) }}</div>
                <div>
                  <p class="text-xs font-semibold text-gray-900">{{ selectedRipeur2.nom }}</p>
                  <p class="text-[10px] text-blue-500 font-medium">Ripeur 2 · {{ selectedRipeur2.matricule }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-between pt-4 border-t border-gray-100">
            <BaseButton @click="prevTab" variant="outline" type="button">
              <ChevronLeft class="w-4 h-4 mr-1.5" />
              Chauffeur
            </BaseButton>
            <BaseButton @click="nextTab" variant="primary" type="button">
              Suivant — Arrondissement
              <ChevronRight class="w-4 h-4 ml-1.5" />
            </BaseButton>
          </div>
        </div>

        <!-- ═══════════ ONGLET ARRONDISSEMENT ═══════════ -->
        <div v-show="activeTab === 'arrondissement'" class="space-y-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <MapPin class="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-900">Arrondissement de collecte</h3>
              <p class="text-xs text-gray-500">Zone géographique de la tournée</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                <MapPin class="w-3.5 h-3.5 text-gray-400" />
                Arrondissement <span class="text-red-400">*</span>
              </label>
              <select
                v-model="arrondissement"
                required
                class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors duration-200"
              >
                <option value="">— Sélectionner un arrondissement —</option>
                <option v-for="arr in arrondissements" :key="arr" :value="arr">{{ arr }}</option>
              </select>
            </div>

            <div>
              <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                <MapPin class="w-3.5 h-3.5 text-gray-400" />
                Secteur / Quartier
              </label>
              <input
                v-model="secteur"
                type="text"
                placeholder="Ex: Quartier Glass, Bord de mer..."
                class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors duration-200"
              />
            </div>
          </div>

          <!-- Arrondissement sélectionné -->
          <div v-if="arrondissement" class="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
            <MapPin class="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p class="text-sm font-semibold text-amber-800">{{ arrondissement }}</p>
              <p v-if="secteur" class="text-xs text-amber-600">Secteur : {{ secteur }}</p>
            </div>
          </div>

          <div class="flex justify-between pt-4 border-t border-gray-100">
            <BaseButton @click="prevTab" variant="outline" type="button">
              <ChevronLeft class="w-4 h-4 mr-1.5" />
              Ripeurs
            </BaseButton>
            <BaseButton @click="nextTab" variant="primary" type="button">
              Suivant — Circuit & Tonnage
              <ChevronRight class="w-4 h-4 ml-1.5" />
            </BaseButton>
          </div>
        </div>

        <!-- ═══════════ ONGLET CIRCUIT & TONNAGE ═══════════ -->
        <div v-show="activeTab === 'circuit'" class="space-y-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <Route class="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-900">Circuit & Tonnage</h3>
              <p class="text-xs text-gray-500">Données de performance de la tournée</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Nom du circuit -->
            <div class="md:col-span-2">
              <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                <Route class="w-3.5 h-3.5 text-gray-400" />
                Nom du circuit
              </label>
              <input
                v-model="circuitNom"
                type="text"
                placeholder="Ex: Circuit Akanda Nord, Circuit Glass-Montagne Sainte..."
                class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors duration-200"
              />
            </div>

            <!-- Tonnage -->
            <div>
              <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                <Weight class="w-3.5 h-3.5 text-gray-400" />
                Tonnage total (tonnes) <span class="text-red-400">*</span>
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
                Nombre de rotations <span class="text-red-400">*</span>
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

          <!-- Récapitulatif complet avant soumission -->
          <div v-if="selectedChauffeur" class="rounded-xl bg-gray-50 border border-gray-200 p-5 space-y-3">
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Récapitulatif de la saisie</h4>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p class="text-xs text-gray-400">Chauffeur</p>
                <p class="font-semibold text-gray-900">{{ selectedChauffeur.nom }}</p>
                <p class="text-[10px] text-gray-500">{{ selectedChauffeur.matricule }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Ripeur(s)</p>
                <p class="font-semibold text-gray-900">{{ selectedRipeur1?.nom || '—' }}</p>
                <p v-if="selectedRipeur2" class="text-xs text-gray-600">{{ selectedRipeur2.nom }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Arrondissement</p>
                <p class="font-semibold text-gray-900">{{ arrondissement || '—' }}</p>
                <p v-if="secteur" class="text-[10px] text-gray-500">{{ secteur }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400">Véhicule</p>
                <p class="font-semibold text-gray-900">{{ vehiculeType }} N°{{ selectedVehicule?.noParc }}</p>
              </div>
            </div>
          </div>

          <div class="flex justify-between pt-4 border-t border-gray-100">
            <BaseButton @click="prevTab" variant="outline" type="button">
              <ChevronLeft class="w-4 h-4 mr-1.5" />
              Arrondissement
            </BaseButton>
            <BaseButton @click="submit" variant="primary" type="button">
              <CheckCircle class="w-4 h-4 mr-1.5" />
              Enregistrer pour toute l'équipe
            </BaseButton>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
