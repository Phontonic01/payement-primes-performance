<script setup>
import { ref, computed } from 'vue'
import { ClipboardCheck, ShieldCheck, Truck, Save, ArrowLeft, AlertTriangle } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const form = ref({
  date: new Date().toISOString().split('T')[0],
  agent: '',
  epiBottes: true,
  epiGilets: true,
  epiGants: true,
  vehiculeExtincteur: true,
  vehiculeGiromassepe: true,
  vehiculeAssurance: true,
  vehiculeVisite: true,
  vehiculePermis: true,
  vehiculeCarteGrise: true,
  observations: ''
})

const calculateScore = () => {
  let score = 0;
  // EPI (Max 2 pts)
  let epiCount = 0;
  if (form.value.epiBottes) epiCount++;
  if (form.value.epiGilets) epiCount++;
  if (form.value.epiGants) epiCount++;
  score += (epiCount * (2/3));

  // Véhicule (Max 3 pts)
  let vehiculeCount = 0;
  if (form.value.vehiculeExtincteur) vehiculeCount++;
  if (form.value.vehiculeGiromassepe) vehiculeCount++;
  if (form.value.vehiculeAssurance) vehiculeCount++;
  if (form.value.vehiculeVisite) vehiculeCount++;
  if (form.value.vehiculePermis) vehiculeCount++;
  if (form.value.vehiculeCarteGrise) vehiculeCount++;
  score += (vehiculeCount * (3/6));

  return Math.min(score, 5);
}

const scoreQhse = computed(() => calculateScore())

const scoreColor = computed(() => {
  const s = scoreQhse.value
  if (s >= 4) return 'text-emerald-600'
  if (s >= 2.5) return 'text-amber-600'
  return 'text-red-600'
})

const scoreBg = computed(() => {
  const s = scoreQhse.value
  if (s >= 4) return 'bg-emerald-50 border-emerald-100'
  if (s >= 2.5) return 'bg-amber-50 border-amber-100'
  return 'bg-red-50 border-red-100'
})

function submitForm() {
  if (!form.value.agent) {
    alert('Veuillez sélectionner un agent.')
    return
  }
  alert(`Checklist enregistrée. Score santé sécurité: ${scoreQhse.value.toFixed(2)}/5`)
  // Reset simulation
  form.value.agent = ''
  form.value.observations = ''
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Page Header -->
    <div class="flex items-center gap-3">
      <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50">
        <ClipboardCheck class="w-5 h-5 text-emerald-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Checklist Terrain (E40)</h1>
        <p class="text-sm text-gray-500">Service QHSE - Vérification EPI et Documents</p>
      </div>
    </div>

    <BaseCard>
      <form @submit.prevent="submitForm" class="space-y-6">
        <!-- Date & Agent -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BaseInput v-model="form.date" type="date" label="Date de contrôle" required />

          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-900">Agent contrôlé *</label>
            <select
              v-model="form.agent"
              required
              class="block w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            >
              <option value="">Sélectionner un agent</option>
              <option value="ID_1">Jean MOUSSAVOU (Chauffeur)</option>
              <option value="ID_3">Kevin MVOUMA (Équipier)</option>
            </select>
          </div>
        </div>

        <!-- Checklist Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-100 pt-6">
          <!-- EPI Section -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <ShieldCheck class="w-4 h-4 text-emerald-600" />
              <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wide">Équipements de Protection (EPI)</h3>
            </div>
            <div class="space-y-3">
              <label class="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" v-model="form.epiBottes" class="h-4 w-4 accent-emerald-600 rounded" />
                <span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Port des bottes de sécurité</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" v-model="form.epiGilets" class="h-4 w-4 accent-emerald-600 rounded" />
                <span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Port des gilets réfléchissants</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" v-model="form.epiGants" class="h-4 w-4 accent-emerald-600 rounded" />
                <span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Port des gants</span>
              </label>
            </div>
          </div>

          <!-- Documents/Véhicule Section -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <Truck class="w-4 h-4 text-emerald-600" />
              <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wide">Conformité Véhicule / Documents</h3>
            </div>
            <div class="space-y-3">
              <label class="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" v-model="form.vehiculeExtincteur" class="h-4 w-4 accent-emerald-600 rounded" />
                <span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Extincteur valide</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" v-model="form.vehiculeGiromassepe" class="h-4 w-4 accent-emerald-600 rounded" />
                <span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Girophare fonctionnel</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" v-model="form.vehiculeAssurance" class="h-4 w-4 accent-emerald-600 rounded" />
                <span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Assurance à jour</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" v-model="form.vehiculeVisite" class="h-4 w-4 accent-emerald-600 rounded" />
                <span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Visite technique à jour</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" v-model="form.vehiculePermis" class="h-4 w-4 accent-emerald-600 rounded" />
                <span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Permis de conduire valide</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" v-model="form.vehiculeCarteGrise" class="h-4 w-4 accent-emerald-600 rounded" />
                <span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Carte grise présente</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Score & Footer -->
        <div class="bg-gray-50/50 rounded-xl border border-gray-100 p-6 space-y-5">
          <!-- Score Display -->
          <div class="flex items-center justify-between rounded-xl border p-4" :class="scoreBg">
            <span class="text-sm font-medium text-gray-700">Score Checklist (EPI + Véhicule)</span>
            <span class="text-2xl font-bold" :class="scoreColor">
              {{ scoreQhse.toFixed(2) }} <span class="text-sm font-normal text-gray-500">/ 5 pts</span>
            </span>
          </div>

          <!-- Observations -->
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-900">Observations (Pénalités, anomalies)</label>
            <textarea
              v-model="form.observations"
              rows="2"
              class="block w-full text-sm bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              placeholder="Ajouter des observations..."
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3">
            <BaseButton type="button" variant="outline" @click="$router.back()">
              <ArrowLeft class="w-4 h-4 mr-1.5" />
              Annuler
            </BaseButton>
            <BaseButton type="submit" variant="primary">
              <Save class="w-4 h-4 mr-1.5" />
              Enregistrer la checklist
            </BaseButton>
          </div>
        </div>
      </form>
    </BaseCard>
  </div>
</template>
