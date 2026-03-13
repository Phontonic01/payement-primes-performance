<script setup>
import { useAuthStore } from '@/stores/auth'
import {
  TrendingUp, TrendingDown, Truck, MapPin, ShieldCheck, Wrench,
  AlertTriangle, Users, ArrowUpRight, ArrowDownRight
} from 'lucide-vue-next'

const authStore = useAuthStore()

const kpis = [
  {
    label: 'Score moyen global',
    value: '82.4 %',
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
    label: 'Bouclages validés',
    value: '88 %',
    change: '-2.1 %',
    trend: 'down',
    color: 'indigo',
    icon: MapPin
  },
  {
    label: 'Budget primes (est.)',
    value: '12.4 M',
    change: 'XAF',
    trend: 'neutral',
    color: 'amber',
    icon: Users
  }
]

const topAgents = [
  { name: 'Jean MOUSSAVOU', score: 94.2, equipe: 'BOM-01', trend: 'up' },
  { name: 'Paul ONDO', score: 91.8, equipe: 'BOM-03', trend: 'up' },
  { name: 'Marie NDONG', score: 89.5, equipe: 'Plateaux-02', trend: 'up' },
  { name: 'Pierre NZUE', score: 87.1, equipe: 'Bennes-01', trend: 'down' },
  { name: 'Claire MBADINGA', score: 85.3, equipe: 'Movi-02', trend: 'up' },
]

const alerts = [
  { type: 'danger', text: 'Alcoolémie positive — R. OBAME (BOM-04)', time: 'Aujourd\'hui' },
  { type: 'warning', text: '3 agents sous le seuil 60 % — Équipe Bennes-02', time: 'Hier' },
  { type: 'info', text: '12 bouclages en attente de validation GPS', time: 'En cours' },
]

const serviceStatus = [
  { name: 'Collecte', pct: 94, icon: Truck, color: 'emerald' },
  { name: 'Géolocalisation', pct: 78, icon: MapPin, color: 'blue' },
  { name: 'Logistique', pct: 65, icon: Wrench, color: 'amber' },
  { name: 'QHSE', pct: 82, icon: ShieldCheck, color: 'purple' },
]
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
            <div class="flex-1 min-w-0 ml-3">
              <p class="text-sm font-medium text-gray-900 truncate">{{ agent.name }}</p>
              <p class="text-xs text-gray-400">{{ agent.equipe }}</p>
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
      <h3 class="text-sm font-semibold text-gray-900 mb-4">Taux de complétion des saisies par service</h3>
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
  </div>
</template>
