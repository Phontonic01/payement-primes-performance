<script setup>
import { ref, computed } from 'vue'
import { Play, CheckCircle, AlertTriangle } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import { usePontBasculeStore } from '@/stores/pontBascule'
import { useSaisiesStore } from '@/stores/saisies'

const pontBasculeStore = usePontBasculeStore()
const saisiesStore = useSaisiesStore()

const mois = ref(new Date().toISOString().slice(0, 7))
const estConsolide = ref(false)
const enCours = ref(false)
const erreur = ref('')

async function lancerMoteur() {
  enCours.value = true
  erreur.value = ''
  try {
    // Charger le bilan pont-bascule (source principale)
    pontBasculeStore.moisCharge = ''
    await pontBasculeStore.chargerBilan(mois.value)

    // Charger les saisies locales (bouclage, entretien, QHSE)
    await saisiesStore.chargerMois(mois.value)

    estConsolide.value = true
  } catch (e) {
    erreur.value = e.message
  } finally {
    enCours.value = false
  }
}

const stats = computed(() => pontBasculeStore.stats)
const nbSaisies = computed(() => saisiesStore.stats)
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Consolidation des Donnees</h1>
      <p class="text-sm text-gray-500 mt-1">DAF — Croisement pont-bascule + saisies des services</p>
    </div>

    <BaseCard>
      <div class="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between mb-8">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mois de traitement</label>
          <input type="month" v-model="mois"
            class="block w-48 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition" />
        </div>
        <BaseButton @click="lancerMoteur" variant="primary" size="lg" :disabled="enCours" class="w-full md:w-auto cursor-pointer">
          <Play v-if="!enCours" class="w-4 h-4 mr-2" />
          {{ enCours ? 'Consolidation en cours...' : 'Lancer la Consolidation' }}
        </BaseButton>
      </div>

      <!-- Sources -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="rounded-xl p-4 text-center border transition-colors"
          :class="estConsolide && stats ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'">
          <h4 class="text-sm font-medium text-gray-500 mb-2">Pont-Bascule (Tonnage)</h4>
          <BaseBadge v-if="estConsolide && stats" status="success" :text="stats.nbChauffeurs + ' chauffeurs'" />
          <BaseBadge v-else status="neutral" text="En attente" />
        </div>
        <div class="rounded-xl p-4 text-center border transition-colors"
          :class="estConsolide && nbSaisies.nbBouclages > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'">
          <h4 class="text-sm font-medium text-gray-500 mb-2">Bouclages (GEO)</h4>
          <BaseBadge v-if="estConsolide" :status="nbSaisies.nbBouclages > 0 ? 'success' : 'warning'" :text="nbSaisies.nbBouclages + ' bouclages'" />
          <BaseBadge v-else status="neutral" text="En attente" />
        </div>
        <div class="rounded-xl p-4 text-center border transition-colors"
          :class="estConsolide && nbSaisies.nbEntretiens > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'">
          <h4 class="text-sm font-medium text-gray-500 mb-2">Entretiens (Logistique)</h4>
          <BaseBadge v-if="estConsolide" :status="nbSaisies.nbEntretiens > 0 ? 'success' : 'warning'" :text="nbSaisies.nbEntretiens + ' fiches'" />
          <BaseBadge v-else status="neutral" text="En attente" />
        </div>
        <div class="rounded-xl p-4 text-center border transition-colors"
          :class="estConsolide && nbSaisies.nbQhse > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'">
          <h4 class="text-sm font-medium text-gray-500 mb-2">QHSE (Securite)</h4>
          <BaseBadge v-if="estConsolide" :status="nbSaisies.nbQhse > 0 ? 'success' : 'warning'" :text="nbSaisies.nbQhse + ' evaluations'" />
          <BaseBadge v-else status="neutral" text="En attente" />
        </div>
      </div>

      <!-- Erreur -->
      <div v-if="erreur" class="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 mb-6">
        <AlertTriangle class="w-5 h-5 text-red-500 mt-0.5" />
        <div>
          <p class="text-sm font-semibold text-red-700">Erreur de consolidation</p>
          <p class="text-xs text-red-600 mt-0.5">{{ erreur }}</p>
        </div>
      </div>

      <!-- Résultat -->
      <div v-if="estConsolide && stats" class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="bg-gray-50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 class="font-bold text-gray-900">Resultat de la consolidation</h3>
          <BaseBadge status="success" text="Calcul Termine" />
        </div>
        <div class="p-6">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="text-center">
              <p class="text-2xl font-bold text-gray-900">{{ stats.nbChauffeurs }}</p>
              <p class="text-xs text-gray-500">Agents traites</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-emerald-600">{{ stats.totalPrime.toLocaleString() }} F</p>
              <p class="text-xs text-gray-500">Reste a decaisser</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-red-600">-{{ stats.totalPenalites.toLocaleString() }} F</p>
              <p class="text-xs text-gray-500">Penalites cumulees</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-gray-900">{{ stats.presenceMoyenne.toFixed(0) }}%</p>
              <p class="text-xs text-gray-500">Presence moyenne</p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <BaseButton @click="$router.push('/daf/budget')" variant="outline">
              Vue budgetaire
            </BaseButton>
            <BaseButton @click="$router.push('/daf/validation')" variant="primary">
              Passer a la validation finale &rarr;
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Chargement -->
      <div v-else-if="enCours" class="text-center py-12 text-gray-500">
        <div class="inline-block h-8 w-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <p>Chargement des donnees pont-bascule et saisies services...</p>
      </div>

      <!-- Vide -->
      <div v-else class="text-center py-12 text-gray-400">
        Cliquez sur "Lancer la Consolidation" pour croiser les donnees du pont-bascule avec les saisies des services.
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.border-3 { border-width: 3px; }
</style>
