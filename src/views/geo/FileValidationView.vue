<script setup>
import { computed } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Eye, MapPin, Clock, CheckCircle } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useSaisiesStore } from '@/stores/saisies'

const router = useRouter()
const saisiesStore = useSaisiesStore()

const columns = [
  { key: 'dateFr', label: 'Date' },
  { key: 'agent', label: 'Agent' },
  { key: 'circuit', label: 'Circuit' },
  { key: 'declare', label: 'Déclaration (Terrain)' },
  { key: 'statutGeo', label: 'Statut GEO' },
]

// Formater date ISO en dd/mm/yyyy
function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Bouclages en attente de validation GEO
const files = computed(() => {
  return saisiesStore.getBouclagesEnAttente().map(b => ({
    id: `${b.matricule}-${b.date}`,
    matricule: b.matricule,
    date: b.date,
    dateFr: formatDate(b.date),
    agent: b.agent,
    circuit: b.circuit || 'Non spécifié',
    declare: b.bouclageDeclare ? 'OUI' : 'NON',
    statutGeo: b.statutGeo,
  }))
})

// Tous les bouclages (pour l'indicateur total)
const tousLesBouclages = computed(() => Object.values(saisiesStore.bouclages))
const nbTraites = computed(() => tousLesBouclages.value.filter(b => b.statutGeo !== 'EN_ATTENTE_GEO').length)

function voirDetails(row) {
  router.push(`/geo/detail/${row.matricule}__${row.date}`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50">
          <MapPin class="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">File de validation (E20)</h1>
          <p class="text-sm text-gray-500">Service Géolocalisation — Bouclages à valider</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div v-if="nbTraites > 0" class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle class="w-4 h-4 text-emerald-600" />
          <span class="text-sm font-medium text-emerald-700">{{ nbTraites }} traité(s)</span>
        </div>
        <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
          <Clock class="w-4 h-4 text-amber-600" />
          <span class="text-sm font-medium text-amber-700">{{ files.length }} en attente</span>
        </div>
      </div>
    </div>

    <!-- État vide -->
    <div v-if="files.length === 0" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 mb-4">
        <CheckCircle class="w-8 h-8 text-emerald-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900">Aucun bouclage en attente</h3>
      <p class="text-sm text-gray-500 mt-1 max-w-md mx-auto">
        Tous les bouclages déclarés par le service Collecte ont été traités, ou aucun bouclage n'a encore été déclaré.
      </p>
    </div>

    <!-- Validation Queue Table -->
    <BaseCard v-else class="bg-white rounded-xl border border-gray-100">
      <BaseTable :columns="columns" :rows="files">
        <template #cell-declare="{ value }">
          <span class="font-semibold" :class="value === 'OUI' ? 'text-emerald-600' : 'text-red-500'">{{ value }}</span>
        </template>
        <template #cell-statutGeo>
          <BaseBadge status="warning" text="En attente GEO" />
        </template>
        <template #actions="{ row }">
          <BaseButton @click="voirDetails(row)" variant="primary" size="sm" class="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors duration-150">
            <Eye class="w-4 h-4" />
            Analyser
          </BaseButton>
        </template>
      </BaseTable>
    </BaseCard>
  </div>
</template>
