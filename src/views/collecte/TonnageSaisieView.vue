<script setup>
import { ref, computed } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import { Truck, Weight, RotateCcw, Calendar, User, Gauge } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

const agent = ref('')
const vehiculeType = ref('BOM')
const date = ref(new Date().toISOString().split('T')[0])
const tonnage = ref('')
const rotations = ref('')
const vehicules = ['BOM', 'Plateaux', 'Bennes', 'Movi', 'Canter']

// Mock calculation based on specs
const scoreEstime = computed(() => {
  if (!tonnage.value || !rotations.value) return null

  const t = parseFloat(tonnage.value)
  const r = parseInt(rotations.value)

  const avg = t / r

  if (vehiculeType.value === 'BOM') {
    if (avg >= 11) return { score: 100, label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' }
    if (avg >= 8) return { score: 75, label: 'Bien', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' }
    if (avg >= 7) return { score: 50, label: 'Passable', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' }
    return { score: 0, label: 'Insuffisant', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
  }

  return { score: '--', label: 'Calcul generique', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' }
})

function submit() {
  toastStore.addToast('Tonnage enregistré avec succès. (Simulation)', 'success')
  tonnage.value = ''
  rotations.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Saisie Tonnage</h1>
        <p class="text-sm text-gray-500 mt-0.5">Module E10 — Chauffeur PL + Ripeurs</p>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
        <Truck class="w-4 h-4 text-emerald-600" />
        <span class="text-sm font-medium text-gray-700">Service Collecte</span>
      </div>
    </div>

    <!-- Main form card -->
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Weight class="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900">Nouveau releve</h3>
          <p class="text-xs text-gray-500">Saisie du tonnage journalier et nombre de rotations</p>
        </div>
      </div>

      <form @submit.prevent="submit" class="p-6 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Agent selector -->
          <div>
            <AgentSearchInput
              v-model="agent"
              :date="date"
              :filter-presents="true"
              label="Agent (Chauffeur)"
              required
            />
          </div>

          <!-- Vehicle type -->
          <div>
            <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <Truck class="w-3.5 h-3.5 text-gray-400" />
              Type de vehicule
            </label>
            <select
              v-model="vehiculeType"
              class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-200"
            >
              <option v-for="v in vehicules" :key="v" :value="v">{{ v }}</option>
            </select>
          </div>

          <!-- Date -->
          <div>
            <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <Calendar class="w-3.5 h-3.5 text-gray-400" />
              Date du releve
            </label>
            <input
              v-model="date"
              type="date"
              required
              class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-200"
            />
          </div>

          <!-- Tonnage -->
          <div>
            <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <Weight class="w-3.5 h-3.5 text-gray-400" />
              Tonnage total (tonnes)
            </label>
            <input
              v-model="tonnage"
              type="number"
              step="0.1"
              placeholder="Ex: 8.5"
              required
              class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-200"
            />
          </div>

          <!-- Rotations -->
          <div>
            <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <RotateCcw class="w-3.5 h-3.5 text-gray-400" />
              Nombre de rotations
            </label>
            <input
              v-model="rotations"
              type="number"
              placeholder="Ex: 2"
              required
              class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors duration-200"
            />
          </div>
        </div>

        <!-- Score estimate panel -->
        <div
          v-if="scoreEstime"
          class="rounded-xl border p-5 transition-all duration-300"
          :class="[scoreEstime.bg, scoreEstime.border]"
        >
          <div class="flex items-center gap-2 mb-3">
            <Gauge class="w-4 h-4" :class="scoreEstime.color" />
            <h4 class="text-sm font-semibold text-gray-900">Estimation du score journalier</h4>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-gray-500 mb-1">Moyenne calculee</p>
              <p class="text-xl font-bold font-mono text-gray-900">{{ (tonnage / rotations).toFixed(2) }} <span class="text-sm font-normal text-gray-500">t / rotation</span></p>
            </div>
            <div class="text-right">
              <p class="text-xs font-medium text-gray-500 mb-1">Score estime</p>
              <p class="text-3xl font-bold font-mono tracking-tight" :class="scoreEstime.color">{{ scoreEstime.score }} %</p>
              <p class="text-xs font-semibold uppercase tracking-wider mt-0.5" :class="scoreEstime.color">{{ scoreEstime.label }}</p>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div class="flex justify-end pt-4 border-t border-gray-100">
          <BaseButton type="submit" variant="primary">Enregistrer le tonnage</BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
