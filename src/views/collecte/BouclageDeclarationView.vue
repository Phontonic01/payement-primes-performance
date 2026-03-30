<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import { Check, X, MapPin, Calendar, Route, RotateCcw, Search, Truck, Users, Hash, Loader2, Zap, RefreshCw } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import { useSaisiesStore } from '@/stores/saisies'
import { useAuthStore } from '@/stores/auth'
import ReadOnlyBanner from '@/components/ui/ReadOnlyBanner.vue'
import DateInput from '@/components/ui/DateInput.vue'
import api from '@/api/client'

const toastStore = useToastStore()
const confirmStore = useConfirmStore()
const saisiesStore = useSaisiesStore()
const authStore = useAuthStore()
const readOnly = computed(() => authStore.isReadOnly())

const dateFiltre = ref(new Date().toISOString().split('T')[0])
const searchQuery = ref('')
const loading = ref(false)
const vehiculesDuJour = ref([])

// Charger les véhicules du jour depuis le pont-bascule
async function chargerDonnees() {
  loading.value = true
  try {
    const data = await api.pontBasculeVehiculesDuJour(dateFiltre.value, 'CLEAN AFRICA')
    vehiculesDuJour.value = (data.vehicules || []).map(v => {
      const bouclage = saisiesStore.getBouclage(v.code_transporteur, dateFiltre.value)
      // Chercher les fiches collecte pour avoir les ripeurs
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
    toastStore.addToast('Erreur chargement pont-bascule: ' + err.message, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(chargerDonnees)
watch(dateFiltre, chargerDonnees)

// Filtrage
const vehiculesFiltres = computed(() => {
  if (!searchQuery.value) return vehiculesDuJour.value
  const q = searchQuery.value.toLowerCase()
  return vehiculesDuJour.value.filter(v =>
    v.chauffeur.toLowerCase().includes(q) ||
    v.code_transporteur.toString().includes(q) ||
    v.immatriculation.toLowerCase().includes(q) ||
    v.arrondissement.toLowerCase().includes(q)
  )
})

function declarer(v, estBoucle) {
  saisiesStore.enregistrerBouclage({
    matricule: v.code_transporteur,
    date: dateFiltre.value,
    agent: v.chauffeur,
    circuit: v.origine || v.arrondissement,
    vehicule: v.immatriculation,
    bouclageDeclare: estBoucle,
  })
  v.bouclage_declare = estBoucle
  v.statut_geo = 'EN_ATTENTE_GEO'
  toastStore.addToast(`Bouclage declare ${estBoucle ? 'OUI' : 'NON'} pour ${v.chauffeur}`, 'success')
}

async function annulerDeclaration(v) {
  const confirmed = await confirmStore.open({
    title: 'Annuler la declaration',
    message: `Annuler la declaration de bouclage pour "${v.chauffeur}" ?`,
    confirmText: 'Annuler',
    cancelText: 'Retour',
    variant: 'danger'
  })
  if (confirmed) {
    const key = `${v.code_transporteur}-${dateFiltre.value}`
    delete saisiesStore.bouclages[key]
    v.bouclage_declare = null
    v.statut_geo = 'NON_SAISI'
    toastStore.addToast(`Declaration annulee pour ${v.chauffeur}`, 'info')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Declaration Bouclage</h1>
        <p class="text-sm text-gray-500 mt-0.5">Donnees pont-bascule — Chauffeur, vehicule, ripeurs et circuit</p>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
        <Zap class="w-4 h-4 text-emerald-600" />
        <span class="text-sm font-medium text-emerald-700">Pont-bascule</span>
      </div>
    </div>

    <ReadOnlyBanner service="Collecte" />

    <!-- Filtres -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Route class="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-900">Circuits du jour</h3>
            <p class="text-xs text-gray-500">{{ vehiculesFiltres.length }} vehicule(s)</p>
          </div>
        </div>
        <div class="flex items-center gap-2 ml-auto">
          <Calendar class="w-4 h-4 text-gray-400" />
          <DateInput v-model="dateFiltre" />
          <button @click="chargerDonnees" class="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">
            <RefreshCw class="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher par chauffeur, matricule, vehicule, arrondissement..."
          class="block w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
        />
      </div>
    </div>

    <!-- Chargement -->
    <div v-if="loading" class="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center gap-3">
      <Loader2 class="w-8 h-8 text-emerald-600 animate-spin" />
      <p class="text-sm text-gray-500">Chargement des donnees pont-bascule...</p>
    </div>

    <!-- Liste des vehicules -->
    <div v-else class="space-y-3" :class="{ 'opacity-60 pointer-events-none': readOnly }">
      <div v-if="vehiculesFiltres.length === 0" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Route class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-sm font-medium text-gray-500">Aucun vehicule pour cette date</p>
      </div>

      <div
        v-for="v in vehiculesFiltres"
        :key="v.immatriculation"
        class="bg-white rounded-xl border overflow-hidden"
        :class="v.bouclage_declare === true ? 'border-emerald-200' : v.bouclage_declare === false ? 'border-red-200' : 'border-gray-100'"
      >
        <!-- Header vehicule -->
        <div class="px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Truck class="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-900">
                <span class="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mr-1.5">{{ v.code_transporteur }}</span>
                {{ v.chauffeur }}
              </p>
              <p class="text-xs text-gray-500 mt-0.5">
                Vehicule <span class="font-mono font-semibold text-blue-600">{{ v.immatriculation }}</span>
                · {{ v.arrondissement }}
                · {{ v.tonnage_tonnes }} t · {{ v.rotations }} tour(s)
                <span class="ml-1 text-[10px]" :class="v.equipe === 'NUIT' ? 'text-indigo-600' : 'text-amber-600'">
                  {{ v.equipe === 'NUIT' ? '🌙 Nuit' : '☀️ Jour' }}
                </span>
              </p>
            </div>
          </div>

          <!-- Statut -->
          <div>
            <BaseBadge v-if="v.statut_geo === 'VALIDE'" status="success" text="Valide GEO" />
            <BaseBadge v-else-if="v.statut_geo === 'EN_ATTENTE_GEO'" status="warning" text="En attente GEO" />
            <BaseBadge v-else-if="v.statut_geo === 'PARTIEL'" status="warning" text="Partiel" />
            <BaseBadge v-else-if="v.statut_geo === 'REFUSE'" status="danger" text="Refuse" />
            <BaseBadge v-else status="neutral" text="Non declare" />
          </div>
        </div>

        <div class="px-5 py-3">
          <!-- Ripeurs -->
          <div class="flex flex-wrap gap-3 mb-3">
            <div v-if="v.ripeur1" class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <Users class="w-3.5 h-3.5 text-blue-600" />
              <div class="text-xs">
                <span class="font-semibold text-gray-900">{{ v.ripeur1.nom }}</span>
                <span class="text-blue-600 ml-1">{{ v.ripeur1.matricule }}</span>
              </div>
            </div>
            <div v-if="v.ripeur2" class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <Users class="w-3.5 h-3.5 text-blue-500" />
              <div class="text-xs">
                <span class="font-semibold text-gray-900">{{ v.ripeur2.nom }}</span>
                <span class="text-blue-500 ml-1">{{ v.ripeur2.matricule }}</span>
              </div>
            </div>
            <div v-if="v.ripeur3" class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <Users class="w-3.5 h-3.5 text-blue-400" />
              <div class="text-xs">
                <span class="font-semibold text-gray-900">{{ v.ripeur3.nom }}</span>
                <span class="text-blue-400 ml-1">{{ v.ripeur3.matricule }}</span>
              </div>
            </div>
            <div v-if="!v.ripeur1 && !v.ripeur2 && !v.ripeur3" class="text-xs text-gray-400 italic flex items-center gap-1.5">
              <Users class="w-3.5 h-3.5" />
              Ripeurs non encore saisis (aller dans Saisie Collecte)
            </div>
          </div>

          <!-- Actions bouclage -->
          <div class="flex items-center justify-end gap-2">
            <template v-if="v.bouclage_declare === null">
              <span class="text-xs text-gray-400 mr-2">Circuit boucle ?</span>
              <button
                @click="declarer(v, true)"
                class="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <Check class="w-3.5 h-3.5" />
                Oui, boucle
              </button>
              <button
                @click="declarer(v, false)"
                class="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
              >
                <X class="w-3.5 h-3.5" />
                Non
              </button>
            </template>

            <template v-else>
              <span
                class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                :class="v.bouclage_declare ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'"
              >
                <Check v-if="v.bouclage_declare" class="w-3.5 h-3.5" />
                <X v-else class="w-3.5 h-3.5" />
                Declare {{ v.bouclage_declare ? 'OUI' : 'NON' }}
              </span>
              <button
                v-if="v.statut_geo !== 'VALIDE'"
                @click="annulerDeclaration(v)"
                class="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <RotateCcw class="w-3 h-3" />
                Corriger
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
