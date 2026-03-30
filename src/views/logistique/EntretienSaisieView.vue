<script setup>
import { ref, computed } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import DateInput from '@/components/ui/DateInput.vue'
import { ClipboardCheck, Gauge } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useSaisiesStore } from '@/stores/saisies'
import { useAuthStore } from '@/stores/auth'
import { useVehiculesStore } from '@/stores/vehicules'
import ReadOnlyBanner from '@/components/ui/ReadOnlyBanner.vue'

const toastStore = useToastStore()
const saisiesStore = useSaisiesStore()
const authStore = useAuthStore()
const vehiculesStore = useVehiculesStore()
const readOnly = computed(() => authStore.isReadOnly())

const form = ref({
  date: new Date().toISOString().split('T')[0],
  agent: '',
  vehicule: '',
  etatPneus: 10,
  niveauxHuile: 10,
  proprete: 10,
  etatMecanique: 10,
  observations: ''
})

const scoreEntretien = computed(() => {
  return (form.value.etatPneus + form.value.niveauxHuile + form.value.proprete + form.value.etatMecanique) / 4
})

function submitForm() {
  if (!form.value.vehicule) {
    toastStore.addToast('Veuillez selectionner un vehicule.', 'warning')
    return
  }
  saisiesStore.enregistrerEntretien({
    matricule: form.value.vehicule,
    date: form.value.date,
    agent: form.value.vehicule,
    vehicule: form.value.vehicule,
    etatMecanique: form.value.etatMecanique,
    proprete: form.value.proprete,
    respectControles: form.value.etatPneus,
    degradations: form.value.observations,
    note: scoreEntretien.value,
  })
  toastStore.addToast(`Fiche d'entretien enregistree pour ${form.value.vehicule}. Score: ${scoreEntretien.value.toFixed(1)}/10`, 'success')
  form.value = {
    date: new Date().toISOString().split('T')[0],
    agent: '',
    vehicule: '',
    etatPneus: 10,
    niveauxHuile: 10,
    proprete: 10,
    etatMecanique: 10,
    observations: ''
  }
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Saisie Fiche Entretien (E30)</h1>
      <p class="text-sm text-gray-500 mt-1">Service Logistique — Evaluation de l'etat du materiel</p>
    </div>

    <ReadOnlyBanner service="Logistique" />

    <!-- Form Card -->
    <div class="bg-white rounded-xl border border-gray-100" :class="{ 'opacity-60 pointer-events-none': readOnly }">
      <form @submit.prevent="submitForm" class="divide-y divide-gray-100">

        <!-- Identity Fields -->
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-1.5"><label class="block text-[13px] font-medium text-gray-600">Date d'evaluation<span class="text-red-400 ml-0.5">*</span></label><DateInput v-model="form.date" required /></div>

            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-gray-900">Véhicule du parc <span class="text-red-500">*</span></label>
              <select
                v-model="form.vehicule"
                required
                class="block w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
              >
                <option value="">— Sélectionner un véhicule —</option>
                <optgroup v-for="type in vehiculesStore.typesPL" :key="type" :label="type">
                  <option
                    v-for="v in vehiculesStore.vehiculesOperationnels.filter(vv => vv.type === type)"
                    :key="v.noParc"
                    :value="`${v.type} N°${v.noParc} (${v.immatriculation || 'Sans immat'})`"
                  >
                    N°{{ v.noParc }} — {{ v.immatriculation || 'Sans immat' }} ({{ v.marque }})
                  </option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        <!-- Evaluation Criteria -->
        <div class="p-6">
          <div class="flex items-center gap-2 mb-5">
            <Gauge class="w-5 h-5 text-emerald-600" />
            <h3 class="text-base font-semibold text-gray-900">Criteres d'evaluation (Note sur 10)</h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Pneus -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-900">Etat des pneus</label>
                <span
                  class="text-sm font-bold"
                  :class="form.etatPneus >= 7 ? 'text-emerald-600' : (form.etatPneus >= 5 ? 'text-amber-500' : 'text-red-500')"
                >
                  {{ form.etatPneus }}/10
                </span>
              </div>
              <input
                type="range"
                v-model.number="form.etatPneus"
                min="0"
                max="10"
                class="w-full accent-emerald-600"
              />
            </div>

            <!-- Niveaux Huile -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-900">Niveaux (Huile, Eau)</label>
                <span
                  class="text-sm font-bold"
                  :class="form.niveauxHuile >= 7 ? 'text-emerald-600' : (form.niveauxHuile >= 5 ? 'text-amber-500' : 'text-red-500')"
                >
                  {{ form.niveauxHuile }}/10
                </span>
              </div>
              <input
                type="range"
                v-model.number="form.niveauxHuile"
                min="0"
                max="10"
                class="w-full accent-emerald-600"
              />
            </div>

            <!-- Proprete -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-900">Proprete du vehicule</label>
                <span
                  class="text-sm font-bold"
                  :class="form.proprete >= 7 ? 'text-emerald-600' : (form.proprete >= 5 ? 'text-amber-500' : 'text-red-500')"
                >
                  {{ form.proprete }}/10
                </span>
              </div>
              <input
                type="range"
                v-model.number="form.proprete"
                min="0"
                max="10"
                class="w-full accent-emerald-600"
              />
            </div>

            <!-- Etat Mecanique -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-900">Etat mecanique general</label>
                <span
                  class="text-sm font-bold"
                  :class="form.etatMecanique >= 7 ? 'text-emerald-600' : (form.etatMecanique >= 5 ? 'text-amber-500' : 'text-red-500')"
                >
                  {{ form.etatMecanique }}/10
                </span>
              </div>
              <input
                type="range"
                v-model.number="form.etatMecanique"
                min="0"
                max="10"
                class="w-full accent-emerald-600"
              />
            </div>
          </div>
        </div>

        <!-- Footer: Score + Observations + Actions -->
        <div class="p-6">
          <div class="bg-gray-50/50 rounded-xl p-5 space-y-5">
            <!-- Average Score -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <ClipboardCheck class="w-5 h-5 text-gray-500" />
                <span class="text-sm font-medium text-gray-900">Score d'Entretien (Moyenne)</span>
              </div>
              <span
                class="text-2xl font-bold"
                :class="scoreEntretien >= 7 ? 'text-emerald-600' : (scoreEntretien >= 5 ? 'text-amber-500' : 'text-red-500')"
              >
                {{ scoreEntretien.toFixed(1) }} / 10
              </span>
            </div>

            <!-- Observations -->
            <div class="space-y-1.5">
              <label class="block text-sm font-medium text-gray-900">Observations (Pannes signalees, etc.)</label>
              <textarea
                v-model="form.observations"
                rows="2"
                placeholder="Saisir vos observations..."
                class="block w-full text-sm bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
              ></textarea>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 pt-2">
              <BaseButton type="button" variant="outline" @click="$router.back()">Annuler</BaseButton>
              <BaseButton type="submit" variant="primary">Enregistrer la fiche</BaseButton>
            </div>
          </div>
        </div>

      </form>
    </div>
  </div>
</template>
