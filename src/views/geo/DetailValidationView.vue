<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { ArrowLeft, MapPin, CheckCircle, AlertTriangle, XCircle } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const id = route.params.id

const justification = ref('')

function valider(statut) {
  if (statut !== 'VALIDE' && !justification.value) {
    alert('Une justification est obligatoire pour un refus ou un bouclage partiel.')
    return
  }
  alert(`Bouclage ${statut} avec succès.`)
  router.push('/geo/validation')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <BaseButton @click="$router.back()" variant="ghost" size="sm" class="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors duration-150">
        <ArrowLeft class="w-4 h-4" />
        Retour a la file
      </BaseButton>
      <h1 class="text-2xl font-bold text-gray-900">Validation Bouclage #{{ id }}</h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Panel: Info + Decision -->
      <div class="lg:col-span-1 space-y-6">
        <!-- Informations Card -->
        <BaseCard class="bg-white rounded-xl border border-gray-100">
          <template #header>
            <h3 class="text-base font-semibold text-gray-900">Informations</h3>
          </template>
          <dl class="space-y-4 text-sm">
            <div>
              <dt class="font-medium text-gray-500">Date</dt>
              <dd class="mt-1 text-gray-900">10 Decembre 2025</dd>
            </div>
            <div>
              <dt class="font-medium text-gray-500">Agent</dt>
              <dd class="mt-1 font-semibold text-gray-900">Jean MOUSSAVOU</dd>
            </div>
            <div>
              <dt class="font-medium text-gray-500">Circuit assigne</dt>
              <dd class="mt-1 text-gray-900">PK8 - PK12</dd>
            </div>
            <div>
              <dt class="font-medium text-gray-500">Declaration Collecte</dt>
              <dd class="mt-1 font-semibold text-emerald-600">OUI (Boucle)</dd>
            </div>
          </dl>
        </BaseCard>

        <!-- Decision Card -->
        <BaseCard class="bg-white rounded-xl border border-gray-100">
          <template #header>
            <h3 class="text-base font-semibold text-gray-900">Decision GEO</h3>
          </template>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Justification (Obligatoire si Partiel/Refuse)</label>
              <textarea
                v-model="justification"
                rows="3"
                class="block w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-150"
                placeholder="Saisir la raison..."
              ></textarea>
            </div>

            <div class="space-y-2.5">
              <BaseButton @click="valider('VALIDE')" variant="primary" class="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors duration-150">
                <CheckCircle class="w-4 h-4" />
                Valider Complet (100%)
              </BaseButton>
              <BaseButton @click="valider('PARTIEL')" variant="outline" class="w-full inline-flex items-center justify-center gap-2 border-amber-400 text-amber-700 hover:bg-amber-50 rounded-xl transition-colors duration-150">
                <AlertTriangle class="w-4 h-4" />
                Validation Partielle (50%)
              </BaseButton>
              <BaseButton @click="valider('REFUSE')" variant="danger" class="w-full inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors duration-150">
                <XCircle class="w-4 h-4" />
                Refuser (0%)
              </BaseButton>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Right Panel: Mock GPS Map -->
      <div class="lg:col-span-2">
        <BaseCard class="bg-white rounded-xl border border-gray-100 h-full flex flex-col">
          <template #header>
            <h3 class="text-base font-semibold text-gray-900">Trace GPS du camion (Mock)</h3>
          </template>
          <div class="flex-1 bg-gray-50 flex items-center justify-center min-h-[400px] rounded-b-xl relative overflow-hidden">
            <!-- Dot grid background -->
            <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(#059669 1px, transparent 1px); background-size: 20px 20px;"></div>
            <div class="text-center z-10">
              <div class="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white shadow-sm border border-gray-100 mb-4">
                <MapPin class="w-7 h-7 text-emerald-600" />
              </div>
              <p class="text-gray-900 font-medium">Visualisation geographique simulee</p>
              <p class="text-sm text-gray-500 mt-2">Le trace GPS correspond a <span class="font-semibold text-emerald-600">98%</span> du circuit prevu.</p>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
