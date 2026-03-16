<script setup>
import { useAuthStore } from '@/stores/auth'
import { computed } from 'vue'
import {
  TrendingUp, TrendingDown, Truck, MapPin, ShieldCheck, Wrench,
  AlertTriangle, Users, ArrowUpRight, ArrowDownRight
} from 'lucide-vue-next'
import BaseChart from '@/components/ui/BaseChart.vue'

const authStore = useAuthStore()

// ── Inline agents data (mirrors agents store) ──
const agents = [
  { id: 1, nom: 'Medza Ondo Scheila', matricule: '2823', role: 'CHAUFFEUR', zone: 'PK8' },
  { id: 2, nom: 'Mamfoumbi Muriella', matricule: '2948', role: 'CHAUFFEUR', zone: 'LIBREVILLE' },
  { id: 3, nom: 'Mbatsi Davy', matricule: '0946', role: 'EQUIPIER', zone: 'OWENDO' },
  { id: 4, nom: 'Maduka Tiburce', matricule: '1495', role: 'GEO', zone: 'SIEGE' },
  { id: 5, nom: 'Mbele Christopher', matricule: '3016', role: 'COLLECTE', zone: 'SIEGE' },
  { id: 6, nom: 'Tsamba Tchewarny', matricule: '0943', role: 'CHAUFFEUR', zone: 'OWENDO' },
  { id: 7, nom: 'Beka Christ', matricule: '2024', role: 'EQUIPIER', zone: 'LIBREVILLE' },
  { id: 8, nom: 'Tengou Joram', matricule: '2768', role: 'CHAUFFEUR', zone: 'LIBREVILLE' },
]

// ── Inline prime calculation engine (mirrors primes store) ──
const ponderations = { tonnage: 50, bouclage: 25, entretien: 15, qhse: 10 }
const primesConfig = {
  seuilMinPrime: 60,
  seuilPresence: 93,
  joursOuvresMois: 30,
  plafonds: {
    CHAUFFEUR_COLLECTE: 50000,
    RIPEUR_COLLECTE: 50000,
    CHAUFFEUR_TRI: 25000,
    RIPEUR_TRI: 25000,
  }
}

function calculerScoreTonnage(typeVehicule, tonnage, rotations) {
  if (!rotations || rotations <= 0) return 0
  const moyenne = tonnage / rotations
  switch (typeVehicule) {
    case 'BOM': return moyenne >= 11 ? 100 : moyenne >= 8 ? 75 : moyenne >= 7 ? 50 : 0
    case 'Plateaux': return tonnage >= 7.5 || rotations >= 4 ? 100 : rotations >= 3 ? 75 : rotations >= 2 ? 50 : 0
    case 'Bennes': return moyenne >= 7 && rotations > 2 ? 100 : moyenne >= 7 && rotations >= 2 ? 50 : 0
    case 'Movi': return rotations > 4 ? 100 : rotations >= 4 ? 50 : 0
    default: return moyenne >= 5 ? 100 : moyenne >= 3 ? 75 : moyenne >= 1 ? 50 : 0
  }
}

function calculerScoreBouclage(statut) {
  return statut === 'VALIDE' ? 100 : statut === 'PARTIEL' ? 50 : 0
}

function calculerScoreEntretien(note) {
  if (note === null || note === undefined || note === 'N/A') return 100
  return (note / 10) * 100
}

function calculerScoreQhse({ checklistSur5 = 5, alcootestPositif = false, epiConforme = true, quartHeureSecurite = true }) {
  if (alcootestPositif) return 0
  let score = (checklistSur5 / 5) * 100
  if (!epiConforme) score = Math.max(0, score - 20)
  if (!quartHeureSecurite) score = Math.max(0, score - 10)
  return Math.min(100, Math.max(0, score))
}

function calculerFicheAgent({ typeVehicule, typeAgent, joursPresents, tonnageMoyen, rotationsMoyennes, statutsBouclage, noteEntretienMoyenne, qhseData }) {
  const scoreTonnage = calculerScoreTonnage(typeVehicule, tonnageMoyen, rotationsMoyennes)
  let scoreBouclage = 100
  if (statutsBouclage.length > 0) {
    scoreBouclage = statutsBouclage.reduce((sum, s) => sum + calculerScoreBouclage(s), 0) / statutsBouclage.length
  }
  const scoreEntretien = calculerScoreEntretien(noteEntretienMoyenne)
  const scoreQhse = calculerScoreQhse(qhseData)
  const scores = { tonnage: scoreTonnage, bouclage: scoreBouclage, entretien: scoreEntretien, qhse: scoreQhse }
  const scoreGlobal = (scores.tonnage * ponderations.tonnage / 100) + (scores.bouclage * ponderations.bouclage / 100) + (scores.entretien * ponderations.entretien / 100) + (scores.qhse * ponderations.qhse / 100)
  const tauxPresence = (joursPresents / primesConfig.joursOuvresMois) * 100
  let prime
  if (tauxPresence < primesConfig.seuilPresence) {
    prime = { montant: 0, eligible: false, raison: 'Presence insuffisante' }
  } else if (scoreGlobal < primesConfig.seuilMinPrime) {
    prime = { montant: 0, eligible: false, raison: 'Score global insuffisant' }
  } else {
    const plafond = primesConfig.plafonds[typeAgent] || primesConfig.plafonds.CHAUFFEUR_COLLECTE
    prime = { montant: Math.round((scoreGlobal / 100) * plafond), eligible: true, raison: null }
  }
  return { scores, scoreGlobal, prime }
}

// ── Mock evaluations (same data as RechercheAgentView) ──
const evaluationsMock = {
  '2823': { typeVehicule: 'BOM', typeAgent: 'CHAUFFEUR_COLLECTE', tonnage: 22, rotations: 2, bouclages: ['VALIDE', 'VALIDE', 'VALIDE'], noteEntretien: 9.5, qhse: { checklistSur5: 5, alcootestPositif: false, epiConforme: true, quartHeureSecurite: true }, joursPresents: 28 },
  '2948': { typeVehicule: 'Plateaux', typeAgent: 'CHAUFFEUR_COLLECTE', tonnage: 7.5, rotations: 3, bouclages: ['VALIDE', 'PARTIEL', 'VALIDE'], noteEntretien: 6.0, qhse: { checklistSur5: 4, alcootestPositif: true, epiConforme: true, quartHeureSecurite: true }, joursPresents: 28 },
  '0946': { typeVehicule: 'BOM', typeAgent: 'RIPEUR_COLLECTE', tonnage: 16, rotations: 2, bouclages: ['VALIDE', 'VALIDE'], noteEntretien: null, qhse: { checklistSur5: 3.5, alcootestPositif: false, epiConforme: true, quartHeureSecurite: false }, joursPresents: 28 },
  '1495': { typeVehicule: 'Canter', typeAgent: 'CHAUFFEUR_COLLECTE', tonnage: 1.2, rotations: 3, bouclages: ['VALIDE', 'VALIDE', 'VALIDE'], noteEntretien: 7.0, qhse: { checklistSur5: 4, alcootestPositif: false, epiConforme: true, quartHeureSecurite: true }, joursPresents: 28 },
  '3016': { typeVehicule: 'BOM', typeAgent: 'CHAUFFEUR_COLLECTE', tonnage: 14, rotations: 2, bouclages: ['VALIDE', 'VALIDE', 'VALIDE'], noteEntretien: 7.5, qhse: { checklistSur5: 5, alcootestPositif: false, epiConforme: true, quartHeureSecurite: true }, joursPresents: 28 },
  '0943': { typeVehicule: 'Bennes', typeAgent: 'CHAUFFEUR_COLLECTE', tonnage: 15, rotations: 2, bouclages: ['VALIDE', 'VALIDE'], noteEntretien: 6.5, qhse: { checklistSur5: 4, alcootestPositif: false, epiConforme: false, quartHeureSecurite: true }, joursPresents: 28 },
  '2024': { typeVehicule: 'Movi', typeAgent: 'RIPEUR_TRI', tonnage: 10, rotations: 3, bouclages: ['PARTIEL', 'PARTIEL'], noteEntretien: null, qhse: { checklistSur5: 3, alcootestPositif: false, epiConforme: true, quartHeureSecurite: false }, joursPresents: 28 },
  '2768': { typeVehicule: 'BOM', typeAgent: 'CHAUFFEUR_COLLECTE', tonnage: 22, rotations: 2, bouclages: ['VALIDE', 'VALIDE', 'VALIDE'], noteEntretien: 10, qhse: { checklistSur5: 5, alcootestPositif: false, epiConforme: true, quartHeureSecurite: true }, joursPresents: 28 },
}

// ── Compute all agent fiches ──
const agentFiches = computed(() => {
  return Object.entries(evaluationsMock).map(([matricule, eval_]) => {
    const fiche = calculerFicheAgent({
      typeVehicule: eval_.typeVehicule,
      typeAgent: eval_.typeAgent,
      joursPresents: eval_.joursPresents || 28,
      tonnageMoyen: eval_.tonnage,
      rotationsMoyennes: eval_.rotations,
      statutsBouclage: eval_.bouclages,
      noteEntretienMoyenne: eval_.noteEntretien,
      qhseData: eval_.qhse,
    })
    const agent = agents.find(a => a.matricule === matricule)
    return { matricule, agent, fiche, eval: eval_ }
  })
})

// ── Dynamic average score ──
const scoreMoyenGlobal = computed(() => {
  const fiches = agentFiches.value
  if (fiches.length === 0) return 0
  const sum = fiches.reduce((acc, f) => acc + f.fiche.scoreGlobal, 0)
  return sum / fiches.length
})

// ── Average scores per axis ──
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

// ── Prime distribution brackets ──
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

// Budget calculation
const nbAgents = agents.length

const agentTypes = {
  CHAUFFEUR: 'CHAUFFEUR_COLLECTE',
  EQUIPIER: 'RIPEUR_COLLECTE',
  GEO: 'CHAUFFEUR_COLLECTE',
  COLLECTE: 'CHAUFFEUR_COLLECTE',
}

const budgetMax = computed(() => {
  return agents.reduce((total, agent) => {
    const type = agentTypes[agent.role] || 'CHAUFFEUR_COLLECTE'
    return total + (primesConfig.plafonds[type] || 50000)
  }, 0)
})

const budgetFormate = computed(() => {
  const val = budgetMax.value
  if (val >= 1000000) return (val / 1000000).toFixed(1) + ' M'
  return (val / 1000).toFixed(0) + ' K'
})

const kpis = computed(() => [
  {
    label: 'Score moyen global',
    value: scoreMoyenGlobal.value.toFixed(1) + ' %',
    change: '+3.2 %',
    trend: 'up',
    color: 'emerald',
    icon: TrendingUp
  },
  {
    label: 'Saisies Collecte',
    value: '94 %',
    change: '+1.5 %',
    trend: 'up',
    color: 'blue',
    icon: Truck
  },
  {
    label: 'Bouclages valid\u00e9s',
    value: '88 %',
    change: '-2.1 %',
    trend: 'down',
    color: 'indigo',
    icon: MapPin
  },
  {
    label: 'Budget primes (est.)',
    value: budgetFormate.value,
    change: nbAgents + ' agents \u00d7 plafond',
    trend: 'neutral',
    color: 'amber',
    icon: Users
  }
])

// ── Top agents with dynamic scores ──
const topAgents = computed(() => {
  return agentFiches.value
    .filter(f => f.agent)
    .map(f => ({
      name: f.agent.nom,
      score: parseFloat(f.fiche.scoreGlobal.toFixed(1)),
      equipe: f.eval.typeVehicule + ' - ' + f.agent.zone,
      trend: f.fiche.scoreGlobal >= 70 ? 'up' : 'down',
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
})

const alerts = [
  { type: 'danger', text: 'Alcootest positif \u2014 Mamfoumbi Muriella (2948)', time: "Aujourd'hui" },
  { type: 'warning', text: '3 agents sous le seuil 60 % \u2014 \u00c9quipe Bennes-02', time: 'Hier' },
  { type: 'info', text: '12 bouclages en attente de validation GPS', time: 'En cours' },
]

const serviceStatus = [
  { name: 'Collecte', pct: 94, icon: Truck, color: 'emerald' },
  { name: 'G\u00e9olocalisation', pct: 78, icon: MapPin, color: 'blue' },
  { name: 'Logistique', pct: 65, icon: Wrench, color: 'amber' },
  { name: 'QHSE', pct: 82, icon: ShieldCheck, color: 'purple' },
]

// ── Chart: Performance par axe (horizontal bar) ──
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
    x: {
      beginAtZero: true,
      max: 100,
      ticks: { callback: (v) => v + '%' },
    },
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => ctx.parsed.x.toFixed(1) + ' %',
      },
    },
  },
}

// ── Chart: Distribution des primes (doughnut) ──
const primeChartData = computed(() => ({
  labels: ['0 XAF', '1 - 25 000 XAF', '25 000 - 50 000 XAF'],
  datasets: [{
    data: [
      primeDistribution.value.zero,
      primeDistribution.value.low,
      primeDistribution.value.high,
    ],
    backgroundColor: [
      'rgba(209, 213, 219, 0.8)',
      'rgba(52, 211, 153, 0.8)',
      'rgba(16, 185, 129, 0.9)',
    ],
    borderColor: [
      'rgb(209, 213, 219)',
      'rgb(52, 211, 153)',
      'rgb(16, 185, 129)',
    ],
    borderWidth: 2,
    hoverOffset: 6,
  }],
}))

const primeChartOptions = {
  cutout: '65%',
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
    },
    tooltip: {
      callbacks: {
        label: (ctx) => ctx.label + ': ' + ctx.parsed + ' agent(s)',
      },
    },
  },
}

// ── Chart: Evolution mensuelle (line) ──
const monthlyChartData = computed(() => ({
  labels: ['Oct', 'Nov', 'D\u00e9c', 'Jan', 'F\u00e9v', 'Mar'],
  datasets: [{
    label: 'Score moyen',
    data: [71.2, 74.8, 76.5, 78.1, 80.3, parseFloat(scoreMoyenGlobal.value.toFixed(1))],
    borderColor: 'rgb(16, 185, 129)',
    backgroundColor: (ctx) => {
      const chart = ctx.chart
      if (!chart.chartArea) return 'rgba(16, 185, 129, 0.1)'
      const { ctx: c, chartArea: { top, bottom } } = chart
      const gradient = c.createLinearGradient(0, top, 0, bottom)
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)')
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)')
      return gradient
    },
    fill: true,
    tension: 0.4,
    pointBackgroundColor: 'rgb(16, 185, 129)',
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
    pointRadius: 5,
    pointHoverRadius: 7,
  }],
}))

const monthlyChartOptions = {
  scales: {
    y: {
      beginAtZero: false,
      min: 60,
      max: 100,
      ticks: { callback: (v) => v + '%' },
    },
  },
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => 'Score: ' + ctx.parsed.y.toFixed(1) + ' %',
      },
    },
  },
}

// ── Helper: score dot color ──
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
        <p class="text-gray-500 text-sm mt-0.5">Aper&ccedil;u des performances du mois en cours</p>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span class="text-sm font-medium text-gray-700 capitalize">
          {{ new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) }}
        </span>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="kpi in kpis"
        :key="kpi.label"
        class="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 cursor-pointer transition-all duration-200"
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
          <ArrowUpRight v-if="kpi.trend === 'up'" class="w-3.5 h-3.5 text-emerald-600" />
          <ArrowDownRight v-else-if="kpi.trend === 'down'" class="w-3.5 h-3.5 text-red-500" />
          <span
            class="text-xs font-semibold"
            :class="{
              'text-emerald-600': kpi.trend === 'up',
              'text-red-500': kpi.trend === 'down',
              'text-gray-500': kpi.trend === 'neutral',
            }"
          >{{ kpi.change }}</span>
          <span v-if="kpi.trend !== 'neutral'" class="text-xs text-gray-400">vs mois dernier</span>
        </div>
      </div>
    </div>

    <!-- Grid: Top agents + Alerts -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Top agents -->
      <div class="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="text-sm font-semibold text-gray-900">Top 5 agents du mois</h3>
        </div>
        <div class="divide-y divide-gray-50">
          <div
            v-for="(agent, i) in topAgents"
            :key="agent.name"
            class="flex items-center px-5 py-3 hover:bg-gray-50/50 transition-colors duration-150"
          >
            <span class="w-6 text-xs font-bold text-gray-400">#{{ i + 1 }}</span>
            <div class="flex items-center gap-2 flex-1 min-w-0 ml-3">
              <div
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                :class="scoreDotClass(agent.score)"
              ></div>
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

      <!-- Alerts -->
      <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle class="w-4 h-4 text-amber-500" />
            Alertes
          </h3>
        </div>
        <div class="divide-y divide-gray-50">
          <div
            v-for="alert in alerts"
            :key="alert.text"
            class="px-5 py-3"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                :class="{
                  'bg-red-500': alert.type === 'danger',
                  'bg-amber-500': alert.type === 'warning',
                  'bg-blue-500': alert.type === 'info',
                }"
              ></div>
              <div>
                <p class="text-sm text-gray-700 leading-snug">{{ alert.text }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ alert.time }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Service completion -->
    <div class="bg-white rounded-xl border border-gray-100 p-5">
      <h3 class="text-sm font-semibold text-gray-900 mb-4">Taux de compl&eacute;tion des saisies par service</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="svc in serviceStatus"
          :key="svc.name"
          class="flex items-center gap-4 p-3 rounded-lg bg-gray-50/50"
        >
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

    <!-- Charts row: Performance par axe + Distribution primes -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Performance par axe -->
      <div class="bg-white rounded-xl border border-gray-100 p-5">
        <h3 class="text-sm font-semibold text-gray-900 mb-4">Performance par axe</h3>
        <BaseChart
          type="bar"
          :data="axisChartData"
          :options="axisChartOptions"
        />
      </div>

      <!-- Distribution des primes -->
      <div class="bg-white rounded-xl border border-gray-100 p-5">
        <h3 class="text-sm font-semibold text-gray-900 mb-4">Distribution des primes</h3>
        <div class="flex items-center justify-center">
          <div class="w-64">
            <BaseChart
              type="doughnut"
              :data="primeChartData"
              :options="primeChartOptions"
            />
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

    <!-- Monthly evolution chart -->
    <div class="bg-white rounded-xl border border-gray-100 p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-gray-900">&Eacute;volution mensuelle du score moyen</h3>
        <span class="text-xs text-gray-400 font-medium">6 derniers mois</span>
      </div>
      <BaseChart
        type="line"
        :data="monthlyChartData"
        :options="monthlyChartOptions"
      />
    </div>
  </div>
</template>
