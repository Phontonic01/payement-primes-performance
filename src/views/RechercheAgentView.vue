<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Calendar, User, Hash, MapPin, Truck, ShieldCheck, Wrench, TrendingUp, CheckCircle, XCircle, Clock, AlertTriangle, ArrowDown, Download, Zap, ArrowLeft } from 'lucide-vue-next'
import { generateFicheAgentPdf } from '@/utils/generatePdf'
import { formatDateFr } from '@/utils/formatDate'
import { useAgentsStore } from '@/stores/agents'
import { usePrimesStore } from '@/stores/primes'
import { usePontBasculeStore } from '@/stores/pontBascule'
import { useSaisiesStore } from '@/stores/saisies'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import api from '@/api/client'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import DateInput from '@/components/ui/DateInput.vue'

const route = useRoute()
const router = useRouter()
const agentsStore = useAgentsStore()
const primesStore = usePrimesStore()
const pontBasculeStore = usePontBasculeStore()
const saisiesStore = useSaisiesStore()

const selectedMatricule = ref('')
const selectedDate = ref(new Date().toISOString().split('T')[0])
const selectedAgent = ref(null)

// Si on arrive via /agent/:matricule, charger l'agent automatiquement.
// Recherche dans la base RH d'abord, puis fallback sur l'historique Excel
// (cas des agents présents dans l'Excel d'évaluation mais hors base RH).
async function chargerAgentParMatricule(mat) {
  if (!mat) return
  await agentsStore.ensureLoaded()
  const agent = agentsStore.agents.find(a => a.matricule === mat)
  if (agent) {
    selectedMatricule.value = mat
    selectedAgent.value = agent
    return
  }
  // Fallback : on tente de récupérer l'agent depuis l'Excel RH
  try {
    const data = await api.getHistoriqueAgent(mat)
    if (data?.equipagesRH?.length) {
      const e0 = data.equipagesRH[0]
      const role = e0.role === 'CHAUFFEUR' ? 'CHAUFFEUR' : 'EQUIPIER'
      // Récupérer le nom : si l'agent est chauffeur, c'est e0.chauffeur.nom
      // sinon c'est dans e0.ripeurs où is_self === true
      let nom = ''
      if (e0.chauffeur?.is_self) nom = e0.chauffeur.nom
      else {
        const self = (e0.ripeurs || []).find(r => r.is_self)
        nom = self?.nom || e0.chauffeur?.nom || `Matricule ${mat}`
      }
      selectedMatricule.value = mat
      selectedAgent.value = {
        matricule: mat,
        nom: nom.trim(),
        role,
        fonction: e0.role || '',
        zone: 'Hors base RH',
        service: 'COLLECTE',
        _hors_rh: true,
      }
    }
  } catch (e) {
    console.warn('Fallback agent Excel échoué :', e.message)
  }
}

onMounted(async () => {
  await chargerAgentParMatricule(route.params.matricule)
})

// Re-charger si on change de route /agent/:matricule sans démonter la vue
watch(() => route.params.matricule, (m) => {
  if (m) chargerAgentParMatricule(m)
})

function onAgentSelected(agent) {
  selectedAgent.value = agent
}

// ─── Historique RH (équipages Excel) ───
const equipagesRH = ref([])
const bilanRH = ref([])
const anomaliesPrime = ref([])
const historiqueRHLoading = ref(false)
const historiqueRHOuvert = ref(false)

async function chargerHistoriqueRH(matricule) {
  if (!matricule) return
  historiqueRHLoading.value = true
  equipagesRH.value = []
  bilanRH.value = []
  anomaliesPrime.value = []
  try {
    const data = await api.getHistoriqueAgent(matricule)
    equipagesRH.value = data.equipagesRH || []
    bilanRH.value = data.bilanRH || []
    anomaliesPrime.value = data.anomaliesPrime || []
  } catch { /* pas bloquant */ }
  historiqueRHLoading.value = false
}

watch(selectedAgent, (a) => {
  if (a?.matricule) chargerHistoriqueRH(a.matricule)
}, { immediate: true })

// Mois sélectionné
const moisSelectionne = computed(() => {
  if (!selectedDate.value) return ''
  return selectedDate.value.substring(0, 7)
})

// Charger le bilan quand le mois change
watch(moisSelectionne, (mois) => {
  if (mois) pontBasculeStore.chargerBilan(mois)
}, { immediate: true })

// Bilan pont-bascule pour l'agent sélectionné (par matricule RH puis par nom)
const bilanAgent = computed(() => {
  if (!selectedAgent.value) return null
  return pontBasculeStore.getBilanParNom(selectedAgent.value.nom, selectedAgent.value.matricule)
})

// Présence depuis le pont-bascule (automatique)
const joursPresents = computed(() => bilanAgent.value?.jours_present || 0)

const isPresent = computed(() => {
  if (!bilanAgent.value) return null
  return bilanAgent.value.jours_present > 0
})

// Fiche avec données pont-bascule (pénalités cumulées jour par jour)
const fiche = computed(() => {
  if (!selectedAgent.value) return null

  // Priorité 1 : bilan pont-bascule (données réelles jour par jour)
  if (bilanAgent.value) {
    const b = bilanAgent.value
    const plafond = b.plafond
    const scoreGlobal = plafond > 0 ? (b.prime_finale / plafond) * 100 : 0

    return {
      source: 'pont-bascule',
      scores: {
        tonnage: plafond > 0 ? ((plafond - b.penalites.tonnage) / (plafond * 0.5)) * 100 : 100,
        bouclage: 100 - (b.penalites.bouclage > 0 ? (b.penalites.bouclage / (plafond * 0.25)) * 100 : 0),
        entretien: 100 - (b.penalites.entretien > 0 ? (b.penalites.entretien / (plafond * 0.15)) * 100 : 0),
        qhse: 100 - (b.penalites.qhse > 0 ? (b.penalites.qhse / (plafond * 0.10)) * 100 : 0),
      },
      scoreGlobal,
      penalites: b.penalites,
      prime: {
        montant: b.prime_finale,
        eligible: b.prime_finale > 0,
        raison: b.prime_finale === 0 ? 'Score global sous le seuil minimum' : null,
      },
      ponderations: { tonnage: 50, bouclage: 25, entretien: 15, qhse: 10 },
      details: {
        tonnagePondere: ((100 - (b.penalites.tonnage / (plafond * 0.5) * 100)) * 0.5).toFixed(1),
        bouclagePondere: (25).toFixed(1), // pas encore de données
        entretienPondere: (15).toFixed(1),
        qhsePondere: (10).toFixed(1),
      },
      plafond,
      joursPresent: b.jours_present,
      tauxPresence: b.taux_presence,
      equipe: b.equipe,
      prorata: b.prorata,
      detailJours: b.detail_jours || [],
    }
  }

  // Priorité 2 : ancien calcul via saisies locales (fallback)
  const agregation = saisiesStore.getAgregationMensuelle(selectedAgent.value.matricule, moisSelectionne.value)
  if (agregation.nbSaisiesTonnage === 0 && agregation.nbSaisiesBouclage === 0 &&
      agregation.nbSaisiesEntretien === 0 && agregation.nbSaisiesQhse === 0) {
    return null
  }

  const typeAgent = selectedAgent.value.role === 'EQUIPIER' ? 'RIPEUR_COLLECTE' : 'CHAUFFEUR_COLLECTE'
  const result = primesStore.calculerFicheAgent({
    typeVehicule: agregation.typeVehicule,
    typeAgent,
    joursPresents: joursPresents.value || 28,
    tonnageMoyen: agregation.tonnageMoyen,
    rotationsMoyennes: agregation.rotationsMoyennes,
    statutsBouclage: agregation.statutsBouclage,
    noteEntretienMoyenne: agregation.noteEntretienMoyenne,
    qhseData: agregation.qhseData,
  })
  return { ...result, source: 'local' }
})

const evalData = computed(() => {
  if (!fiche.value) return null
  if (fiche.value.source === 'pont-bascule' && bilanAgent.value) {
    const b = bilanAgent.value
    return {
      typeVehicule: 'BOM',
      typeAgent: selectedAgent.value?.role === 'EQUIPIER' ? 'RIPEUR_COLLECTE' : 'CHAUFFEUR_COLLECTE',
      tonnage: b.detail_jours?.length > 0 ? b.detail_jours.reduce((s, j) => s + j.tonnage_tonnes, 0) / b.detail_jours.length : 0,
      rotations: b.detail_jours?.length > 0 ? b.detail_jours.reduce((s, j) => s + j.rotations, 0) / b.detail_jours.length : 0,
      bouclages: [],
      noteEntretien: null,
      qhse: { checklistSur5: 5, alcootestPositif: false, epiConforme: true, quartHeureSecurite: true },
    }
  }
  const agregation = saisiesStore.getAgregationMensuelle(selectedAgent.value.matricule, moisSelectionne.value)
  return {
    typeVehicule: agregation.typeVehicule,
    typeAgent: selectedAgent.value.role === 'EQUIPIER' ? 'RIPEUR_COLLECTE' : 'CHAUFFEUR_COLLECTE',
    tonnage: agregation.tonnageMoyen,
    rotations: agregation.rotationsMoyennes,
    bouclages: agregation.statutsBouclage,
    noteEntretien: agregation.noteEntretienMoyenne,
    qhse: agregation.qhseData,
  }
})

function scoreColor(score) {
  if (score >= 75) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function exporterPdfAgent() {
  if (!selectedAgent.value || !fiche.value) return
  generateFicheAgentPdf(selectedAgent.value, fiche.value, fiche.value.ponderations)
}

function scoreBg(score) {
  if (score >= 75) return 'bg-emerald-50 border-emerald-200'
  if (score >= 50) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

function scoreBarColor(score) {
  if (score >= 75) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Bouton retour si arrivé via /agent/:matricule -->
    <button
      v-if="route.params.matricule"
      @click="router.back()"
      class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
    >
      <ArrowLeft class="w-4 h-4" />
      Retour
    </button>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ route.params.matricule ? 'Fiche Agent' : 'Recherche Agent' }}</h1>
        <p class="text-sm text-gray-500 mt-0.5">Consultation des performances et primes par matricule ou nom</p>
      </div>
      <div class="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
        <span class="text-xs font-semibold text-emerald-700">Note de service N/Réf: 25-11-001</span>
      </div>
    </div>

    <!-- Barre de recherche principale -->
    <div class="bg-white rounded-xl border border-gray-100 p-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="md:col-span-2">
          <AgentSearchInput
            v-model="selectedMatricule"
            :date="selectedDate"
            :filter-presents="false"
            label="Rechercher un agent"
            placeholder="Tapez un matricule (ex: 0946) ou un nom..."
            @agent-selected="onAgentSelected"
          />
        </div>
        <div class="space-y-1.5">
          <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Calendar class="w-3.5 h-3.5 text-gray-400" />
            Date de consultation
          </label>
          <DateInput v-model="selectedDate" />
        </div>
      </div>
    </div>

    <!-- Résultat: Fiche Agent -->
    <template v-if="selectedAgent && fiche">
      <!-- Profil Agent + Statut présence -->
      <div class="bg-white rounded-xl border border-gray-100 p-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {{ selectedAgent.nom.charAt(0) }}
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-900">{{ selectedAgent.nom }}</h2>
              <div class="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span class="flex items-center gap-1"><Hash class="w-3.5 h-3.5" /> {{ selectedAgent.matricule }}</span>
                <span class="text-gray-300">|</span>
                <span class="flex items-center gap-1"><User class="w-3.5 h-3.5" /> {{ selectedAgent.role }}</span>
                <span class="text-gray-300">|</span>
                <span class="flex items-center gap-1"><MapPin class="w-3.5 h-3.5" /> {{ selectedAgent.zone }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="text-xs text-gray-400 font-medium">{{ formatDateFr(selectedDate) }}</p>
              <div v-if="isPresent === true" class="flex items-center gap-1.5 mt-1">
                <CheckCircle class="w-5 h-5 text-emerald-500" />
                <span class="text-sm font-semibold text-emerald-600">Présent</span>
              </div>
              <div v-else-if="isPresent === false" class="flex items-center gap-1.5 mt-1">
                <XCircle class="w-5 h-5 text-red-400" />
                <span class="text-sm font-semibold text-red-500">Absent ce jour</span>
              </div>
              <div v-else class="flex items-center gap-1.5 mt-1">
                <Clock class="w-5 h-5 text-gray-400" />
                <span class="text-sm font-semibold text-gray-500">Non renseigné</span>
              </div>
            </div>
            <div class="h-12 w-px bg-gray-200 hidden sm:block"></div>
            <div class="text-right hidden sm:block">
              <p class="text-xs text-gray-400 font-medium">Jours présents</p>
              <p class="text-2xl font-bold text-gray-900 mt-0.5">{{ bilanAgent ? bilanAgent.taux_presence : (joursPresents / 20 * 100).toFixed(0) }}<span class="text-sm font-normal text-gray-400"> %</span></p>
            </div>
          </div>
        </div>
      </div>

      <!-- Alerte non-éligibilité -->
      <div v-if="!fiche.prime.eligible" class="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
        <AlertTriangle class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <p class="text-sm font-semibold text-red-700">Agent non éligible à la prime ce mois</p>
          <p class="text-sm text-red-600 mt-0.5">{{ fiche.prime.raison }}</p>
        </div>
      </div>

      <!-- 4 axes de performance -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Axe 1: Tonnage (50%) -->
        <div class="bg-white rounded-xl border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Truck class="w-5 h-5 text-emerald-600" />
              </div>
              <h3 class="text-sm font-semibold text-gray-900">Tonnage</h3>
            </div>
            <span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">50%</span>
          </div>
          <p class="text-3xl font-bold tracking-tight" :class="scoreColor(fiche.scores.tonnage)">{{ fiche.scores.tonnage }}%</p>
          <p class="text-xs text-gray-500 mt-1">{{ evalData.tonnage }} t / {{ evalData.rotations }} rot. ({{ evalData.typeVehicule }})</p>
          <div class="mt-3 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all" :class="scoreBarColor(fiche.scores.tonnage)" :style="{ width: fiche.scores.tonnage + '%' }"></div>
          </div>
          <p class="text-xs text-gray-400 mt-2">Pondéré: <span class="font-semibold text-gray-600">{{ fiche.details.tonnagePondere }} pts</span></p>
        </div>

        <!-- Axe 2: Bouclage (25%) -->
        <div class="bg-white rounded-xl border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <MapPin class="w-5 h-5 text-blue-600" />
              </div>
              <h3 class="text-sm font-semibold text-gray-900">Bouclage</h3>
            </div>
            <span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">25%</span>
          </div>
          <p class="text-3xl font-bold tracking-tight" :class="scoreColor(fiche.scores.bouclage)">{{ fiche.scores.bouclage.toFixed(0) }}%</p>
          <p class="text-xs text-gray-500 mt-1">{{ evalData.bouclages.length }} circuit(s) évalué(s)</p>
          <div class="mt-3 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all" :class="scoreBarColor(fiche.scores.bouclage)" :style="{ width: fiche.scores.bouclage + '%' }"></div>
          </div>
          <p class="text-xs text-gray-400 mt-2">Pondéré: <span class="font-semibold text-gray-600">{{ fiche.details.bouclagePondere }} pts</span></p>
        </div>

        <!-- Axe 3: Entretien (15%) -->
        <div class="bg-white rounded-xl border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <Wrench class="w-5 h-5 text-amber-600" />
              </div>
              <h3 class="text-sm font-semibold text-gray-900">Entretien</h3>
            </div>
            <span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">15%</span>
          </div>
          <p class="text-3xl font-bold tracking-tight" :class="scoreColor(fiche.scores.entretien)">{{ fiche.scores.entretien.toFixed(0) }}%</p>
          <p class="text-xs text-gray-500 mt-1">{{ evalData.noteEntretien !== null ? evalData.noteEntretien + '/10' : 'N/A (Ripeur)' }}</p>
          <div class="mt-3 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all" :class="scoreBarColor(fiche.scores.entretien)" :style="{ width: fiche.scores.entretien + '%' }"></div>
          </div>
          <p class="text-xs text-gray-400 mt-2">Pondéré: <span class="font-semibold text-gray-600">{{ fiche.details.entretienPondere }} pts</span></p>
        </div>

        <!-- Axe 4: QHSE (10%) -->
        <div class="bg-white rounded-xl border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                <ShieldCheck class="w-5 h-5 text-purple-600" />
              </div>
              <h3 class="text-sm font-semibold text-gray-900">Sécurité</h3>
            </div>
            <span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">10%</span>
          </div>
          <p class="text-3xl font-bold tracking-tight" :class="scoreColor(fiche.scores.qhse)">{{ fiche.scores.qhse.toFixed(0) }}%</p>
          <div class="space-y-0.5 mt-1">
            <p class="text-xs text-gray-500">Alcootest: <span :class="evalData.qhse.alcootestPositif ? 'text-red-600 font-bold' : 'text-emerald-600 font-medium'">{{ evalData.qhse.alcootestPositif ? 'POSITIF' : 'Négatif' }}</span></p>
            <p class="text-xs text-gray-500">Checklist: {{ evalData.qhse.checklistSur5 }}/5</p>
            <p class="text-xs text-gray-500">EPI: <span :class="evalData.qhse.epiConforme ? 'text-emerald-600' : 'text-red-500'">{{ evalData.qhse.epiConforme ? 'Conforme' : 'Non conforme' }}</span></p>
          </div>
          <div class="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all" :class="scoreBarColor(fiche.scores.qhse)" :style="{ width: fiche.scores.qhse + '%' }"></div>
          </div>
          <p class="text-xs text-gray-400 mt-2">Pondéré: <span class="font-semibold text-gray-600">{{ fiche.details.qhsePondere }} pts</span></p>
        </div>
      </div>

      <!-- Score global + Décomposition -->
      <div class="bg-white rounded-xl border border-gray-100 p-6">
        <h3 class="text-sm font-semibold text-gray-900 mb-4">Décomposition du score global</h3>
        <div class="flex items-center gap-6">
          <!-- Barres empilées -->
          <div class="flex-1 space-y-2">
            <div class="flex items-center gap-3">
              <span class="w-20 text-xs text-gray-500 text-right">Tonnage</span>
              <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500 rounded-full" :style="{ width: (fiche.scores.tonnage * 50 / 100) + '%' }"></div>
              </div>
              <span class="w-16 text-xs font-semibold text-gray-700 text-right">{{ fiche.details.tonnagePondere }}/50</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-20 text-xs text-gray-500 text-right">Bouclage</span>
              <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-blue-500 rounded-full" :style="{ width: (fiche.scores.bouclage * 25 / 100) + '%' }"></div>
              </div>
              <span class="w-16 text-xs font-semibold text-gray-700 text-right">{{ fiche.details.bouclagePondere }}/25</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-20 text-xs text-gray-500 text-right">Entretien</span>
              <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-amber-500 rounded-full" :style="{ width: (fiche.scores.entretien * 15 / 100) + '%' }"></div>
              </div>
              <span class="w-16 text-xs font-semibold text-gray-700 text-right">{{ fiche.details.entretienPondere }}/15</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-20 text-xs text-gray-500 text-right">Sécurité</span>
              <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-purple-500 rounded-full" :style="{ width: (fiche.scores.qhse * 10 / 100) + '%' }"></div>
              </div>
              <span class="w-16 text-xs font-semibold text-gray-700 text-right">{{ fiche.details.qhsePondere }}/10</span>
            </div>
          </div>

          <!-- Score global -->
          <div class="text-center px-6 border-l border-gray-200">
            <p class="text-xs text-gray-400 font-medium mb-1">Score Global</p>
            <p class="text-4xl font-bold tracking-tight" :class="scoreColor(fiche.scoreGlobal)">{{ fiche.scoreGlobal.toFixed(1) }}%</p>
            <p v-if="fiche.scoreGlobal < primesStore.config.seuilMinPrime" class="text-xs text-red-500 font-semibold mt-1">Sous le seuil de {{ primesStore.config.seuilMinPrime }}%</p>
          </div>
        </div>
      </div>

      <!-- Prime finale — dégression par pénalités -->
      <div
        class="rounded-xl p-6 text-white"
        :class="fiche.prime.eligible ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-gray-500 to-gray-600'"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <TrendingUp class="w-6 h-6 opacity-60" />
            <div>
              <h3 class="text-lg font-bold">Prime de Performance — Reste à payer</h3>
              <p class="text-sm opacity-80">
                {{ selectedAgent.nom }} ({{ selectedAgent.matricule }})
                <span v-if="fiche.equipe" class="ml-1 opacity-70">· {{ fiche.equipe === 'NUIT' ? '🌙 Nuit' : '☀️ Jour' }}</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="text-4xl font-bold tracking-tight">{{ fiche.prime.montant.toLocaleString('fr-FR') }} <span class="text-lg">XAF</span></p>
              <p v-if="!fiche.prime.eligible" class="text-sm opacity-80 mt-0.5">{{ fiche.prime.raison }}</p>
              <p v-if="fiche.prorata" class="text-sm opacity-80 mt-0.5">Prorata presence ({{ fiche.tauxPresence || (fiche.joursPresent / 20 * 100).toFixed(0) }}%)</p>
            </div>
            <button
              @click="exporterPdfAgent"
              class="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
              title="Exporter PDF"
            >
              <Download class="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <!-- Détail dégression -->
        <div v-if="fiche.penalites" class="mt-4 pt-4 border-t border-white/20">
          <div class="flex flex-wrap gap-4 text-sm">
            <div>
              <p class="text-xs opacity-60">Plafond</p>
              <p class="font-bold font-mono">{{ (fiche.plafond || 50000).toLocaleString() }} F</p>
            </div>
            <div class="text-center">
              <p class="text-xs opacity-60">−</p>
              <p class="text-lg opacity-60">−</p>
            </div>
            <div>
              <p class="text-xs opacity-60">Pénalités cumulées</p>
              <p class="font-bold font-mono text-red-200">{{ fiche.penalites.total.toLocaleString() }} F</p>
            </div>
            <div class="text-center">
              <p class="text-xs opacity-60">=</p>
              <p class="text-lg opacity-60">=</p>
            </div>
            <div>
              <p class="text-xs opacity-60">Reste à payer</p>
              <p class="font-bold font-mono text-lg">{{ fiche.prime.montant.toLocaleString() }} F</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-3 mt-3 text-xs">
            <span class="px-2 py-1 rounded bg-white/10" :class="fiche.penalites.tonnage > 0 ? 'text-red-200' : 'text-emerald-200'">
              Tonnage: {{ fiche.penalites.tonnage > 0 ? '-' + fiche.penalites.tonnage.toLocaleString() + ' F' : '✓' }}
            </span>
            <span class="px-2 py-1 rounded bg-white/10" :class="fiche.penalites.bouclage > 0 ? 'text-red-200' : 'text-emerald-200'">
              Bouclage: {{ fiche.penalites.bouclage > 0 ? '-' + fiche.penalites.bouclage.toLocaleString() + ' F' : '✓' }}
            </span>
            <span class="px-2 py-1 rounded bg-white/10" :class="fiche.penalites.entretien > 0 ? 'text-red-200' : 'text-emerald-200'">
              Entretien: {{ fiche.penalites.entretien > 0 ? '-' + fiche.penalites.entretien.toLocaleString() + ' F' : '✓' }}
            </span>
            <span class="px-2 py-1 rounded bg-white/10" :class="fiche.penalites.qhse > 0 ? 'text-red-200' : 'text-emerald-200'">
              QHSE: {{ fiche.penalites.qhse > 0 ? '-' + fiche.penalites.qhse.toLocaleString() + ' F' : '✓' }}
            </span>
            <span class="px-2 py-1 rounded bg-white/10">
              Presence: {{ fiche.tauxPresence || (( fiche.joursPresent || joursPresents) / 20 * 100).toFixed(0) }}%
            </span>
          </div>
        </div>
      </div>

      <!-- ══ HISTORIQUE JOURNALIER PONT-BASCULE ══ -->
      <div v-if="fiche.detailJours && fiche.detailJours.length > 0" class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-gray-900">Historique journalier — Pont-bascule</h3>
            <p class="text-xs text-gray-500 mt-0.5">
              Periode {{ bilanAgent?.periode || pontBasculeStore.bilan?.periode || '' }}
              · {{ fiche.detailJours.length }} jour(s) travaille(s)
              · {{ fiche.equipe === 'NUIT' ? '🌙 Nuit' : '☀️ Jour' }}
            </p>
          </div>
          <div class="flex items-center gap-3 text-xs">
            <span class="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
              {{ fiche.detailJours.reduce((s, j) => s + j.tonnage_tonnes, 0).toFixed(2) }} t total
            </span>
            <span class="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
              {{ fiche.detailJours.reduce((s, j) => s + j.rotations, 0) }} rotations
            </span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-center px-3 py-2.5 text-xs font-semibold text-gray-500">Jour</th>
                <th class="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Tonnage</th>
                <th class="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Rotations</th>
                <th class="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Moyenne</th>
                <th class="text-center px-3 py-2.5 text-xs font-semibold text-gray-500">Score</th>
                <th class="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Penalite</th>
                <th class="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Destination</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="j in fiche.detailJours" :key="j.jour" class="hover:bg-gray-50/50">
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
                <td class="px-3 py-2 text-xs text-gray-500 truncate max-w-[200px]">{{ j.destination }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs">
                <td class="px-3 py-2.5 text-center text-gray-700">{{ fiche.detailJours.length }} jours</td>
                <td class="px-3 py-2.5 text-right font-mono text-gray-900">
                  {{ fiche.detailJours.reduce((s, j) => s + j.tonnage_tonnes, 0).toFixed(2) }} t
                </td>
                <td class="px-3 py-2.5 text-right font-mono text-gray-700">
                  {{ fiche.detailJours.reduce((s, j) => s + j.rotations, 0) }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono text-gray-700">
                  {{ fiche.detailJours.length > 0 ? (fiche.detailJours.reduce((s, j) => s + j.tonnage_tonnes, 0) / fiche.detailJours.reduce((s, j) => s + j.rotations, 0)).toFixed(1) : '0' }} t/rot
                </td>
                <td class="px-3 py-2.5 text-center">—</td>
                <td class="px-3 py-2.5 text-right font-mono text-red-600">
                  -{{ fiche.penalites.total.toLocaleString() }} F
                </td>
                <td class="px-3 py-2.5"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>

    <!-- Agent sélectionné mais pas de saisies — afficher quand même les données pont-bascule si disponibles -->
    <template v-else-if="selectedAgent && !fiche && bilanAgent">
      <!-- Profil Agent minimal -->
      <div class="bg-white rounded-xl border border-gray-100 p-6">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {{ selectedAgent.nom.charAt(0) }}
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-900">{{ selectedAgent.nom }}</h2>
            <div class="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span class="flex items-center gap-1"><Hash class="w-3.5 h-3.5" /> {{ selectedAgent.matricule }}</span>
              <span class="text-gray-300">|</span>
              <span class="flex items-center gap-1"><User class="w-3.5 h-3.5" /> {{ selectedAgent.role }}</span>
              <span class="text-gray-300">|</span>
              <span>{{ bilanAgent.equipe === 'NUIT' ? '🌙 Nuit' : '☀️ Jour' }}</span>
              <span class="text-gray-300">|</span>
              <span>Presence: {{ bilanAgent.taux_presence }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Historique journalier pont-bascule (sans les axes de sanction) -->
      <div v-if="bilanAgent.detail_jours && bilanAgent.detail_jours.length > 0" class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="text-sm font-bold text-gray-900">Historique journalier — Pont-bascule</h3>
          <p class="text-xs text-gray-500 mt-0.5">{{ bilanAgent.detail_jours.length }} jour(s) travaille(s) · Les services n'ont pas encore saisi les sanctions</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-center px-3 py-2.5 text-xs font-semibold text-gray-500">Jour</th>
                <th class="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Tonnage</th>
                <th class="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Rotations</th>
                <th class="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Moyenne</th>
                <th class="text-center px-3 py-2.5 text-xs font-semibold text-gray-500">Score</th>
                <th class="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Penalite tonnage</th>
                <th class="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Destination</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="j in bilanAgent.detail_jours" :key="j.jour" class="hover:bg-gray-50/50">
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
                <td class="px-3 py-2 text-xs text-gray-500 truncate max-w-[200px]">{{ j.destination }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs">
                <td class="px-3 py-2.5 text-center text-gray-700">{{ bilanAgent.detail_jours.length }} j</td>
                <td class="px-3 py-2.5 text-right font-mono text-gray-900">
                  {{ bilanAgent.detail_jours.reduce((s, j) => s + j.tonnage_tonnes, 0).toFixed(2) }} t
                </td>
                <td class="px-3 py-2.5 text-right font-mono text-gray-700">
                  {{ bilanAgent.detail_jours.reduce((s, j) => s + j.rotations, 0) }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono text-gray-700">—</td>
                <td class="px-3 py-2.5 text-center">—</td>
                <td class="px-3 py-2.5 text-right font-mono text-red-600">
                  -{{ bilanAgent.penalites.total.toLocaleString() }} F
                </td>
                <td class="px-3 py-2.5"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </template>

    <!-- ─── Tournées RH (source Excel d'évaluation) — affiché DÈS qu'on a un agent ─── -->
    <div v-if="selectedAgent && (equipagesRH.length > 0 || anomaliesPrime.length > 0)"
      class="bg-white rounded-xl border border-amber-200 overflow-hidden mt-4">
      <div class="p-4 border-b border-amber-100 bg-amber-50/40 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Truck class="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 class="text-base font-semibold text-gray-900">Tournées RH (source Excel d'évaluation)</h3>
            <p class="text-xs text-gray-500">
              {{ equipagesRH.length }} tournées trouvées
              <span v-if="anomaliesPrime.length > 0" class="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold">
                ⚠ {{ anomaliesPrime.length }} jour(s) avec saisie sans présence Excel
              </span>
            </p>
          </div>
        </div>
      </div>

      <!-- Bilan mensuel Excel -->
      <div v-if="bilanRH.length > 0" class="p-4 border-b border-amber-100 grid grid-cols-2 md:grid-cols-3 gap-3">
        <div v-for="b in bilanRH" :key="b.mois" class="p-3 rounded-xl bg-amber-50 border border-amber-100">
          <p class="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">{{ b.mois }}</p>
          <p class="text-lg font-bold text-gray-900 mt-1">{{ b.tournees }} tournées</p>
          <p class="text-[11px] text-gray-600">
            {{ b.jours_travailles }} jours · {{ b.presences || 0 }} présences · {{ b.absences || 0 }} absences
          </p>
          <p class="text-[11px] text-gray-600">
            {{ (b.tonnage_cumule || 0).toFixed(2) }} t · {{ b.rotations_cumul || 0 }} rotations
          </p>
        </div>
      </div>

      <!-- Anomalies prime -->
      <div v-if="anomaliesPrime.length > 0" class="p-4 border-b border-amber-100 bg-red-50/40">
        <p class="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
          <AlertTriangle class="w-4 h-4" /> Saisies sans présence dans l'équipage RH
        </p>
        <p class="text-xs text-gray-600 mb-3">
          L'agent a été déclaré sur une tournée alors qu'il n'apparaît pas dans l'Excel RH du jour — à vérifier avant paiement.
        </p>
        <div class="overflow-x-auto bg-white rounded-lg border border-red-100">
          <table class="w-full text-xs">
            <thead>
              <tr class="bg-red-50 border-b border-red-100">
                <th class="text-left px-3 py-2 font-semibold text-red-800">Date</th>
                <th class="text-left px-3 py-2 font-semibold text-red-800">N° Parc</th>
                <th class="text-left px-3 py-2 font-semibold text-red-800">Immatriculation</th>
                <th class="text-right px-3 py-2 font-semibold text-red-800">Tonnage saisi</th>
                <th class="text-right px-3 py-2 font-semibold text-red-800">Rotations</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-red-50">
              <tr v-for="(a, i) in anomaliesPrime" :key="i">
                <td class="px-3 py-2 font-mono text-gray-700">{{ a.date.split('-').reverse().join('/') }}</td>
                <td class="px-3 py-2">{{ a.no_parc || '-' }}</td>
                <td class="px-3 py-2 font-mono text-gray-600">{{ a.immatriculation || '-' }}</td>
                <td class="px-3 py-2 text-right font-mono">{{ a.tonnage }} t</td>
                <td class="px-3 py-2 text-right font-mono">{{ a.rotations }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tableau des tournées -->
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="text-left px-3 py-2 font-semibold text-gray-500">Date</th>
              <th class="text-center px-3 py-2 font-semibold text-gray-500">Poste</th>
              <th class="text-center px-3 py-2 font-semibold text-gray-500">Rôle</th>
              <th class="text-left px-3 py-2 font-semibold text-gray-500">Véh / Affect.</th>
              <th class="text-left px-3 py-2 font-semibold text-gray-500 min-w-[280px]">Équipage du jour</th>
              <th class="text-center px-3 py-2 font-semibold text-gray-500">P/A</th>
              <th class="text-right px-3 py-2 font-semibold text-gray-500">Tonnage</th>
              <th class="text-right px-3 py-2 font-semibold text-gray-500">Rot.</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="(e, i) in equipagesRH" :key="i" class="hover:bg-amber-50/30 align-top">
              <td class="px-3 py-2 font-mono text-gray-700 whitespace-nowrap">{{ e.date.split('-').reverse().join('/') }}</td>
              <td class="px-3 py-2 text-center">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  :class="e.poste === 'JOUR' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'">
                  {{ e.poste }}
                </span>
              </td>
              <td class="px-3 py-2 text-center">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  :class="e.role === 'CHAUFFEUR' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'">
                  {{ e.role }}
                </span>
              </td>
              <td class="px-3 py-2 whitespace-nowrap">
                <div class="font-mono font-semibold text-gray-900">N°{{ e.no_parc }}</div>
                <div class="text-[10px] text-gray-500">{{ e.affectation || '-' }}</div>
              </td>
              <td class="px-3 py-2">
                <div class="space-y-1">
                  <!-- Chauffeur -->
                  <div class="flex items-center gap-1.5">
                    <span class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">CH</span>
                    <span :class="['text-xs', e.chauffeur.is_self ? 'font-bold text-amber-800' : 'text-gray-800']">
                      {{ e.chauffeur.nom || '—' }}
                    </span>
                    <span class="font-mono text-[10px] text-gray-400">{{ e.chauffeur.matricule }}</span>
                    <span v-if="e.chauffeur.is_self" class="text-[9px] text-amber-700 font-semibold">(lui-même)</span>
                    <span v-if="!e.chauffeur.rh_ok && e.chauffeur.matricule"
                      class="px-1 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold" title="Hors RH">⚠</span>
                  </div>
                  <!-- Ripeurs -->
                  <div v-for="(r, j) in e.ripeurs" :key="j" class="flex items-center gap-1.5">
                    <span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">R{{ j + 1 }}</span>
                    <span :class="['text-xs', r.is_self ? 'font-bold text-amber-800' : 'text-gray-700']">
                      {{ r.nom || '—' }}
                    </span>
                    <span class="font-mono text-[10px] text-gray-400">{{ r.matricule }}</span>
                    <span v-if="r.is_self" class="text-[9px] text-amber-700 font-semibold">(lui-même)</span>
                    <span v-if="!r.rh_ok"
                      class="px-1 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold" title="Hors RH">⚠</span>
                  </div>
                </div>
              </td>
              <td class="px-3 py-2 text-center">
                <span :class="e.presence ? 'text-green-700 font-bold' : 'text-red-600 font-bold'">
                  {{ e.presence ? 'P' : 'A' }}
                </span>
              </td>
              <td class="px-3 py-2 text-right font-mono whitespace-nowrap">{{ (e.tonnage_excel || 0).toFixed(2) }} t</td>
              <td class="px-3 py-2 text-right font-mono">{{ e.rotations_excel }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Agent sélectionné, aucune donnée pont-bascule -->
    <div v-if="selectedAgent && !fiche && equipagesRH.length === 0 && anomaliesPrime.length === 0" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 mb-4">
        <AlertTriangle class="w-8 h-8 text-amber-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900">Aucune donnee pour cet agent</h3>
      <p class="text-sm text-gray-500 mt-1 max-w-md mx-auto">
        Aucune donnee de performance n'a ete trouvee pour <strong>{{ selectedAgent.nom }}</strong> sur le mois selectionne.
      </p>
    </div>

    <!-- État vide -->
    <div v-else class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-50 mb-4">
        <Search class="w-8 h-8 text-gray-300" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900">Rechercher un agent</h3>
      <p class="text-sm text-gray-500 mt-1 max-w-md mx-auto">
        Saisissez un matricule ou un nom dans la barre de recherche pour consulter les performances et la prime calculée.
      </p>
    </div>
  </div>
</template>
