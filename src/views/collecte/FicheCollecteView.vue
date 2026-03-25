<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSaisiesStore } from '@/stores/saisies'
import { formatDateFr } from '@/utils/formatDate'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import {
  FileText, User, Users, MapPin, Route, Truck, Weight, RotateCcw, Hash,
  Calendar, Clock, ArrowLeft, Plus, Printer, CheckCircle, AlertTriangle
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const saisiesStore = useSaisiesStore()

const ficheId = computed(() => route.params.id)
const fiche = computed(() => saisiesStore.getFicheCollecte(ficheId.value))

function imprimer() {
  window.print()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Fiche introuvable -->
    <div v-if="!fiche" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mb-4">
        <AlertTriangle class="w-8 h-8 text-red-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900">Fiche introuvable</h3>
      <p class="text-sm text-gray-500 mt-1">La fiche {{ ficheId }} n'existe pas ou a été supprimée.</p>
      <BaseButton @click="router.push('/collecte/tonnage')" variant="primary" class="mt-6">
        <ArrowLeft class="w-4 h-4 mr-1.5" />
        Retour à la saisie
      </BaseButton>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <FileText class="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Fiche de Collecte</h1>
            <p class="text-sm text-gray-500">{{ fiche.id }} — Enregistrée le {{ new Date(fiche.timestamp).toLocaleString('fr-FR') }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <BaseButton @click="imprimer" variant="outline">
            <Printer class="w-4 h-4 mr-1.5" />
            Imprimer
          </BaseButton>
          <BaseButton @click="router.push('/collecte/tonnage')" variant="primary">
            <Plus class="w-4 h-4 mr-1.5" />
            Nouvelle saisie
          </BaseButton>
        </div>
      </div>

      <!-- Bandeau de confirmation -->
      <div class="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
        <CheckCircle class="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <p class="text-sm font-semibold text-emerald-800">Fiche enregistrée et partagée avec tous les services</p>
          <p class="text-xs text-emerald-600 mt-1">Les services GEO, Logistique, QHSE et DAF ont accès à ces informations pour compléter leurs évaluations.</p>
        </div>
      </div>

      <!-- Fiche principale -->
      <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <!-- Titre fiche (style imprimable) -->
        <div class="px-6 py-5 border-b border-gray-100 bg-gray-50">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-gray-900">FICHE DE COLLECTE JOURNALIÈRE</h2>
              <p class="text-sm text-gray-500 mt-0.5">Clean Africa — Paiement de la Prime de Performance</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-400 font-medium">Référence</p>
              <p class="text-sm font-bold text-emerald-700 font-mono">{{ fiche.id }}</p>
            </div>
          </div>
        </div>

        <div class="p-6 space-y-6">

          <!-- Date & Véhicule -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <div class="flex items-center gap-2 mb-2">
                <Calendar class="w-4 h-4 text-gray-400" />
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</span>
              </div>
              <p class="text-lg font-bold text-gray-900">{{ formatDateFr(fiche.date) }}</p>
            </div>
            <div class="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <div class="flex items-center gap-2 mb-2">
                <Truck class="w-4 h-4 text-emerald-600" />
                <span class="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Véhicule</span>
              </div>
              <p class="text-lg font-bold text-gray-900">{{ fiche.vehicule.type }} N°{{ fiche.vehicule.noParc }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ fiche.vehicule.immatriculation || 'Sans immatriculation' }}</p>
            </div>
            <div class="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <div class="flex items-center gap-2 mb-2">
                <Clock class="w-4 h-4 text-gray-400" />
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Horodatage</span>
              </div>
              <p class="text-sm font-semibold text-gray-900">{{ new Date(fiche.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}</p>
              <p class="text-xs text-gray-500 mt-0.5">Saisie effectuée</p>
            </div>
          </div>

          <!-- Équipe -->
          <div>
            <h3 class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users class="w-4 h-4 text-gray-400" />
              Équipe de collecte
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <!-- Chauffeur -->
              <div class="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {{ fiche.chauffeur.nom.charAt(0) }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-gray-900 truncate">{{ fiche.chauffeur.nom }}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="flex items-center gap-1 text-xs text-gray-500">
                        <Hash class="w-3 h-3" />{{ fiche.chauffeur.matricule }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="mt-3">
                  <BaseBadge status="success" text="Chauffeur PL" />
                </div>
              </div>

              <!-- Ripeur 1 -->
              <div class="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {{ fiche.ripeur1.nom.charAt(0) }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-gray-900 truncate">{{ fiche.ripeur1.nom }}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="flex items-center gap-1 text-xs text-gray-500">
                        <Hash class="w-3 h-3" />{{ fiche.ripeur1.matricule }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="mt-3">
                  <BaseBadge status="info" text="Ripeur 1" />
                </div>
              </div>

              <!-- Ripeur 2 -->
              <div class="rounded-xl border p-4" :class="fiche.ripeur2 ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-gray-50'">
                <template v-if="fiche.ripeur2">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {{ fiche.ripeur2.nom.charAt(0) }}
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-bold text-gray-900 truncate">{{ fiche.ripeur2.nom }}</p>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="flex items-center gap-1 text-xs text-gray-500">
                          <Hash class="w-3 h-3" />{{ fiche.ripeur2.matricule }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="mt-3">
                    <BaseBadge status="info" text="Ripeur 2" />
                  </div>
                </template>
                <template v-else>
                  <div class="flex items-center justify-center h-full py-4">
                    <p class="text-sm text-gray-400 italic">Pas de 2e ripeur</p>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Arrondissement & Circuit -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <div class="flex items-center gap-2 mb-2">
                <MapPin class="w-4 h-4 text-amber-600" />
                <span class="text-xs font-semibold text-amber-700 uppercase tracking-wider">Arrondissement</span>
              </div>
              <p class="text-sm font-bold text-gray-900">{{ fiche.arrondissement }}</p>
              <p v-if="fiche.secteur" class="text-xs text-gray-500 mt-1">Secteur : {{ fiche.secteur }}</p>
            </div>
            <div class="rounded-xl bg-purple-50 border border-purple-200 p-4">
              <div class="flex items-center gap-2 mb-2">
                <Route class="w-4 h-4 text-purple-600" />
                <span class="text-xs font-semibold text-purple-700 uppercase tracking-wider">Circuit</span>
              </div>
              <p class="text-sm font-bold text-gray-900">{{ fiche.circuit || 'Non spécifié' }}</p>
            </div>
          </div>

          <!-- Données de performance -->
          <div class="rounded-xl bg-gray-900 text-white p-6">
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Données de performance</h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <div class="flex items-center gap-1.5 mb-1">
                  <Weight class="w-3.5 h-3.5 text-emerald-400" />
                  <span class="text-xs text-gray-400">Tonnage total</span>
                </div>
                <p class="text-3xl font-bold tracking-tight">{{ fiche.tonnage }} <span class="text-sm font-normal text-gray-400">t</span></p>
              </div>
              <div>
                <div class="flex items-center gap-1.5 mb-1">
                  <RotateCcw class="w-3.5 h-3.5 text-blue-400" />
                  <span class="text-xs text-gray-400">Rotations</span>
                </div>
                <p class="text-3xl font-bold tracking-tight">{{ fiche.rotations }}</p>
              </div>
              <div>
                <div class="flex items-center gap-1.5 mb-1">
                  <Truck class="w-3.5 h-3.5 text-amber-400" />
                  <span class="text-xs text-gray-400">Moyenne / rotation</span>
                </div>
                <p class="text-3xl font-bold tracking-tight">{{ (fiche.tonnage / fiche.rotations).toFixed(2) }} <span class="text-sm font-normal text-gray-400">t</span></p>
              </div>
              <div>
                <div class="flex items-center gap-1.5 mb-1">
                  <Users class="w-3.5 h-3.5 text-purple-400" />
                  <span class="text-xs text-gray-400">Agents concernés</span>
                </div>
                <p class="text-3xl font-bold tracking-tight">{{ fiche.ripeur2 ? 3 : 2 }}</p>
              </div>
            </div>
          </div>

          <!-- Statut par service -->
          <div>
            <h3 class="text-sm font-semibold text-gray-900 mb-3">Suivi par service</h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                <Truck class="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
                <p class="text-xs font-semibold text-emerald-800">Collecte</p>
                <BaseBadge status="success" text="Enregistré" class="mt-1.5" />
              </div>
              <div class="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
                <MapPin class="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
                <p class="text-xs font-semibold text-blue-800">Géolocalisation</p>
                <BaseBadge status="warning" text="En attente" class="mt-1.5" />
              </div>
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                <Truck class="w-5 h-5 text-amber-600 mx-auto mb-1.5" />
                <p class="text-xs font-semibold text-amber-800">Logistique</p>
                <BaseBadge status="warning" text="En attente" class="mt-1.5" />
              </div>
              <div class="rounded-xl border border-purple-200 bg-purple-50 p-3 text-center">
                <Users class="w-5 h-5 text-purple-600 mx-auto mb-1.5" />
                <p class="text-xs font-semibold text-purple-800">QHSE</p>
                <BaseBadge status="warning" text="En attente" class="mt-1.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex flex-col sm:flex-row justify-between gap-3 print:hidden">
        <BaseButton @click="router.push('/collecte/historique')" variant="outline">
          <ArrowLeft class="w-4 h-4 mr-1.5" />
          Historique des saisies
        </BaseButton>
        <BaseButton @click="router.push('/collecte/tonnage')" variant="primary">
          <Plus class="w-4 h-4 mr-1.5" />
          Nouvelle saisie d'équipe
        </BaseButton>
      </div>
    </template>
  </div>
</template>
