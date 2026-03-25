<script setup>
import { computed } from 'vue'
import { MapPin, AlertTriangle, XCircle, ArrowRight } from 'lucide-vue-next'
import { useGeoStore } from '@/stores/geo'
import BaseBadge from './BaseBadge.vue'

const props = defineProps({
  service: { type: String, required: true }, // 'Collecte' | 'Logistique' | 'QHSE' | 'Tonnage'
})

const geoStore = useGeoStore()

const impacts = computed(() => geoStore.getImpactsPourService(props.service))
</script>

<template>
  <div v-if="impacts.length > 0" class="space-y-3">
    <div
      v-for="(impact, i) in impacts"
      :key="i"
      class="rounded-xl border-2 p-4 flex items-start gap-3"
      :class="impact.type === 'INVALIDE' ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'"
    >
      <div class="flex-shrink-0 mt-0.5">
        <XCircle v-if="impact.type === 'INVALIDE'" class="w-5 h-5 text-red-600" />
        <AlertTriangle v-else class="w-5 h-5 text-amber-600" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <MapPin class="w-3.5 h-3.5 text-blue-600" />
          <span class="text-xs font-bold uppercase tracking-wider"
            :class="impact.type === 'INVALIDE' ? 'text-red-700' : 'text-amber-700'"
          >
            Décision GEO — Fait autorité
          </span>
          <BaseBadge
            v-if="impact.type === 'INVALIDE'"
            status="danger"
            text="INVALIDÉ"
          />
          <BaseBadge
            v-else-if="impact.type === 'DEGRADE'"
            status="warning"
            text="DÉGRADÉ"
          />
          <BaseBadge
            v-else
            status="warning"
            text="ALERTE"
          />
        </div>

        <p class="text-sm font-semibold" :class="impact.type === 'INVALIDE' ? 'text-red-800' : 'text-amber-800'">
          {{ impact.agent }} <span class="font-normal text-gray-500">({{ impact.matricule }}) — {{ impact.date }} — {{ impact.circuit }}</span>
        </p>

        <p class="text-sm mt-1" :class="impact.type === 'INVALIDE' ? 'text-red-700' : 'text-amber-700'">
          {{ impact.message }}
        </p>

        <p v-if="impact.scoreForce !== undefined" class="text-xs font-bold mt-2"
          :class="impact.type === 'INVALIDE' ? 'text-red-600' : 'text-amber-600'"
        >
          Score forcé à {{ impact.scoreForce }}% par la GEO
          <span v-if="impact.scoreForce === 0"> — Prime annulée sur cet axe</span>
        </p>

        <div class="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600">
          <MapPin class="w-3 h-3" />
          Se rapprocher du service Géolocalisation
          <ArrowRight class="w-3 h-3" />
        </div>
      </div>
    </div>
  </div>
</template>
