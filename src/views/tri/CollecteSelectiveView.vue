<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Recycle, Info, Truck, Calendar, Users, Route,
  ChevronRight, CheckCircle, Zap, Loader2, WifiOff, Search, RefreshCw, User, X, ArrowLeft
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
import { useAgentsStore } from '@/stores/agents'
import api from '@/api/client'

const toastStore = useToastStore()
const primesStore = usePrimesStore()
const authStore = useAuthStore()
const saisiesStore = useSaisiesStore()
const agentsStore = useAgentsStore()
const readOnly = computed(() => authStore.isReadOnly())
const router = useRouter()

// ── Date ──
const date = ref(new Date().toISOString().split('T')[0])

// ── Données pont-bascule (chauffeurs TRI) ──
const pontBasculeLoading = ref(false)
const pontBasculeError = ref('')
const vehiculesDuJour = ref([])
const bilanMensuel = ref(null)
const searchQuery = ref('')
const filtreEquipe = ref('TOUS')
const selectedVehicule = ref(null)

const plafond = computed(() => primesStore.config.plafonds.CHAUFFEUR_TRI)

async function chargerVehiculesDuJour() {
  pontBasculeLoading.value = true
  pontBasculeError.value = ''
  vehiculesDuJour.value = []
  fermerFormulaire()
  try {
    const mois = date.value.slice(0, 7)
    const [dataJour, dataBilan] = await Promise.all([
      api.pontBasculeVehiculesDuJour(date.value, 'CLEAN AFRICA', 'TRI'),
      api.pontBasculeBilan(mois, 'TRI'),
    ])

    bilanMensuel.value = dataBilan

    const bilanMap = {}
    if (dataBilan?.chauffeurs) {
      dataBilan.chauffeurs.forEach(c => { bilanMap[c.code_transporteur] = c })
    }

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
  const p = plafond.value
  const penalites = v.penalites_mois || { tonnage: 0, bouclage: 0, entretien: 0, qhse: 0, total: 0 }
  const primeAvantPresence = Math.max(0, p - penalites.total)
  const tauxPresence = Math.min(v.taux_presence || 0, 100)
  let primeFinale = primeAvantPresence
  if (tauxPresence < 93) primeFinale = Math.round(primeAvantPresence * tauxPresence / 100)
  const scoreGlobal = p > 0 ? (primeFinale / p) * 100 : 0
  return { plafond: p, penalites, primeAvantPresence, primeFinale, scoreGlobal, tauxPresence, prorata: tauxPresence < 93 }
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

const vehiculesFiltres = computed(() => {
  let list = vehiculesDuJour.value
  if (filtreEquipe.value !== 'TOUS') list = list.filter(v => v.equipe === filtreEquipe.value)
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

// ── Sélection véhicule → formulaire ──
const equipeSuggestion = ref(null)
const equipeLoading = ref(false)
const equipeAcceptee = ref(false)

const ripeur1Matricule = ref('')
const ripeur2Matricule = ref('')
const ripeur3Matricule = ref('')
const selectedRipeur1 = ref(null)
const selectedRipeur2 = ref(null)
const selectedRipeur3 = ref(null)
const circuitSaisi = ref('')

// ── Historique équipages ──
const historiqueVehicule = ref([])
const historiqueBilan = ref([])
const historiqueLoading = ref(false)
const historiqueOuvert = ref(false)

// ── Historique agent (ripeur) ──
const historiqueAgent = ref(null)
const historiqueAgentLoading = ref(false)

async function voirHistoriqueAgent(agent) {
  if (!agent) return
  if (historiqueAgent.value?.matricule === agent.matricule) {
    historiqueAgent.value = null
    return
  }
  historiqueAgentLoading.value = true
  try {
    const data = await api.getHistoriqueAgent(agent.matricule)
    historiqueAgent.value = {
      matricule: agent.matricule,
      nom: agent.nom,
      saisies: data.saisies || [],
      bilan: data.bilan || [],
    }
  } catch { historiqueAgent.value = null }
  historiqueAgentLoading.value = false
}

async function chargerHistorique(immat) {
  historiqueLoading.value = true
  historiqueVehicule.value = []
  historiqueBilan.value = []
  historiqueAgent.value = null
  try {
    const data = await api.getHistoriqueVehicule(immat)
    historiqueVehicule.value = data.saisies || []
    historiqueBilan.value = data.bilan || []
  } catch { /* pas bloquant */ }
  historiqueLoading.value = false
}

async function selectionnerVehicule(v) {
  selectedVehicule.value = v
  ripeur1Matricule.value = ''
  ripeur2Matricule.value = ''
  ripeur3Matricule.value = ''
  selectedRipeur1.value = null
  selectedRipeur2.value = null
  selectedRipeur3.value = null
  circuitSaisi.value = ''
  equipeSuggestion.value = null
  equipeAcceptee.value = false
  historiqueOuvert.value = false
  chargerHistorique(v.immatriculation)

  equipeLoading.value = true
  try {
    const eq = await api.getEquipeVehicule(v.immatriculation, 'TRI')
    if (eq && eq.ripeur1_matricule) equipeSuggestion.value = eq
  } catch { /* pas d'équipe connue */ }
  equipeLoading.value = false

  setTimeout(() => {
    document.getElementById('formulaire-equipe-tri')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 100)
}

function fermerFormulaire() {
  selectedVehicule.value = null
  equipeSuggestion.value = null
  equipeAcceptee.value = false
  ripeur1Matricule.value = ''
  ripeur2Matricule.value = ''
  ripeur3Matricule.value = ''
  selectedRipeur1.value = null
  selectedRipeur2.value = null
  selectedRipeur3.value = null
  circuitSaisi.value = ''
}

function appliquerEquipe(eq) {
  if (eq.ripeur1_matricule) {
    ripeur1Matricule.value = eq.ripeur1_matricule
    selectedRipeur1.value = agentsStore.getAgentByMatricule(eq.ripeur1_matricule)
      || { matricule: eq.ripeur1_matricule, nom: eq.ripeur1_nom }
  }
  if (eq.ripeur2_matricule) {
    ripeur2Matricule.value = eq.ripeur2_matricule
    selectedRipeur2.value = agentsStore.getAgentByMatricule(eq.ripeur2_matricule)
      || { matricule: eq.ripeur2_matricule, nom: eq.ripeur2_nom }
  }
  if (eq.ripeur3_matricule) {
    ripeur3Matricule.value = eq.ripeur3_matricule
    selectedRipeur3.value = agentsStore.getAgentByMatricule(eq.ripeur3_matricule)
      || { matricule: eq.ripeur3_matricule, nom: eq.ripeur3_nom }
  }
  if (eq.circuit) circuitSaisi.value = eq.circuit
  equipeAcceptee.value = true
}

// ── Soumission ──
async function submit() {
  if (!selectedVehicule.value || !selectedRipeur1.value) {
    toastStore.addToast('Veuillez sélectionner au moins le Ripeur 1.', 'warning')
    return
  }

  const v = selectedVehicule.value

  try {
    await api.createTriSaisie({
      date: date.value,
      arrondissement: circuitSaisi.value || v.arrondissement || '',
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

    api.saveEquipeVehicule({
      immatriculation: v.immatriculation, service: 'TRI',
      chauffeur_matricule: v.code_transporteur || '', chauffeur_nom: v.chauffeur || '',
      ripeur1_matricule: selectedRipeur1.value?.matricule || '', ripeur1_nom: selectedRipeur1.value?.nom || '',
      ripeur2_matricule: selectedRipeur2.value?.matricule || '', ripeur2_nom: selectedRipeur2.value?.nom || '',
      ripeur3_matricule: selectedRipeur3.value?.matricule || '', ripeur3_nom: selectedRipeur3.value?.nom || '',
      circuit: circuitSaisi.value || v.arrondissement || '',
    }).catch(() => {})

    toastStore.addToast(`Saisie TRI enregistrée — ${v.chauffeur} · ${v.tonnage_tonnes}t`, 'success')

    fermerFormulaire()
    await chargerVehiculesDuJour()
  } catch (err) {
    toastStore.addToast('Erreur : ' + err.message, 'error')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50">
          <Recycle class="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Saisie Collecte Sélective</h1>
          <p class="text-sm text-gray-500">Service TRI — Choisissez un chauffeur, ajoutez les ripeurs et le circuit</p>
        </div>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-xl shadow-sm">
        <Zap class="w-4 h-4 text-teal-600" />
        <span class="text-sm font-medium text-teal-700">Pont-bascule connecté</span>
      </div>
    </div>

    <ReadOnlyBanner service="TRI" />

    <!-- Barème -->
    <div class="rounded-2xl bg-teal-50 border border-teal-100 p-4">
      <div class="flex items-start gap-3">
        <Info class="w-5 h-5 text-teal-500 mt-0.5 shrink-0" />
        <div class="text-sm text-teal-700 space-y-1">
          <p class="font-semibold">Prime TRI — Plafond {{ plafond.toLocaleString('fr-FR') }} XAF par agent</p>
          <p class="text-xs text-teal-600">Les tonnages viennent du pont-bascule. Les ripeurs et le circuit sont saisis manuellement.</p>
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
          <p class="text-xs text-gray-500">Chauffeurs TRI chargés depuis le pont-bascule</p>
        </div>
      </div>
      <DateInput v-model="date" required />
      <button type="button" @click="chargerVehiculesDuJour"
        class="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-colors cursor-pointer">
        <RefreshCw class="w-4 h-4" /> Actualiser
      </button>
    </div>

    <!-- ═══ CONTENU ═══ -->
    <div :class="{ 'opacity-60 pointer-events-none': readOnly }">

      <div v-if="pontBasculeLoading" class="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center gap-3">
        <Loader2 class="w-8 h-8 text-teal-600 animate-spin" />
        <p class="text-sm text-gray-500">Chargement des chauffeurs TRI...</p>
      </div>

      <div v-else-if="pontBasculeError" class="bg-red-50 rounded-xl border border-red-200 p-6 flex items-center gap-3">
        <WifiOff class="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <p class="text-sm font-semibold text-red-800">Pont-bascule indisponible</p>
          <p class="text-xs text-red-600 mt-0.5">{{ pontBasculeError }}</p>
        </div>
      </div>

      <template v-else>
        <!-- Recherche + filtres -->
        <div class="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="relative flex-1">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input v-model="searchQuery" type="text" placeholder="Rechercher par immatriculation, chauffeur..."
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors" />
            </div>
            <span class="font-mono font-semibold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg text-sm">
              {{ vehiculesFiltres.length }} véhicule(s)
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" @click="filtreEquipe = 'TOUS'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              :class="filtreEquipe === 'TOUS' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
              Tous ({{ vehiculesDuJour.length }})
            </button>
            <button type="button" @click="filtreEquipe = 'NUIT'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              :class="filtreEquipe === 'NUIT' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'">
              <span class="text-sm">🌙</span> Nuit ({{ nbNuit }})
            </button>
            <button type="button" @click="filtreEquipe = 'JOUR'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              :class="filtreEquipe === 'JOUR' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'">
              <span class="text-sm">☀️</span> Jour ({{ nbJour }})
            </button>
          </div>
        </div>

        <!-- Tableau des véhicules TRI -->
        <div v-if="!selectedVehicule" class="mt-4 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Immat.</th>
                  <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Mat.</th>
                  <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Chauffeur</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Tonnage</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Tours</th>
                  <th class="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Présence</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-teal-600 uppercase">A payer</th>
                  <th class="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="v in vehiculesFiltres" :key="v.immatriculation"
                  class="hover:bg-teal-50/50 transition-colors cursor-pointer group"
                  @click="selectionnerVehicule(v)">
                  <td class="px-3 py-2.5 font-mono font-semibold text-gray-900 text-xs">{{ v.immatriculation }}</td>
                  <td class="px-3 py-2.5 font-mono text-xs text-gray-500">{{ v.code_transporteur }}</td>
                  <td class="px-3 py-2.5 text-gray-900 text-xs">
                    {{ v.chauffeur }}
                    <span class="ml-1 inline-flex px-1 py-0.5 rounded text-[9px] font-bold"
                      :class="v.equipe === 'NUIT' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'">
                      {{ v.equipe === 'NUIT' ? '🌙' : '☀️' }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono font-semibold text-gray-900">{{ v.tonnage_tonnes }} t</td>
                  <td class="px-3 py-2.5 text-right font-mono text-gray-700">{{ v.rotations }}</td>
                  <td class="px-3 py-2.5 text-center">
                    <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded"
                      :class="v.taux_presence >= 93 ? 'text-emerald-700 bg-emerald-50' : v.taux_presence >= 70 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'">
                      {{ v.taux_presence }}%
                    </span>
                  </td>
                  <td class="px-3 py-2.5 text-right">
                    <span class="font-mono text-xs font-bold px-2 py-0.5 rounded" :class="primeColor(estimerPrime(v).scoreGlobal)">
                      {{ estimerPrime(v).primeFinale.toLocaleString() }} F
                    </span>
                  </td>
                  <td class="px-2 py-2.5">
                    <Truck class="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors" />
                  </td>
                </tr>
                <tr v-if="vehiculesFiltres.length === 0">
                  <td colspan="8" class="px-4 py-8 text-center text-gray-400">Aucun véhicule TRI trouvé pour cette date</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ═══ FORMULAIRE ÉQUIPE TRI ═══ -->
        <div v-if="selectedVehicule" id="formulaire-equipe-tri" class="mt-6 space-y-5">

          <!-- En-tête véhicule -->
          <div class="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-300 p-5">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <Truck class="w-5 h-5 text-teal-600" />
                <span class="text-sm font-bold text-teal-800">Véhicule TRI sélectionné</span>
              </div>
              <button type="button" @click="fermerFormulaire"
                class="flex items-center gap-1.5 text-xs text-teal-600 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                <X class="w-3.5 h-3.5" /> Changer
              </button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <p class="text-[11px] text-teal-600 font-medium">N° Parc / Immat.</p>
                <p class="font-bold text-gray-900 font-mono">{{ selectedVehicule.immatriculation }}</p>
              </div>
              <div>
                <p class="text-[11px] text-teal-600 font-medium">Chauffeur</p>
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
                <p class="text-[11px] text-teal-600 font-medium">Présence</p>
                <p class="font-bold font-mono" :class="estimerPrime(selectedVehicule).tauxPresence >= 93 ? 'text-emerald-600' : 'text-amber-600'">
                  {{ estimerPrime(selectedVehicule).tauxPresence }}%
                </p>
              </div>
              <div>
                <p class="text-[11px] text-teal-600 font-medium">Reste à payer</p>
                <p class="font-bold font-mono" :class="primeColor(estimerPrime(selectedVehicule).scoreGlobal)">
                  {{ estimerPrime(selectedVehicule).primeFinale.toLocaleString() }} F
                </p>
              </div>
            </div>
            <div class="mt-3">
              <div class="w-full h-2.5 bg-red-200 rounded-full overflow-hidden flex">
                <div class="h-full rounded-l-full transition-all duration-500"
                  :class="barColor(estimerPrime(selectedVehicule).scoreGlobal)"
                  :style="{ width: (estimerPrime(selectedVehicule).primeFinale / estimerPrime(selectedVehicule).plafond * 100) + '%' }"></div>
              </div>
            </div>
          </div>

          <!-- Historique équipages + bilan -->
          <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <button type="button" @click="historiqueOuvert = !historiqueOuvert"
              class="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
              <span class="flex items-center gap-2">
                <Users class="w-4 h-4 text-gray-400" />
                Historique de ce véhicule
                <span v-if="historiqueVehicule.length > 0" class="text-xs text-gray-400 font-mono">({{ historiqueVehicule.length }} saisies)</span>
              </span>
              <ChevronRight class="w-4 h-4 text-gray-400 transition-transform" :class="{ 'rotate-90': historiqueOuvert }" />
            </button>
            <div v-if="historiqueOuvert" class="border-t border-gray-100">
              <div v-if="historiqueLoading" class="p-4 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 class="w-4 h-4 animate-spin" /> Chargement...
              </div>
              <template v-else>
                <!-- Bilan mensuel -->
                <div v-if="historiqueBilan.length > 0" class="p-4 border-b border-gray-100 space-y-3">
                  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bilan mensuel</p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div v-for="b in historiqueBilan" :key="b.mois + b.matricule"
                      class="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-2">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-gray-700 font-mono">{{ b.mois }}</span>
                        <span class="text-xs text-gray-500">{{ b.agent_nom }}</span>
                      </div>
                      <div class="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p class="text-[10px] text-gray-400">Jours travaillés</p>
                          <p class="font-mono font-bold text-gray-900">{{ b.jours_travailles }} j</p>
                        </div>
                        <div>
                          <p class="text-[10px] text-gray-400">Tonnage cumulé</p>
                          <p class="font-mono font-bold text-gray-900">{{ b.tonnage_cumule }} t</p>
                        </div>
                        <div>
                          <p class="text-[10px] text-gray-400">Rotations cumulées</p>
                          <p class="font-mono font-bold text-gray-900">{{ b.rotations_cumul }}</p>
                        </div>
                        <div>
                          <p class="text-[10px] text-gray-400">Moyenne / jour</p>
                          <p class="font-mono font-bold text-gray-900">{{ b.tonnage_moyen }} t</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Tableau saisies -->
                <div v-if="historiqueVehicule.length === 0" class="p-4 text-sm text-gray-400 text-center">
                  Aucune saisie précédente pour ce véhicule
                </div>
                <div v-else class="overflow-x-auto">
                  <p class="px-4 pt-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Détail des saisies</p>
                  <table class="w-full text-xs mt-2">
                    <thead>
                      <tr class="bg-gray-50 border-b border-gray-100">
                        <th class="text-left px-3 py-2 font-semibold text-gray-500">Date</th>
                        <th class="text-left px-3 py-2 font-semibold text-gray-500">Chauffeur</th>
                        <th class="text-left px-3 py-2 font-semibold text-gray-500">Ripeur 1</th>
                        <th class="text-left px-3 py-2 font-semibold text-gray-500">Ripeur 2</th>
                        <th class="text-left px-3 py-2 font-semibold text-gray-500">Circuit</th>
                        <th class="text-right px-3 py-2 font-semibold text-gray-500">Tonnage</th>
                        <th class="text-right px-3 py-2 font-semibold text-gray-500">Rotations</th>
                        <th class="text-center px-3 py-2 font-semibold text-gray-500">Service</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                      <tr v-for="(h, i) in historiqueVehicule" :key="i" class="hover:bg-gray-50/50">
                        <td class="px-3 py-2 font-mono text-gray-700">{{ h.date.split('-').reverse().join('/') }}</td>
                        <td class="px-3 py-2 text-gray-900">{{ h.chauffeur_nom || '-' }}</td>
                        <td class="px-3 py-2 text-gray-700">{{ h.ripeur1_nom || '-' }}</td>
                        <td class="px-3 py-2 text-gray-700">{{ h.ripeur2_nom || '-' }}</td>
                        <td class="px-3 py-2 text-gray-600">{{ h.circuit || '-' }}</td>
                        <td class="px-3 py-2 text-right font-mono font-semibold text-gray-900">{{ h.tonnage }} t</td>
                        <td class="px-3 py-2 text-right font-mono text-gray-700">{{ h.rotations }}</td>
                        <td class="px-3 py-2 text-center">
                          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                            :class="h.service === 'TRI' ? 'bg-teal-100 text-teal-700' : 'bg-emerald-100 text-emerald-700'">
                            {{ h.service }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </div>
          </div>

          <!-- Suggestion équipe -->
          <div v-if="equipeLoading" class="flex items-center gap-3 p-4 bg-teal-50 rounded-xl border border-teal-100">
            <Loader2 class="w-5 h-5 text-teal-500 animate-spin" />
            <span class="text-sm text-teal-700">Recherche de la dernière équipe connue...</span>
          </div>

          <div v-if="equipeSuggestion && !equipeAcceptee" class="rounded-xl bg-teal-50 border border-teal-200 p-4 space-y-3">
            <div class="flex items-center gap-2">
              <Users class="w-4 h-4 text-teal-600" />
              <span class="text-sm font-semibold text-teal-800">Dernière équipe connue pour ce véhicule</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <span v-if="equipeSuggestion.ripeur1_nom" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-teal-200 rounded-lg text-xs font-medium text-gray-800">
                <div class="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold">{{ equipeSuggestion.ripeur1_nom.charAt(0) }}</div>
                {{ equipeSuggestion.ripeur1_nom }}
              </span>
              <span v-if="equipeSuggestion.ripeur2_nom" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-teal-200 rounded-lg text-xs font-medium text-gray-800">
                <div class="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-white text-[10px] font-bold">{{ equipeSuggestion.ripeur2_nom.charAt(0) }}</div>
                {{ equipeSuggestion.ripeur2_nom }}
              </span>
              <span v-if="equipeSuggestion.ripeur3_nom" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-teal-200 rounded-lg text-xs font-medium text-gray-800">
                <div class="w-5 h-5 rounded-full bg-teal-400 flex items-center justify-center text-white text-[10px] font-bold">{{ equipeSuggestion.ripeur3_nom.charAt(0) }}</div>
                {{ equipeSuggestion.ripeur3_nom }}
              </span>
              <span v-if="equipeSuggestion.circuit" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600">
                <Route class="w-3.5 h-3.5 text-gray-400" /> {{ equipeSuggestion.circuit }}
              </span>
            </div>
            <button type="button" @click="appliquerEquipe(equipeSuggestion)"
              class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors cursor-pointer">
              <Users class="w-4 h-4" /> Reprendre cette équipe
            </button>
          </div>

          <!-- Formulaire Ripeurs + Circuit -->
          <div class="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                <Users class="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-900">Ripeurs + Circuit</h3>
                <p class="text-xs text-gray-500">Saisie manuelle — les chauffeurs sont exclus de la liste</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AgentSearchInput v-model="ripeur1Matricule" serviceFilter="TRI" exclude-role="CHAUFFEUR"
                label="Ripeur 1 (obligatoire)" placeholder="Rechercher un ripeur TRI..." required
                @agent-selected="selectedRipeur1 = $event" />
              <div>
                <AgentSearchInput v-model="ripeur2Matricule" serviceFilter="TRI" exclude-role="CHAUFFEUR"
                  label="Ripeur 2 (optionnel)" placeholder="Rechercher un ripeur TRI..."
                  @agent-selected="selectedRipeur2 = $event" />
                <p class="text-[11px] text-gray-400 mt-1.5">Optionnel</p>
              </div>
              <div>
                <AgentSearchInput v-model="ripeur3Matricule" serviceFilter="TRI" exclude-role="CHAUFFEUR"
                  label="Ripeur 3 (optionnel)" placeholder="Rechercher un ripeur TRI..."
                  @agent-selected="selectedRipeur3 = $event" />
                <p class="text-[11px] text-gray-400 mt-1.5">Optionnel</p>
              </div>
            </div>

            <!-- Circuit -->
            <div class="space-y-1.5">
              <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Route class="w-3.5 h-3.5 text-gray-400" /> Circuit / Secteur
              </label>
              <input v-model="circuitSaisi" type="text"
                :placeholder="selectedVehicule?.arrondissement || 'Ex: Décharge, CET Mindoubé...'"
                class="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors" />
            </div>
          </div>

          <!-- Résumé équipe + historique ripeurs -->
          <div v-if="selectedRipeur1" class="bg-white rounded-xl border border-teal-200 p-5 space-y-3">
            <div class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-teal-600" />
              <span class="text-sm font-semibold text-gray-900">Équipe complète</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-teal-50 border border-teal-200 rounded-lg text-xs font-medium">
                <div class="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold">{{ selectedVehicule.chauffeur.charAt(0) }}</div>
                {{ selectedVehicule.chauffeur }} <span class="text-teal-500 text-[10px]">Chauffeur</span>
              </span>
              <button type="button" @click="voirHistoriqueAgent(selectedRipeur1)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                :class="historiqueAgent?.matricule === selectedRipeur1.matricule ? 'bg-teal-600 text-white border border-teal-600' : 'bg-teal-50 border border-teal-200 hover:bg-teal-100'">
                <div class="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-white text-[10px] font-bold">{{ selectedRipeur1.nom.charAt(0) }}</div>
                {{ selectedRipeur1.nom }} <span :class="historiqueAgent?.matricule === selectedRipeur1.matricule ? 'text-teal-200' : 'text-teal-400'" class="text-[10px]">R1</span>
              </button>
              <button v-if="selectedRipeur2" type="button" @click="voirHistoriqueAgent(selectedRipeur2)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                :class="historiqueAgent?.matricule === selectedRipeur2.matricule ? 'bg-teal-500 text-white border border-teal-500' : 'bg-teal-50 border border-teal-200 hover:bg-teal-100'">
                <div class="w-5 h-5 rounded-full bg-teal-400 flex items-center justify-center text-white text-[10px] font-bold">{{ selectedRipeur2.nom.charAt(0) }}</div>
                {{ selectedRipeur2.nom }} <span :class="historiqueAgent?.matricule === selectedRipeur2.matricule ? 'text-teal-200' : 'text-teal-300'" class="text-[10px]">R2</span>
              </button>
              <button v-if="selectedRipeur3" type="button" @click="voirHistoriqueAgent(selectedRipeur3)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                :class="historiqueAgent?.matricule === selectedRipeur3.matricule ? 'bg-teal-400 text-white border border-teal-400' : 'bg-teal-50 border border-teal-200 hover:bg-teal-100'">
                <div class="w-5 h-5 rounded-full bg-teal-300 flex items-center justify-center text-white text-[10px] font-bold">{{ selectedRipeur3.nom.charAt(0) }}</div>
                {{ selectedRipeur3.nom }} <span :class="historiqueAgent?.matricule === selectedRipeur3.matricule ? 'text-teal-100' : 'text-teal-300'" class="text-[10px]">R3</span>
              </button>
              <span v-if="circuitSaisi" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600">
                <Route class="w-3.5 h-3.5" /> {{ circuitSaisi }}
              </span>
            </div>
            <p class="text-[10px] text-gray-400">Cliquez sur un ripeur pour voir son historique</p>
          </div>

          <!-- Panneau historique agent (ripeur) -->
          <div v-if="historiqueAgentLoading" class="flex items-center gap-3 p-4 bg-teal-50 rounded-xl border border-teal-100">
            <Loader2 class="w-4 h-4 text-teal-500 animate-spin" />
            <span class="text-sm text-teal-700">Chargement historique...</span>
          </div>
          <div v-if="historiqueAgent" class="bg-white rounded-xl border border-teal-200 overflow-hidden">
            <div class="px-5 py-3 bg-teal-50 border-b border-teal-200 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <User class="w-4 h-4 text-teal-600" />
                <span class="text-sm font-bold text-teal-800">Historique — {{ historiqueAgent.nom }}</span>
                <span class="font-mono text-xs text-teal-500">{{ historiqueAgent.matricule }}</span>
              </div>
              <button type="button" @click="historiqueAgent = null" class="text-xs text-teal-500 hover:text-red-500 cursor-pointer">Fermer</button>
            </div>
            <div v-if="historiqueAgent.bilan.length > 0" class="p-4 border-b border-gray-100">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Bilan mensuel</p>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <div v-for="b in historiqueAgent.bilan" :key="b.mois" class="rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <p class="text-xs font-bold text-gray-700 font-mono mb-1">{{ b.mois }}</p>
                  <div class="grid grid-cols-2 gap-1 text-[11px]">
                    <div><span class="text-gray-400">Jours</span> <span class="font-mono font-bold text-gray-900 ml-1">{{ b.jours_travailles }}</span></div>
                    <div><span class="text-gray-400">Tonnage</span> <span class="font-mono font-bold text-gray-900 ml-1">{{ b.tonnage_cumule }} t</span></div>
                    <div><span class="text-gray-400">Rotations</span> <span class="font-mono font-bold text-gray-900 ml-1">{{ b.rotations_cumul }}</span></div>
                    <div><span class="text-gray-400">Moy/j</span> <span class="font-mono font-bold text-gray-900 ml-1">{{ b.tonnage_moyen }} t</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="historiqueAgent.saisies.length > 0" class="overflow-x-auto">
              <p class="px-4 pt-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dernières saisies</p>
              <table class="w-full text-xs mt-2">
                <thead>
                  <tr class="bg-gray-50 border-b border-gray-100">
                    <th class="text-left px-3 py-2 font-semibold text-gray-500">Date</th>
                    <th class="text-left px-3 py-2 font-semibold text-gray-500">Rôle</th>
                    <th class="text-left px-3 py-2 font-semibold text-gray-500">Véhicule</th>
                    <th class="text-left px-3 py-2 font-semibold text-gray-500">Chauffeur</th>
                    <th class="text-left px-3 py-2 font-semibold text-gray-500">Circuit</th>
                    <th class="text-right px-3 py-2 font-semibold text-gray-500">Tonnage</th>
                    <th class="text-center px-3 py-2 font-semibold text-gray-500">Service</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  <tr v-for="(h, i) in historiqueAgent.saisies" :key="i" class="hover:bg-gray-50/50">
                    <td class="px-3 py-2 font-mono text-gray-700">{{ h.date.split('-').reverse().join('/') }}</td>
                    <td class="px-3 py-2">
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        :class="h.role_dans_equipe === 'Chauffeur' ? 'bg-emerald-100 text-emerald-700' : 'bg-teal-100 text-teal-700'">
                        {{ h.role_dans_equipe }}
                      </span>
                    </td>
                    <td class="px-3 py-2 font-mono text-gray-700">{{ h.immatriculation }}</td>
                    <td class="px-3 py-2 text-gray-900">{{ h.chauffeur_nom || '-' }}</td>
                    <td class="px-3 py-2 text-gray-600">{{ h.circuit || '-' }}</td>
                    <td class="px-3 py-2 text-right font-mono font-semibold">{{ h.tonnage }} t</td>
                    <td class="px-3 py-2 text-center">
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        :class="h.service === 'TRI' ? 'bg-teal-100 text-teal-700' : 'bg-emerald-100 text-emerald-700'">
                        {{ h.service }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="p-4 text-sm text-gray-400 text-center">Aucune saisie trouvée</div>
          </div>

          <!-- Boutons Retour + Valider (toujours visibles) -->
          <div class="flex justify-between items-center bg-white rounded-xl border border-gray-100 px-5 py-4">
            <button type="button" @click="fermerFormulaire"
              class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
              <ArrowLeft class="w-4 h-4" /> Retour à la liste
            </button>
            <BaseButton @click="submit" variant="primary" type="button" :disabled="!selectedRipeur1">
              <CheckCircle class="w-4 h-4 mr-1.5" /> Valider la saisie TRI
            </BaseButton>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
