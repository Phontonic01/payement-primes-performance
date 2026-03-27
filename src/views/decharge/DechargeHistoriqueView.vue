<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Factory, History } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import TableSkeleton from '@/components/ui/TableSkeleton.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import api from '@/api/client'

const loading = ref(true)
const moisFiltre = ref(new Date().toISOString().slice(0, 7))
const searchQuery = ref('')
const rawData = ref([])

async function charger() {
  loading.value = true
  try {
    const data = await api.pontBasculeBilan(moisFiltre.value)
    rawData.value = data?.chauffeurs || []
  } catch (err) {
    console.error('Erreur chargement décharge:', err.message)
  } finally {
    loading.value = false
  }
}

onMounted(charger)
watch(moisFiltre, charger)

const columns = [
  { key: 'immatriculation', label: 'N°Parc' },
  { key: 'chauffeur', label: 'Chauffeur' },
  { key: 'service', label: 'Service' },
  { key: 'equipe', label: 'Équipe' },
  { key: 'jours_present', label: 'Jours' },
  { key: 'taux_presenceFr', label: 'Présence' },
  { key: 'primeFr', label: 'Prime' },
]

const historiques = computed(() => {
  let list = rawData.value.map(c => ({
    ...c,
    taux_presenceFr: c.taux_presence + '%',
    primeFr: (c.prime_finale || 0).toLocaleString('fr-FR') + ' F',
  }))

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c =>
      c.chauffeur.toLowerCase().includes(q) ||
      String(c.immatriculation).includes(q)
    )
  }

  return list
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50">
        <History class="w-5 h-5 text-orange-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Historique Décharge</h1>
        <p class="text-sm text-gray-500">Bilan mensuel de tous les camions passés au pont-bascule</p>
      </div>
    </div>

    <div class="rounded-xl bg-orange-50 border border-orange-100 p-4 flex items-start gap-3">
      <Factory class="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
      <p class="text-sm text-orange-700">
        Vue consolidée de tous les chauffeurs (Collecte + TRI) avec leur tonnage, présence et prime sur la période de référence (21 → 20).
      </p>
    </div>

    <BaseCard>
      <div class="flex flex-col md:flex-row gap-4 mb-6 items-end">
        <input v-model="moisFiltre" type="month" class="block text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors" />
        <div class="flex-1 max-w-sm">
          <div class="relative">
            <input v-model="searchQuery" type="text" placeholder="Rechercher un chauffeur..." class="w-full pl-4 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 outline-none transition-colors" />
          </div>
        </div>
      </div>

      <TableSkeleton v-if="loading" :rows="5" :cols="7" />
      <template v-else>
        <BaseTable v-if="historiques.length > 0" :columns="columns" :rows="historiques" />
        <div v-else class="text-center py-12 text-gray-400">
          <Factory class="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p class="text-sm font-medium">Aucune donnée pour cette période</p>
        </div>
      </template>
    </BaseCard>
  </div>
</template>
