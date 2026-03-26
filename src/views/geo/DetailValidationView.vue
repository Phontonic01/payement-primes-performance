<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { ArrowLeft, MapPin, CheckCircle, AlertTriangle, XCircle, Truck, Wrench, ShieldCheck, Navigation, Clock, Gauge, Upload, Image, Trash2 } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import { useGeoStore } from '@/stores/geo'
import { useSaisiesStore } from '@/stores/saisies'
import { useAgentsStore } from '@/stores/agents'

const toastStore = useToastStore()
const confirmStore = useConfirmStore()
const geoStore = useGeoStore()
const saisiesStore = useSaisiesStore()
const agentsStore = useAgentsStore()

const route = useRoute()
const router = useRouter()

// L'ID est au format "matricule__YYYY-MM-DD"
const rawId = route.params.id
const [matricule, dateIso] = rawId.split('__')

const justification = ref('')
const circuitImage = ref(null)
const circuitImageUrl = ref('')
const isDragging = ref(false)

function onDragOver(e) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    circuitImage.value = file
    circuitImageUrl.value = URL.createObjectURL(file)
  }
}

function onFileSelect(e) {
  const file = e.target?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    circuitImage.value = file
    circuitImageUrl.value = URL.createObjectURL(file)
  }
}

function supprimerImage() {
  circuitImage.value = null
  if (circuitImageUrl.value) {
    URL.revokeObjectURL(circuitImageUrl.value)
    circuitImageUrl.value = ''
  }
}

// Formater date ISO en dd/mm/yyyy
function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Charger les vraies données depuis les stores
const agent = computed(() => agentsStore.getAgentByMatricule(matricule))
const bouclage = computed(() => saisiesStore.getBouclage(matricule, dateIso))
const tonnageData = computed(() => saisiesStore.getTonnage(matricule, dateIso))
const entretienData = computed(() => saisiesStore.getEntretien(matricule, dateIso))
const qhseData = computed(() => saisiesStore.getQhse(matricule, dateIso))

const notFound = computed(() => !agent.value || !bouclage.value)

// Données GPS — à renseigner manuellement par l'opérateur GEO
const gps = ref({
  couverture: 0,
  kmParcourus: '',
  tempsCircuit: '',
  arrets: 0,
  vitesseMoyenne: 0,
  heureDepart: '',
  heureRetour: '',
  pointsGps: 0,
})

async function valider(statut) {
  if (statut !== 'VALIDE' && !justification.value) {
    toastStore.addToast('Une justification est obligatoire pour un refus ou un bouclage partiel.', 'warning')
    return
  }

  const labels = { VALIDE: 'validé à 100%', PARTIEL: 'marqué comme partiel (50%)', REFUSE: 'refusé (0%)' }

  const confirmed = await confirmStore.open({
    title: 'Décision GEO — Fait autorité',
    message: `Vous allez marquer ce bouclage comme "${labels[statut]}". Cette décision GEO prévaut sur les déclarations des autres services.${justification.value ? '\n\nMotif : ' + justification.value : ''}`,
    confirmText: 'Confirmer la décision GEO',
    cancelText: 'Annuler',
    variant: statut === 'REFUSE' ? 'danger' : 'primary'
  })

  if (confirmed) {
    // 1. Enregistrer dans le store GEO (traçabilité + impacts)
    geoStore.enregistrerDecision({
      matricule,
      date: dateIso,
      agent: agent.value.nom,
      circuit: bouclage.value.circuit,
      statut,
      couvertureGps: gps.value.couverture,
      justification: justification.value || 'Validation GEO',
      gpsData: gps.value,
      divergences: statut !== 'VALIDE' ? [
        { service: 'Collecte', message: `Bouclage déclaré OUI mais ${statut === 'REFUSE' ? 'circuit non bouclé' : 'partiellement couvert'} selon le GPS (${gps.value.couverture}%)` },
      ] : [],
    })

    // 2. PROPAGER la décision GEO vers saisiesStore → impacte le calcul de prime
    saisiesStore.majStatutGeo(matricule, dateIso, statut)

    const nbImpacts = statut !== 'VALIDE' ? ' Le score de prime de l\'agent a été impacté.' : ''
    toastStore.addToast(`Décision GEO enregistrée : bouclage ${labels[statut]} pour ${agent.value.nom} le ${formatDate(dateIso)}.${nbImpacts}`, 'success')
    router.push('/geo/validation')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <BaseButton @click="$router.back()" variant="ghost" size="sm" class="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors duration-150">
        <ArrowLeft class="w-4 h-4" />
        Retour
      </BaseButton>
      <div class="flex items-center gap-3">
        <BaseBadge status="info" text="Décision GEO — Fait autorité" />
      </div>
    </div>

    <!-- Pas trouvé -->
    <div v-if="notFound" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mb-4">
        <AlertTriangle class="w-8 h-8 text-red-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900">Bouclage introuvable</h3>
      <p class="text-sm text-gray-500 mt-1">Aucun bouclage trouvé pour le matricule {{ matricule }} à la date {{ formatDate(dateIso) }}.</p>
    </div>

    <template v-else>
      <!-- Alerte autorité -->
      <div class="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-center gap-3">
        <MapPin class="w-4 h-4 text-blue-500 flex-shrink-0" />
        <p class="text-xs text-blue-700"><strong>Votre décision fait autorité.</strong> Les données GPS prévalent sur les déclarations des services Collecte, Logistique et QHSE. Le score de prime sera directement impacté.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Colonne gauche: Info agent + données services + décision -->
        <div class="lg:col-span-1 space-y-4">

          <!-- Informations agent -->
          <BaseCard>
            <template #header>
              <h3 class="text-sm font-semibold text-gray-900">Agent & Circuit</h3>
            </template>
            <dl class="space-y-3 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-500">Agent</dt>
                <dd class="font-semibold text-gray-900">{{ agent.nom }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Matricule</dt>
                <dd class="font-mono text-gray-900">{{ agent.matricule }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Date</dt>
                <dd class="text-gray-900">{{ formatDate(dateIso) }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Circuit</dt>
                <dd class="font-semibold text-gray-900">{{ bouclage.circuit || '—' }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Fonction</dt>
                <dd class="text-gray-900">{{ agent.fonction || agent.role }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-500">Zone</dt>
                <dd class="text-gray-900">{{ agent.zone || '—' }}</dd>
              </div>
            </dl>
          </BaseCard>

          <!-- Ce que disent les autres services -->
          <BaseCard>
            <template #header>
              <h3 class="text-sm font-semibold text-gray-900">Déclarations des services</h3>
            </template>
            <div class="space-y-3">
              <!-- Collecte -->
              <div class="rounded-lg bg-emerald-50/50 border border-emerald-100 p-3">
                <div class="flex items-center gap-1.5 mb-1.5">
                  <Truck class="w-3 h-3 text-emerald-600" />
                  <span class="text-xs font-semibold text-emerald-700">COLLECTE</span>
                </div>
                <div class="text-xs space-y-0.5">
                  <p>Bouclage : <strong class="text-emerald-600">{{ bouclage.bouclageDeclare ? 'OUI' : 'NON' }}</strong></p>
                  <p v-if="tonnageData">Tonnage : <strong>{{ tonnageData.tonnage }} t</strong> ({{ tonnageData.rotations }} rot. — {{ tonnageData.vehicule }})</p>
                  <p v-else class="text-gray-400 italic">Pas de saisie tonnage ce jour</p>
                </div>
              </div>
              <!-- Logistique -->
              <div class="rounded-lg bg-amber-50/50 border border-amber-100 p-3">
                <div class="flex items-center gap-1.5 mb-1.5">
                  <Wrench class="w-3 h-3 text-amber-600" />
                  <span class="text-xs font-semibold text-amber-700">LOGISTIQUE</span>
                </div>
                <p v-if="entretienData" class="text-xs">Entretien : <strong :class="entretienData.note >= 7 ? 'text-emerald-600' : 'text-amber-600'">{{ entretienData.note.toFixed(1) }}/10</strong></p>
                <p v-else class="text-xs text-gray-400 italic">Pas de fiche entretien ce jour</p>
              </div>
              <!-- QHSE -->
              <div class="rounded-lg bg-purple-50/50 border border-purple-100 p-3">
                <div class="flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck class="w-3 h-3 text-purple-600" />
                  <span class="text-xs font-semibold text-purple-700">QHSE</span>
                </div>
                <div v-if="qhseData" class="text-xs space-y-0.5">
                  <p>Checklist : <strong>{{ qhseData.checklistSur5.toFixed(1) }}/5</strong></p>
                  <p>Alcootest : <strong :class="qhseData.alcootestPositif ? 'text-red-600' : 'text-emerald-600'">{{ qhseData.alcootestPositif ? 'POSITIF' : 'Négatif' }}</strong></p>
                  <p>EPI : <strong :class="qhseData.epiConforme ? 'text-emerald-600' : 'text-red-600'">{{ qhseData.epiConforme ? 'Conforme' : 'Non conforme' }}</strong></p>
                </div>
                <p v-else class="text-xs text-gray-400 italic">Pas de checklist QHSE ce jour</p>
              </div>
            </div>
          </BaseCard>

          <!-- Décision GEO -->
          <BaseCard class="border-2 border-blue-200">
            <template #header>
              <h3 class="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                <MapPin class="w-4 h-4" />
                Décision GEO (fait autorité)
              </h3>
            </template>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">Justification <span class="text-gray-400">(obligatoire si Partiel/Refusé)</span></label>
                <textarea
                  v-model="justification"
                  rows="3"
                  class="block w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  placeholder="Observations terrain basées sur le GPS..."
                ></textarea>
              </div>

              <div class="space-y-2.5">
                <BaseButton @click="valider('VALIDE')" variant="primary" class="w-full inline-flex items-center justify-center gap-2">
                  <CheckCircle class="w-4 h-4" />
                  Confirmer — Bouclage Complet (100%)
                </BaseButton>
                <BaseButton @click="valider('PARTIEL')" variant="outline" class="w-full inline-flex items-center justify-center gap-2 border-amber-400 text-amber-700 hover:bg-amber-50">
                  <AlertTriangle class="w-4 h-4" />
                  Infirmer — Partiel (50%)
                </BaseButton>
                <BaseButton @click="valider('REFUSE')" variant="danger" class="w-full inline-flex items-center justify-center gap-2">
                  <XCircle class="w-4 h-4" />
                  Infirmer — Refuser (0%)
                </BaseButton>
              </div>
            </div>
          </BaseCard>
        </div>

        <!-- Colonne droite: métriques GPS -->
        <div class="lg:col-span-2 space-y-4">
          <!-- Saisie données GPS terrain -->
          <BaseCard>
            <template #header>
              <h3 class="text-sm font-semibold text-gray-900">Données terrain GPS</h3>
            </template>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="space-y-1">
                <label class="text-xs font-medium text-gray-500">Couverture circuit (%)</label>
                <input v-model.number="gps.couverture" type="number" min="0" max="100" placeholder="Ex: 85"
                  class="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-mono font-bold text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  :class="gps.couverture >= 90 ? 'text-emerald-600' : gps.couverture >= 70 ? 'text-amber-600' : 'text-gray-900'"
                />
              </div>
              <div class="space-y-1">
                <label class="text-xs font-medium text-gray-500">Km parcourus</label>
                <input v-model="gps.kmParcourus" type="text" placeholder="Ex: 32.5"
                  class="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <div class="space-y-1">
                <label class="text-xs font-medium text-gray-500">Heure départ</label>
                <input v-model="gps.heureDepart" type="time"
                  class="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <div class="space-y-1">
                <label class="text-xs font-medium text-gray-500">Heure retour</label>
                <input v-model="gps.heureRetour" type="time"
                  class="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
            </div>

            <!-- Barre couverture -->
            <div v-if="gps.couverture > 0" class="mt-4">
              <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span>Couverture du circuit assigné</span>
                <span class="font-bold" :class="gps.couverture >= 90 ? 'text-emerald-600' : gps.couverture >= 70 ? 'text-amber-600' : 'text-red-600'">
                  {{ gps.couverture }}%
                </span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-3">
                <div
                  class="h-3 rounded-full transition-all duration-500"
                  :class="gps.couverture >= 90 ? 'bg-emerald-500' : gps.couverture >= 70 ? 'bg-amber-500' : 'bg-red-500'"
                  :style="{ width: gps.couverture + '%' }"
                ></div>
              </div>
            </div>
          </BaseCard>

          <!-- Carte du circuit — Glisser-déposer -->
          <BaseCard class="h-full flex flex-col">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-gray-900">Carte du circuit (capture d'écran)</h3>
                <span v-if="circuitImage" class="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">Image chargée</span>
              </div>
            </template>

            <!-- Image déjà chargée -->
            <div v-if="circuitImageUrl" class="relative">
              <img :src="circuitImageUrl" alt="Carte du circuit" class="w-full rounded-lg border border-gray-200" />
              <button
                type="button"
                @click="supprimerImage"
                class="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg shadow-lg hover:bg-red-700 transition-colors cursor-pointer"
              >
                <Trash2 class="w-3.5 h-3.5" />
                Supprimer
              </button>
              <div class="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <Image class="w-3.5 h-3.5" />
                {{ circuitImage.name }} — {{ (circuitImage.size / 1024).toFixed(0) }} Ko
              </div>
            </div>

            <!-- Zone de glisser-déposer -->
            <div
              v-else
              class="flex-1 min-h-[300px] rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center cursor-pointer"
              :class="isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
              @drop="onDrop"
              @click="$refs.fileInput.click()"
            >
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onFileSelect"
              />
              <div class="text-center px-6">
                <div
                  class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-colors"
                  :class="isDragging ? 'bg-blue-100' : 'bg-white border border-gray-200 shadow-sm'"
                >
                  <Upload class="w-8 h-8" :class="isDragging ? 'text-blue-600' : 'text-gray-400'" />
                </div>
                <p class="text-sm font-semibold" :class="isDragging ? 'text-blue-700' : 'text-gray-700'">
                  {{ isDragging ? 'Relâchez pour déposer' : 'Glissez-déposez la carte du circuit ici' }}
                </p>
                <p class="text-xs text-gray-400 mt-1.5">
                  Capture d'écran GPS montrant le circuit bouclé ou non bouclé
                </p>
                <p class="text-xs text-gray-400 mt-1">
                  ou <span class="text-blue-600 font-medium">cliquez pour parcourir</span>
                </p>
                <p class="text-[10px] text-gray-300 mt-3">PNG, JPG, WEBP — max 10 Mo</p>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>
    </template>
  </div>
</template>
