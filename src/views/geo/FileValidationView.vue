<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import DateInput from '@/components/ui/DateInput.vue'
import { Eye, MapPin, Clock, CheckCircle, Search, Calendar, Truck, Hash, Users, Loader2 } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useSaisiesStore } from '@/stores/saisies'
import api from '@/api/client'

const router = useRouter()
const saisiesStore = useSaisiesStore()

const dateFiltre = ref(new Date().toISOString().split('T')[0])
const searchQuery = ref('')
const loading = ref(false)
const vehicules = ref([])

async function charger() {
  loading.value = true
  try {
    const data = await api.pontBasculeVehiculesDuJour(dateFiltre.value, 'CLEAN AFRICA')
    vehicules.value = (data.vehicules || []).map(v => {
      const bouclage = saisiesStore.getBouclage(v.code_transporteur, dateFiltre.value)
      const fiche = Object.values(saisiesStore.fichesCollecte).find(f =>
        f.date === dateFiltre.value && f.immatriculation === v.immatriculation
      )
      return {
        ...v,
        bouclage_declare: bouclage?.bouclageDeclare ?? null,
        statut_geo: bouclage?.statutGeo || 'NON_SAISI',
        ripeur1: fiche?.ripeur1 || null,
        ripeur2: fiche?.ripeur2 || null,
        ripeur3: fiche?.ripeur3 || null,
      }
    })
  } catch (err) {
    console.error('Erreur:', err.message)
  } finally {
    loading.value = false
  }
}

onMounted(charger)
watch(dateFiltre, charger)

// Seuls les bouclages déclarés en attente GEO
const enAttente = computed(() =>
  vehicules.value.filter(v => v.statut_geo === 'EN_ATTENTE_GEO')
)

const filtres = computed(() => {
  let list = enAttente.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(v =>
      v.chauffeur.toLowerCase().includes(q) ||
      v.code_transporteur.toString().includes(q) ||
      v.immatriculation.toLowerCase().includes(q)
    )
  }
  return list
})

const nbTraites = computed(() =>
  vehicules.value.filter(v => v.statut_geo === 'VALIDE' || v.statut_geo === 'PARTIEL' || v.statut_geo === 'REFUSE').length
)

function voirDetails(v) {
  router.push(`/geo/detail/${v.code_transporteur}__${dateFiltre.value}`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <MapPin class="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">File de Validation GPS</h1>
          <p class="text-sm text-gray-500">Service Geolocalisation — Bouclages a valider</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div v-if="nbTraites > 0" class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle class="w-4 h-4 text-emerald-600" />
          <span class="text-sm font-medium text-emerald-700">{{ nbTraites }} traite(s)</span>
        </div>
        <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
          <Clock class="w-4 h-4 text-amber-600" />
          <span class="text-sm font-medium text-amber-700">{{ enAttente.length }} en attente</span>
        </div>
      </div>
    </div>

    <!-- Filtres -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
      <div class="flex items-center gap-2">
        <Calendar class="w-4 h-4 text-gray-400" />
        <DateInput v-model="dateFiltre" />
      </div>
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="searchQuery" type="text" placeholder="Rechercher par chauffeur, matricule, vehicule..."
          class="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors" />
      </div>
    </div>

    <!-- Chargement -->
    <div v-if="loading" class="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center gap-3">
      <Loader2 class="w-8 h-8 text-emerald-600 animate-spin" />
      <p class="text-sm text-gray-500">Chargement...</p>
    </div>

    <!-- Vide -->
    <div v-else-if="enAttente.length === 0" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <CheckCircle class="w-10 h-10 mx-auto mb-3 text-emerald-400" />
      <h3 class="text-lg font-semibold text-gray-900">Aucun bouclage en attente</h3>
      <p class="text-sm text-gray-500 mt-1">Tous les bouclages ont ete traites ou aucun n'a ete declare.</p>
    </div>

    <!-- Tableau -->
    <div v-else class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Matricule</th>
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Chauffeur</th>
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Vehicule</th>
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Ripeurs</th>
              <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Arrondissement</th>
              <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Tonnage</th>
              <th class="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Declaration</th>
              <th class="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="v in filtres" :key="v.immatriculation" class="hover:bg-emerald-50/30">
              <td class="px-3 py-3 font-mono text-xs font-bold text-emerald-700">{{ v.code_transporteur }}</td>
              <td class="px-3 py-3 text-gray-900 font-medium text-xs">{{ v.chauffeur }}</td>
              <td class="px-3 py-3 font-mono text-xs text-blue-600 font-semibold">{{ v.immatriculation }}</td>
              <td class="px-3 py-3">
                <div class="flex flex-wrap gap-1">
                  <span v-if="v.ripeur1" class="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{{ v.ripeur1.nom }}</span>
                  <span v-if="v.ripeur2" class="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{{ v.ripeur2.nom }}</span>
                  <span v-if="v.ripeur3" class="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-medium">{{ v.ripeur3.nom }}</span>
                  <span v-if="!v.ripeur1" class="text-[10px] text-gray-400 italic">non saisis</span>
                </div>
              </td>
              <td class="px-3 py-3 text-xs text-gray-600">{{ v.arrondissement }}</td>
              <td class="px-3 py-3 text-right font-mono text-xs font-semibold text-gray-900">{{ v.tonnage_tonnes }} t</td>
              <td class="px-3 py-3 text-center">
                <span class="font-semibold text-xs" :class="v.bouclage_declare ? 'text-emerald-600' : 'text-red-600'">
                  {{ v.bouclage_declare ? 'OUI' : 'NON' }}
                </span>
              </td>
              <td class="px-3 py-3 text-right">
                <BaseButton @click="voirDetails(v)" variant="primary" size="sm" class="inline-flex items-center gap-1.5 text-xs">
                  <Eye class="w-3.5 h-3.5" />
                  Analyser
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
