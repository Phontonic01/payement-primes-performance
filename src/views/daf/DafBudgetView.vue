<script setup>
import { ref, computed } from 'vue'
import { Landmark, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import { useAgentsStore } from '@/stores/agents'
import { usePrimesStore } from '@/stores/primes'

const agentsStore = useAgentsStore()
const primesStore = usePrimesStore()

const moisSelectionne = ref('2025-12')

// Données mock par service — simulant le résultat post-consolidation
const budgetsParService = ref([
  {
    id: 'collecte',
    nom: 'Service Collecte',
    description: 'Tonnage, bouclage circuits, chauffeurs & équipiers',
    couleur: 'emerald',
    nbAgents: 5,
    nbEligibles: 4,
    totalPrimesCalculees: 274000,
    budgetAlloue: 300000,
    details: {
      chauffeurs: { count: 3, total: 177000 },
      equipiers: { count: 2, total: 97000 },
    }
  },
  {
    id: 'geo',
    nom: 'Service Géolocalisation',
    description: 'Validation GPS, suivi bouclage terrain',
    couleur: 'blue',
    nbAgents: 1,
    nbEligibles: 1,
    totalPrimesCalculees: 60000,
    budgetAlloue: 75000,
    details: {
      validateurs: { count: 1, total: 60000 },
    }
  },
  {
    id: 'logistique',
    nom: 'Service Logistique',
    description: 'Entretien véhicules, suivi équipements',
    couleur: 'amber',
    nbAgents: 1,
    nbEligibles: 1,
    totalPrimesCalculees: 45000,
    budgetAlloue: 50000,
    details: {
      techniciens: { count: 1, total: 45000 },
    }
  },
  {
    id: 'qhse',
    nom: 'Service QHSE / TRI',
    description: 'Sécurité, alcootests, collecte sélective, checklists',
    couleur: 'purple',
    nbAgents: 1,
    nbEligibles: 1,
    totalPrimesCalculees: 48000,
    budgetAlloue: 60000,
    details: {
      agents: { count: 1, total: 48000 },
    }
  },
])

// Totaux calculés
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

// Données pour le graphique
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
      label: 'Primes calculées (XAF)',
      data: budgetsParService.value.map(s => s.totalPrimesCalculees),
      backgroundColor: 'rgba(16, 185, 129, 0.3)',
      borderColor: 'rgb(16, 185, 129)',
      borderWidth: 2,
    },
  ]
}))

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { position: 'top' },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (v) => v.toLocaleString('fr-FR') + ' XAF'
      }
    }
  }
}

function formatXAF(montant) {
  return montant.toLocaleString('fr-FR')
}

function getCouleurClasses(couleur, type = 'bg') {
  const map = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600' },
  }
  return map[couleur]?.[type] || ''
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Vue Budgétaire Globale</h1>
        <p class="text-sm text-gray-500 mt-1">DAF — Enveloppes budgétaires par service pour le paiement des primes</p>
      </div>
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-gray-600">Période :</label>
        <input
          type="month"
          v-model="moisSelectionne"
          class="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
        />
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <BaseCard class="!p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-gray-500">Budget Total Alloué</span>
          <div class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
            <Landmark class="w-4 h-4 text-gray-600" />
          </div>
        </div>
        <p class="text-2xl font-bold text-gray-900">{{ formatXAF(totalBudget) }} <span class="text-sm font-normal text-gray-500">XAF</span></p>
        <p class="text-xs text-gray-400 mt-1">Enveloppe tous services confondus</p>
      </BaseCard>

      <BaseCard class="!p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-gray-500">Primes à Décaisser</span>
          <div class="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
            <TrendingUp class="w-4 h-4 text-emerald-600" />
          </div>
        </div>
        <p class="text-2xl font-bold text-emerald-600">{{ formatXAF(totalPrimes) }} <span class="text-sm font-normal text-gray-500">XAF</span></p>
        <p class="text-xs text-gray-400 mt-1">{{ pourcentageUtilisation }}% du budget utilisé</p>
      </BaseCard>

      <BaseCard class="!p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-gray-500">Solde Disponible</span>
          <div class="w-9 h-9 rounded-lg flex items-center justify-center"
            :class="ecartBudget >= 0 ? 'bg-emerald-100' : 'bg-red-100'"
          >
            <TrendingDown class="w-4 h-4" :class="ecartBudget >= 0 ? 'text-emerald-600' : 'text-red-600'" />
          </div>
        </div>
        <p class="text-2xl font-bold" :class="ecartBudget >= 0 ? 'text-gray-900' : 'text-red-600'">
          {{ ecartBudget >= 0 ? '+' : '' }}{{ formatXAF(ecartBudget) }} <span class="text-sm font-normal text-gray-500">XAF</span>
        </p>
        <p class="text-xs mt-1" :class="ecartBudget >= 0 ? 'text-emerald-600' : 'text-red-500'">
          {{ ecartBudget >= 0 ? 'Budget suffisant' : 'Dépassement budgétaire !' }}
        </p>
      </BaseCard>

      <BaseCard class="!p-5">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-gray-500">Agents Éligibles</span>
          <div class="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <CheckCircle class="w-4 h-4 text-blue-600" />
          </div>
        </div>
        <p class="text-2xl font-bold text-gray-900">{{ totalEligibles }} <span class="text-sm font-normal text-gray-500">/ {{ totalAgents }}</span></p>
        <p class="text-xs text-gray-400 mt-1">Agents remplissant les critères</p>
      </BaseCard>
    </div>

    <!-- Graphique budget vs primes -->
    <BaseCard title="Comparaison Budget Alloué vs Primes Calculées">
      <BaseChart type="bar" :data="chartData" :options="chartOptions" class="h-72" />
    </BaseCard>

    <!-- Détail par service -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <BaseCard
        v-for="service in budgetsParService"
        :key="service.id"
        class="!p-0 overflow-hidden"
      >
        <!-- Service header -->
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between"
          :class="getCouleurClasses(service.couleur, 'bg')"
        >
          <div>
            <h3 class="font-bold text-gray-900">{{ service.nom }}</h3>
            <p class="text-xs text-gray-500 mt-0.5">{{ service.description }}</p>
          </div>
          <BaseBadge
            :status="service.totalPrimesCalculees <= service.budgetAlloue ? 'success' : 'danger'"
            :text="service.totalPrimesCalculees <= service.budgetAlloue ? 'Dans le budget' : 'Dépassement'"
          />
        </div>

        <div class="p-5 space-y-4">
          <!-- Montants -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Budget alloué</p>
              <p class="text-lg font-bold text-gray-700 mt-1">{{ formatXAF(service.budgetAlloue) }} XAF</p>
            </div>
            <div>
              <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Primes calculées</p>
              <p class="text-lg font-bold mt-1" :class="getCouleurClasses(service.couleur, 'text')">
                {{ formatXAF(service.totalPrimesCalculees) }} XAF
              </p>
            </div>
          </div>

          <!-- Barre de progression -->
          <div>
            <div class="flex justify-between text-xs text-gray-500 mb-1">
              <span>Consommation</span>
              <span>{{ (service.totalPrimesCalculees / service.budgetAlloue * 100).toFixed(0) }}%</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2.5">
              <div
                class="h-2.5 rounded-full transition-all duration-500"
                :class="service.totalPrimesCalculees <= service.budgetAlloue ? 'bg-emerald-500' : 'bg-red-500'"
                :style="{ width: Math.min(100, (service.totalPrimesCalculees / service.budgetAlloue * 100)) + '%' }"
              ></div>
            </div>
          </div>

          <!-- Agents -->
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">
              <strong class="text-gray-900">{{ service.nbEligibles }}</strong> / {{ service.nbAgents }} agents éligibles
            </span>
            <span class="text-gray-500">
              Reste : <strong class="text-gray-900">{{ formatXAF(service.budgetAlloue - service.totalPrimesCalculees) }} XAF</strong>
            </span>
          </div>

          <!-- Détails par catégorie -->
          <div class="border-t border-gray-100 pt-3">
            <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Ventilation</p>
            <div class="space-y-1.5">
              <div
                v-for="(detail, categorie) in service.details"
                :key="categorie"
                class="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"
              >
                <span class="text-gray-600 capitalize">{{ categorie }} ({{ detail.count }})</span>
                <span class="font-semibold text-gray-900">{{ formatXAF(detail.total) }} XAF</span>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- Alerte dépassement global -->
    <div v-if="ecartBudget < 0" class="rounded-xl bg-red-50 p-4 flex items-start gap-3">
      <AlertTriangle class="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <p class="text-sm text-red-700 font-medium">Attention : dépassement budgétaire de {{ formatXAF(Math.abs(ecartBudget)) }} XAF</p>
        <p class="text-xs text-red-600 mt-1">Un ajustement des enveloppes ou une révision des paramètres de calcul est nécessaire avant validation.</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row gap-3 justify-end">
      <BaseButton @click="$router.push('/daf/validation')" variant="outline">
        Voir la validation détaillée <ArrowRight class="w-4 h-4 ml-2" />
      </BaseButton>
      <BaseButton @click="$router.push('/daf/rapports')" variant="primary">
        Exporter les rapports <ArrowRight class="w-4 h-4 ml-2" />
      </BaseButton>
    </div>
  </div>
</template>
