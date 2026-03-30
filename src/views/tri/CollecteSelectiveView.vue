<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Recycle, Info, Save, ArrowLeft, Truck, Container, Calendar, Users,
  ChevronRight, CheckCircle, Zap, Loader2, WifiOff, Search, RefreshCw, User, Hash
} from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import DateInput from '@/components/ui/DateInput.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import ReadOnlyBanner from '@/components/ui/ReadOnlyBanner.vue'
import { useToastStore } from '@/stores/toast'
import { usePrimesStore } from '@/stores/primes'
import { useAuthStore } from '@/stores/auth'
import { useSaisiesStore } from '@/stores/saisies'
import api from '@/api/client'

const toastStore = useToastStore()
const primesStore = usePrimesStore()
const authStore = useAuthStore()
const saisiesStore = useSaisiesStore()
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

// ── Données pont-bascule (chauffeurs TRI uniquement) ──
const pontBasculeLoading = ref(false)
const pontBasculeError = ref('')
const vehiculesDuJour = ref([])
const bilanMensuel = ref(null)
const searchQuery = ref('')
const filtreEquipe = ref('TOUS')
const selectedVehicule = ref(null)

// ── Paramètres prime TRI ──
const plafond = computed(() => primesStore.config.plafonds.CHAUFFEUR_TRI) // 25000

async function chargerVehiculesDuJour() {
  pontBasculeLoading.value = true
  pontBasculeError.value = ''
  vehiculesDuJour.value = []
  selectedVehicule.value = null
  try {
    const mois = date.value.slice(0, 7)
    // Charger UNIQUEMENT les véhicules TRI (filtre côté API)
    const [dataJour, dataBilan] = await Promise.all([
      api.pontBasculeVehiculesDuJour(date.value, 'CLEAN AFRICA', 'TRI'),
      api.pontBasculeBilan(mois, 'TRI'),
    ])

    bilanMensuel.value = dataBilan

    // Index bilan par code_transporteur
    const bilanMap = {}
    if (dataBilan?.chauffeurs) {
      dataBilan.chauffeurs.forEach(c => { bilanMap[c.code_transporteur] = c })
    }

    // Tous les véhicules retournés sont déjà du TRI (filtré par l'API)
    vehiculesDuJour.value = (dataJour.vehicules || []).map(v => {
      const bilan = bilanMap[v.code_transporteur]
      return {
        ...v,
        bilan: bilan || null,
        jours_present: bilan?.jours_present || v.jours_present || 0,
        taux_presence: bilan?.taux_presence || v.taux_presence || 0,
        penalites_mois: bilan?.penalites || { tonnage: 0, bouclage: 0, entretien: 0, qhse: 0, total: 0 },
        prime_finale: bilan?.prime_finale ?? plafond.value,
        prorata: bilan?.prorata || false,
      }
    })

    if (vehiculesDuJour.value.length > 0) {
      toastStore.addToast(`${vehiculesDuJour.value.length} véhicule(s) TRI chargé(s)`, 'success')
    }
  } catch (err) {
    pontBasculeError.value = err.message
    toastStore.addToast('Pont-bascule indisponible : ' + err.message, 'error')
  } finally {
    pontBasculeLoading.value = false
  }
}

watch(date, () => chargerVehiculesDuJour(), { immediate: true })

// ── Prime par dégression (plafond TRI = 25 000 F) ──
function estimerPrime(v) {
  const p = plafond.value // 25 000 F pour le TRI
  const penalites = v.penalites_mois || { tonnage: 0, bouclage: 0, entretien: 0, qhse: 0, total: 0 }
  const primeAvantPresence = Math.max(0, p - penalites.total)
  const tauxPresence = Math.min(v.taux_presence || 0, 100)

  // Retenue présence : si < 93% → prime au prorata du taux de présence
  let retenuePresence = 0
  let primeFinale = primeAvantPresence
  if (tauxPresence < 93) {
    primeFinale = Math.round(primeAvantPresence * tauxPresence / 100)
    retenuePresence = primeAvantPresence - primeFinale
  }

  const scoreGlobal = p > 0 ? (primeFinale / p) * 100 : 0

  return { plafond: p, penalites, primeAvantPresence, primeFinale, scoreGlobal, tauxPresence, prorata: tauxPresence < 93, retenuePresence }
}

function primeColor(scoreGlobal) {
  if (scoreGlobal >= 75) return 'text-emerald-700 bg-emerald-50'
  if (scoreGlobal >= 60) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

function barColor(scoreGlobal) {
  if (scoreGlobal >= 75) return 'bg-teal-500'
  if (scoreGlobal >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

// ── Filtrer les véhicules ──
const vehiculesFiltres = computed(() => {
  let list = vehiculesDuJour.value
  if (filtreEquipe.value !== 'TOUS') {
    list = list.filter(v => v.equipe === filtreEquipe.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(v =>
      v.immatriculation.toLowerCase().includes(q) ||
      v.chauffeur.toLowerCase().includes(q) ||
      v.code_transporteur.toString().includes(q)
    )
  }
  return list
})

const nbJour = computed(() => vehiculesDuJour.value.filter(v => v.equipe === 'JOUR').length)
const nbNuit = computed(() => vehiculesDuJour.value.filter(v => v.equipe === 'NUIT').length)

// ── Fiche détaillée agent ──
const ficheAgent = ref(null)

function ouvrirFicheAgent(v) {
  const bilan = bilanMensuel.value
  const code = String(v.code_transporteur)
  if (bilan?.chauffeurs) {
    const agent = bilan.chauffeurs.find(c => String(c.code_transporteur) === code)
    if (agent) {
      ficheAgent.value = { ...agent, immatriculation: v.immatriculation }
      setTimeout(() => {
        document.getElementById('fiche-agent-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
      return
    }
  }
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

function fermerFicheAgent() { ficheAgent.value = null }

function selectionnerVehicule(v) {
  selectedVehicule.value = v
  activeStep.value = 'ripeur'
}

// ── Ripeurs TRI (saisie manuelle, max 3) ──
const ripeur1Matricule = ref('')
const ripeur2Matricule = ref('')
const ripeur3Matricule = ref('')
const selectedRipeur1 = ref(null)
const selectedRipeur2 = ref(null)
const selectedRipeur3 = ref(null)

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
async function submit() {
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

  try {
    // Enregistrer la saisie TRI avec les données pont-bascule
    await api.createTriSaisie({
      date: date.value,
      arrondissement: v.arrondissement || '',
      immatriculation: v.immatriculation,
      chauffeur_matricule: v.code_transporteur,
      chauffeur_nom: v.chauffeur,
      ripeur1_matricule: selectedRipeur1.value.matricule,
      ripeur1_nom: selectedRipeur1.value.nom,
      ripeur2_matricule: selectedRipeur2.value?.matricule || '',
      ripeur2_nom: selectedRipeur2.value?.nom || '',
      ripeur3_matricule: selectedRipeur3.value?.matricule || '',
      ripeur3_nom: selectedRipeur3.value?.nom || '',
      tonnage_collecte: v.tonnage_tonnes || 0,
      rotations: v.rotations || 0,
      pourcentage_prime: estimerPrime(v).scoreGlobal,
      montant_prime: estimerPrime(v).primeFinale,
    })

    toastStore.addToast(
      `Saisie TRI enregistrée — ${v.chauffeur} · ${v.tonnage_tonnes}t · ${v.rotations} rotation(s)`,
      'success'
    )

    // Reset
    selectedVehicule.value = null
    selectedRipeur1.value = null
    selectedRipeur2.value = null
    selectedRipeur3.value = null
    ripeur1Matricule.value = ''
    ripeur2Matricule.value = ''
    ripeur3Matricule.value = ''
    activeStep.value = 'vehicule'
    await chargerVehiculesDuJour()
  } catch (err) {
    toastStore.addToast('Erreur : ' + err.message, 'error')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50">
          <Recycle class="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Saisie Collecte Sélective</h1>
          <p class="text-sm text-gray-500">Service TRI — Données pont-bascule + ripeurs manuels</p>
        </div>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-xl shadow-sm">
        <Zap class="w-4 h-4 text-teal-600" />
        <span class="text-sm font-medium text-teal-700">Pont-bascule connecté</span>
      </div>
    </div>

    <ReadOnlyBanner service="TRI" />

    <!-- Barème Info -->
    <div class="rounded-2xl bg-teal-50 border border-teal-100 p-4">
      <div class="flex items-start gap-3">
        <Info class="w-5 h-5 text-teal-500 mt-0.5 shrink-0" />
        <div class="text-sm text-teal-700 space-y-1">
          <p class="font-semibold">Prime TRI — Plafond {{ plafond.toLocaleString('fr-FR') }} XAF par agent</p>
          <p class="text-xs text-teal-600">Les tonnages et rotations viennent automatiquement du pont-bascule. Seuls les ripeurs sont saisis manuellement (max 3).</p>
        </div>
      </div>
    </div>

    <!-- Date -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
          <Calendar class="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900">Date du relevé</h3>
          <p class="text-xs text-gray-500">Données pont-bascule chargées automatiquement pour le TRI</p>
        </div>
      </div>
      <DateInput v-model="date" required />
      <button
        type="button"
        @click="chargerVehiculesDuJour"
        class="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-colors cursor-pointer"
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
            ? 'bg-teal-600 text-white shadow-sm'
            : step.id === 'recap' && selectedVehicule && selectedRipeur1
              ? 'bg-teal-50 text-teal-700 border border-teal-200'
              : 'bg-gray-100 text-gray-500'"
        >
          <component :is="step.icon" class="w-4 h-4" />
          {{ step.label }}
        </button>
        <ChevronRight v-if="i < steps.length - 1" class="w-4 h-4 text-gray-300" />
      </template>
    </div>

    <!-- ═══ ÉTAPE 1 : VÉHICULE (pont-bascule, chauffeurs TRI) ═══ -->
    <div v-show="activeStep === 'vehicule'" class="space-y-4" :class="{ 'opacity-60 pointer-events-none': readOnly }">

      <!-- Chargement -->
      <div v-if="pontBasculeLoading" class="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center gap-3">
        <Loader2 class="w-8 h-8 text-teal-600 animate-spin" />
        <p class="text-sm text-gray-500">Chargement des chauffeurs TRI depuis le pont-bascule...</p>
      </div>

      <!-- Erreur -->
      <div v-else-if="pontBasculeError" class="bg-red-50 rounded-xl border border-red-200 p-6 flex items-center gap-3">
        <WifiOff class="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <p class="text-sm font-semibold text-red-800">Pont-bascule indisponible</p>
          <p class="text-xs text-red-600 mt-0.5">{{ pontBasculeError }}</p>
        </div>
      </div>

      <!-- Liste des véhicules TRI -->
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
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors"
              />
            </div>
            <span class="font-mono font-semibold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg text-sm">
              {{ vehiculesFiltres.length }} chauffeur(s) TRI
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
              @click="filtreEquipe = 'JOUR'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              :class="filtreEquipe === 'JOUR'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'"
            >
              Jour ({{ nbJour }})
            </button>
            <button
              type="button"
              @click="filtreEquipe = 'NUIT'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              :class="filtreEquipe === 'NUIT'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'"
            >
              Nuit ({{ nbNuit }})
            </button>
          </div>
        </div>

        <!-- Véhicule sélectionné -->
        <div v-if="selectedVehicule" class="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-300 p-5 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Zap class="w-5 h-5 text-teal-600" />
              <span class="text-sm font-bold text-teal-800">Véhicule TRI sélectionné</span>
            </div>
            <button
              type="button"
              @click="selectedVehicule = null; activeStep = 'vehicule'"
              class="text-xs text-teal-600 hover:text-teal-800 font-medium cursor-pointer"
            >Changer</button>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <p class="text-[11px] text-teal-600 font-medium">Immatriculation</p>
              <p class="font-bold text-gray-900 font-mono">{{ selectedVehicule.immatriculation }}</p>
            </div>
            <div>
              <p class="text-[11px] text-teal-600 font-medium">Matricule / Chauffeur</p>
              <p class="font-semibold text-gray-900">
                <span class="font-mono text-xs text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded mr-1">{{ selectedVehicule.code_transporteur }}</span>
                {{ selectedVehicule.chauffeur }}
              </p>
            </div>
            <div>
              <p class="text-[11px] text-teal-600 font-medium">Tonnage</p>
              <p class="font-bold text-gray-900 font-mono">{{ selectedVehicule.tonnage_tonnes }} t</p>
            </div>
            <div>
              <p class="text-[11px] text-teal-600 font-medium">Rotations</p>
              <p class="font-bold text-gray-900 font-mono">{{ selectedVehicule.rotations }}</p>
            </div>
            <div>
              <p class="text-[11px] text-teal-600 font-medium">Zone</p>
              <p class="font-semibold text-gray-900">{{ selectedVehicule.arrondissement }}</p>
            </div>
            <div>
              <p class="text-[11px] text-teal-600 font-medium">Reste à payer</p>
              <p class="font-bold font-mono" :class="primeColor(estimerPrime(selectedVehicule).scoreGlobal)">
                {{ estimerPrime(selectedVehicule).primeFinale.toLocaleString() }} F
              </p>
              <p class="text-[10px] text-gray-500">Presence {{ estimerPrime(selectedVehicule).tauxPresence }}%</p>
            </div>
          </div>
          <!-- Barre de dégression prime -->
          <div class="mt-3 space-y-2">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              <span class="text-gray-500">Plafond : {{ estimerPrime(selectedVehicule).plafond.toLocaleString() }} F</span>
              <span class="text-red-600 font-semibold" v-if="estimerPrime(selectedVehicule).penalites.total > 0">
                Pénalités : -{{ estimerPrime(selectedVehicule).penalites.total.toLocaleString() }} F
              </span>
              <span class="text-gray-600" v-if="estimerPrime(selectedVehicule).primeAvantPresence !== estimerPrime(selectedVehicule).plafond">
                Après pén. : {{ estimerPrime(selectedVehicule).primeAvantPresence.toLocaleString() }} F
              </span>
              <span class="text-amber-600 font-semibold" v-if="estimerPrime(selectedVehicule).retenuePresence > 0">
                Retenue présence ({{ estimerPrime(selectedVehicule).tauxPresence }}%) : -{{ estimerPrime(selectedVehicule).retenuePresence.toLocaleString() }} F
              </span>
              <span class="ml-auto font-bold" :class="primeColor(estimerPrime(selectedVehicule).scoreGlobal)">
                À payer : {{ estimerPrime(selectedVehicule).primeFinale.toLocaleString() }} F
              </span>
            </div>
            <div class="w-full h-3 bg-red-200 rounded-full overflow-hidden flex">
              <div
                class="h-full rounded-l-full transition-all duration-500"
                :class="barColor(estimerPrime(selectedVehicule).scoreGlobal)"
                :style="{ width: (estimerPrime(selectedVehicule).primeFinale / estimerPrime(selectedVehicule).plafond * 100) + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Tableau des véhicules TRI -->
        <div v-if="!selectedVehicule" class="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">N°Parc</th>
                  <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Chauffeur</th>
                  <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Arrondissement</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Tonnage</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Tours</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Plafond</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-red-500 uppercase">Pénalités</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Après pén.</th>
                  <th class="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Présence</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-amber-600 uppercase">Retenue prés.</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-teal-600 uppercase">À payer</th>
                  <th class="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr
                  v-for="v in vehiculesFiltres"
                  :key="v.immatriculation"
                  class="hover:bg-teal-50/50 transition-colors cursor-pointer group"
                  @click="ouvrirFicheAgent(v)"
                >
                  <td class="px-3 py-2.5 font-mono font-semibold text-gray-900 text-xs">{{ v.immatriculation }}</td>
                  <td class="px-3 py-2.5 text-gray-900 text-xs">
                    {{ v.chauffeur }}
                    <span
                      class="ml-1 inline-flex px-1 py-0.5 rounded text-[9px] font-bold"
                      :class="v.equipe === 'NUIT' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'"
                    >{{ v.equipe }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-gray-700 text-xs">{{ v.arrondissement || '-' }}</td>
                  <td class="px-3 py-2.5 text-right font-mono font-semibold text-gray-900">{{ v.tonnage_tonnes }} t</td>
                  <td class="px-3 py-2.5 text-right font-mono text-gray-700">{{ v.rotations }}</td>
                  <td class="px-3 py-2.5 text-right font-mono text-xs text-gray-400">{{ plafond.toLocaleString() }}</td>
                  <td class="px-3 py-2.5 text-right font-mono text-xs font-semibold" :class="estimerPrime(v).penalites.total > 0 ? 'text-red-600' : 'text-gray-300'">
                    {{ estimerPrime(v).penalites.total > 0 ? '-' + estimerPrime(v).penalites.total.toLocaleString() : '0' }}
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-xs font-semibold text-gray-700">
                    {{ estimerPrime(v).primeAvantPresence.toLocaleString() }}
                  </td>
                  <td class="px-3 py-2.5 text-center">
                    <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded"
                      :class="v.taux_presence >= 93 ? 'text-emerald-700 bg-emerald-50' : v.taux_presence >= 70 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'">
                      {{ v.taux_presence }}%
                    </span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-xs font-semibold" :class="estimerPrime(v).retenuePresence > 0 ? 'text-amber-600' : 'text-gray-300'">
                    {{ estimerPrime(v).retenuePresence > 0 ? '-' + estimerPrime(v).retenuePresence.toLocaleString() : '0' }}
                  </td>
                  <td class="px-3 py-2.5 text-right">
                    <span class="font-mono text-xs font-bold px-2 py-0.5 rounded" :class="primeColor(estimerPrime(v).scoreGlobal)">
                      {{ estimerPrime(v).primeFinale.toLocaleString() }} F
                    </span>
                  </td>
                  <td class="px-2 py-2.5">
                    <ChevronRight class="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors" />
                  </td>
                </tr>
                <tr v-if="vehiculesFiltres.length === 0">
                  <td colspan="12" class="px-4 py-8 text-center text-gray-400">
                    Aucun chauffeur TRI trouvé pour cette date
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Fiche détaillée agent -->
        <div v-if="ficheAgent" id="fiche-agent-detail" class="bg-white rounded-xl border border-teal-200 overflow-hidden">
          <div class="px-5 py-4 bg-teal-50 border-b border-teal-200 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-teal-900">
                Fiche Mensuelle TRI —
                <span class="font-mono">{{ ficheAgent.code_transporteur }}</span>
                {{ ficheAgent.chauffeur }}
              </h3>
              <p class="text-xs text-teal-600 mt-0.5">Plafond {{ plafond.toLocaleString() }} F · Présence {{ ficheAgent.taux_presence }}%</p>
            </div>
            <button @click="fermerFicheAgent" class="text-xs text-teal-600 hover:text-teal-800 font-medium cursor-pointer">Fermer</button>
          </div>
          <div class="p-5 space-y-4">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="bg-gray-50 rounded-lg p-3">
                <p class="text-[10px] text-gray-500 uppercase font-semibold">Prime finale</p>
                <p class="text-lg font-bold text-teal-700 font-mono">{{ (ficheAgent.prime_finale || 0).toLocaleString() }} F</p>
              </div>
              <div class="bg-gray-50 rounded-lg p-3">
                <p class="text-[10px] text-gray-500 uppercase font-semibold">Pénalités</p>
                <p class="text-lg font-bold text-red-600 font-mono">-{{ (ficheAgent.penalites?.total || 0).toLocaleString() }} F</p>
              </div>
              <div class="bg-gray-50 rounded-lg p-3">
                <p class="text-[10px] text-gray-500 uppercase font-semibold">Présence</p>
                <p class="text-lg font-bold font-mono" :class="ficheAgent.taux_presence >= 93 ? 'text-emerald-600' : 'text-amber-600'">
                  {{ ficheAgent.taux_presence }}%
                </p>
              </div>
              <div class="bg-gray-50 rounded-lg p-3">
                <p class="text-[10px] text-gray-500 uppercase font-semibold">Équipe</p>
                <p class="text-lg font-bold text-gray-800">{{ ficheAgent.equipe }}</p>
              </div>
            </div>
            <!-- Bouton sélectionner -->
            <BaseButton variant="primary" @click="selectionnerVehicule(ficheAgent); fermerFicheAgent()" class="w-full" v-if="!readOnly">
              <Truck class="w-4 h-4" />
              Sélectionner ce véhicule pour la saisie
            </BaseButton>
          </div>
        </div>
      </template>
    </div>

    <!-- ═══ ÉTAPE 2 : RIPEURS TRI (saisie manuelle, max 3) ═══ -->
    <div v-show="activeStep === 'ripeur'" class="space-y-4" :class="{ 'opacity-60 pointer-events-none': readOnly }">
      <BaseCard>
        <div class="space-y-6">
          <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div class="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <Users class="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-900">Ripeurs TRI (max 3)</h3>
              <p class="text-xs text-gray-500">Agents du service TRI uniquement</p>
            </div>
          </div>

          <!-- Ripeur 1 (obligatoire) -->
          <AgentSearchInput
            v-model="ripeur1Matricule"
            serviceFilter="TRI"
            label="Ripeur 1 (obligatoire)"
            placeholder="Rechercher un ripeur TRI..."
            required
            @agent-selected="selectedRipeur1 = $event"
          />

          <!-- Ripeur 2 (optionnel) -->
          <AgentSearchInput
            v-model="ripeur2Matricule"
            serviceFilter="TRI"
            label="Ripeur 2 (optionnel)"
            placeholder="Rechercher un ripeur TRI..."
            @agent-selected="selectedRipeur2 = $event"
          />

          <!-- Ripeur 3 (optionnel) -->
          <AgentSearchInput
            v-model="ripeur3Matricule"
            serviceFilter="TRI"
            label="Ripeur 3 (optionnel)"
            placeholder="Rechercher un ripeur TRI..."
            @agent-selected="selectedRipeur3 = $event"
          />

          <div class="flex justify-between pt-4 border-t border-gray-100">
            <BaseButton variant="outline" @click="prevStep">
              <ArrowLeft class="w-4 h-4" />
              Retour
            </BaseButton>
            <BaseButton variant="primary" @click="nextStep" :disabled="!selectedRipeur1">
              Validation
              <ChevronRight class="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- ═══ ÉTAPE 3 : VALIDATION ═══ -->
    <div v-show="activeStep === 'recap'" class="space-y-4" :class="{ 'opacity-60 pointer-events-none': readOnly }">
      <BaseCard v-if="selectedVehicule">
        <div class="space-y-6">
          <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div class="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <CheckCircle class="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-900">Récapitulatif — Saisie TRI</h3>
              <p class="text-xs text-gray-500">Vérifiez les informations avant validation</p>
            </div>
          </div>

          <!-- Résumé véhicule -->
          <div class="bg-teal-50 rounded-xl p-4 space-y-2">
            <p class="text-xs font-semibold text-teal-700 uppercase">Véhicule & Chauffeur (pont-bascule)</p>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <div>
                <span class="text-xs text-gray-500">N° Parc</span>
                <p class="font-mono font-bold">{{ selectedVehicule.immatriculation }}</p>
              </div>
              <div>
                <span class="text-xs text-gray-500">Chauffeur</span>
                <p class="font-semibold">{{ selectedVehicule.chauffeur }}</p>
              </div>
              <div>
                <span class="text-xs text-gray-500">Arrondissement</span>
                <p class="font-semibold">{{ selectedVehicule.arrondissement || '-' }}</p>
              </div>
              <div>
                <span class="text-xs text-gray-500">Tonnage</span>
                <p class="font-mono font-bold">{{ selectedVehicule.tonnage_tonnes }} t</p>
              </div>
              <div>
                <span class="text-xs text-gray-500">Rotations</span>
                <p class="font-mono font-bold">{{ selectedVehicule.rotations }}</p>
              </div>
            </div>
            <div class="text-xs text-teal-600 mt-1">
              Date : <span class="font-semibold">{{ date }}</span>
            </div>
          </div>

          <!-- Résumé ripeurs -->
          <div class="bg-gray-50 rounded-xl p-4 space-y-2">
            <p class="text-xs font-semibold text-gray-700 uppercase">Ripeurs TRI</p>
            <div class="space-y-1.5 text-sm">
              <div v-if="selectedRipeur1" class="flex items-center gap-2">
                <User class="w-4 h-4 text-teal-600" />
                <span class="font-mono text-xs text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">{{ selectedRipeur1.matricule }}</span>
                <span class="font-medium">{{ selectedRipeur1.nom }}</span>
              </div>
              <div v-if="selectedRipeur2" class="flex items-center gap-2">
                <User class="w-4 h-4 text-teal-600" />
                <span class="font-mono text-xs text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">{{ selectedRipeur2.matricule }}</span>
                <span class="font-medium">{{ selectedRipeur2.nom }}</span>
              </div>
              <div v-if="selectedRipeur3" class="flex items-center gap-2">
                <User class="w-4 h-4 text-teal-600" />
                <span class="font-mono text-xs text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">{{ selectedRipeur3.matricule }}</span>
                <span class="font-medium">{{ selectedRipeur3.nom }}</span>
              </div>
            </div>
          </div>

          <!-- Prime estimée -->
          <div class="rounded-xl border p-4" :class="primeColor(estimerPrime(selectedVehicule).scoreGlobal)">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase">Prime TRI estimée</p>
                <p class="text-xs text-gray-500 mt-0.5">Plafond {{ plafond.toLocaleString() }} F</p>
              </div>
              <p class="text-2xl font-bold font-mono">
                {{ estimerPrime(selectedVehicule).primeFinale.toLocaleString() }} F
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-between pt-4 border-t border-gray-100">
            <BaseButton variant="outline" @click="prevStep">
              <ArrowLeft class="w-4 h-4" />
              Retour
            </BaseButton>
            <BaseButton variant="primary" @click="submit">
              <Save class="w-4 h-4" />
              Enregistrer la saisie TRI
            </BaseButton>
          </div>
        </div>
      </BaseCard>
      <div v-else class="text-center py-12 text-gray-400">
        <p class="text-sm">Veuillez d'abord sélectionner un véhicule.</p>
      </div>
    </div>
  </div>
</template>
