<script setup>
import { ref, watch } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useToastStore } from '@/stores/toast'
import { usePrimesStore } from '@/stores/primes'

const toastStore = useToastStore()
const primesStore = usePrimesStore()

// Charger les valeurs actuelles depuis le store
const ponderations = ref({ ...primesStore.ponderations })
const config = ref({
  seuilMinPrime: primesStore.config.seuilMinPrime,
  seuilPresence: primesStore.config.seuilPresence,
  joursOuvresMois: primesStore.config.joursOuvresMois,
  plafondCollecte: primesStore.config.plafonds.CHAUFFEUR_COLLECTE,
  plafondTri: primesStore.config.plafonds.CHAUFFEUR_TRI,
})

// Vérifier que les pondérations totalisent 100%
const totalPonderation = ref(0)
watch(ponderations, (p) => {
  totalPonderation.value = p.tonnage + p.bouclage + p.entretien + p.qhse
}, { immediate: true, deep: true })

function saveParams() {
  if (totalPonderation.value !== 100) {
    toastStore.addToast(`Le total des pondérations doit être 100% (actuellement ${totalPonderation.value}%).`, 'warning')
    return
  }

  // Écrire les pondérations dans le store primes
  primesStore.ponderations.tonnage = ponderations.value.tonnage
  primesStore.ponderations.bouclage = ponderations.value.bouclage
  primesStore.ponderations.entretien = ponderations.value.entretien
  primesStore.ponderations.qhse = ponderations.value.qhse

  // Écrire la configuration dans le store primes
  primesStore.config.seuilMinPrime = config.value.seuilMinPrime
  primesStore.config.seuilPresence = config.value.seuilPresence
  primesStore.config.joursOuvresMois = config.value.joursOuvresMois
  primesStore.config.plafonds.CHAUFFEUR_COLLECTE = config.value.plafondCollecte
  primesStore.config.plafonds.RIPEUR_COLLECTE = config.value.plafondCollecte
  primesStore.config.plafonds.CHAUFFEUR_TRI = config.value.plafondTri
  primesStore.config.plafonds.RIPEUR_TRI = config.value.plafondTri

  toastStore.addToast('Paramètres enregistrés. Les calculs de primes utilisent maintenant ces valeurs.', 'success')
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Paramétrage des Règles (E51)</h1>
      <p class="text-sm text-gray-500 mt-1">DAF - Configuration du moteur de calcul des primes</p>
    </div>

    <!-- Alert Warning -->
    <div class="rounded-xl bg-amber-50 p-4 flex items-start gap-3">
      <AlertTriangle class="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <p class="text-sm text-amber-700">
        Toute modification de ces paramètres impactera <strong>immédiatement</strong> les calculs du mois en cours (Dashboard, Recherche Agent, Consolidation).
      </p>
    </div>

    <form @submit.prevent="saveParams" class="space-y-6">

      <!-- Pondérations des 4 axes -->
      <BaseCard title="Pondérations des axes (total = 100%)">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Tonnage (%)</label>
            <input v-model.number="ponderations.tonnage" type="number" min="0" max="100" required
              class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Bouclage (%)</label>
            <input v-model.number="ponderations.bouclage" type="number" min="0" max="100" required
              class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Entretien (%)</label>
            <input v-model.number="ponderations.entretien" type="number" min="0" max="100" required
              class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">QHSE (%)</label>
            <input v-model.number="ponderations.qhse" type="number" min="0" max="100" required
              class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
          </div>
        </div>
        <div class="flex items-center gap-2 px-4 py-2.5 rounded-xl" :class="totalPonderation === 100 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'">
          <span class="text-sm font-medium" :class="totalPonderation === 100 ? 'text-emerald-700' : 'text-red-700'">
            Total : {{ totalPonderation }}%
          </span>
          <span v-if="totalPonderation !== 100" class="text-xs text-red-500">(doit être 100%)</span>
          <span v-else class="text-xs text-emerald-600">OK</span>
        </div>
      </BaseCard>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Seuils -->
        <BaseCard title="Seuils d'éligibilité">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Score minimum pour prime (%)</label>
              <input v-model.number="config.seuilMinPrime" type="number" min="0" max="100" required
                class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              <p class="text-xs text-gray-500 mt-1">En dessous de ce score, pas de prime (défaut: 60%)</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Présence minimum (%)</label>
              <input v-model.number="config.seuilPresence" type="number" min="0" max="100" required
                class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              <p class="text-xs text-gray-500 mt-1">28 jours / 30 = 93% (défaut: 93%)</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Jours ouvrés / mois</label>
              <input v-model.number="config.joursOuvresMois" type="number" min="20" max="31" required
                class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
            </div>
          </div>
        </BaseCard>

        <!-- Plafonds -->
        <BaseCard title="Plafonds de prime (XAF)">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Plafond Collecte (Chauffeurs + Ripeurs)</label>
              <input v-model.number="config.plafondCollecte" type="number" min="0" step="1000" required
                class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              <p class="text-xs text-gray-500 mt-1">Défaut: 50 000 XAF</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Plafond TRI (Chauffeurs + Ripeurs)</label>
              <input v-model.number="config.plafondTri" type="number" min="0" step="1000" required
                class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              <p class="text-xs text-gray-500 mt-1">Défaut: 25 000 XAF</p>
            </div>
          </div>
        </BaseCard>
      </div>

      <div class="flex justify-end pt-4 bg-white rounded-xl border border-gray-100 p-5">
        <BaseButton type="submit" variant="primary">Enregistrer la Configuration</BaseButton>
      </div>
    </form>
  </div>
</template>
