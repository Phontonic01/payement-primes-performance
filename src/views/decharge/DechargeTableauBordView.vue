<script setup>
import { ref, computed, onMounted } from 'vue'
import { Factory, Truck, Weight, Clock, TrendingUp } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import api from '@/api/client'

const loading = ref(true)
const mois = ref(new Date().toISOString().slice(0, 7))
const stats = ref({ totalPesees: 0, totalTonnage: 0, nbCamions: 0, nbJours: 0 })

async function chargerStats() {
  loading.value = true
  try {
    const data = await api.pontBasculeBilan(mois.value)
    if (data?.chauffeurs) {
      stats.value = {
        totalPesees: data.chauffeurs.reduce((s, c) => s + (c.jours_present || 0), 0),
        totalTonnage: data.chauffeurs.reduce((s, c) => {
          const jours = c.detail_jours || []
          return s + jours.reduce((t, j) => t + (j.tonnage_kg || 0), 0)
        }, 0),
        nbCamions: data.chauffeurs.length,
        nbJours: data.jours_ouvres || 20,
      }
    }
  } catch (err) {
    console.error('Erreur stats décharge:', err.message)
  } finally {
    loading.value = false
  }
}

onMounted(chargerStats)

const tonnageFormate = computed(() => {
  const t = stats.value.totalTonnage / 1000
  return t >= 1000 ? (t / 1000).toFixed(1) + ' K' : t.toFixed(0)
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50">
        <Factory class="w-5 h-5 text-orange-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tableau de Bord — Décharge</h1>
        <p class="text-sm text-gray-500">Gestion des déchets — Réception et traitement</p>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <BaseCard>
        <div class="flex items-center gap-4 p-2">
          <div class="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
            <Truck class="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p class="text-sm text-gray-500">Camions reçus</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.nbCamions }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard>
        <div class="flex items-center gap-4 p-2">
          <div class="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
            <Weight class="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p class="text-sm text-gray-500">Tonnage total</p>
            <p class="text-2xl font-bold text-gray-900">{{ tonnageFormate }} t</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard>
        <div class="flex items-center gap-4 p-2">
          <div class="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
            <Clock class="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p class="text-sm text-gray-500">Jours d'activité</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.nbJours }}</p>
          </div>
        </div>
      </BaseCard>
      <BaseCard>
        <div class="flex items-center gap-4 p-2">
          <div class="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
            <TrendingUp class="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p class="text-sm text-gray-500">Pesées totales</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.totalPesees }}</p>
          </div>
        </div>
      </BaseCard>
    </div>

    <BaseCard>
      <div class="p-4 text-center text-gray-400">
        <Factory class="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p class="text-sm font-medium">Centre de gestion des déchets</p>
        <p class="text-xs mt-1">Les données de réception des camions et de traitement des déchets apparaîtront ici.</p>
      </div>
    </BaseCard>
  </div>
</template>
