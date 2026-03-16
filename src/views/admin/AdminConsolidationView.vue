<script setup>
import { ref, computed } from 'vue'
import { Play, CheckCircle } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import { useAgentsStore } from '@/stores/agents'

const agentsStore = useAgentsStore()
const nbAgents = computed(() => agentsStore.agents.length)

const mois = ref('2025-12')
const estConsolide = ref(false)
const enCours = ref(false)

function lancerMoteur() {
  enCours.value = true
  setTimeout(() => {
    enCours.value = false
    estConsolide.value = true
  }, 2000)
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Consolidation des Données (E52)</h1>
      <p class="text-sm text-gray-500 mt-1">Administration - Lancement du moteur de calcul des primes</p>
    </div>

    <BaseCard>
      <div class="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between mb-8">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mois de traitement</label>
          <input
            type="month"
            v-model="mois"
            class="block w-48 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
        </div>

        <BaseButton @click="lancerMoteur" variant="primary" size="lg" :disabled="enCours || estConsolide" :loading="enCours" class="w-full md:w-auto">
          <Play v-if="!enCours" class="w-4 h-4 mr-2" />
          Lancer le Calcul {{ mois }}
        </BaseButton>
      </div>

      <!-- Service status cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div
          class="rounded-xl p-4 text-center border transition-colors"
          :class="estConsolide ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'"
        >
          <h4 class="text-sm font-medium text-gray-500 mb-2">Service Collecte</h4>
          <BaseBadge :status="estConsolide ? 'success' : 'neutral'" :text="estConsolide ? 'Données prêtes' : 'En attente'" />
        </div>
        <div
          class="rounded-xl p-4 text-center border transition-colors"
          :class="estConsolide ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'"
        >
          <h4 class="text-sm font-medium text-gray-500 mb-2">Service GEO</h4>
          <BaseBadge :status="estConsolide ? 'success' : 'neutral'" :text="estConsolide ? 'Validations OK' : 'En attente'" />
        </div>
        <div
          class="rounded-xl p-4 text-center border transition-colors"
          :class="estConsolide ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'"
        >
          <h4 class="text-sm font-medium text-gray-500 mb-2">Service Logistique</h4>
          <BaseBadge :status="estConsolide ? 'success' : 'neutral'" :text="estConsolide ? 'Fiches reçues' : 'En attente'" />
        </div>
        <div
          class="rounded-xl p-4 text-center border transition-colors"
          :class="estConsolide ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'"
        >
          <h4 class="text-sm font-medium text-gray-500 mb-2">Service QHSE</h4>
          <BaseBadge :status="estConsolide ? 'success' : 'neutral'" :text="estConsolide ? 'Checklists lues' : 'En attente'" />
        </div>
      </div>

      <!-- Result state -->
      <div v-if="estConsolide" class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="bg-gray-50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 class="font-bold text-gray-900">Résultat de la consolidation</h3>
          <BaseBadge status="success" text="Calcul Terminé" />
        </div>
        <div class="p-6 text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-4">
            <CheckCircle class="w-6 h-6 text-emerald-600" />
          </div>
          <p class="text-lg text-gray-700 mb-2"><strong>{{ nbAgents }}</strong> agents traités avec succès.</p>
          <p class="text-sm text-gray-500 mb-6">Total des primes calculées (brouillon) : <strong class="text-gray-900">En attente de validation</strong></p>

          <BaseButton @click="$router.push('/admin/validation')" variant="outline" class="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            Passer à la validation finale &rarr;
          </BaseButton>
        </div>
      </div>

      <!-- Loading state -->
      <div v-else-if="enCours" class="text-center py-12 text-gray-500">
        <div class="inline-block h-8 w-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <p>Croisement des données en cours, veuillez patienter...</p>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-12 text-gray-400">
        Cliquez sur "Lancer le Calcul" pour croiser les données des 4 services.
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.border-3 {
  border-width: 3px;
}
</style>
