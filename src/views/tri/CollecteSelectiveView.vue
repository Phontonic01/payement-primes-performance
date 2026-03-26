<script setup>
import { ref, computed } from 'vue'
import { Recycle, Info, Save, ArrowLeft, Truck, Container } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useToastStore } from '@/stores/toast'
import { usePrimesStore } from '@/stores/primes'
import api from '@/api/client'

const toastStore = useToastStore()
const primesStore = usePrimesStore()

const form = ref({
  date: new Date().toISOString().split('T')[0],
  arrondissement: '',
  typeEquipement: 'BOM_CANTER',
  // BOM + Canter
  tonnageCollecte: 0,
  // Movi
  bennesLevees: 0,
})

// Calcul en temps réel de la prime selon le barème
const calculPrime = computed(() => {
  if (form.value.typeEquipement === 'BOM_CANTER') {
    return primesStore.calculerPrimeTri('BOM_CANTER', Number(form.value.tonnageCollecte))
  } else {
    return primesStore.calculerPrimeTri('MOVI', Number(form.value.bennesLevees))
  }
})

const saving = ref(false)

async function validerSaisie() {
  if (!form.value.arrondissement) {
    toastStore.addToast('Veuillez sélectionner l\'arrondissement / zone.', 'warning')
    return
  }

  saving.value = true
  try {
    await api.createTriSaisie({
      date: form.value.date,
      arrondissement: form.value.arrondissement,
      type_equipement: form.value.typeEquipement,
      tonnage_collecte: form.value.typeEquipement === 'BOM_CANTER' ? form.value.tonnageCollecte : 0,
      bennes_levees: form.value.typeEquipement === 'MOVI' ? form.value.bennesLevees : 0,
      pourcentage_prime: calculPrime.value.pourcentage,
      montant_prime: calculPrime.value.montant,
    })

    const valeur = form.value.typeEquipement === 'BOM_CANTER'
      ? `${form.value.tonnageCollecte}t`
      : `${form.value.bennesLevees} bennes`

    toastStore.addToast(
      `Saisie enregistrée — ${form.value.arrondissement} : ${valeur} → ${calculPrime.value.pourcentage}% de la prime (${calculPrime.value.montant.toLocaleString('fr-FR')} XAF).`,
      calculPrime.value.eligible ? 'success' : 'warning'
    )

    form.value.tonnageCollecte = 0
    form.value.bennesLevees = 0
  } catch (err) {
    toastStore.addToast('Erreur : ' + err.message, 'error')
  } finally {
    saving.value = false
  }
}

function primeColor(pct) {
  if (pct >= 100) return 'text-emerald-600'
  if (pct >= 75) return 'text-blue-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-500'
}

function primeBg(pct) {
  if (pct >= 100) return 'bg-emerald-50 border-emerald-200/60'
  if (pct >= 75) return 'bg-blue-50 border-blue-200/60'
  if (pct >= 50) return 'bg-amber-50 border-amber-200/60'
  return 'bg-red-50 border-red-200/60'
}
</script>

<template>
  <div class="space-y-6 max-w-3xl mx-auto">
    <!-- Page Header -->
    <div class="flex items-center gap-3">
      <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50">
        <Recycle class="w-5 h-5 text-teal-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Saisie Collecte Sélective</h1>
        <p class="text-sm text-gray-500">Service TRI — Prime de rendement par équipe d'arrondissement</p>
      </div>
    </div>

    <!-- Barème Info -->
    <div class="rounded-2xl bg-teal-50 border border-teal-100 p-4">
      <div class="flex items-start gap-3">
        <Info class="w-5 h-5 text-teal-500 mt-0.5 shrink-0" />
        <div class="text-sm text-teal-700 space-y-2">
          <p class="font-semibold">Barème de la prime TRI (par équipe de zone) :</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p class="font-medium text-teal-800 mb-1 flex items-center gap-1.5">
                <Truck class="w-4 h-4" /> BOM + Canter
              </p>
              <ul class="space-y-0.5 text-xs text-teal-600">
                <li>≥ 1,2 tonne → <strong>100%</strong> de la prime</li>
                <li>≥ 1,0 tonne → <strong>75%</strong> de la prime</li>
                <li>≥ 800 kg → <strong>50%</strong> de la prime</li>
              </ul>
            </div>
            <div>
              <p class="font-medium text-teal-800 mb-1 flex items-center gap-1.5">
                <Container class="w-4 h-4" /> Movi
              </p>
              <ul class="space-y-0.5 text-xs text-teal-600">
                <li>≥ 5 bennes levées → <strong>100%</strong> de la prime</li>
                <li>≥ 4 bennes levées → <strong>75%</strong> de la prime</li>
                <li>≥ 3 bennes levées → <strong>50%</strong> de la prime</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <BaseCard>
      <form @submit.prevent="validerSaisie" class="space-y-6">
        <!-- Date & Zone -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BaseInput v-model="form.date" type="date" label="Date" required />
          <div class="space-y-1.5">
            <label class="block text-[13px] font-medium text-gray-600">Arrondissement / Zone *</label>
            <select
              v-model="form.arrondissement"
              required
              class="block w-full text-sm bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none transition-colors"
            >
              <option value="">Sélectionner une zone</option>
              <option value="1er Arrondissement">1er Arrondissement</option>
              <option value="2ème Arrondissement">2ème Arrondissement</option>
              <option value="3ème Arrondissement">3ème Arrondissement</option>
              <option value="4ème Arrondissement">4ème Arrondissement</option>
              <option value="5ème Arrondissement">5ème Arrondissement</option>
              <option value="6ème Arrondissement">6ème Arrondissement</option>
              <option value="Owendo">Owendo</option>
              <option value="Akanda">Akanda</option>
              <option value="Ntoum">Ntoum</option>
            </select>
          </div>
        </div>

        <!-- Type d'équipement -->
        <div class="space-y-2">
          <label class="block text-[13px] font-medium text-gray-600">Type d'équipement *</label>
          <div class="grid grid-cols-2 gap-3">
            <label
              class="flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition-all"
              :class="form.typeEquipement === 'BOM_CANTER'
                ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500/20'
                : 'border-gray-200 hover:border-gray-300'"
            >
              <input type="radio" v-model="form.typeEquipement" value="BOM_CANTER" class="sr-only" />
              <Truck class="w-5 h-5" :class="form.typeEquipement === 'BOM_CANTER' ? 'text-teal-600' : 'text-gray-400'" />
              <div>
                <p class="text-sm font-semibold" :class="form.typeEquipement === 'BOM_CANTER' ? 'text-teal-700' : 'text-gray-700'">BOM + Canter</p>
                <p class="text-[11px]" :class="form.typeEquipement === 'BOM_CANTER' ? 'text-teal-500' : 'text-gray-400'">Tonnage collecté par l'équipe</p>
              </div>
            </label>
            <label
              class="flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition-all"
              :class="form.typeEquipement === 'MOVI'
                ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500/20'
                : 'border-gray-200 hover:border-gray-300'"
            >
              <input type="radio" v-model="form.typeEquipement" value="MOVI" class="sr-only" />
              <Container class="w-5 h-5" :class="form.typeEquipement === 'MOVI' ? 'text-teal-600' : 'text-gray-400'" />
              <div>
                <p class="text-sm font-semibold" :class="form.typeEquipement === 'MOVI' ? 'text-teal-700' : 'text-gray-700'">Movi</p>
                <p class="text-[11px]" :class="form.typeEquipement === 'MOVI' ? 'text-teal-500' : 'text-gray-400'">Nombre de bennes levées</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Saisie valeur selon type -->
        <div class="border-t border-gray-100 pt-6">
          <template v-if="form.typeEquipement === 'BOM_CANTER'">
            <h3 class="text-sm font-semibold text-gray-900 mb-4">Tonnage collecté par l'équipe (en tonnes)</h3>
            <div class="max-w-xs">
              <BaseInput
                v-model.number="form.tonnageCollecte"
                type="number"
                min="0"
                max="10"
                step="0.1"
                label="Tonnage total (t)"
                placeholder="Ex: 1.2"
                required
              />
              <p class="text-xs text-gray-400 mt-1.5">BOM + Canter combinés pour la zone {{ form.arrondissement || '...' }}</p>
            </div>
          </template>
          <template v-else>
            <h3 class="text-sm font-semibold text-gray-900 mb-4">Nombre de bennes levées</h3>
            <div class="max-w-xs">
              <BaseInput
                v-model.number="form.bennesLevees"
                type="number"
                min="0"
                max="20"
                step="1"
                label="Bennes levées"
                placeholder="Ex: 5"
                required
              />
              <p class="text-xs text-gray-400 mt-1.5">Bennes levées par le Movi pour la zone {{ form.arrondissement || '...' }}</p>
            </div>
          </template>
        </div>

        <!-- Calcul prime en temps réel -->
        <div class="rounded-xl border p-5 transition-all" :class="primeBg(calculPrime.pourcentage)">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prime calculée pour l'équipe</p>
              <p class="text-sm text-gray-600 mt-0.5">{{ calculPrime.palier }}</p>
            </div>
            <div class="text-right">
              <p class="text-3xl font-bold" :class="primeColor(calculPrime.pourcentage)">
                {{ calculPrime.pourcentage }}%
              </p>
              <p class="text-sm font-semibold text-gray-700">
                {{ calculPrime.montant.toLocaleString('fr-FR') }} <span class="text-xs font-normal text-gray-400">XAF</span>
              </p>
              <p class="text-[10px] text-gray-400 mt-0.5">Plafond : {{ calculPrime.plafond.toLocaleString('fr-FR') }} XAF</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <BaseButton type="button" variant="outline" @click="$router.back()">
            <ArrowLeft class="w-4 h-4" />
            Annuler
          </BaseButton>
          <BaseButton type="submit" variant="primary">
            <Save class="w-4 h-4" />
            Enregistrer
          </BaseButton>
        </div>
      </form>
    </BaseCard>
  </div>
</template>
