<script setup>
import { useAuthStore } from '@/stores/auth'
import { useAgentsStore } from '@/stores/agents'
import { usePrimesStore } from '@/stores/primes'
import { useSaisiesStore } from '@/stores/saisies'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  TrendingUp, Truck, MapPin, ShieldCheck, Wrench,
  AlertTriangle, Users, ArrowUpRight, ArrowDownRight, UserPlus, Search, ArrowRight
} from 'lucide-vue-next'
import BaseChart from '@/components/ui/BaseChart.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'

const authStore = useAuthStore()
const agentsStore = useAgentsStore()
const primesStore = usePrimesStore()
const saisiesStore = useSaisiesStore()
const router = useRouter()

// Recherche rapide d'agent depuis le tableau de bord
const searchMatricule = ref('')
function onQuickAgentSelected(agent) {
  if (agent) {
    router.push('/recherche-agent')
  }
}

// Mois en cours au format "YYYY-MM"
const moisCourant = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})

// ── Calcul dynamique des fiches pour tous les agents ──
const agentFiches = computed(() => {
  return agentsStore.agents
    .filter(a => ['CHAUFFEUR', 'EQUIPIER'].includes(a.role))
    .map(agent => {
      const agregation = saisiesStore.getAgregationMensuelle(agent.matricule, moisCourant.value)
      const typeAgent = agent.role === 'EQUIPIER' ? 'RIPEUR_COLLECTE' : 'CHAUFFEUR_COLLECTE'

      const fiche = primesStore.calculerFicheAgent({
        typeVehicule: agregation.typeVehicule,
        typeAgent,
        joursPresents: 28, // TODO: lire depuis les présences
        tonnageMoyen: agregation.tonnageMoyen,
        rotationsMoyennes: agregation.rotationsMoyennes,
        statutsBouclage: agregation.statutsBouclage,
        noteEntretienMoyenne: agregation.noteEntretienMoyenne,
        qhseData: agregation.qhseData,
      })

      return { matricule: agent.matricule, agent, fiche, agregation }
    })
})

const hasSaisies = computed(() => {
  const s = saisiesStore.stats
  return s.nbTonnages > 0 || s.nbBouclages > 0 || s.nbEntretiens > 0 || s.nbQhse > 0
})

// ── Score moyen global ──
const scoreMoyenGlobal = computed(() => {
  const fiches = agentFiches.value
  if (fiches.length === 0) return 0
  return fiches.reduce((acc, f) => acc + f.fiche.scoreGlobal, 0) / fiches.length
})

// ── Scores moyens par axe ──
const avgScoresByAxis = computed(() => {
  const fiches = agentFiches.value
  if (fiches.length === 0) return { tonnage: 0, bouclage: 0, entretien: 0, qhse: 0 }
  const n = fiches.length
  return {
    tonnage: fiches.reduce((s, f) => s + f.fiche.scores.tonnage, 0) / n,
    bouclage: fiches.reduce((s, f) => s + f.fiche.scores.bouclage, 0) / n,
    entretien: fiches.reduce((s, f) => s + f.fiche.scores.entretien, 0) / n,
    qhse: fiches.reduce((s, f) => s + f.fiche.scores.qhse, 0) / n,
  }
})

// ── Distribution des primes ──
const primeDistribution = computed(() => {
  const brackets = { zero: 0, low: 0, high: 0 }
  agentFiches.value.forEach(f => {
    const montant = f.fiche.prime.montant
    if (montant === 0) brackets.zero++
    else if (montant <= 25000) brackets.low++
    else brackets.high++
  })
  return brackets
})

// ── KPIs ──
const nbAgents = computed(() => agentsStore.agents.length)

const budgetEstime = computed(() => {
  return agentFiches.value.reduce((total, f) => total + f.fiche.prime.montant, 0)
})

const budgetFormate = computed(() => {
  const val = budgetEstime.value
  if (val >= 1000000) return (val / 1000000).toFixed(1) + ' M'
  if (val >= 1000) return (val / 1000).toFixed(0) + ' K'
  return val + ''
})

const kpis = computed(() => [
  {
    label: 'Score moyen global',
    value: agentFiches.value.length > 0 ? scoreMoyenGlobal.value.toFixed(1) + ' %' : '—',
    change: agentFiches.value.length + ' agents évalués',
    trend: 'neutral',
    color: 'emerald',
    icon: TrendingUp
  },
  {
    label: 'Saisies Collecte',
    value: saisiesStore.stats.nbTonnages.toString(),
    change: 'tonnages enregistrés',
    trend: 'neutral',
    color: 'blue',
    icon: Truck
  },
  {
    label: 'Bouclages déclarés',
    value: saisiesStore.stats.nbBouclages.toString(),
    change: 'circuits déclarés',
    trend: 'neutral',
    color: 'indigo',
    icon: MapPin
  },
  {
    label: 'Budget primes (est.)',
    value: budgetFormate.value + ' XAF',
    change: nbAgents.value + ' agents',
    trend: 'neutral',
    color: 'amber',
    icon: Users
  }
])

// ── Top agents ──
const topAgents = computed(() => {
  return agentFiches.value
    .filter(f => f.fiche.scoreGlobal > 0)
    .map(f => ({
      name: f.agent.nom,
      score: parseFloat(f.fiche.scoreGlobal.toFixed(1)),
      equipe: f.agregation.typeVehicule + ' - ' + f.agent.zone,
      trend: f.fiche.scoreGlobal >= 70 ? 'up' : 'down',
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
})

// ── Taux de complétion par service ──
const serviceStatus = computed(() => {
  const nbAgentsTerrain = agentsStore.agents.filter(a => ['CHAUFFEUR', 'EQUIPIER'].includes(a.role)).length
  if (nbAgentsTerrain === 0) return []

  const pctCollecte = Math.round((saisiesStore.stats.nbTonnages / Math.max(1, nbAgentsTerrain)) * 100)
  const pctGeo = Math.round((saisiesStore.stats.nbBouclages / Math.max(1, nbAgentsTerrain)) * 100)
  const pctLogistique = Math.round((saisiesStore.stats.nbEntretiens / Math.max(1, nbAgentsTerrain)) * 100)
  const pctQhse = Math.round((saisiesStore.stats.nbQhse / Math.max(1, nbAgentsTerrain)) * 100)

  return [
    { name: 'Collecte', pct: Math.min(100, pctCollecte), icon: Truck, color: 'emerald' },
    { name: 'Géolocalisation', pct: Math.min(100, pctGeo), icon: MapPin, color: 'blue' },
    { name: 'Logistique', pct: Math.min(100, pctLogistique), icon: Wrench, color: 'amber' },
    { name: 'QHSE', pct: Math.min(100, pctQhse), icon: ShieldCheck, color: 'purple' },
  ]
})

// ── Charts ──
const axisChartData = computed(() => ({
  labels: ['Tonnage (50%)', 'Bouclage (25%)', 'Entretien (15%)', 'QHSE (10%)'],
  datasets: [{
    label: 'Score moyen',
    data: [
      parseFloat(avgScoresByAxis.value.tonnage.toFixed(1)),
      parseFloat(avgScoresByAxis.value.bouclage.toFixed(1)),
      parseFloat(avgScoresByAxis.value.entretien.toFixed(1)),
      parseFloat(avgScoresByAxis.value.qhse.toFixed(1)),
    ],
    backgroundColor: [
      'rgba(16, 185, 129, 0.8)',
      'rgba(59, 130, 246, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(139, 92, 246, 0.8)',
    ],
    borderColor: [
      'rgb(16, 185, 129)',
      'rgb(59, 130, 246)',
      'rgb(245, 158, 11)',
      'rgb(139, 92, 246)',
    ],
    borderWidth: 1,
    borderRadius: 6,
    barThickness: 28,
  }],
}))

const axisChartOptions = {
  indexAxis: 'y',
  scales: {
    x: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } },
  },
  plugins: {
    tooltip: { callbacks: { label: (ctx) => ctx.parsed.x.toFixed(1) + ' %' } },
  },
}

const primeChartData = computed(() => ({
  labels: ['0 XAF', '1 - 25 000 XAF', '25 000 - 50 000 XAF'],
  datasets: [{
    data: [primeDistribution.value.zero, primeDistribution.value.low, primeDistribution.value.high],
    backgroundColor: ['rgba(209, 213, 219, 0.8)', 'rgba(52, 211, 153, 0.8)', 'rgba(16, 185, 129, 0.9)'],
    borderColor: ['rgb(209, 213, 219)', 'rgb(52, 211, 153)', 'rgb(16, 185, 129)'],
    borderWidth: 2,
    hoverOffset: 6,
  }],
}))

const primeChartOptions = {
  cutout: '65%',
  plugins: {
    legend: { display: true, position: 'bottom' },
    tooltip: { callbacks: { label: (ctx) => ctx.label + ': ' + ctx.parsed + ' agent(s)' } },
  },
}

function scoreDotClass(score) {
  if (score >= 90) return 'bg-emerald-500'
  if (score >= 75) return 'bg-blue-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          Bonjour, {{ authStore.user?.name }}
        </h1>
        <p class="text-gray-500 text-sm mt-0.5">Aperçu des performances du mois en cours</p>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span class="text-sm font-medium text-gray-700 capitalize">
          {{ new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) }}
        </span>
      </div>
    </div>

    <!-- Recherche rapide agent -->
    <div v-if="nbAgents > 0" class="bg-white rounded-xl border border-gray-100 p-5">
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex items-center gap-3 flex-shrink-0">
          <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Search class="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-900">Recherche rapide</h3>
            <p class="text-xs text-gray-500">Nom ou matricule — tous les agents</p>
          </div>
        </div>
        <div class="flex-1">
          <AgentSearchInput
            v-model="searchMatricule"
            :filter-presents="false"
            label=""
            placeholder="Tapez un nom ou un matricule pour trouver un agent..."
            @agent-selected="onQuickAgentSelected"
          />
        </div>
        <router-link
          to="/recherche-agent"
          class="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors flex-shrink-0"
        >
          Fiche détaillée
          <ArrowRight class="w-4 h-4" />
        </router-link>
      </div>
    </div>

    <!-- État vide: pas d'agents -->
    <div v-if="nbAgents === 0" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 mb-4">
        <UserPlus class="w-8 h-8 text-emerald-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900">Aucun agent enregistré</h3>
      <p class="text-sm text-gray-500 mt-1 max-w-lg mx-auto">
        Pour commencer, allez dans <strong>DAF > Utilisateurs</strong> pour ajouter les agents (chauffeurs, ripeurs).
        Ensuite, chaque service pourra saisir les données de performance.
      </p>
      <router-link
        to="/daf/utilisateurs"
        class="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
      >
        <UserPlus class="w-4 h-4" />
        Ajouter des agents
      </router-link>
    </div>

    <template v-else>
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="kpi in kpis"
          :key="kpi.label"
          class="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200"
        >
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-gray-500 font-medium">{{ kpi.label }}</p>
              <p class="text-3xl font-bold text-gray-900 mt-2 tracking-tight">{{ kpi.value }}</p>
            </div>
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              :class="{
                'bg-emerald-50 text-emerald-600': kpi.color === 'emerald',
                'bg-blue-50 text-blue-600': kpi.color === 'blue',
                'bg-indigo-50 text-indigo-600': kpi.color === 'indigo',
                'bg-amber-50 text-amber-600': kpi.color === 'amber',
              }"
            >
              <component :is="kpi.icon" class="w-5 h-5" />
            </div>
          </div>
          <div class="mt-3 flex items-center gap-1.5">
            <span class="text-xs text-gray-500">{{ kpi.change }}</span>
          </div>
        </div>
      </div>

      <!-- Pas de saisies encore -->
      <div v-if="!hasSaisies" class="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
        <AlertTriangle class="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <p class="text-sm font-semibold text-amber-800">Aucune saisie enregistrée ce mois</p>
          <p class="text-sm text-amber-700 mt-0.5">
            {{ nbAgents }} agents sont enregistrés. Les chefs de service peuvent maintenant saisir les tonnages,
            bouclages, entretiens et checklists QHSE dans leurs modules respectifs.
          </p>
        </div>
      </div>

      <template v-if="hasSaisies">
        <!-- Grid: Top agents + Alerts -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Top agents -->
          <div class="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100">
              <h3 class="text-sm font-semibold text-gray-900">Top agents du mois</h3>
            </div>
            <div v-if="topAgents.length === 0" class="p-8 text-center text-sm text-gray-400">
              Les scores apparaîtront une fois les saisies effectuées.
            </div>
            <div v-else class="divide-y divide-gray-50">
              <div
                v-for="(agent, i) in topAgents"
                :key="agent.name"
                class="flex items-center px-5 py-3 hover:bg-gray-50/50 transition-colors duration-150"
              >
                <span class="w-6 text-xs font-bold text-gray-400">#{{ i + 1 }}</span>
                <div class="flex items-center gap-2 flex-1 min-w-0 ml-3">
                  <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :class="scoreDotClass(agent.score)"></div>
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ agent.name }}</p>
                    <p class="text-xs text-gray-400">{{ agent.equipe }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full"
                      :class="agent.score >= 90 ? 'bg-emerald-500' : agent.score >= 75 ? 'bg-blue-500' : 'bg-amber-500'"
                      :style="{ width: agent.score + '%' }"
                    ></div>
                  </div>
                  <span class="text-sm font-semibold text-gray-900 w-14 text-right">{{ agent.score }} %</span>
                  <ArrowUpRight v-if="agent.trend === 'up'" class="w-3.5 h-3.5 text-emerald-500" />
                  <ArrowDownRight v-else class="w-3.5 h-3.5 text-red-400" />
                </div>
              </div>
            </div>
          </div>

          <!-- Stats saisies -->
          <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100">
              <h3 class="text-sm font-semibold text-gray-900">Résumé des saisies</h3>
            </div>
            <div class="p-5 space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Tonnages</span>
                <span class="text-sm font-bold text-gray-900">{{ saisiesStore.stats.nbTonnages }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Bouclages</span>
                <span class="text-sm font-bold text-gray-900">{{ saisiesStore.stats.nbBouclages }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Entretiens</span>
                <span class="text-sm font-bold text-gray-900">{{ saisiesStore.stats.nbEntretiens }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">QHSE</span>
                <span class="text-sm font-bold text-gray-900">{{ saisiesStore.stats.nbQhse }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Service completion -->
        <div v-if="serviceStatus.length > 0" class="bg-white rounded-xl border border-gray-100 p-5">
          <h3 class="text-sm font-semibold text-gray-900 mb-4">Taux de complétion des saisies par service</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div v-for="svc in serviceStatus" :key="svc.name" class="flex items-center gap-4 p-3 rounded-lg bg-gray-50/50">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                :class="{
                  'bg-emerald-100 text-emerald-600': svc.color === 'emerald',
                  'bg-blue-100 text-blue-600': svc.color === 'blue',
                  'bg-amber-100 text-amber-600': svc.color === 'amber',
                  'bg-purple-100 text-purple-600': svc.color === 'purple',
                }"
              >
                <component :is="svc.icon" class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-sm font-medium text-gray-700">{{ svc.name }}</span>
                  <span class="text-sm font-bold" :class="{
                    'text-emerald-600': svc.pct >= 80,
                    'text-amber-600': svc.pct >= 60 && svc.pct < 80,
                    'text-red-600': svc.pct < 60,
                  }">{{ svc.pct }} %</span>
                </div>
                <div class="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="{
                      'bg-emerald-500': svc.pct >= 80,
                      'bg-amber-500': svc.pct >= 60 && svc.pct < 80,
                      'bg-red-500': svc.pct < 60,
                    }"
                    :style="{ width: svc.pct + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-white rounded-xl border border-gray-100 p-5">
            <h3 class="text-sm font-semibold text-gray-900 mb-4">Performance par axe</h3>
            <BaseChart type="bar" :data="axisChartData" :options="axisChartOptions" />
          </div>
          <div class="bg-white rounded-xl border border-gray-100 p-5">
            <h3 class="text-sm font-semibold text-gray-900 mb-4">Distribution des primes</h3>
            <div class="flex items-center justify-center">
              <div class="w-64">
                <BaseChart type="doughnut" :data="primeChartData" :options="primeChartOptions" />
              </div>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-2 text-center">
              <div class="p-2 rounded-lg bg-gray-50">
                <p class="text-lg font-bold text-gray-400">{{ primeDistribution.zero }}</p>
                <p class="text-[10px] text-gray-500 font-medium">0 XAF</p>
              </div>
              <div class="p-2 rounded-lg bg-emerald-50">
                <p class="text-lg font-bold text-emerald-600">{{ primeDistribution.low }}</p>
                <p class="text-[10px] text-emerald-700 font-medium">1 - 25K</p>
              </div>
              <div class="p-2 rounded-lg bg-emerald-100">
                <p class="text-lg font-bold text-emerald-700">{{ primeDistribution.high }}</p>
                <p class="text-[10px] text-emerald-800 font-medium">25K - 50K</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
