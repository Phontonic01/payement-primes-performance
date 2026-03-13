<script setup>
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import { Truck, AlertTriangle, XCircle } from 'lucide-vue-next'

const columns = [
  { key: 'immatriculation', label: 'Immatriculation' },
  { key: 'type', label: 'Type' },
  { key: 'dernierEntretien', label: 'Dernier Entretien (Date)' },
  { key: 'scoreMoyen', label: 'Score Moyen (Mois)' },
  { key: 'statut', label: 'Statut Flotte' },
]

const flotte = [
  { id: 1, immatriculation: 'GA-123-AB', type: 'Camion Tasseur (CT)', dernierEntretien: '2025-12-10', scoreMoyen: 8.5, statut: 'OPERATIONNEL' },
  { id: 2, immatriculation: 'GA-456-CD', type: 'Camion Tasseur (CT)', dernierEntretien: '2025-12-09', scoreMoyen: 5.0, statut: 'A_REVISER' },
  { id: 3, immatriculation: 'GA-789-EF', type: 'Camion Ampliroll (CA)', dernierEntretien: '2025-12-01', scoreMoyen: 3.2, statut: 'EN_PANNE' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Suivi des Equipements & Flotte (E32)</h1>
      <p class="text-sm text-gray-500 mt-1">Vue d'ensemble de l'etat de la flotte de vehicules</p>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <!-- Operational -->
      <div class="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Vehicules Operationnels</p>
            <p class="text-3xl font-bold text-gray-900 mt-2">
              18 <span class="text-sm font-normal text-gray-500">/ 22</span>
            </p>
          </div>
          <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50">
            <Truck class="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <div class="mt-3 h-1 rounded-full bg-gray-100">
          <div class="h-1 rounded-full bg-emerald-600" style="width: 82%"></div>
        </div>
      </div>

      <!-- Needs Revision -->
      <div class="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">A Reviser</p>
            <p class="text-3xl font-bold text-gray-900 mt-2">3</p>
          </div>
          <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50">
            <AlertTriangle class="w-5 h-5 text-amber-500" />
          </div>
        </div>
        <div class="mt-3 h-1 rounded-full bg-gray-100">
          <div class="h-1 rounded-full bg-amber-500" style="width: 14%"></div>
        </div>
      </div>

      <!-- Broken -->
      <div class="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">En Panne (Immobilises)</p>
            <p class="text-3xl font-bold text-gray-900 mt-2">1</p>
          </div>
          <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50">
            <XCircle class="w-5 h-5 text-red-500" />
          </div>
        </div>
        <div class="mt-3 h-1 rounded-full bg-gray-100">
          <div class="h-1 rounded-full bg-red-500" style="width: 5%"></div>
        </div>
      </div>
    </div>

    <!-- Fleet Table -->
    <div class="bg-white rounded-xl border border-gray-100">
      <div class="px-6 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">Detail de la flotte</h2>
      </div>
      <div class="p-0">
        <BaseTable :columns="columns" :rows="flotte">
          <template #cell-scoreMoyen="{ value }">
            <span
              class="font-bold text-sm"
              :class="value >= 7 ? 'text-emerald-600' : (value >= 5 ? 'text-amber-500' : 'text-red-500')"
            >
              {{ value.toFixed(1) }}
            </span>
          </template>
          <template #cell-statut="{ value }">
            <BaseBadge v-if="value === 'OPERATIONNEL'" status="success" text="Operationnel" />
            <BaseBadge v-else-if="value === 'A_REVISER'" status="warning" text="A reviser" />
            <BaseBadge v-else-if="value === 'EN_PANNE'" status="danger" text="En panne" />
          </template>
        </BaseTable>
      </div>
    </div>
  </div>
</template>
