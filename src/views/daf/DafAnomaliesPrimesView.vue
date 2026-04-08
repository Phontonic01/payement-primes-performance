<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { AlertTriangle, Search, Loader2, Users, Calendar, RefreshCw, Download } from 'lucide-vue-next'
import api from '@/api/client'
import DateInput from '@/components/ui/DateInput.vue'

const router = useRouter()

const stats = ref(null)
const anomalies = ref({ total_distincts: 0, total_occurrences: 0, matricules: [] })
const loading = ref(false)
const dateDebut = ref('2026-01-22')
const dateFin = ref('2026-03-28')
const filtre = ref('')
const filtreFonction = ref('TOUS')

async function charger() {
  loading.value = true
  try {
    const [s, a] = await Promise.all([
      api.getEquipesStats(),
      api.getEquipesAnomalies(dateDebut.value, dateFin.value),
    ])
    stats.value = s
    anomalies.value = a
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

onMounted(charger)

const matriculesAffiches = computed(() => {
  let list = anomalies.value.matricules || []
  if (filtreFonction.value !== 'TOUS') {
    list = list.filter(m => m.role === filtreFonction.value)
  }
  if (filtre.value) {
    const q = filtre.value.toLowerCase()
    list = list.filter(m =>
      m.matricule.includes(q) ||
      (m.nom || '').toLowerCase().includes(q)
    )
  }
  return list
})

function ouvrirFicheAgent(mat) {
  router.push(`/agent/${mat}`)
}

function exportCsv() {
  const lines = ['matricule;nom;fonction;role;occurrences;premiere_date;derniere_date;vehicules']
  for (const m of matriculesAffiches.value) {
    lines.push([m.matricule, m.nom, m.fonction, m.role, m.occurrences, m.premiere_date, m.derniere_date, `"${m.vehicules}"`].join(';'))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `anomalies-primes-${dateDebut.value}_${dateFin.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
    <!-- Header -->
    <div class="bg-white rounded-2xl border border-gray-100 p-5">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
            <AlertTriangle class="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-900">Anomalies primes — croisement Excel RH</h1>
            <p class="text-sm text-gray-500 mt-0.5">
              Matricules apparaissant dans l'Excel d'évaluation mais introuvables dans la base RH officielle.
            </p>
          </div>
        </div>
        <button @click="charger" :disabled="loading"
          class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-50">
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" /> Recharger
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div v-if="stats" class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <p class="text-xs font-semibold text-gray-500 uppercase">Équipages importés</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.equipes }}</p>
        <p class="text-xs text-gray-500 mt-1">{{ stats.couverture.jours }} jours · {{ stats.vehicules }} véhicules</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <p class="text-xs font-semibold text-gray-500 uppercase">Membres total</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.membres.total }}</p>
        <p class="text-xs text-gray-500 mt-1">
          {{ stats.membres.chauffeurs }} chauffeurs · {{ stats.membres.ripeurs }} ripeurs
        </p>
      </div>
      <div class="bg-white rounded-xl border border-amber-200 p-4">
        <p class="text-xs font-semibold text-amber-600 uppercase">Lignes hors RH</p>
        <p class="text-2xl font-bold text-amber-700 mt-1">{{ stats.membres.inconnus_rh }}</p>
        <p class="text-xs text-gray-500 mt-1">Sur {{ stats.membres.total }} ({{ Math.round(stats.membres.inconnus_rh / stats.membres.total * 100) }} %)</p>
      </div>
      <div class="bg-white rounded-xl border border-red-200 p-4">
        <p class="text-xs font-semibold text-red-600 uppercase">Matricules distincts hors RH</p>
        <p class="text-2xl font-bold text-red-700 mt-1">{{ anomalies.total_distincts }}</p>
        <p class="text-xs text-gray-500 mt-1">À investiguer prioritairement</p>
      </div>
    </div>

    <!-- Filtres -->
    <div class="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label class="text-xs font-semibold text-gray-600 mb-1 block">Du</label>
          <DateInput v-model="dateDebut" />
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-600 mb-1 block">Au</label>
          <DateInput v-model="dateFin" />
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-600 mb-1 block">Fonction</label>
          <select v-model="filtreFonction" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="TOUS">Toutes</option>
            <option value="CHAUFFEUR">Chauffeurs</option>
            <option value="RIPEUR">Ripeurs</option>
            <option value="CONDUCTEUR">Conducteurs d'engins</option>
            <option value="AUTRE">Autres</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-600 mb-1 block">Recherche</label>
          <div class="relative">
            <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input v-model="filtre" type="text" placeholder="matricule ou nom"
              class="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
        </div>
      </div>
      <div class="flex justify-between items-center">
        <button @click="charger" class="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">
          Appliquer la période
        </button>
        <button @click="exportCsv" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700">
          <Download class="w-4 h-4" /> Exporter CSV ({{ matriculesAffiches.length }})
        </button>
      </div>
    </div>

    <!-- Tableau -->
    <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div v-if="loading" class="p-8 text-center">
        <Loader2 class="w-6 h-6 text-blue-500 animate-spin inline-block" />
      </div>
      <div v-else-if="matriculesAffiches.length === 0" class="p-8 text-center text-gray-500 text-sm">
        Aucune anomalie sur la période et les filtres sélectionnés.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-red-50 border-b border-red-100">
              <th class="text-left px-4 py-3 font-semibold text-red-800">Matricule</th>
              <th class="text-left px-4 py-3 font-semibold text-red-800">Nom</th>
              <th class="text-left px-4 py-3 font-semibold text-red-800">Fonction</th>
              <th class="text-center px-4 py-3 font-semibold text-red-800">Rôle</th>
              <th class="text-right px-4 py-3 font-semibold text-red-800">Occurrences</th>
              <th class="text-left px-4 py-3 font-semibold text-red-800">Période</th>
              <th class="text-left px-4 py-3 font-semibold text-red-800">Véhicules</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="m in matriculesAffiches" :key="m.matricule" class="hover:bg-amber-50/30">
              <td class="px-4 py-3 font-mono font-semibold text-gray-900">{{ m.matricule }}</td>
              <td class="px-4 py-3 text-gray-800">{{ m.nom || '—' }}</td>
              <td class="px-4 py-3 text-gray-600 text-xs">{{ m.fonction }}</td>
              <td class="px-4 py-3 text-center">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                  :class="{
                    'bg-blue-100 text-blue-700': m.role === 'CHAUFFEUR',
                    'bg-emerald-100 text-emerald-700': m.role === 'RIPEUR',
                    'bg-purple-100 text-purple-700': m.role === 'CONDUCTEUR',
                    'bg-gray-100 text-gray-700': m.role === 'AUTRE',
                  }">
                  {{ m.role }}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-mono font-semibold text-red-700">{{ m.occurrences }}</td>
              <td class="px-4 py-3 text-xs text-gray-600">
                {{ m.premiere_date.split('-').reverse().join('/') }} → {{ m.derniere_date.split('-').reverse().join('/') }}
              </td>
              <td class="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" :title="m.vehicules">
                {{ m.vehicules }}
              </td>
              <td class="px-4 py-3 text-right">
                <button @click="ouvrirFicheAgent(m.matricule)"
                  class="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium">
                  Voir fiche
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
