<script setup>
import { ref, computed, watch } from 'vue'
import { Landmark, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ArrowRight, Search, Download } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import { usePontBasculeStore } from '@/stores/pontBascule'
import { usePrimesStore } from '@/stores/primes'

const pontBasculeStore = usePontBasculeStore()
const primesStore = usePrimesStore()

const moisSelectionne = ref(new Date().toISOString().slice(0, 7))
const searchQuery = ref('')
const filtreDirection = ref('TOUS')

watch(moisSelectionne, (mois) => {
  pontBasculeStore.chargerBilan(mois)
}, { immediate: true })

// Forcer le rechargement quand le mois change
function recharger() {
  pontBasculeStore.moisCharge = ''
  pontBasculeStore.chargerBilan(moisSelectionne.value)
}

const stats = computed(() => pontBasculeStore.stats)
const chauffeurs = computed(() => pontBasculeStore.chauffeurs)

// Directions disponibles
const directions = computed(() => {
  const dirs = new Set(chauffeurs.value.map(c => c.direction || 'Non rattache'))
  return ['TOUS', ...Array.from(dirs).sort()]
})

// Filtre combiné recherche + direction
const chauffeursFiltres = computed(() => {
  let list = chauffeurs.value

  if (filtreDirection.value !== 'TOUS') {
    list = list.filter(c => (c.direction || 'Non rattache') === filtreDirection.value)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c =>
      c.chauffeur.toLowerCase().includes(q) ||
      c.code_transporteur.toString().includes(q) ||
      (c.direction || '').toLowerCase().includes(q)
    )
  }

  return list
})

// Totaux sur les chauffeurs filtrés
const plafond = computed(() => primesStore.config.plafonds.CHAUFFEUR_COLLECTE)
const totalBudget = computed(() => chauffeursFiltres.value.length * plafond.value)
const totalPenalites = computed(() => chauffeursFiltres.value.reduce((s, c) => s + c.penalites.total, 0))
const totalPrimes = computed(() => chauffeursFiltres.value.reduce((s, c) => s + c.prime_finale, 0))
const nbEligibles = computed(() => chauffeursFiltres.value.filter(c => c.prime_finale > 0).length)

function formatXAF(montant) { return montant.toLocaleString('fr-FR') }

function nomDirection(code) {
  const dirs = {
    'DT': 'Direction Technique',
    'DQHSE': 'Direction QHSE',
  }
  return dirs[code] || code || 'Non rattache'
}

function primeColor(prime, plafond) {
  const pct = plafond > 0 ? (prime / plafond) * 100 : 0
  if (pct >= 50) return 'text-emerald-700'
  if (pct >= 25) return 'text-amber-700'
  if (pct > 0) return 'text-red-600'
  return 'text-gray-400'
}

// Graphique par direction
const chartData = computed(() => {
  const dirs = {}
  chauffeurs.value.forEach(c => {
    const dir = c.direction || 'Non rattache'
    if (!dirs[dir]) dirs[dir] = { budget: 0, primes: 0, penalites: 0, nb: 0 }
    dirs[dir].budget += plafond.value
    dirs[dir].primes += c.prime_finale
    dirs[dir].penalites += c.penalites.total
    dirs[dir].nb++
  })
  const labels = Object.keys(dirs)
  return {
    labels: labels.map(d => `${nomDirection(d)} (${dirs[d].nb})`),
    datasets: [
      {
        label: 'Budget (plafond)',
        data: labels.map(d => dirs[d].budget),
        backgroundColor: 'rgba(156, 163, 175, 0.3)',
        borderColor: 'rgb(156, 163, 175)',
        borderWidth: 2,
      },
      {
        label: 'Reste a decaisser',
        data: labels.map(d => dirs[d].primes),
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
      },
      {
        label: 'Penalites',
        data: labels.map(d => dirs[d].penalites),
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
      },
    ]
  }
})

const chartOptions = {
  responsive: true,
  plugins: { legend: { position: 'top' } },
  scales: { y: { beginAtZero: true, ticks: { callback: v => (v / 1000).toFixed(0) + 'K' } } }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Vue Budgetaire — Primes de Performance</h1>
        <p class="text-sm text-gray-500 mt-1">
          DAF — Plafond, sanctions et reste a decaisser par agent
          <span v-if="pontBasculeStore.bilan?.periode" class="ml-2 text-emerald-600 font-medium">
            | Periode : {{ pontBasculeStore.bilan.periode }}
          </span>
        </p>
      </div>
      <div class="flex items-center gap-3">
        <input
          type="month"
          v-model="moisSelectionne"
          class="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
        />
        <button @click="recharger" class="px-3 py-2 text-xs font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition cursor-pointer">
          Actualiser
        </button>
      </div>
    </div>

    <div v-if="pontBasculeStore.loading" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <p class="text-sm text-gray-500">Chargement du bilan pont-bascule...</p>
    </div>

    <template v-else-if="stats">
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BaseCard class="!p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-500">Budget Total (plafond)</span>
            <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <Landmark class="w-4 h-4 text-gray-600" />
            </div>
          </div>
          <p class="text-2xl font-bold text-gray-900">{{ formatXAF(chauffeurs.length * plafond) }} <span class="text-sm font-normal text-gray-500">XAF</span></p>
          <p class="text-xs text-gray-400 mt-1">{{ chauffeurs.length }} agents x {{ formatXAF(plafond) }} F</p>
        </BaseCard>

        <BaseCard class="!p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-500">Penalites cumulees</span>
            <div class="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingDown class="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p class="text-2xl font-bold text-red-600">-{{ formatXAF(stats.totalPenalites) }} <span class="text-sm font-normal text-gray-500">XAF</span></p>
          <p class="text-xs text-gray-400 mt-1">Deductions sur {{ chauffeurs.length }} agents</p>
        </BaseCard>

        <BaseCard class="!p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-500">Reste a Decaisser</span>
            <div class="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp class="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p class="text-2xl font-bold text-emerald-600">{{ formatXAF(stats.totalPrime) }} <span class="text-sm font-normal text-gray-500">XAF</span></p>
          <p class="text-xs text-gray-400 mt-1">{{ stats.nbEligibles }} eligibles · {{ stats.nbProrata }} en prorata</p>
        </BaseCard>

        <BaseCard class="!p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-500">Economies realisees</span>
            <div class="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <CheckCircle class="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p class="text-2xl font-bold text-blue-600">{{ formatXAF(chauffeurs.length * plafond - stats.totalPrime) }} <span class="text-sm font-normal text-gray-500">XAF</span></p>
          <p class="text-xs text-gray-400 mt-1">{{ ((1 - stats.totalPrime / (chauffeurs.length * plafond)) * 100).toFixed(1) }}% du budget economise</p>
        </BaseCard>
      </div>

      <!-- Graphique par direction -->
      <BaseCard title="Budget vs Primes par Direction">
        <BaseChart type="bar" :data="chartData" :options="chartOptions" class="h-72" />
      </BaseCard>

      <!-- Filtres + Tableau détaillé -->
      <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <!-- Filtres -->
        <div class="p-4 border-b border-gray-100 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="relative flex-1">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Rechercher par nom, matricule ou direction..."
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
              />
            </div>
            <span class="text-sm font-mono font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg whitespace-nowrap">
              {{ chauffeursFiltres.length }} agent(s) · {{ formatXAF(totalPrimes) }} F
            </span>
          </div>
          <!-- Filtre direction -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="dir in directions"
              :key="dir"
              @click="filtreDirection = dir"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              :class="filtreDirection === dir
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            >
              {{ dir === 'TOUS' ? 'Toutes les directions' : nomDirection(dir) }}
            </button>
          </div>
        </div>

        <!-- Tableau -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Mat.</th>
                <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Agent</th>
                <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Direction</th>
                <th class="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Equipe</th>
                <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Plafond</th>
                <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Sanctions</th>
                <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Apres sanctions</th>
                <th class="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Presence</th>
                <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Reste a payer</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="(c, i) in chauffeursFiltres" :key="c.code_transporteur" class="hover:bg-gray-50/50">
                <td class="px-3 py-2.5 text-gray-400 font-mono text-xs">{{ i + 1 }}</td>
                <td class="px-3 py-2.5 font-mono text-xs text-gray-500">{{ c.code_transporteur }}</td>
                <td class="px-3 py-2.5 text-gray-900 font-medium text-xs">{{ c.chauffeur }}</td>
                <td class="px-3 py-2.5">
                  <span v-if="c.direction" class="inline-flex px-2 py-0.5 rounded text-[11px] font-medium"
                    :class="c.direction === 'DT' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'">
                    {{ nomDirection(c.direction) }}
                  </span>
                  <span v-else class="text-xs text-gray-400 italic">Non rattache</span>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span class="text-xs">{{ c.equipe === 'NUIT' ? '🌙' : '☀️' }}</span>
                </td>
                <td class="px-3 py-2.5 text-right font-mono text-xs text-gray-500">{{ formatXAF(plafond) }}</td>
                <td class="px-3 py-2.5 text-right font-mono text-xs font-semibold" :class="c.penalites.total > 0 ? 'text-red-600' : 'text-gray-300'">
                  {{ c.penalites.total > 0 ? '-' + formatXAF(c.penalites.total) : '0' }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono text-xs font-semibold text-gray-700">
                  {{ formatXAF(c.prime_avant_presence || (plafond - c.penalites.total)) }}
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span
                    class="font-mono text-xs font-bold px-1.5 py-0.5 rounded"
                    :class="c.taux_presence >= 93 ? 'text-emerald-700 bg-emerald-50' : c.taux_presence >= 70 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'"
                  >
                    {{ c.taux_presence }}%
                  </span>
                  <span v-if="c.prorata" class="block text-[9px] text-amber-500 font-medium mt-0.5">
                    prorata
                  </span>
                </td>
                <td class="px-3 py-2.5 text-right">
                  <span class="font-mono text-xs font-bold px-2 py-0.5 rounded" :class="primeColor(c.prime_finale, plafond)">
                    {{ formatXAF(c.prime_finale) }} F
                  </span>
                </td>
              </tr>
            </tbody>
            <!-- Totaux -->
            <tfoot>
              <tr class="bg-gray-50 border-t-2 border-gray-200 font-bold text-sm">
                <td colspan="5" class="px-3 py-3 text-gray-700">TOTAL ({{ chauffeursFiltres.length }} agents)</td>
                <td class="px-3 py-3 text-right font-mono text-gray-700">{{ formatXAF(totalBudget) }}</td>
                <td class="px-3 py-3 text-right font-mono text-red-600">-{{ formatXAF(totalPenalites) }}</td>
                <td class="px-3 py-3 text-right font-mono text-gray-700">{{ formatXAF(totalBudget - totalPenalites) }}</td>
                <td class="px-3 py-3 text-center text-gray-500">—</td>
                <td class="px-3 py-3 text-right font-mono text-emerald-700">{{ formatXAF(totalPrimes) }} F</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 justify-end">
        <BaseButton @click="$router.push('/daf/validation')" variant="outline">
          Validation detaillee <ArrowRight class="w-4 h-4 ml-2" />
        </BaseButton>
        <BaseButton @click="$router.push('/daf/rapports')" variant="primary">
          Exporter les rapports <ArrowRight class="w-4 h-4 ml-2" />
        </BaseButton>
      </div>
    </template>
  </div>
</template>
