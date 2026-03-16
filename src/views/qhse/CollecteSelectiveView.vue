<script setup>
import { ref } from 'vue'
import { Recycle, Info, Save, ArrowLeft } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

const form = ref({
  date: new Date().toISOString().split('T')[0],
  agent: '',
  circuit: '',
  peseePlastique: 0,
  peseeCarton: 0,
  peseeAutre: 0,
})

function validerPesee() {
  if (!form.value.agent || !form.value.circuit) {
    toastStore.addToast('Veuillez renseigner l\'agent et le circuit.', 'warning')
    return
  }
  const total = Number(form.value.peseePlastique) + Number(form.value.peseeCarton) + Number(form.value.peseeAutre)
  toastStore.addToast(`Pesée enregistrée. Total sélectif: ${total} kg. Bonus applicable selon barème.`, 'success')

  // Reset
  form.value.peseePlastique = 0
  form.value.peseeCarton = 0
  form.value.peseeAutre = 0
}
</script>

<template>
  <div class="space-y-6 max-w-3xl mx-auto">
    <!-- Page Header -->
    <div class="flex items-center gap-3">
      <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50">
        <Recycle class="w-5 h-5 text-emerald-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Saisie Collecte Sélective (E42)</h1>
        <p class="text-sm text-gray-500">Service QHSE - Bonus recyclage (Plastiques, Cartons...)</p>
      </div>
    </div>

    <!-- Info Alert -->
    <div class="rounded-xl bg-blue-50 border border-blue-100 p-4">
      <div class="flex items-start gap-3">
        <Info class="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <p class="text-sm text-blue-700">
          La collecte sélective débloque un <strong>BONUS</strong> (hors barème standard de base).
          La pesée est effectuée à la base par le service QHSE.
        </p>
      </div>
    </div>

    <BaseCard>
      <form @submit.prevent="validerPesee" class="space-y-6">
        <!-- Date & Agent -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BaseInput v-model="form.date" type="date" label="Date de pesée" required />
          <div>
            <AgentSearchInput
              v-model="form.agent"
              :date="form.date"
              :filter-presents="true"
              label="Agent bénéficiaire"
              required
            />
          </div>
        </div>

        <!-- Circuit Select -->
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-900">Zone / Circuit d'origine *</label>
          <select
            v-model="form.circuit"
            required
            class="block w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          >
            <option value="">Sélectionner un circuit</option>
            <option value="PK8-PK12">PK8 - PK12</option>
            <option value="AKANDA">Akanda</option>
          </select>
        </div>

        <!-- Weighing Data -->
        <div class="border-t border-gray-100 pt-6">
          <h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Données de Pesée (kg)</h3>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BaseInput v-model.number="form.peseePlastique" type="number" min="0" step="0.5" label="Plastiques (PET/HDPE)" />
            <BaseInput v-model.number="form.peseeCarton" type="number" min="0" step="0.5" label="Cartons / Papiers" />
            <BaseInput v-model.number="form.peseeAutre" type="number" min="0" step="0.5" label="Autres recyclables" />
          </div>
        </div>

        <!-- Total Display -->
        <div class="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex justify-between items-center">
          <span class="text-sm font-medium text-emerald-800">Total Collecte Sélective</span>
          <span class="text-2xl font-bold text-emerald-600">
            {{ Number(form.peseePlastique) + Number(form.peseeCarton) + Number(form.peseeAutre) }} kg
          </span>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <BaseButton type="button" variant="outline" @click="$router.back()">
            <ArrowLeft class="w-4 h-4 mr-1.5" />
            Annuler
          </BaseButton>
          <BaseButton type="submit" variant="primary">
            <Save class="w-4 h-4 mr-1.5" />
            Enregistrer la pesée
          </BaseButton>
        </div>
      </form>
    </BaseCard>
  </div>
</template>
