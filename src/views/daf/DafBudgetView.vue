<script setup>
import { ref, computed, watch } from 'vue'
import { Landmark, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import { usePontBasculeStore } from '@/stores/pontBascule'
import { usePrimesStore } from '@/stores/primes'

const pontBasculeStore = usePontBasculeStore()
const primesStore = usePrimesStore()

const moisSelectionne = ref(new Date().toISOString().slice(0, 7))

watch(moisSelectionne, (mois) => pontBasculeStore.chargerBilan(mois), { immediate: true })

const stats = computed(() => pontBasculeStore.stats)
const chauffeurs = computed(() => pontBasculeStore.chauffeurs)

// Budget par service — calculé depuis les données réelles
const budgetsParService = computed(() => {
  if (!stats.value) return []
  const s = stats.value
  const plafondCollecte = primesStore.config.plafonds.CHAUFFEUR_COLLECTE
  const plafondTri = primesStore.config.plafonds.CHAUFFEUR_TRI

  return [
    {
      id: 'collecte',
      nom: 'Service Collecte',
      description: 'Tonnage, bouclage circuits, chauffeurs & ripeurs',
      couleur: 'emerald',
      nbAgents: s.nbChauffeurs,
      nbEligibles: s.nbEligibles,
      totalPrimesCalculees: s.totalPrime,
      budgetAlloue: s.nbChauffeurs * plafondCollecte,
      penalites: s.totalPenalites,
    },
    {
      id: 'tri',
      nom: 'Service TRI',
      description: 'Collecte sélective, pesée recyclage',
      couleur: 'purple',
      nbAgents: 0,
      nbEligibles: 0,
      totalPrimesCalculees: 0,
      budgetAlloue: 0,
      penalites: 0,
    },
  ]
})

const totalPrimes = computed(() =>
  budgetsParService.value.reduce((sum, s) => sum + s.totalPrimesCalculees, 0)
)
const totalBudget = computed(() =>
  budgetsParService.value.reduce((sum, s) => sum + s.budgetAlloue, 0)
)
const totalAgents = computed(() =>
  budgetsParService.value.reduce((sum, s) => sum + s.nbAgents, 0)
)
const totalEligibles = computed(() =>
  budgetsParService.value.reduce((sum, s) => sum + s.nbEligibles, 0)
)
const ecartBudget = computed(() => totalBudget.value - totalPrimes.value)
const pourcentageUtilisation = computed(() =>
  totalBudget.value > 0 ? ((totalPrimes.value / totalBudget.value) * 100).toFixed(1) : 0
)
const totalPenalites = computed(() => stats.value?.totalPenalites || 0)

const chartData = computed(() => ({
  labels: budgetsParService.value.map(s => s.nom.replace('Service ', '')),
  datasets: [
    {
      label: 'Budget alloué (XAF)',
      data: budgetsParService.value.map(s => s.budgetAlloue),
      backgroundColor: 'rgba(156, 163, 175, 0.3)',
      borderColor: 'rgb(156, 163, 175)',
      borderWidth: 2,
    },
    {
      label: 'Primes à décaisser (XAF)',
      data: budgetsParService.value.map(s => s.totalPrimesCalculees),
      backgroundColor: 'rgba(16, 185, 129, 0.3)',
      borderColor: 'rgb(16, 185, 129)',
      borderWidth: 2,
    },
  ]
}))

const chartOptions = {
  responsive: true,
  plugins: { legend: { position: 'top' } },
  scales: {
    y: { beginAtZero: true, ticks: { callback: (v) => v.toLocaleString('fr-FR') + ' XAF' } }
  }
}

function formatXAF(montant) { return montant.toLocaleString('fr-FR') }

function getCouleurClasses(couleur, type = 'bg') {
  const map = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  }
  return map[couleur]?.[type] || ''
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Vue Budgetaire Globale</h1>
        <p class="text-sm text-gray-500 mt-1">DAF — Donnees reelles pont-bascule</p>
      </div>
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-gray-600">Periode :</label>
        <input
          type="month"
          v-model="moisSelectionne"
          class="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
        />
      </div>
    </div>

    <!-- Chargement -->
    <div v-if="pontBasculeStore.loading" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <p class="text-sm text-gray-500">Chargement du bilan pont-bascule...</p>
    </div>

    <template v-else-if="stats">
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BaseCard class="!p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-500">Budget Total</span>
            <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <Landmark class="w-4 h-4 text-gray-600" />
            </div>
          </div>
          <p class="text-2xl font-bold text-gray-900">{{ formatXAF(totalBudget) }} <span class="text-sm font-normal text-gray-500">XAF</span></p>
          <p class="text-xs text-gray-400 mt-1">{{ totalAgents }} agents x {{ formatXAF(stats.plafond) }} F</p>
        </BaseCard>

        <BaseCard class="!p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-500">Reste a Decaisser</span>
            <div class="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp class="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p class="text-2xl font-bold text-emerald-600">{{ formatXAF(totalPrimes) }} <span class="text-sm font-normal text-gray-500">XAF</span></p>
          <p class="text-xs text-gray-400 mt-1">{{ pourcentageUtilisation }}% du budget</p>
        </BaseCard>

        <BaseCard class="!p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-500">Penalites cumulees</span>
            <div class="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingDown class="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p class="text-2xl font-bold text-red-600">-{{ formatXAF(totalPenalites) }} <span class="text-sm font-normal text-gray-500">XAF</span></p>
          <p class="text-xs text-gray-400 mt-1">Economies sur le budget</p>
        </BaseCard>

        <BaseCard class="!p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-500">Agents Eligibles</span>
            <div class="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <CheckCircle class="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p class="text-2xl font-bold text-gray-900">{{ totalEligibles }} <span class="text-sm font-normal text-gray-500">/ {{ totalAgents }}</span></p>
          <p class="text-xs text-gray-400 mt-1">{{ stats.nbNuit }} nuit / {{ stats.nbJour }} jour · {{ stats.nbProrata }} en prorata</p>
        </BaseCard>
      </div>

      <!-- Graphique -->
      <BaseCard title="Budget vs Primes a decaisser">
        <BaseChart type="bar" :data="chartData" :options="chartOptions" class="h-72" />
      </BaseCard>

      <!-- Top 10 chauffeurs -->
      <BaseCard>
        <template #header>
          <h3 class="text-sm font-semibold text-gray-900">Top 10 — Primes les plus elevees</h3>
        </template>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-3 py-2 text-xs font-semibold text-gray-500">#</th>
                <th class="text-left px-3 py-2 text-xs font-semibold text-gray-500">Mat.</th>
                <th class="text-left px-3 py-2 text-xs font-semibold text-gray-500">Chauffeur</th>
                <th class="text-center px-3 py-2 text-xs font-semibold text-gray-500">Equipe</th>
                <th class="text-center px-3 py-2 text-xs font-semibold text-gray-500">Presence</th>
                <th class="text-right px-3 py-2 text-xs font-semibold text-gray-500">Penalites</th>
                <th class="text-right px-3 py-2 text-xs font-semibold text-gray-500">Prime</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="(c, i) in chauffeurs.slice(0, 10)" :key="c.code_transporteur">
                <td class="px-3 py-2 text-gray-400 font-mono">{{ i + 1 }}</td>
                <td class="px-3 py-2 font-mono text-xs text-gray-500">{{ c.code_transporteur }}</td>
                <td class="px-3 py-2 text-gray-900">{{ c.chauffeur }}</td>
                <td class="px-3 py-2 text-center">
                  <span class="text-xs" :class="c.equipe === 'NUIT' ? 'text-indigo-600' : 'text-amber-600'">
                    {{ c.equipe === 'NUIT' ? '🌙' : '☀️' }}
                  </span>
                </td>
                <td class="px-3 py-2 text-center font-mono text-xs">{{ c.jours_present }}j</td>
                <td class="px-3 py-2 text-right font-mono text-xs text-red-600">-{{ c.penalites.total.toLocaleString() }} F</td>
                <td class="px-3 py-2 text-right font-mono font-bold" :class="c.prime_finale > 0 ? 'text-emerald-700' : 'text-gray-400'">
                  {{ c.prime_finale.toLocaleString() }} F
                  <span v-if="c.prorata" class="text-[9px] text-amber-500 font-normal ml-1">prorata</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 justify-end">
        <BaseButton @click="$router.push('/daf/validation')" variant="outline">
          Voir la validation detaillee <ArrowRight class="w-4 h-4 ml-2" />
        </BaseButton>
        <BaseButton @click="$router.push('/daf/rapports')" variant="primary">
          Exporter les rapports <ArrowRight class="w-4 h-4 ml-2" />
        </BaseButton>
      </div>
    </template>
  </div>
</template>
