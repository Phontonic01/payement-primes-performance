<script setup>
import { ref } from 'vue'
import { Wine, CheckCircle, XCircle, Save } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'

const form = ref({
  date: new Date().toISOString().split('T')[0],
  heure: new Date().toTimeString().split(' ')[0].substring(0, 5),
  agent: '',
  resultat: 'NEGATIF', // NEGATIF (0g/l) ou POSITIF (>0g/l)
  taux: 0,
  observations: ''
})

function submitForm() {
  if (!form.value.agent) {
    alert('Veuillez sélectionner un agent.')
    return
  }

  if (form.value.resultat === 'POSITIF') {
    alert(`ATTENTION: Alcootest positif enregistré (${form.value.taux} g/l). Pénalité de 5 points appliquée. Note administrative potentielle.`)
  } else {
    alert('Alcootest négatif enregistré avec succès.')
  }

  // Reset
  form.value.agent = ''
  form.value.resultat = 'NEGATIF'
  form.value.taux = 0
  form.value.observations = ''
}
</script>

<template>
  <div class="space-y-6 max-w-3xl mx-auto">
    <!-- Page Header -->
    <div class="flex items-center gap-3">
      <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50">
        <Wine class="w-5 h-5 text-emerald-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Saisie Alcootest (E41)</h1>
        <p class="text-sm text-gray-500">Service QHSE - Contrôle d'alcoolémie</p>
      </div>
    </div>

    <BaseCard>
      <form @submit.prevent="submitForm" class="space-y-6">
        <!-- Date & Time -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BaseInput v-model="form.date" type="date" label="Date de contrôle" required />
          <BaseInput v-model="form.heure" type="time" label="Heure de contrôle" required />
        </div>

        <!-- Agent Select -->
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-900">Agent contrôlé *</label>
          <select
            v-model="form.agent"
            required
            class="block w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          >
            <option value="">Sélectionner un agent</option>
            <option value="ID_1">Jean MOUSSAVOU</option>
            <option value="ID_2">Paul ONDO</option>
            <option value="ID_3">Kevin MVOUMA</option>
          </select>
        </div>

        <!-- Test Result -->
        <div class="border-t border-gray-100 pt-6">
          <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Résultat du Test</h3>

          <div class="grid grid-cols-2 gap-4 mb-6">
            <!-- Négatif Card -->
            <label
              class="relative flex cursor-pointer rounded-xl border-2 bg-white p-4 transition-all duration-200 hover:shadow-sm"
              :class="form.resultat === 'NEGATIF' ? 'border-emerald-500 bg-emerald-50/30 shadow-sm' : 'border-gray-200 hover:border-gray-300'"
            >
              <input type="radio" v-model="form.resultat" value="NEGATIF" class="sr-only" aria-labelledby="status-negatif" />
              <div class="flex flex-1 items-start justify-between">
                <div class="flex flex-col">
                  <span id="status-negatif" class="text-sm font-semibold text-gray-900">Négatif (0 g/l)</span>
                  <span class="mt-1 text-sm text-gray-500">Conforme, pas de pénalité</span>
                </div>
                <CheckCircle
                  class="w-5 h-5 transition-colors"
                  :class="form.resultat === 'NEGATIF' ? 'text-emerald-500' : 'text-gray-300'"
                />
              </div>
            </label>

            <!-- Positif Card -->
            <label
              class="relative flex cursor-pointer rounded-xl border-2 bg-white p-4 transition-all duration-200 hover:shadow-sm"
              :class="form.resultat === 'POSITIF' ? 'border-red-500 bg-red-50/30 shadow-sm' : 'border-gray-200 hover:border-gray-300'"
            >
              <input type="radio" v-model="form.resultat" value="POSITIF" class="sr-only" aria-labelledby="status-positif" />
              <div class="flex flex-1 items-start justify-between">
                <div class="flex flex-col">
                  <span id="status-positif" class="text-sm font-semibold text-gray-900">Positif (> 0 g/l)</span>
                  <span class="mt-1 text-sm font-medium text-red-500">Pénalité (-5 pts)</span>
                </div>
                <XCircle
                  class="w-5 h-5 transition-colors"
                  :class="form.resultat === 'POSITIF' ? 'text-red-500' : 'text-gray-300'"
                />
              </div>
            </label>
          </div>

          <!-- Positive Result Details -->
          <div v-if="form.resultat === 'POSITIF'" class="rounded-xl bg-red-50 border border-red-100 p-4 mb-6 space-y-3">
            <BaseInput v-model="form.taux" type="number" step="0.01" label="Taux relevé (g/l) *" required />
            <p class="text-sm text-red-600 font-medium">
              Une pénalité totale (-5 pts) s'appliquera sur l'axe QHSE pour cet agent ce mois-ci.
            </p>
          </div>
        </div>

        <!-- Observations -->
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-900">Observations</label>
          <textarea
            v-model="form.observations"
            rows="2"
            class="block w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            placeholder="Ajouter des observations..."
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <BaseButton type="button" variant="outline" @click="$router.back()">Annuler</BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            :class="form.resultat === 'POSITIF' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : ''"
          >
            <Save class="w-4 h-4 mr-1.5" />
            {{ form.resultat === 'POSITIF' ? 'Enregistrer (Positif)' : 'Enregistrer Alcootest' }}
          </BaseButton>
        </div>
      </form>
    </BaseCard>
  </div>
</template>
