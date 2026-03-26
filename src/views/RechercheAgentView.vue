<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Calendar, User, Hash, MapPin, Truck, ShieldCheck, Wrench, TrendingUp, CheckCircle, XCircle, Clock, AlertTriangle, ArrowDown, Download, Zap } from 'lucide-vue-next'
import { generateFicheAgentPdf } from '@/utils/generatePdf'
import { formatDateFr } from '@/utils/formatDate'
import { useAgentsStore } from '@/stores/agents'
import { usePrimesStore } from '@/stores/primes'
import { usePontBasculeStore } from '@/stores/pontBascule'
import { useSaisiesStore } from '@/stores/saisies'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'

const agentsStore = useAgentsStore()
const primesStore = usePrimesStore()
const pontBasculeStore = usePontBasculeStore()
const saisiesStore = useSaisiesStore()

const selectedMatricule = ref('')
const selectedDate = ref(new Date().toISOString().split('T')[0])
const selectedAgent = ref(null)

function onAgentSelected(agent) {
  selectedAgent.value = agent
}

// Mois sélectionné
const moisSelectionne = computed(() => {
  if (!selectedDate.value) return ''
  return selectedDate.value.substring(0, 7)
})

// Charger le bilan quand le mois change
watch(moisSelectionne, (mois) => {
  if (mois) pontBasculeStore.chargerBilan(mois)
}, { immediate: true })

// Bilan pont-bascule pour l'agent sélectionné (par nom)
const bilanAgent = computed(() => {
  if (!selectedAgent.value) return null
  return pontBasculeStore.getBilanParNom(selectedAgent.value.nom)
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
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Recherche Agent</h1>
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
          <input
            v-model="selectedDate"
            type="date"
            class="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors duration-200"
          />
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
              <p class="text-2xl font-bold text-gray-900 mt-0.5">{{ joursPresents }}<span class="text-sm font-normal text-gray-400">/30</span></p>
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
              <p v-if="fiche.prorata" class="text-sm opacity-80 mt-0.5">Prorata présence ({{ fiche.joursPresent }}j/30)</p>
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
              Présence: {{ fiche.joursPresent || joursPresents }}j/30
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- Agent sélectionné mais pas de saisies -->
    <div v-else-if="selectedAgent && !fiche" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 mb-4">
        <AlertTriangle class="w-8 h-8 text-amber-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900">Aucune saisie pour cet agent</h3>
      <p class="text-sm text-gray-500 mt-1 max-w-md mx-auto">
        Aucune donnée de performance n'a été saisie pour <strong>{{ selectedAgent.nom }}</strong> sur le mois sélectionné.
        Les services doivent d'abord saisir le tonnage, bouclage, entretien et QHSE.
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
