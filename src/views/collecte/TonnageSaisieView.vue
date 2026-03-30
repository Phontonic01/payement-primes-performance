<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import DateInput from '@/components/ui/DateInput.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import {
  Truck, Calendar, Users, User, Route, Zap, Loader2, WifiOff,
  Search, RefreshCw, ArrowLeft, CheckCircle, X, ChevronRight
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

// ── Date ──
const date = ref(new Date().toISOString().split('T')[0])

// ── Données pont-bascule ──
const pontBasculeLoading = ref(false)
const pontBasculeError = ref('')
const vehiculesDuJour = ref([])
const bilanMensuel = ref(null)
const searchQuery = ref('')
const filtreEquipe = ref('TOUS')
const selectedVehicule = ref(null)

async function chargerVehiculesDuJour() {
  pontBasculeLoading.value = true
  pontBasculeError.value = ''
  vehiculesDuJour.value = []
  fermerFormulaire()
  try {
    const mois = date.value.slice(0, 7)
    const [dataJour, dataBilan] = await Promise.all([
      api.pontBasculeVehiculesDuJour(date.value, 'CLEAN AFRICA'),
      api.pontBasculeBilan(mois),
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
      toastStore.addToast(`${vehiculesDuJour.value.length} véhicule(s) · Bilan mensuel chargé`, 'success')
    }
  } catch (err) {
    pontBasculeError.value = err.message
    toastStore.addToast('Pont-bascule indisponible : ' + err.message, 'error')
  } finally {
    pontBasculeLoading.value = false
  }
}

watch(date, () => chargerVehiculesDuJour(), { immediate: true })

// ── Paramètres ──
const plafond = computed(() => primesStore.config.plafonds.CHAUFFEUR_COLLECTE)
const seuilPresence = computed(() => primesStore.config.seuilPresence)

function estimerPrime(v) {
  const p = plafond.value
  const penalites = v.penalites_mois || { tonnage: 0, bouclage: 0, entretien: 0, qhse: 0, total: 0 }
  const primeAvant = Math.max(0, p - penalites.total)
  const primeFinale = v.prime_finale ?? primeAvant
  const scoreGlobal = (primeFinale / p) * 100
  return {
    plafond: p, penalites, primeAvant, primeFinale, scoreGlobal,
    joursPresent: v.jours_present || 0,
    tauxPresence: v.taux_presence || 0,
    prorata: v.prorata || false,
  }
}

function primeColor(scoreGlobal) {
  if (scoreGlobal >= 75) return 'text-emerald-700 bg-emerald-50'
  if (scoreGlobal >= 60) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

function barColor(scoreGlobal) {
  if (scoreGlobal >= 75) return 'bg-emerald-500'
  if (scoreGlobal >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

// Filtrer la liste
const vehiculesFiltres = computed(() => {
  let list = vehiculesDuJour.value
  if (filtreEquipe.value !== 'TOUS') list = list.filter(v => v.equipe === filtreEquipe.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(v => {
      const mat = String(v.code_transporteur || '')
      return v.immatriculation.toLowerCase().includes(q) ||
        v.chauffeur.toLowerCase().includes(q) ||
        v.arrondissement.toLowerCase().includes(q) ||
        mat.includes(q) || mat.padStart(4, '0').includes(q)
    })
  }
  return list
})

const nbJour = computed(() => vehiculesDuJour.value.filter(v => v.equipe === 'JOUR').length)
const nbNuit = computed(() => vehiculesDuJour.value.filter(v => v.equipe === 'NUIT').length)

// ── Sélection véhicule → ouvre le formulaire ──
const equipeSuggestion = ref(null)
const equipeLoading = ref(false)
const equipeAcceptee = ref(false)

// ── Historique équipages ──
const historiqueVehicule = ref([])
const historiqueBilan = ref([])
const historiqueLoading = ref(false)
const historiqueOuvert = ref(false)

// ── Historique agent (ripeur) ──
const historiqueAgent = ref(null) // { matricule, nom, saisies, bilan }
const historiqueAgentLoading = ref(false)

async function voirHistoriqueAgent(agent) {
  if (!agent) return
  if (historiqueAgent.value?.matricule === agent.matricule) {
    historiqueAgent.value = null // toggle off
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

const ripeur1Matricule = ref('')
const ripeur2Matricule = ref('')
const ripeur3Matricule = ref('')
const selectedRipeur1 = ref(null)
const selectedRipeur2 = ref(null)
const selectedRipeur3 = ref(null)
const circuitSaisi = ref('')

async function selectionnerVehicule(v) {
  selectedVehicule.value = v
  // Reset formulaire
  ripeur1Matricule.value = ''
  ripeur2Matricule.value = ''
  ripeur3Matricule.value = ''
  selectedRipeur1.value = null
  selectedRipeur2.value = null
  selectedRipeur3.value = null
  circuitSaisi.value = ''
  equipeSuggestion.value = null
  equipeAcceptee.value = false

  // Charger historique + suggestion en parallèle
  historiqueOuvert.value = false
  chargerHistorique(v.immatriculation)
  equipeLoading.value = true
  try {
    const eq = await api.getEquipeVehicule(v.immatriculation, 'COLLECTE')
    if (eq && eq.ripeur1_matricule) equipeSuggestion.value = eq
  } catch { /* pas d'équipe connue */ }
  equipeLoading.value = false

  // Scroll vers le formulaire
  setTimeout(() => {
    document.getElementById('formulaire-equipe')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

// ── Correspondance véhicule local ──
const vehiculeLocal = computed(() => {
  if (!selectedVehicule.value) return null
  return vehiculesStore.vehiculesOperationnels.find(
    v => v.immatriculation === selectedVehicule.value.immatriculation
  ) || null
})
const vehiculeType = computed(() => vehiculeLocal.value?.type || 'BOM')

// ── Soumission ──
function submit() {
  if (!selectedVehicule.value) return
  if (!selectedRipeur1.value) {
    toastStore.addToast('Veuillez sélectionner au moins le Ripeur 1.', 'warning')
    return
  }

  const v = selectedVehicule.value
  const vLocal = vehiculeLocal.value
  const vLabel = vLocal ? `${vLocal.type} N°${vLocal.noParc} — ${vLocal.immatriculation}` : v.immatriculation
  const circuitFinal = circuitSaisi.value || v.origine

  const saisieBase = {
    date: date.value, vehicule: vehiculeType.value,
    noParc: vLocal?.noParc || '', immatriculation: v.immatriculation,
    vehiculeLabel: vLabel, tonnage: v.tonnage_tonnes, rotations: v.rotations,
    arrondissement: v.arrondissement, secteur: '', circuit: circuitFinal,
  }

  // Tonnages chauffeur + ripeurs
  saisiesStore.enregistrerTonnage({ ...saisieBase, matricule: v.code_transporteur || v.immatriculation, agent: v.chauffeur })
  saisiesStore.enregistrerTonnage({ ...saisieBase, matricule: selectedRipeur1.value.matricule, agent: selectedRipeur1.value.nom })
  if (selectedRipeur2.value) saisiesStore.enregistrerTonnage({ ...saisieBase, matricule: selectedRipeur2.value.matricule, agent: selectedRipeur2.value.nom })
  if (selectedRipeur3.value) saisiesStore.enregistrerTonnage({ ...saisieBase, matricule: selectedRipeur3.value.matricule, agent: selectedRipeur3.value.nom })

  // Fiche collecte
  const ficheId = saisiesStore.enregistrerFicheCollecte({
    date: date.value,
    chauffeur: { matricule: v.code_transporteur || v.immatriculation, nom: v.chauffeur },
    ripeur1: selectedRipeur1.value, ripeur2: selectedRipeur2.value, ripeur3: selectedRipeur3.value,
    vehiculeType: vehiculeType.value, vehiculeLabel: vLabel,
    noParc: vLocal?.noParc || '', immatriculation: v.immatriculation,
    arrondissement: v.arrondissement, secteur: '', circuit: circuitFinal,
    tonnage: v.tonnage_tonnes, rotations: v.rotations,
  })

  // Sauvegarder l'équipe pour suggestion future
  api.saveEquipeVehicule({
    immatriculation: v.immatriculation, service: 'COLLECTE',
    chauffeur_matricule: v.code_transporteur || '', chauffeur_nom: v.chauffeur || '',
    ripeur1_matricule: selectedRipeur1.value?.matricule || '', ripeur1_nom: selectedRipeur1.value?.nom || '',
    ripeur2_matricule: selectedRipeur2.value?.matricule || '', ripeur2_nom: selectedRipeur2.value?.nom || '',
    ripeur3_matricule: selectedRipeur3.value?.matricule || '', ripeur3_nom: selectedRipeur3.value?.nom || '',
    circuit: circuitFinal,
  }).catch(() => {})

  toastStore.addToast('Fiche collecte enregistrée !', 'success')
  router.push(`/collecte/fiche/${ficheId}`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Saisie Collecte</h1>
        <p class="text-sm text-gray-500 mt-0.5">Choisissez un chauffeur, ajoutez les ripeurs et le circuit</p>
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
          <p class="text-xs text-gray-500">Les chauffeurs sont chargés depuis le pont-bascule</p>
        </div>
      </div>
      <DateInput v-model="date" required />
      <button type="button" @click="chargerVehiculesDuJour"
        class="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer">
        <RefreshCw class="w-4 h-4" /> Actualiser
      </button>
    </div>

    <!-- ═══ LISTE DES VÉHICULES / CHAUFFEURS ═══ -->
    <div :class="{ 'opacity-60 pointer-events-none': readOnly }">

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

      <template v-else>
        <!-- Barre de recherche + filtres -->
        <div class="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="relative flex-1">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input v-model="searchQuery" type="text"
                placeholder="Rechercher par immatriculation, chauffeur, matricule..."
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors" />
            </div>
            <span class="font-mono font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm">
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

        <!-- Tableau des véhicules -->
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
                  <th class="text-right px-3 py-3 text-xs font-semibold text-red-500 uppercase">Sanctions</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-emerald-600 uppercase">A payer</th>
                  <th class="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="v in vehiculesFiltres" :key="v.immatriculation"
                  class="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
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
                  <td class="px-3 py-2.5 text-right font-mono text-xs font-semibold"
                    :class="estimerPrime(v).penalites.total > 0 ? 'text-red-600' : 'text-gray-300'">
                    {{ estimerPrime(v).penalites.total > 0 ? '-' + estimerPrime(v).penalites.total.toLocaleString() : '0' }}
                  </td>
                  <td class="px-3 py-2.5 text-right">
                    <span class="font-mono text-xs font-bold px-2 py-0.5 rounded" :class="primeColor(estimerPrime(v).scoreGlobal)">
                      {{ estimerPrime(v).primeFinale.toLocaleString() }} F
                    </span>
                  </td>
                  <td class="px-2 py-2.5">
                    <Truck class="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                  </td>
                </tr>
                <tr v-if="vehiculesFiltres.length === 0">
                  <td colspan="9" class="px-4 py-8 text-center text-gray-400">Aucun véhicule trouvé pour cette date</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Résumé global -->
        <div class="mt-4 bg-white rounded-xl border border-gray-100 px-4 py-3">
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
              <span class="text-gray-500">Total à payer</span>
              <p class="font-mono font-bold text-emerald-700 text-sm">{{ vehiculesFiltres.reduce((s, v) => s + (v.prime_finale ?? 0), 0).toLocaleString() }} F</p>
            </div>
            <div class="ml-auto text-right">
              <span class="text-gray-400">{{ vehiculesFiltres.length }} agents · Plafond {{ plafond.toLocaleString() }} F · Présence {{ seuilPresence }}%</span>
            </div>
          </div>
        </div>

        <!-- ═══ FORMULAIRE ÉQUIPE (s'affiche quand un véhicule est sélectionné) ═══ -->
        <div v-if="selectedVehicule" id="formulaire-equipe" class="mt-6 space-y-5">

          <!-- En-tête véhicule sélectionné -->
          <div class="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-300 p-5">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <Truck class="w-5 h-5 text-emerald-600" />
                <span class="text-sm font-bold text-emerald-800">Véhicule sélectionné</span>
              </div>
              <button type="button" @click="fermerFormulaire"
                class="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                <X class="w-3.5 h-3.5" /> Changer
              </button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <p class="text-[11px] text-emerald-600 font-medium">N° Parc / Immat.</p>
                <p class="font-bold text-gray-900 font-mono">{{ selectedVehicule.immatriculation }}</p>
              </div>
              <div>
                <p class="text-[11px] text-emerald-600 font-medium">Chauffeur</p>
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
              </div>
            </div>
            <!-- Barre dégression -->
            <div class="mt-3">
              <div class="w-full h-2.5 bg-red-200 rounded-full overflow-hidden flex">
                <div class="h-full rounded-l-full transition-all duration-500"
                  :class="barColor(estimerPrime(selectedVehicule).scoreGlobal)"
                  :style="{ width: (estimerPrime(selectedVehicule).primeFinale / estimerPrime(selectedVehicule).plafond * 100) + '%' }"></div>
              </div>
            </div>
          </div>

          <!-- Bouton + panneau historique équipages -->
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
                <!-- Bilan mensuel par chauffeur -->
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

                <!-- Tableau des saisies -->
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

          <!-- Suggestion équipe (non pré-remplie) -->
          <div v-if="equipeLoading" class="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <Loader2 class="w-5 h-5 text-blue-500 animate-spin" />
            <span class="text-sm text-blue-700">Recherche de la dernière équipe connue...</span>
          </div>

          <div v-if="equipeSuggestion && !equipeAcceptee" class="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-3">
            <div class="flex items-center gap-2">
              <Users class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-semibold text-blue-800">Dernière équipe connue pour ce véhicule</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <span v-if="equipeSuggestion.ripeur1_nom" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-gray-800">
                <div class="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">{{ equipeSuggestion.ripeur1_nom.charAt(0) }}</div>
                {{ equipeSuggestion.ripeur1_nom }}
              </span>
              <span v-if="equipeSuggestion.ripeur2_nom" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-gray-800">
                <div class="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">{{ equipeSuggestion.ripeur2_nom.charAt(0) }}</div>
                {{ equipeSuggestion.ripeur2_nom }}
              </span>
              <span v-if="equipeSuggestion.ripeur3_nom" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-gray-800">
                <div class="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center text-white text-[10px] font-bold">{{ equipeSuggestion.ripeur3_nom.charAt(0) }}</div>
                {{ equipeSuggestion.ripeur3_nom }}
              </span>
              <span v-if="equipeSuggestion.circuit" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600">
                <Route class="w-3.5 h-3.5 text-gray-400" /> {{ equipeSuggestion.circuit }}
              </span>
            </div>
            <button type="button" @click="appliquerEquipe(equipeSuggestion)"
              class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer">
              <Users class="w-4 h-4" /> Reprendre cette équipe
            </button>
          </div>

          <!-- Formulaire Ripeurs + Circuit -->
          <div class="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users class="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-900">Ripeurs + Circuit</h3>
                <p class="text-xs text-gray-500">Saisie manuelle — les chauffeurs sont exclus de la liste</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AgentSearchInput v-model="ripeur1Matricule" :date="date" :filter-presents="false"
                exclude-role="CHAUFFEUR"
                label="Ripeur 1 (obligatoire)" placeholder="Rechercher un ripeur..." required
                @agent-selected="(a) => selectedRipeur1 = a" />
              <div>
                <AgentSearchInput v-model="ripeur2Matricule" :date="date" :filter-presents="false"
                  exclude-role="CHAUFFEUR"
                  label="Ripeur 2 (optionnel)" placeholder="Rechercher un ripeur..."
                  @agent-selected="(a) => selectedRipeur2 = a" />
                <p class="text-[11px] text-gray-400 mt-1.5">Optionnel</p>
              </div>
              <div>
                <AgentSearchInput v-model="ripeur3Matricule" :date="date" :filter-presents="false"
                  exclude-role="CHAUFFEUR"
                  label="Ripeur 3 (optionnel)" placeholder="Rechercher un ripeur..."
                  @agent-selected="(a) => selectedRipeur3 = a" />
                <p class="text-[11px] text-gray-400 mt-1.5">Optionnel</p>
              </div>
            </div>

            <!-- Circuit -->
            <div class="space-y-1.5">
              <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Route class="w-3.5 h-3.5 text-gray-400" /> Circuit / Secteur
              </label>
              <input v-model="circuitSaisi" type="text"
                :placeholder="selectedVehicule?.origine || 'Ex: 1er Arrondissement, Akébé, PK5...'"
                class="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors" />
            </div>
          </div>

          <!-- Résumé équipe + historique ripeurs -->
          <div v-if="selectedRipeur1" class="bg-white rounded-xl border border-emerald-200 p-5 space-y-3">
            <div class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-emerald-600" />
              <span class="text-sm font-semibold text-gray-900">Équipe complète</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium">
                <div class="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">{{ selectedVehicule.chauffeur.charAt(0) }}</div>
                {{ selectedVehicule.chauffeur }} <span class="text-emerald-500 text-[10px]">Chauffeur</span>
              </span>
              <button type="button" @click="voirHistoriqueAgent(selectedRipeur1)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                :class="historiqueAgent?.matricule === selectedRipeur1.matricule ? 'bg-blue-600 text-white border border-blue-600' : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'">
                <div class="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">{{ selectedRipeur1.nom.charAt(0) }}</div>
                {{ selectedRipeur1.nom }} <span :class="historiqueAgent?.matricule === selectedRipeur1.matricule ? 'text-blue-200' : 'text-blue-500'" class="text-[10px]">R1</span>
              </button>
              <button v-if="selectedRipeur2" type="button" @click="voirHistoriqueAgent(selectedRipeur2)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                :class="historiqueAgent?.matricule === selectedRipeur2.matricule ? 'bg-blue-500 text-white border border-blue-500' : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'">
                <div class="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">{{ selectedRipeur2.nom.charAt(0) }}</div>
                {{ selectedRipeur2.nom }} <span :class="historiqueAgent?.matricule === selectedRipeur2.matricule ? 'text-blue-200' : 'text-blue-400'" class="text-[10px]">R2</span>
              </button>
              <button v-if="selectedRipeur3" type="button" @click="voirHistoriqueAgent(selectedRipeur3)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                :class="historiqueAgent?.matricule === selectedRipeur3.matricule ? 'bg-blue-400 text-white border border-blue-400' : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'">
                <div class="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center text-white text-[10px] font-bold">{{ selectedRipeur3.nom.charAt(0) }}</div>
                {{ selectedRipeur3.nom }} <span :class="historiqueAgent?.matricule === selectedRipeur3.matricule ? 'text-blue-200' : 'text-blue-300'" class="text-[10px]">R3</span>
              </button>
              <span v-if="circuitSaisi" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600">
                <Route class="w-3.5 h-3.5" /> {{ circuitSaisi }}
              </span>
            </div>
            <p class="text-[10px] text-gray-400">Cliquez sur un ripeur pour voir son historique</p>
          </div>

          <!-- Panneau historique agent (ripeur) -->
          <div v-if="historiqueAgentLoading" class="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <Loader2 class="w-4 h-4 text-blue-500 animate-spin" />
            <span class="text-sm text-blue-700">Chargement historique...</span>
          </div>
          <div v-if="historiqueAgent" class="bg-white rounded-xl border border-blue-200 overflow-hidden">
            <div class="px-5 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <User class="w-4 h-4 text-blue-600" />
                <span class="text-sm font-bold text-blue-800">Historique — {{ historiqueAgent.nom }}</span>
                <span class="font-mono text-xs text-blue-500">{{ historiqueAgent.matricule }}</span>
              </div>
              <button type="button" @click="historiqueAgent = null" class="text-xs text-blue-500 hover:text-red-500 cursor-pointer">Fermer</button>
            </div>
            <!-- Bilan mensuel agent -->
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
            <!-- Saisies agent -->
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
                        :class="h.role_dans_equipe === 'Chauffeur' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'">
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
              <CheckCircle class="w-4 h-4 mr-1.5" /> Valider la fiche collecte
            </BaseButton>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
