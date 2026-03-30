<script setup>
import { ref, computed, watch } from 'vue'
import { Factory, Truck, Calendar, RefreshCw, Loader2, WifiOff, Search, ChevronRight, Zap } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import DateInput from '@/components/ui/DateInput.vue'
import api from '@/api/client'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()
const date = ref(new Date().toISOString().split('T')[0])
const loading = ref(false)
const error = ref('')
const vehicules = ref([])
const searchQuery = ref('')
const filtreEquipe = ref('TOUS')

async function charger() {
  loading.value = true
  error.value = ''
  try {
    const data = await api.pontBasculeVehiculesDuJour(date.value, 'CLEAN AFRICA')
    vehicules.value = data.vehicules || []
    if (vehicules.value.length > 0) {
      toastStore.addToast(`${vehicules.value.length} camion(s) reçus à la décharge`, 'success')
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

watch(date, charger, { immediate: true })

const vehiculesFiltres = computed(() => {
  let list = vehicules.value
  if (filtreEquipe.value !== 'TOUS') {
    list = list.filter(v => v.equipe === filtreEquipe.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(v =>
      v.immatriculation.toLowerCase().includes(q) ||
      v.chauffeur.toLowerCase().includes(q) ||
      (v.arrondissement || '').toLowerCase().includes(q)
    )
  }
  return list
})

const nbJour = computed(() => vehicules.value.filter(v => v.equipe === 'JOUR').length)
const nbNuit = computed(() => vehicules.value.filter(v => v.equipe === 'NUIT').length)
const tonnageTotal = computed(() => vehicules.value.reduce((s, v) => s + (v.tonnage_tonnes || 0), 0).toFixed(1))
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50">
          <Truck class="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Réception Camions</h1>
          <p class="text-sm text-gray-500">Décharge — Tous les camions pesés au pont-bascule</p>
        </div>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl shadow-sm">
        <Zap class="w-4 h-4 text-orange-600" />
        <span class="text-sm font-medium text-orange-700">Pont-bascule connecté</span>
      </div>
    </div>

    <!-- Date -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
          <Calendar class="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900">Date</h3>
          <p class="text-xs text-gray-500">Données pont-bascule automatiques</p>
        </div>
      </div>
      <DateInput v-model="date" />
      <button @click="charger" class="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors cursor-pointer">
        <RefreshCw class="w-4 h-4" /> Actualiser
      </button>
      <div class="ml-auto text-sm text-gray-500">
        Total : <span class="font-bold text-gray-900">{{ tonnageTotal }} t</span> · {{ vehicules.length }} camion(s)
      </div>
    </div>

    <!-- Chargement / Erreur -->
    <div v-if="loading" class="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center gap-3">
      <Loader2 class="w-8 h-8 text-orange-600 animate-spin" />
      <p class="text-sm text-gray-500">Chargement des données pont-bascule...</p>
    </div>
    <div v-else-if="error" class="bg-red-50 rounded-xl border border-red-200 p-6 flex items-center gap-3">
      <WifiOff class="w-6 h-6 text-red-500 flex-shrink-0" />
      <div>
        <p class="text-sm font-semibold text-red-800">Pont-bascule indisponible</p>
        <p class="text-xs text-red-600 mt-0.5">{{ error }}</p>
      </div>
    </div>

    <template v-else>
      <!-- Recherche + filtres -->
      <div class="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input v-model="searchQuery" type="text" placeholder="Rechercher par immat., chauffeur, arrondissement..." class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-colors" />
          </div>
          <span class="font-mono font-semibold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg text-sm">
            {{ vehiculesFiltres.length }} camion(s)
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button @click="filtreEquipe = 'TOUS'" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer" :class="filtreEquipe === 'TOUS' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
            Tous ({{ vehicules.length }})
          </button>
          <button @click="filtreEquipe = 'JOUR'" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer" :class="filtreEquipe === 'JOUR' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'">
            Jour ({{ nbJour }})
          </button>
          <button @click="filtreEquipe = 'NUIT'" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer" :class="filtreEquipe === 'NUIT' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'">
            Nuit ({{ nbNuit }})
          </button>
        </div>
      </div>

      <!-- Tableau -->
      <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">N°Parc</th>
                <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Chauffeur</th>
                <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Arrondissement</th>
                <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Service</th>
                <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Tonnage</th>
                <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Rotations</th>
                <th class="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Équipe</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="v in vehiculesFiltres" :key="v.immatriculation" class="hover:bg-orange-50/30 transition-colors">
                <td class="px-3 py-2.5 font-mono font-semibold text-gray-900 text-xs">{{ v.immatriculation }}</td>
                <td class="px-3 py-2.5 text-gray-900 text-xs">{{ v.chauffeur }}</td>
                <td class="px-3 py-2.5 text-gray-700 text-xs">{{ v.arrondissement || '-' }}</td>
                <td class="px-3 py-2.5 text-xs">
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-bold" :class="v.service === 'TRI' ? 'bg-teal-100 text-teal-700' : 'bg-emerald-100 text-emerald-700'">
                    {{ v.service || 'COLLECTE' }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-right font-mono font-semibold text-gray-900">{{ v.tonnage_tonnes }} t</td>
                <td class="px-3 py-2.5 text-right font-mono text-gray-700">{{ v.rotations }}</td>
                <td class="px-3 py-2.5 text-center">
                  <span class="px-1.5 py-0.5 rounded text-[9px] font-bold" :class="v.equipe === 'NUIT' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'">
                    {{ v.equipe }}
                  </span>
                </td>
              </tr>
              <tr v-if="vehiculesFiltres.length === 0">
                <td colspan="7" class="px-4 py-8 text-center text-gray-400">
                  Aucun camion reçu à la décharge pour cette date
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
