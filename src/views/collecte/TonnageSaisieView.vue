<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import {
  Truck, Weight, RotateCcw, Calendar, User, Gauge, Hash, Users, MapPin,
  Route, ChevronRight, ChevronLeft, CheckCircle, Zap, Loader2, WifiOff,
  Search, RefreshCw
} from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useSaisiesStore } from '@/stores/saisies'
import { useAgentsStore } from '@/stores/agents'
import { useAuthStore } from '@/stores/auth'
import { useVehiculesStore } from '@/stores/vehicules'
import { usePrimesStore } from '@/stores/primes'
import ReadOnlyBanner from '@/components/ui/ReadOnlyBanner.vue'
import api from '@/api/client'

const toastStore = useToastStore()
const saisiesStore = useSaisiesStore()
const agentsStore = useAgentsStore()
const authStore = useAuthStore()
const vehiculesStore = useVehiculesStore()
const primesStore = usePrimesStore()
const readOnly = computed(() => authStore.isReadOnly())
const router = useRouter()

// ── Étapes du workflow ──
const activeStep = ref('vehicule')
const steps = [
  { id: 'vehicule', label: 'Véhicule', icon: Truck },
  { id: 'ripeur', label: 'Ripeurs', icon: Users },
  { id: 'recap', label: 'Validation', icon: CheckCircle },
]

// ── Date ──
const date = ref(new Date().toISOString().split('T')[0])

// ── Données pont-bascule ──
const pontBasculeLoading = ref(false)
const pontBasculeError = ref('')
const vehiculesDuJour = ref([])
const bilanMensuel = ref(null) // bilan cumulé avec pénalités jour par jour
const searchQuery = ref('')
const filtreEquipe = ref('TOUS') // TOUS, JOUR, NUIT
const selectedVehicule = ref(null)

async function chargerVehiculesDuJour() {
  pontBasculeLoading.value = true
  pontBasculeError.value = ''
  vehiculesDuJour.value = []
  selectedVehicule.value = null
  try {
    const mois = date.value.slice(0, 7)
    // Charger les véhicules du jour ET le bilan mensuel en parallèle
    const [dataJour, dataBilan] = await Promise.all([
      api.pontBasculeVehiculesDuJour(date.value, 'CLEAN AFRICA'),
      api.pontBasculeBilan(mois),
    ])

    bilanMensuel.value = dataBilan

    // Enrichir chaque véhicule du jour avec les pénalités cumulées du mois
    const bilanMap = {}
    if (dataBilan?.chauffeurs) {
      dataBilan.chauffeurs.forEach(c => { bilanMap[c.code_transporteur] = c })
    }

    vehiculesDuJour.value = (dataJour.vehicules || []).map(v => {
      const bilan = bilanMap[v.code_transporteur]
      return {
        ...v,
        // Données cumulées du mois depuis le bilan
        bilan: bilan || null,
        jours_present: bilan?.jours_present || v.jours_present || 0,
        taux_presence: bilan?.taux_presence || v.taux_presence || 0,
        penalites_mois: bilan?.penalites || { tonnage: 0, bouclage: 0, entretien: 0, qhse: 0, total: 0 },
        prime_finale: bilan?.prime_finale ?? plafond.value,
        prorata: bilan?.prorata || false,
      }
    })

    if (vehiculesDuJour.value.length > 0) {
      toastStore.addToast(`${vehiculesDuJour.value.length} véhicule(s) · Bilan mensuel chargé`, 'success')
    }
  } catch (err) {
    pontBasculeError.value = err.message
    toastStore.addToast('Pont-bascule indisponible : ' + err.message, 'error')
  } finally {
    pontBasculeLoading.value = false
  }
}

// Charger au montage et quand la date change
watch(date, () => chargerVehiculesDuJour(), { immediate: true })

// ── Paramètres Note de Service ──
const joursOuvresMois = computed(() => primesStore.config.joursOuvresMois) // 30
const seuilPresence = computed(() => primesStore.config.seuilPresence) // 93
const plafond = computed(() => primesStore.config.plafonds.CHAUFFEUR_COLLECTE) // 50000

/**
 * Prime par dégression — pénalités cumulées jour par jour depuis le bilan mensuel.
 *
 * Plafond (50 000 F) - pénalités cumulées du mois = reste à payer.
 * Chaque mauvais jour enlève (833 F × % manqué) sur l'axe tonnage.
 * Présence < 93% → prime au prorata.
 */
function estimerPrime(v) {
  const p = plafond.value // 50 000

  // Pénalités cumulées du mois (viennent du bilan API, calculées jour par jour)
  const penalites = v.penalites_mois || { tonnage: 0, bouclage: 0, entretien: 0, qhse: 0, total: 0 }

  // Prime avant prorata
  const primeAvant = Math.max(0, p - penalites.total)

  // Présence
  const joursPresent = v.jours_present || 0
  const tauxPresence = v.taux_presence || 0
  const prorata = v.prorata || false
  const primeFinale = v.prime_finale ?? primeAvant

  // Score global pour la couleur (approximation)
  const scoreGlobal = (primeFinale / p) * 100

  return {
    plafond: p,
    penalites,
    primeAvant,
    primeFinale,
    scoreGlobal,
    joursPresent,
    tauxPresence,
    prorata,
    // Nombre de jours avec des pénalités
    nbJoursPenalises: v.bilan?.detail_jours?.filter(j => j.penalite > 0).length || 0,
    nbJoursSansPenalite: v.bilan?.detail_jours?.filter(j => j.penalite === 0).length || 0,
  }
}

// Couleur selon le score
function primeColor(scoreGlobal) {
  if (scoreGlobal >= 75) return 'text-emerald-700 bg-emerald-50'
  if (scoreGlobal >= 60) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

// Couleur barre de progression
function barColor(scoreGlobal) {
  if (scoreGlobal >= 75) return 'bg-emerald-500'
  if (scoreGlobal >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

// Filtrer la liste des véhicules par recherche ET par équipe
const vehiculesFiltres = computed(() => {
  let list = vehiculesDuJour.value

  // Filtre par équipe
  if (filtreEquipe.value !== 'TOUS') {
    list = list.filter(v => v.equipe === filtreEquipe.value)
  }

  // Filtre par recherche texte
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(v =>
      v.immatriculation.toLowerCase().includes(q) ||
      v.chauffeur.toLowerCase().includes(q) ||
      v.arrondissement.toLowerCase().includes(q) ||
      v.code_transporteur.toString().includes(q)
    )
  }

  return list
})

// Compteurs par équipe
const nbJour = computed(() => vehiculesDuJour.value.filter(v => v.equipe === 'JOUR').length)
const nbNuit = computed(() => vehiculesDuJour.value.filter(v => v.equipe === 'NUIT').length)

// ── Fiche détaillée d'un agent (historique mensuel) ──
const ficheAgent = ref(null)
const ficheLoading = ref(false)

function ouvrirFicheAgent(v) {
  // Chercher dans le bilan mensuel (chargé en parallèle avec vehicules du jour)
  const bilan = bilanMensuel.value
  const code = String(v.code_transporteur)

  if (bilan?.chauffeurs) {
    const agent = bilan.chauffeurs.find(c => String(c.code_transporteur) === code)
    if (agent) {
      ficheAgent.value = { ...agent, immatriculation: v.immatriculation }
      // Scroll vers la fiche
      setTimeout(() => {
        document.getElementById('fiche-agent-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
      return
    }
  }

  // Fallback : afficher au moins les données du jour
  ficheAgent.value = {
    code_transporteur: v.code_transporteur,
    chauffeur: v.chauffeur,
    immatriculation: v.immatriculation,
    equipe: v.equipe,
    jours_present: v.jours_present || 0,
    taux_presence: v.taux_presence || 0,
    plafond: plafond.value,
    penalites: v.penalites_mois || { tonnage: 0, bouclage: 0, entretien: 0, qhse: 0, total: 0 },
    prime_avant_presence: plafond.value - (v.penalites_mois?.total || 0),
    prime_finale: v.prime_finale ?? plafond.value,
    prorata: v.prorata || false,
    detail_jours: v.bilan?.detail_jours || [],
  }
  setTimeout(() => {
    document.getElementById('fiche-agent-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 100)
}

function fermerFicheAgent() {
  ficheAgent.value = null
}

function selectionnerVehicule(v) {
  selectedVehicule.value = v
  activeStep.value = 'ripeur'
}

// ── Ripeurs (saisie manuelle) ──
const ripeur1Matricule = ref('')
const ripeur2Matricule = ref('')
const ripeur3Matricule = ref('')
const selectedRipeur1 = ref(null)
const selectedRipeur2 = ref(null)
const selectedRipeur3 = ref(null)

// ── Correspondance véhicule local (optionnel) ──
const vehiculeLocal = computed(() => {
  if (!selectedVehicule.value) return null
  return vehiculesStore.vehiculesOperationnels.find(
    v => v.immatriculation === selectedVehicule.value.immatriculation
  ) || null
})

const vehiculeType = computed(() => vehiculeLocal.value?.type || 'BOM')

// ── Score estimé ──
const scoreEstime = computed(() => {
  if (!selectedVehicule.value) return null
  const t = selectedVehicule.value.tonnage_tonnes
  const r = selectedVehicule.value.rotations
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

// ── Navigation ──
function nextStep() {
  const idx = steps.findIndex(s => s.id === activeStep.value)
  if (idx < steps.length - 1) activeStep.value = steps[idx + 1].id
}
function prevStep() {
  const idx = steps.findIndex(s => s.id === activeStep.value)
  if (idx > 0) activeStep.value = steps[idx - 1].id
}

// ── Soumission ──
function submit() {
  if (!selectedVehicule.value) {
    toastStore.addToast('Veuillez sélectionner un véhicule.', 'warning')
    activeStep.value = 'vehicule'
    return
  }
  if (!selectedRipeur1.value) {
    toastStore.addToast('Veuillez sélectionner au moins le Ripeur 1.', 'warning')
    activeStep.value = 'ripeur'
    return
  }

  const v = selectedVehicule.value
  const vLocal = vehiculeLocal.value
  const vLabel = vLocal ? `${vLocal.type} N°${vLocal.noParc} — ${vLocal.immatriculation}` : v.immatriculation

  const saisieBase = {
    date: date.value,
    vehicule: vehiculeType.value,
    noParc: vLocal?.noParc || '',
    immatriculation: v.immatriculation,
    vehiculeLabel: vLabel,
    tonnage: v.tonnage_tonnes,
    rotations: v.rotations,
    arrondissement: v.arrondissement,
    secteur: '',
    circuit: v.origine,
  }

  // Enregistrer les tonnages pour le chauffeur (donnée pont-bascule)
  saisiesStore.enregistrerTonnage({
    ...saisieBase,
    matricule: v.code_transporteur || v.immatriculation,
    agent: v.chauffeur,
  })

  // Enregistrer pour le ripeur 1
  saisiesStore.enregistrerTonnage({
    ...saisieBase,
    matricule: selectedRipeur1.value.matricule,
    agent: selectedRipeur1.value.nom,
  })

  // Ripeur 2 si présent
  if (selectedRipeur2.value) {
    saisiesStore.enregistrerTonnage({
      ...saisieBase,
      matricule: selectedRipeur2.value.matricule,
      agent: selectedRipeur2.value.nom,
    })
  }

  // Ripeur 3 si présent
  if (selectedRipeur3.value) {
    saisiesStore.enregistrerTonnage({
      ...saisieBase,
      matricule: selectedRipeur3.value.matricule,
      agent: selectedRipeur3.value.nom,
    })
  }

  // Fiche collecte complète
  const ficheId = saisiesStore.enregistrerFicheCollecte({
    date: date.value,
    chauffeur: { matricule: v.code_transporteur || v.immatriculation, nom: v.chauffeur },
    ripeur1: selectedRipeur1.value,
    ripeur2: selectedRipeur2.value,
    ripeur3: selectedRipeur3.value,
    vehiculeType: vehiculeType.value,
    vehiculeLabel: vLabel,
    noParc: vLocal?.noParc || '',
    immatriculation: v.immatriculation,
    arrondissement: v.arrondissement,
    secteur: '',
    circuit: v.origine,
    tonnage: v.tonnage_tonnes,
    rotations: v.rotations,
  })

  toastStore.addToast('Fiche collecte enregistrée avec succès !', 'success')
  router.push(`/collecte/fiche/${ficheId}`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Saisie Collecte</h1>
        <p class="text-sm text-gray-500 mt-0.5">Données automatiques pont-bascule — Ajoutez les ripeurs</p>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
        <Zap class="w-4 h-4 text-emerald-600" />
        <span class="text-sm font-medium text-emerald-700">Pont-bascule connecté</span>
      </div>
    </div>

    <ReadOnlyBanner service="Collecte" />

    <!-- Date -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Calendar class="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900">Date du relevé</h3>
          <p class="text-xs text-gray-500">Les données pont-bascule sont chargées automatiquement</p>
        </div>
      </div>
      <input
        v-model="date"
        type="date"
        required
        class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-200"
      />
      <button
        type="button"
        @click="chargerVehiculesDuJour"
        class="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
      >
        <RefreshCw class="w-4 h-4" />
        Actualiser
      </button>
    </div>

    <!-- Étapes -->
    <div class="flex items-center gap-2 px-1">
      <template v-for="(step, i) in steps" :key="step.id">
        <button
          type="button"
          @click="activeStep = step.id"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
          :class="activeStep === step.id
            ? 'bg-emerald-600 text-white shadow-sm'
            : step.id === 'recap' && selectedVehicule && selectedRipeur1
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-gray-100 text-gray-500'"
        >
          <component :is="step.icon" class="w-4 h-4" />
          {{ step.label }}
        </button>
        <ChevronRight v-if="i < steps.length - 1" class="w-4 h-4 text-gray-300" />
      </template>
    </div>

    <!-- ═══ ÉTAPE 1 : VÉHICULE (pont-bascule) ═══ -->
    <div v-show="activeStep === 'vehicule'" class="space-y-4" :class="{ 'opacity-60 pointer-events-none': readOnly }">

      <!-- Chargement -->
      <div v-if="pontBasculeLoading" class="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center gap-3">
        <Loader2 class="w-8 h-8 text-emerald-600 animate-spin" />
        <p class="text-sm text-gray-500">Chargement des données pont-bascule...</p>
      </div>

      <!-- Erreur -->
      <div v-else-if="pontBasculeError" class="bg-red-50 rounded-xl border border-red-200 p-6 flex items-center gap-3">
        <WifiOff class="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <p class="text-sm font-semibold text-red-800">Pont-bascule indisponible</p>
          <p class="text-xs text-red-600 mt-0.5">{{ pontBasculeError }}</p>
        </div>
      </div>

      <!-- Liste des véhicules -->
      <template v-else>
        <!-- Barre de recherche + stats -->
        <div class="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="relative flex-1">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Rechercher par immatriculation, chauffeur, matricule..."
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
              />
            </div>
            <span class="font-mono font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm">
              {{ vehiculesFiltres.length }} véhicule(s)
            </span>
          </div>
          <!-- Filtre Jour / Nuit -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="filtreEquipe = 'TOUS'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              :class="filtreEquipe === 'TOUS'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            >
              Tous ({{ vehiculesDuJour.length }})
            </button>
            <button
              type="button"
              @click="filtreEquipe = 'NUIT'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              :class="filtreEquipe === 'NUIT'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'"
            >
              <span class="text-sm">🌙</span> Nuit ({{ nbNuit }})
            </button>
            <button
              type="button"
              @click="filtreEquipe = 'JOUR'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              :class="filtreEquipe === 'JOUR'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'"
            >
              <span class="text-sm">☀️</span> Jour ({{ nbJour }})
            </button>
          </div>
        </div>

        <!-- Véhicule sélectionné -->
        <div v-if="selectedVehicule" class="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-300 p-5 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Zap class="w-5 h-5 text-emerald-600" />
              <span class="text-sm font-bold text-emerald-800">Véhicule sélectionné</span>
            </div>
            <button
              type="button"
              @click="selectedVehicule = null"
              class="text-xs text-emerald-600 hover:text-emerald-800 font-medium cursor-pointer"
            >Changer</button>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <p class="text-[11px] text-emerald-600 font-medium">Immatriculation</p>
              <p class="font-bold text-gray-900 font-mono">{{ selectedVehicule.immatriculation }}</p>
            </div>
            <div>
              <p class="text-[11px] text-emerald-600 font-medium">Matricule / Chauffeur</p>
              <p class="font-semibold text-gray-900">
                <span class="font-mono text-xs text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded mr-1">{{ selectedVehicule.code_transporteur }}</span>
                {{ selectedVehicule.chauffeur }}
              </p>
            </div>
            <div>
              <p class="text-[11px] text-emerald-600 font-medium">Tonnage</p>
              <p class="font-bold text-gray-900 font-mono">{{ selectedVehicule.tonnage_tonnes }} t</p>
            </div>
            <div>
              <p class="text-[11px] text-emerald-600 font-medium">Rotations</p>
              <p class="font-bold text-gray-900 font-mono">{{ selectedVehicule.rotations }}</p>
            </div>
            <div>
              <p class="text-[11px] text-emerald-600 font-medium">Arrondissement</p>
              <p class="font-semibold text-gray-900">{{ selectedVehicule.arrondissement }}</p>
            </div>
            <div>
              <p class="text-[11px] text-emerald-600 font-medium">Reste à payer</p>
              <p class="font-bold font-mono" :class="primeColor(estimerPrime(selectedVehicule).scoreGlobal)">
                {{ estimerPrime(selectedVehicule).primeFinale.toLocaleString() }} F
              </p>
              <p class="text-[10px] text-gray-500">
                Score: {{ estimerPrime(selectedVehicule).scoreGlobal.toFixed(0) }}%
                · Presence {{ estimerPrime(selectedVehicule).tauxPresence }}%
              </p>
            </div>
          </div>
          <!-- Barre de dégression prime -->
          <div class="mt-3 space-y-2">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-gray-500">Plafond : {{ estimerPrime(selectedVehicule).plafond.toLocaleString() }} F</span>
              <span class="text-red-600 font-semibold" v-if="estimerPrime(selectedVehicule).penalites.total > 0">
                Pénalités : -{{ estimerPrime(selectedVehicule).penalites.total.toLocaleString() }} F
              </span>
              <span class="font-bold" :class="primeColor(estimerPrime(selectedVehicule).scoreGlobal)">
                Reste à payer : {{ estimerPrime(selectedVehicule).primeFinale.toLocaleString() }} F
              </span>
            </div>
            <!-- Barre : vert = reste à payer, rouge = pénalités -->
            <div class="w-full h-3 bg-red-200 rounded-full overflow-hidden flex">
              <div
                class="h-full rounded-l-full transition-all duration-500"
                :class="barColor(estimerPrime(selectedVehicule).scoreGlobal)"
                :style="{ width: (estimerPrime(selectedVehicule).primeFinale / estimerPrime(selectedVehicule).plafond * 100) + '%' }"
              ></div>
            </div>
            <!-- Détail pénalités -->
            <div class="flex flex-wrap gap-3 text-[10px]">
              <span :class="estimerPrime(selectedVehicule).penalites.tonnage > 0 ? 'text-red-500' : 'text-emerald-500'">
                Tonnage (50%): {{ estimerPrime(selectedVehicule).penalites.tonnage > 0 ? '-' + estimerPrime(selectedVehicule).penalites.tonnage.toLocaleString() + ' F' : '✓ OK' }}
              </span>
              <span :class="estimerPrime(selectedVehicule).penalites.bouclage > 0 ? 'text-red-500' : 'text-emerald-500'">
                Bouclage (25%): {{ estimerPrime(selectedVehicule).penalites.bouclage > 0 ? '-' + estimerPrime(selectedVehicule).penalites.bouclage.toLocaleString() + ' F' : '✓ OK' }}
              </span>
              <span :class="estimerPrime(selectedVehicule).penalites.entretien > 0 ? 'text-red-500' : 'text-emerald-500'">
                Entretien (15%): {{ estimerPrime(selectedVehicule).penalites.entretien > 0 ? '-' + estimerPrime(selectedVehicule).penalites.entretien.toLocaleString() + ' F' : '✓ OK' }}
              </span>
              <span :class="estimerPrime(selectedVehicule).penalites.qhse > 0 ? 'text-red-500' : 'text-emerald-500'">
                QHSE (10%): {{ estimerPrime(selectedVehicule).penalites.qhse > 0 ? '-' + estimerPrime(selectedVehicule).penalites.qhse.toLocaleString() + ' F' : '✓ OK' }}
              </span>
              <span class="ml-auto" :class="estimerPrime(selectedVehicule).tauxPresence >= 93 ? 'text-emerald-500' : 'text-amber-500'">
                Presence: {{ estimerPrime(selectedVehicule).tauxPresence }}%
                {{ estimerPrime(selectedVehicule).prorata ? '(prorata)' : '' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Tableau des véhicules du jour -->
        <div v-if="!selectedVehicule" class="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Immat.</th>
                  <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Mat.</th>
                  <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Chauffeur</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Tonnage</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Tours</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Plafond</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Sanctions</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Apres sanct.</th>
                  <th class="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Presence</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-red-500 uppercase">Total deduit</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-emerald-600 uppercase">A payer</th>
                  <th class="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr
                  v-for="v in vehiculesFiltres"
                  :key="v.immatriculation"
                  class="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                  @click="ouvrirFicheAgent(v)"
                >
                  <td class="px-3 py-2.5 font-mono font-semibold text-gray-900 text-xs">{{ v.immatriculation }}</td>
                  <td class="px-3 py-2.5 font-mono text-xs text-gray-500">{{ v.code_transporteur }}</td>
                  <td class="px-3 py-2.5 text-gray-900 text-xs">
                    {{ v.chauffeur }}
                    <span
                      class="ml-1 inline-flex px-1 py-0.5 rounded text-[9px] font-bold"
                      :class="v.equipe === 'NUIT' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'"
                    >{{ v.equipe === 'NUIT' ? '🌙' : '☀️' }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono font-semibold text-gray-900">{{ v.tonnage_tonnes }} t</td>
                  <td class="px-3 py-2.5 text-right font-mono text-gray-700">{{ v.rotations }}</td>
                  <td class="px-3 py-2.5 text-right font-mono text-xs text-gray-400">{{ plafond.toLocaleString() }}</td>
                  <td class="px-3 py-2.5 text-right font-mono text-xs font-semibold" :class="estimerPrime(v).penalites.total > 0 ? 'text-red-600' : 'text-gray-300'">
                    {{ estimerPrime(v).penalites.total > 0 ? '-' + estimerPrime(v).penalites.total.toLocaleString() : '0' }}
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-xs font-semibold text-gray-700">
                    {{ estimerPrime(v).primeAvant.toLocaleString() }}
                  </td>
                  <td class="px-3 py-2.5 text-center">
                    <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded"
                      :class="v.taux_presence >= 93 ? 'text-emerald-700 bg-emerald-50' : v.taux_presence >= 70 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'">
                      {{ v.taux_presence }}%
                    </span>
                    <span v-if="estimerPrime(v).prorata" class="block text-[9px] text-amber-600 font-mono font-semibold mt-0.5">
                      = {{ Math.round(estimerPrime(v).primeAvant * v.taux_presence / 100).toLocaleString() }} F
                    </span>
                  </td>
                  <td class="px-3 py-2.5 text-right">
                    <span class="font-mono text-xs font-bold text-red-600">
                      -{{ (plafond - estimerPrime(v).primeFinale).toLocaleString() }} F
                    </span>
                  </td>
                  <td class="px-3 py-2.5 text-right">
                    <span class="font-mono text-xs font-bold px-2 py-0.5 rounded" :class="primeColor(estimerPrime(v).scoreGlobal)">
                      {{ estimerPrime(v).primeFinale.toLocaleString() }} F
                    </span>
                  </td>
                  <td class="px-2 py-2.5">
                    <ChevronRight class="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                  </td>
                </tr>
                <tr v-if="vehiculesFiltres.length === 0">
                  <td colspan="12" class="px-4 py-8 text-center text-gray-400">
                    Aucun vehicule trouve pour cette date
                  </td>
                </tr>
              </tbody>
            </table>

          </div>
        </div>

        <!-- ══ FICHE DÉTAILLÉE AGENT (historique mensuel 21→20) ══ -->
        <div v-if="ficheAgent" id="fiche-agent-detail" class="bg-white rounded-xl border border-blue-200 overflow-hidden">
          <!-- Header fiche -->
          <div class="px-5 py-4 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-blue-900">
                Fiche Tonnage Mensuel —
                <span class="font-mono">{{ ficheAgent.code_transporteur }}</span>
                {{ ficheAgent.chauffeur }}
              </h3>
              <p class="text-xs text-blue-600 mt-0.5">
                Vehicule {{ ficheAgent.immatriculation }} · {{ ficheAgent.equipe === 'NUIT' ? '🌙 Nuit' : '☀️ Jour' }}
                · Periode {{ bilanMensuel?.periode || '' }}
              </p>
            </div>
            <button @click="fermerFicheAgent" class="p-2 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
              <span class="text-blue-600 text-sm font-bold">✕</span>
            </button>
          </div>

          <!-- Résumé prime -->
          <div class="px-5 py-3 bg-blue-50/30 border-b border-blue-100 flex flex-wrap items-center gap-6 text-xs">
            <div>
              <span class="text-gray-500">Plafond</span>
              <p class="font-mono font-bold text-gray-700">{{ ficheAgent.plafond.toLocaleString() }} F</p>
            </div>
            <div class="text-lg text-gray-300">−</div>
            <div>
              <span class="text-gray-500">Sanctions cumulees</span>
              <p class="font-mono font-bold text-red-600">{{ ficheAgent.penalites.total.toLocaleString() }} F</p>
            </div>
            <div class="text-lg text-gray-300">=</div>
            <div>
              <span class="text-gray-500">Apres sanctions</span>
              <p class="font-mono font-bold text-gray-700">{{ ficheAgent.prime_avant_presence.toLocaleString() }} F</p>
            </div>
            <div v-if="ficheAgent.prorata">
              <span class="text-gray-500">× Presence {{ ficheAgent.taux_presence }}%</span>
            </div>
            <div class="text-lg text-gray-300">=</div>
            <div>
              <span class="text-emerald-600 font-semibold">A payer</span>
              <p class="font-mono font-bold text-emerald-700 text-sm">{{ ficheAgent.prime_finale.toLocaleString() }} F</p>
            </div>
            <div class="ml-auto">
              <span class="text-gray-500">Total deduit</span>
              <p class="font-mono font-bold text-red-600">-{{ (ficheAgent.plafond - ficheAgent.prime_finale).toLocaleString() }} F</p>
            </div>
          </div>

          <!-- Tableau jour par jour -->
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="text-center px-3 py-2 text-xs font-semibold text-gray-500">Jour</th>
                  <th class="text-right px-3 py-2 text-xs font-semibold text-gray-500">Tonnage</th>
                  <th class="text-right px-3 py-2 text-xs font-semibold text-gray-500">Rotations</th>
                  <th class="text-right px-3 py-2 text-xs font-semibold text-gray-500">Moyenne</th>
                  <th class="text-center px-3 py-2 text-xs font-semibold text-gray-500">Score</th>
                  <th class="text-right px-3 py-2 text-xs font-semibold text-gray-500">Penalite</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold text-gray-500">Destination</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="j in ficheAgent.detail_jours" :key="j.jour" class="hover:bg-gray-50/50">
                  <td class="px-3 py-2 text-center font-mono text-xs font-bold text-gray-700">J{{ j.jour }}</td>
                  <td class="px-3 py-2 text-right font-mono text-xs font-semibold text-gray-900">{{ j.tonnage_tonnes }} t</td>
                  <td class="px-3 py-2 text-right font-mono text-xs text-gray-700">{{ j.rotations }}</td>
                  <td class="px-3 py-2 text-right font-mono text-xs text-gray-700">{{ j.moyenne }} t/rot</td>
                  <td class="px-3 py-2 text-center">
                    <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded"
                      :class="j.score >= 75 ? 'text-emerald-700 bg-emerald-50' : j.score >= 50 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'">
                      {{ j.score }}%
                    </span>
                  </td>
                  <td class="px-3 py-2 text-right font-mono text-xs" :class="j.penalite > 0 ? 'text-red-600 font-semibold' : 'text-gray-300'">
                    {{ j.penalite > 0 ? '-' + j.penalite.toLocaleString() + ' F' : '0' }}
                  </td>
                  <td class="px-3 py-2 text-xs text-gray-500 truncate max-w-[150px]">{{ j.destination }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs">
                  <td class="px-3 py-2 text-center text-gray-700">{{ ficheAgent.detail_jours.length }} jours</td>
                  <td class="px-3 py-2 text-right font-mono text-gray-900">
                    {{ ficheAgent.detail_jours.reduce((s, j) => s + j.tonnage_tonnes, 0).toFixed(2) }} t
                  </td>
                  <td class="px-3 py-2 text-right font-mono text-gray-700">
                    {{ ficheAgent.detail_jours.reduce((s, j) => s + j.rotations, 0) }}
                  </td>
                  <td class="px-3 py-2 text-right font-mono text-gray-700">
                    {{ ficheAgent.detail_jours.length > 0 ? (ficheAgent.detail_jours.reduce((s, j) => s + j.tonnage_tonnes, 0) / ficheAgent.detail_jours.reduce((s, j) => s + j.rotations, 0)).toFixed(1) : '0' }} t/rot
                  </td>
                  <td class="px-3 py-2 text-center">—</td>
                  <td class="px-3 py-2 text-right font-mono text-red-600">
                    -{{ ficheAgent.penalites.total.toLocaleString() }} F
                  </td>
                  <td class="px-3 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Bouton sélectionner pour passer aux ripeurs -->
          <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <button @click="fermerFicheAgent" class="text-xs text-gray-500 hover:text-gray-700 cursor-pointer">
              Retour a la liste
            </button>
            <BaseButton @click="() => { const v = vehiculesDuJour.find(vv => vv.code_transporteur == ficheAgent?.code_transporteur); ficheAgent = null; if (v) selectionnerVehicule(v) }" variant="primary" type="button">
              Selectionner ce vehicule
              <ChevronRight class="w-4 h-4 ml-1.5" />
            </BaseButton>
          </div>
        </div>

        <!-- Résumé global -->
        <div class="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <div class="flex flex-wrap items-center gap-6 text-xs">
            <div>
              <span class="text-gray-500">Budget total</span>
              <p class="font-mono font-bold text-gray-700">{{ (vehiculesFiltres.length * plafond).toLocaleString() }} F</p>
            </div>
            <div class="text-lg text-gray-300">−</div>
            <div>
              <span class="text-gray-500">Total sanctions</span>
              <p class="font-mono font-bold text-red-600">{{ vehiculesFiltres.reduce((s, v) => s + (v.penalites_mois?.total || 0), 0).toLocaleString() }} F</p>
            </div>
            <div class="text-lg text-gray-300">=</div>
            <div>
              <span class="text-gray-500">Total a payer</span>
              <p class="font-mono font-bold text-emerald-700 text-sm">{{ vehiculesFiltres.reduce((s, v) => s + (v.prime_finale ?? 0), 0).toLocaleString() }} F</p>
            </div>
            <div class="ml-auto text-right">
              <span class="text-gray-400">{{ vehiculesFiltres.length }} agents · Plafond {{ plafond.toLocaleString() }} F · Presence {{ seuilPresence }}%</span>
            </div>
          </div>
        </div>

        <div v-if="selectedVehicule" class="flex justify-end">
          <BaseButton @click="nextStep" variant="primary" type="button">
            Suivant — Ripeurs
            <ChevronRight class="w-4 h-4 ml-1.5" />
          </BaseButton>
        </div>
      </template>
    </div>

    <!-- ═══ ÉTAPE 2 : RIPEURS (saisie manuelle) ═══ -->
    <div v-show="activeStep === 'ripeur'" class="space-y-6" :class="{ 'opacity-60 pointer-events-none': readOnly }">
      <div class="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-900">Ripeurs de l'équipe</h3>
            <p class="text-xs text-gray-500">Seule saisie manuelle — le reste vient du pont-bascule</p>
          </div>
        </div>

        <!-- Rappel véhicule/chauffeur -->
        <div v-if="selectedVehicule" class="rounded-xl bg-gray-50 border border-gray-200 p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
          <div>
            <p class="text-[11px] text-gray-400">Matricule / Chauffeur</p>
            <p class="font-semibold text-gray-900">
              <span class="font-mono text-xs text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded mr-1">{{ selectedVehicule.code_transporteur }}</span>
              {{ selectedVehicule.chauffeur }}
            </p>
          </div>
          <div>
            <p class="text-[11px] text-gray-400">Véhicule</p>
            <p class="font-semibold text-gray-900 font-mono">{{ selectedVehicule.immatriculation }}</p>
          </div>
          <div>
            <p class="text-[11px] text-gray-400">Tonnage</p>
            <p class="font-semibold text-gray-900 font-mono">{{ selectedVehicule.tonnage_tonnes }} t</p>
          </div>
          <div>
            <p class="text-[11px] text-gray-400">Rotations</p>
            <p class="font-semibold text-gray-900 font-mono">{{ selectedVehicule.rotations }}</p>
          </div>
          <div>
            <p class="text-[11px] text-gray-400">Reste à payer</p>
            <p class="font-bold font-mono text-xs" :class="primeColor(estimerPrime(selectedVehicule).scoreGlobal)">
              {{ estimerPrime(selectedVehicule).primeFinale.toLocaleString() }} F
            </p>
            <p v-if="estimerPrime(selectedVehicule).penalites.total > 0" class="text-[10px] text-red-500">
              -{{ estimerPrime(selectedVehicule).penalites.total.toLocaleString() }} F pénalités
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <div>
            <AgentSearchInput
              v-model="ripeur2Matricule"
              :date="date"
              :filter-presents="false"
              label="Ripeur 2 (Nom ou Matricule)"
              placeholder="Tapez un nom ou un matricule..."
              @agent-selected="(a) => selectedRipeur2 = a"
            />
            <p class="text-[11px] text-gray-400 mt-1.5">Optionnel</p>
          </div>
          <div>
            <AgentSearchInput
              v-model="ripeur3Matricule"
              :date="date"
              :filter-presents="false"
              label="Ripeur 3 (Nom ou Matricule)"
              placeholder="Tapez un nom ou un matricule..."
              @agent-selected="(a) => selectedRipeur3 = a"
            />
            <p class="text-[11px] text-gray-400 mt-1.5">Optionnel</p>
          </div>
        </div>

        <!-- Résumé équipe -->
        <div v-if="selectedRipeur1" class="rounded-xl bg-gray-50 border border-gray-200 p-4">
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Équipe complète</h4>
          <div class="flex flex-wrap gap-3">
            <div v-if="selectedVehicule" class="flex items-center gap-2 px-3 py-2 bg-white border border-emerald-200 rounded-lg">
              <div class="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">{{ selectedVehicule.chauffeur.charAt(0) }}</div>
              <div>
                <p class="text-xs font-semibold text-gray-900">{{ selectedVehicule.chauffeur }}</p>
                <p class="text-[10px] text-emerald-600 font-medium">Chauffeur · Pont-bascule</p>
              </div>
            </div>
            <div class="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg">
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
            <div v-if="selectedRipeur3" class="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg">
              <div class="w-7 h-7 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-bold">{{ selectedRipeur3.nom.charAt(0) }}</div>
              <div>
                <p class="text-xs font-semibold text-gray-900">{{ selectedRipeur3.nom }}</p>
                <p class="text-[10px] text-blue-400 font-medium">Ripeur 3 · {{ selectedRipeur3.matricule }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-between">
        <BaseButton @click="prevStep" variant="outline" type="button">
          <ChevronLeft class="w-4 h-4 mr-1.5" />
          Véhicule
        </BaseButton>
        <BaseButton @click="nextStep" variant="primary" type="button" :disabled="!selectedRipeur1">
          Suivant — Validation
          <ChevronRight class="w-4 h-4 ml-1.5" />
        </BaseButton>
      </div>
    </div>

    <!-- ═══ ÉTAPE 3 : RÉCAPITULATIF & VALIDATION ═══ -->
    <div v-show="activeStep === 'recap'" class="space-y-6" :class="{ 'opacity-60 pointer-events-none': readOnly }">
      <div class="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
            <CheckCircle class="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-900">Récapitulatif de la fiche collecte</h3>
            <p class="text-xs text-gray-500">Vérifiez les informations avant validation</p>
          </div>
        </div>

        <div v-if="selectedVehicule" class="space-y-4">
          <!-- Données pont-bascule -->
          <div class="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-5">
            <h4 class="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Zap class="w-3.5 h-3.5" /> Données pont-bascule (automatiques)
            </h4>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p class="text-[11px] text-emerald-600">Immatriculation</p>
                <p class="font-bold text-gray-900 font-mono">{{ selectedVehicule.immatriculation }}</p>
              </div>
              <div>
                <p class="text-[11px] text-emerald-600">Matricule chauffeur</p>
                <p class="font-mono font-bold text-emerald-700">{{ selectedVehicule.code_transporteur }}</p>
              </div>
              <div>
                <p class="text-[11px] text-emerald-600">Chauffeur</p>
                <p class="font-semibold text-gray-900">{{ selectedVehicule.chauffeur }}</p>
              </div>
              <div>
                <p class="text-[11px] text-emerald-600">Arrondissement</p>
                <p class="font-semibold text-gray-900">{{ selectedVehicule.arrondissement }}</p>
              </div>
              <div>
                <p class="text-[11px] text-emerald-600">Tonnage</p>
                <p class="font-bold text-gray-900 font-mono text-lg">{{ selectedVehicule.tonnage_tonnes }} t</p>
              </div>
              <div>
                <p class="text-[11px] text-emerald-600">Rotations</p>
                <p class="font-bold text-gray-900 font-mono text-lg">{{ selectedVehicule.rotations }}</p>
              </div>
              <div>
                <p class="text-[11px] text-emerald-600">Origine</p>
                <p class="font-semibold text-gray-900">{{ selectedVehicule.origine }}</p>
              </div>
              <div class="sm:col-span-2">
                <p class="text-[11px] text-emerald-600">Prime (dégression par pénalités)</p>
                <div class="flex items-baseline gap-3 mt-1">
                  <div>
                    <p class="text-[10px] text-gray-500">Plafond</p>
                    <p class="font-bold font-mono text-lg text-gray-400">{{ estimerPrime(selectedVehicule).plafond.toLocaleString() }} F</p>
                  </div>
                  <span class="text-red-400 text-lg">−</span>
                  <div>
                    <p class="text-[10px] text-red-500">Pénalités</p>
                    <p class="font-bold font-mono text-lg text-red-600">{{ estimerPrime(selectedVehicule).penalites.total.toLocaleString() }} F</p>
                  </div>
                  <span class="text-gray-300 text-lg">=</span>
                  <div>
                    <p class="text-[10px] text-gray-500">Reste à payer</p>
                    <p class="font-bold font-mono text-lg" :class="primeColor(estimerPrime(selectedVehicule).scoreGlobal)">
                      {{ estimerPrime(selectedVehicule).primeFinale.toLocaleString() }} F
                    </p>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2 mt-2 text-[10px]">
                  <span class="px-1.5 py-0.5 rounded" :class="estimerPrime(selectedVehicule).penalites.tonnage > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'">
                    Tonnage: {{ estimerPrime(selectedVehicule).penalites.tonnage > 0 ? '-' + estimerPrime(selectedVehicule).penalites.tonnage.toLocaleString() : '✓' }}
                  </span>
                  <span class="px-1.5 py-0.5 rounded" :class="estimerPrime(selectedVehicule).penalites.bouclage > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'">
                    Bouclage: {{ estimerPrime(selectedVehicule).penalites.bouclage > 0 ? '-' + estimerPrime(selectedVehicule).penalites.bouclage.toLocaleString() : '✓' }}
                  </span>
                  <span class="px-1.5 py-0.5 rounded" :class="estimerPrime(selectedVehicule).penalites.entretien > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'">
                    Entretien: {{ estimerPrime(selectedVehicule).penalites.entretien > 0 ? '-' + estimerPrime(selectedVehicule).penalites.entretien.toLocaleString() : '✓' }}
                  </span>
                  <span class="px-1.5 py-0.5 rounded" :class="estimerPrime(selectedVehicule).penalites.qhse > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'">
                    QHSE: {{ estimerPrime(selectedVehicule).penalites.qhse > 0 ? '-' + estimerPrime(selectedVehicule).penalites.qhse.toLocaleString() : '✓' }}
                  </span>
                  <span class="px-1.5 py-0.5 rounded" :class="estimerPrime(selectedVehicule).tauxPresence >= 93 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">
                    Presence: {{ estimerPrime(selectedVehicule).tauxPresence }}%
                    {{ estimerPrime(selectedVehicule).prorata ? '(prorata)' : '✓' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Ripeurs (saisie manuelle) -->
          <div class="rounded-xl bg-blue-50 border border-blue-200 p-5">
            <h4 class="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users class="w-3.5 h-3.5" /> Ripeurs (saisie manuelle)
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div v-if="selectedRipeur1">
                <p class="text-[11px] text-blue-600">Ripeur 1</p>
                <p class="font-semibold text-gray-900">{{ selectedRipeur1.nom }}</p>
                <p class="text-xs text-gray-500">{{ selectedRipeur1.matricule }}</p>
              </div>
              <div v-if="selectedRipeur2">
                <p class="text-[11px] text-blue-600">Ripeur 2</p>
                <p class="font-semibold text-gray-900">{{ selectedRipeur2.nom }}</p>
                <p class="text-xs text-gray-500">{{ selectedRipeur2.matricule }}</p>
              </div>
              <div v-if="selectedRipeur3">
                <p class="text-[11px] text-blue-600">Ripeur 3</p>
                <p class="font-semibold text-gray-900">{{ selectedRipeur3.nom }}</p>
                <p class="text-xs text-gray-500">{{ selectedRipeur3.matricule }}</p>
              </div>
            </div>
          </div>

          <!-- Score estimé -->
          <div
            v-if="scoreEstime"
            class="rounded-xl border p-5 transition-all duration-300"
            :class="[scoreEstime.bg, scoreEstime.border]"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Gauge class="w-4 h-4" :class="scoreEstime.color" />
                <h4 class="text-sm font-semibold text-gray-900">Score journalier estimé</h4>
              </div>
              <div class="text-right">
                <p class="text-3xl font-bold font-mono tracking-tight" :class="scoreEstime.color">{{ scoreEstime.score }} %</p>
                <p class="text-xs font-semibold uppercase tracking-wider" :class="scoreEstime.color">{{ scoreEstime.label }}</p>
              </div>
            </div>
          </div>

          <!-- Détail pesées -->
          <details class="text-xs rounded-xl bg-gray-50 border border-gray-200 p-4">
            <summary class="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
              Détail des {{ selectedVehicule.pesees.length }} pesée(s) pont-bascule
            </summary>
            <div class="mt-3 space-y-1">
              <div v-for="(p, i) in selectedVehicule.pesees" :key="i" class="flex items-center gap-3 px-3 py-2 bg-white rounded-lg">
                <span class="text-gray-400 w-4 text-right">#{{ i + 1 }}</span>
                <span class="font-mono font-semibold text-gray-900">{{ (p.poids_net / 1000).toFixed(2) }} t</span>
                <span class="text-gray-500">{{ p.origine }} → {{ p.destination }}</span>
                <span class="ml-auto text-gray-400">Ticket {{ p.no_ticket }}</span>
              </div>
            </div>
          </details>
        </div>
      </div>

      <div class="flex justify-between">
        <BaseButton @click="prevStep" variant="outline" type="button">
          <ChevronLeft class="w-4 h-4 mr-1.5" />
          Ripeurs
        </BaseButton>
        <BaseButton @click="submit" variant="primary" type="button">
          <CheckCircle class="w-4 h-4 mr-1.5" />
          Enregistrer la fiche collecte
        </BaseButton>
      </div>
    </div>
  </div>
</template>
