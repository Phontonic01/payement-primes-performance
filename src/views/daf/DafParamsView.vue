<script setup>
import { ref, watch } from 'vue'
import { AlertTriangle, Lock, Unlock, FileText, Eye } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useToastStore } from '@/stores/toast'
import { usePrimesStore } from '@/stores/primes'

const toastStore = useToastStore()
const primesStore = usePrimesStore()

// ── Note de service pour autoriser la modification ──
const noteDeServiceActive = ref(false)
const noteDeServiceRef = ref('')
const noteDeServiceDate = ref('')

function activerNoteDeService() {
  if (!noteDeServiceRef.value.trim() || !noteDeServiceDate.value) {
    toastStore.addToast('Veuillez renseigner la référence et la date de la note de service.', 'warning')
    return
  }
  noteDeServiceActive.value = true
  toastStore.addToast(`Note de service ${noteDeServiceRef.value} activée. Les paramètres sont désormais modifiables.`, 'success')
}

function desactiverNoteDeService() {
  noteDeServiceActive.value = false
  noteDeServiceRef.value = ''
  noteDeServiceDate.value = ''
  // Recharger les valeurs actuelles (annuler les modifications non sauvegardées)
  ponderations.value = { ...primesStore.ponderations }
  config.value = {
    seuilMinPrime: primesStore.config.seuilMinPrime,
    seuilPresence: primesStore.config.seuilPresence,
    joursOuvresMois: primesStore.config.joursOuvresMois,
    plafondCollecte: primesStore.config.plafonds.CHAUFFEUR_COLLECTE,
    plafondTri: primesStore.config.plafonds.CHAUFFEUR_TRI,
  }
  toastStore.addToast('Note de service désactivée. Les paramètres sont verrouillés.', 'info')
}

// ── Valeurs actuelles depuis le store ──
const ponderations = ref({ ...primesStore.ponderations })
const config = ref({
  seuilMinPrime: primesStore.config.seuilMinPrime,
  seuilPresence: primesStore.config.seuilPresence,
  joursOuvresMois: primesStore.config.joursOuvresMois,
  plafondCollecte: primesStore.config.plafonds.CHAUFFEUR_COLLECTE,
  plafondTri: primesStore.config.plafonds.CHAUFFEUR_TRI,
})

const totalPonderation = ref(0)
watch(ponderations, (p) => {
  totalPonderation.value = p.tonnage + p.bouclage + p.entretien + p.qhse
}, { immediate: true, deep: true })

function saveParams() {
  if (!noteDeServiceActive.value) {
    toastStore.addToast('Impossible : une note de service officielle est requise pour modifier les paramètres.', 'warning')
    return
  }
  if (totalPonderation.value !== 100) {
    toastStore.addToast(`Le total des pondérations doit être 100% (actuellement ${totalPonderation.value}%).`, 'warning')
    return
  }

  primesStore.ponderations.tonnage = ponderations.value.tonnage
  primesStore.ponderations.bouclage = ponderations.value.bouclage
  primesStore.ponderations.entretien = ponderations.value.entretien
  primesStore.ponderations.qhse = ponderations.value.qhse
  primesStore.config.seuilMinPrime = config.value.seuilMinPrime
  primesStore.config.seuilPresence = config.value.seuilPresence
  primesStore.config.joursOuvresMois = config.value.joursOuvresMois
  primesStore.config.plafonds.CHAUFFEUR_COLLECTE = config.value.plafondCollecte
  primesStore.config.plafonds.RIPEUR_COLLECTE = config.value.plafondCollecte
  primesStore.config.plafonds.CHAUFFEUR_TRI = config.value.plafondTri
  primesStore.config.plafonds.RIPEUR_TRI = config.value.plafondTri

  toastStore.addToast(`Paramètres mis à jour (Réf: ${noteDeServiceRef.value}). Les calculs utilisent désormais ces valeurs.`, 'success')
}

// Classes pour les inputs verrouillés / déverrouillés
const inputClass = 'block w-full rounded-xl px-3 py-2.5 text-sm text-center font-bold transition-colors'
const lockedClass = 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
const unlockedClass = 'bg-white border border-amber-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Paramètres du moteur de calcul</h1>
      <p class="text-sm text-gray-500 mt-1">DAF — Consultation des règles de calcul de la prime</p>
    </div>

    <!-- ── Note de Service (contrôle de modification) ── -->
    <BaseCard>
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex items-center gap-3 flex-shrink-0">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center"
            :class="noteDeServiceActive ? 'bg-amber-50 ring-1 ring-amber-500/20' : 'bg-gray-50 ring-1 ring-gray-200'"
          >
            <FileText class="w-5 h-5" :class="noteDeServiceActive ? 'text-amber-600' : 'text-gray-400'" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-900">Note de Service Officielle</h3>
            <p class="text-xs text-gray-400">
              {{ noteDeServiceActive
                ? `Réf. ${noteDeServiceRef} du ${new Date(noteDeServiceDate).toLocaleDateString('fr-FR')} — Modification autorisée`
                : 'Tous les paramètres sont en lecture seule. Une note de service est requise pour toute modification.'
              }}
            </p>
          </div>
        </div>

        <div v-if="!noteDeServiceActive" class="flex-1 flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <div class="flex-1 grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Référence</label>
              <input
                v-model="noteDeServiceRef"
                type="text"
                placeholder="Ex: NS-2026-003"
                class="block w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none"
              />
            </div>
            <div class="space-y-1">
              <label class="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Date</label>
              <input
                v-model="noteDeServiceDate"
                type="date"
                class="block w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none"
              />
            </div>
          </div>
          <BaseButton @click="activerNoteDeService" variant="outline" size="sm">
            <Unlock class="w-3.5 h-3.5" />
            Déverrouiller
          </BaseButton>
        </div>
        <div v-else>
          <BaseButton @click="desactiverNoteDeService" variant="ghost" size="sm" class="text-amber-600 hover:text-amber-700">
            <Lock class="w-3.5 h-3.5" />
            Reverrouiller
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- ── Info lecture seule ── -->
    <div v-if="!noteDeServiceActive" class="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex items-start gap-3">
      <Eye class="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
      <div>
        <p class="text-sm text-blue-700 font-medium">Mode consultation</p>
        <p class="text-xs text-blue-600 mt-0.5">Les paramètres ci-dessous reflètent la configuration actuelle. Aucune modification n'est possible sans note de service officielle.</p>
      </div>
    </div>

    <div v-if="noteDeServiceActive" class="rounded-2xl bg-amber-50 border border-amber-200/60 p-4 flex items-start gap-3">
      <AlertTriangle class="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <p class="text-sm text-amber-700">
        <strong>Mode modification activé</strong> (Réf: {{ noteDeServiceRef }}). Toute modification impactera <strong>immédiatement</strong> les calculs du mois en cours.
      </p>
    </div>

    <form @submit.prevent="saveParams" class="space-y-6">

      <!-- Pondérations des 4 axes -->
      <BaseCard title="Pondérations des axes (total = 100%)">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div v-for="(label, key) in { tonnage: 'Tonnage', bouclage: 'Bouclage', entretien: 'Entretien', qhse: 'QHSE' }" :key="key">
            <label class="block text-sm font-medium text-gray-600 mb-1.5">
              {{ label }} (%)
              <Lock v-if="!noteDeServiceActive" class="w-3 h-3 inline text-gray-300 ml-1" />
            </label>
            <input
              v-model.number="ponderations[key]"
              type="number" min="0" max="100" required
              :disabled="!noteDeServiceActive"
              :class="[inputClass, noteDeServiceActive ? unlockedClass : lockedClass]"
            />
          </div>
        </div>
        <div class="flex items-center gap-2 px-4 py-2.5 rounded-xl" :class="totalPonderation === 100 ? 'bg-emerald-50 border border-emerald-200/60' : 'bg-red-50 border border-red-200/60'">
          <span class="text-sm font-medium" :class="totalPonderation === 100 ? 'text-emerald-700' : 'text-red-700'">
            Total : {{ totalPonderation }}%
          </span>
          <span v-if="totalPonderation !== 100" class="text-xs text-red-500">(doit être 100%)</span>
          <span v-else class="text-xs text-emerald-600">✓ Conforme</span>
        </div>
      </BaseCard>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Seuils -->
        <BaseCard title="Seuils d'éligibilité">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1.5">
                Score minimum pour prime (%)
                <Lock v-if="!noteDeServiceActive" class="w-3 h-3 inline text-gray-300 ml-1" />
              </label>
              <input
                v-model.number="config.seuilMinPrime"
                type="number" min="0" max="100" required
                :disabled="!noteDeServiceActive"
                :class="[inputClass, 'text-left', noteDeServiceActive ? unlockedClass : lockedClass]"
              />
              <p class="text-xs text-gray-400 mt-1">En dessous de ce score, pas de prime (actuel: {{ primesStore.config.seuilMinPrime }}%)</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1.5">
                Présence minimum (%)
                <Lock v-if="!noteDeServiceActive" class="w-3 h-3 inline text-gray-300 ml-1" />
              </label>
              <input
                v-model.number="config.seuilPresence"
                type="number" min="0" max="100" required
                :disabled="!noteDeServiceActive"
                :class="[inputClass, 'text-left', noteDeServiceActive ? unlockedClass : lockedClass]"
              />
              <p class="text-xs text-gray-400 mt-1">Seuil minimum : {{ primesStore.config.seuilPresence }}%</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1.5">
                Jours ouvrés / mois
                <Lock v-if="!noteDeServiceActive" class="w-3 h-3 inline text-gray-300 ml-1" />
              </label>
              <input
                v-model.number="config.joursOuvresMois"
                type="number" min="20" max="31" required
                :disabled="!noteDeServiceActive"
                :class="[inputClass, 'text-left', noteDeServiceActive ? unlockedClass : lockedClass]"
              />
            </div>
          </div>
        </BaseCard>

        <!-- Plafonds -->
        <BaseCard title="Plafonds de prime (XAF)">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1.5">
                Plafond Collecte (Chauffeurs + Ripeurs)
                <Lock v-if="!noteDeServiceActive" class="w-3 h-3 inline text-gray-300 ml-1" />
              </label>
              <input
                v-model.number="config.plafondCollecte"
                type="number" min="0" step="1000" required
                :disabled="!noteDeServiceActive"
                :class="[inputClass, 'text-left', noteDeServiceActive ? unlockedClass : lockedClass]"
              />
              <p class="text-xs text-gray-400 mt-1">Actuel: {{ primesStore.config.plafonds.CHAUFFEUR_COLLECTE.toLocaleString('fr-FR') }} XAF</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1.5">
                Plafond TRI (Chauffeurs + Ripeurs)
                <Lock v-if="!noteDeServiceActive" class="w-3 h-3 inline text-gray-300 ml-1" />
              </label>
              <input
                v-model.number="config.plafondTri"
                type="number" min="0" step="1000" required
                :disabled="!noteDeServiceActive"
                :class="[inputClass, 'text-left', noteDeServiceActive ? unlockedClass : lockedClass]"
              />
              <p class="text-xs text-gray-400 mt-1">Actuel: {{ primesStore.config.plafonds.CHAUFFEUR_TRI.toLocaleString('fr-FR') }} XAF</p>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Bouton Enregistrer (visible uniquement en mode modification) -->
      <div v-if="noteDeServiceActive" class="flex justify-end pt-4">
        <BaseButton type="submit" variant="primary">
          Enregistrer la Configuration (Réf: {{ noteDeServiceRef }})
        </BaseButton>
      </div>
    </form>
  </div>
</template>
