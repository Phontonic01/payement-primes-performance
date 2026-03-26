<script setup>
import { ref, computed } from 'vue'
import {
  Eye, CheckCircle, Search, MessageSquare, Lock, Unlock,
  FileText, AlertTriangle, ChevronDown, ChevronUp, X, Send
} from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import { useAgentsStore } from '@/stores/agents'
import { usePrimesStore } from '@/stores/primes'
import { useSaisiesStore } from '@/stores/saisies'
import { usePontBasculeStore } from '@/stores/pontBascule'

const toastStore = useToastStore()
const confirmStore = useConfirmStore()
const agentsStore = useAgentsStore()
const primesStore = usePrimesStore()
const saisiesStore = useSaisiesStore()
const pontBasculeStore = usePontBasculeStore()

const moisCourant = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})()

const searchQuery = ref('')
const isValide = ref(false)

// ── Note de service officielle ──
const noteDeServiceActive = ref(false)
const noteDeServiceRef = ref('')
const noteDeServiceDate = ref('')

function activerNoteDeService() {
  if (!noteDeServiceRef.value.trim() || !noteDeServiceDate.value) {
    toastStore.addToast('Veuillez renseigner la référence et la date de la note de service.', 'warning')
    return
  }
  noteDeServiceActive.value = true
  toastStore.addToast(`Note de service ${noteDeServiceRef.value} activée. La modification des montants est désormais possible.`, 'success')
}

function desactiverNoteDeService() {
  noteDeServiceActive.value = false
  noteDeServiceRef.value = ''
  noteDeServiceDate.value = ''
  // Réinitialiser les ajustements
  ajustements.value = {}
  toastStore.addToast('Note de service désactivée. Les montants sont verrouillés.', 'info')
}

// ── Ajustements manuels des primes ──
const ajustements = ref({}) // { matricule: { montant: number, motif: string } }

// ── Demandes d'infos ──
const demandesInfos = ref({}) // { matricule: { message: string, date: string, statut: 'EN_ATTENTE'|'REPONDU' } }
const demandeModal = ref(false)
const demandeAgent = ref(null)
const demandeMessage = ref('')

function ouvrirDemandeInfos(agent) {
  demandeAgent.value = agent
  demandeMessage.value = ''
  demandeModal.value = true
}

function envoyerDemande() {
  if (!demandeMessage.value.trim()) {
    toastStore.addToast('Veuillez saisir votre demande.', 'warning')
    return
  }
  demandesInfos.value[demandeAgent.value.matricule] = {
    message: demandeMessage.value,
    date: new Date().toISOString(),
    statut: 'EN_ATTENTE',
  }
  demandeModal.value = false
  toastStore.addToast(`Demande envoyée pour ${demandeAgent.value.nom}.`, 'success')
}

// ── Agent développé (accordéon) ──
const expandedAgent = ref(null)

function toggleAgent(matricule) {
  expandedAgent.value = expandedAgent.value === matricule ? null : matricule
}

// ── Calcul des résultats depuis le pont-bascule ──
const resultats = computed(() => {
  // Priorité : chauffeurs du bilan pont-bascule
  const chauffeurs = pontBasculeStore.chauffeurs
  if (chauffeurs.length > 0) {
    return chauffeurs.map(c => {
      const ajust = ajustements.value[c.code_transporteur]
      const montantFinal = ajust ? ajust.montant : c.prime_finale
      return {
        matricule: c.code_transporteur,
        nom: c.chauffeur,
        role: c.role || 'CHAUFFEUR',
        direction: c.direction || '',
        equipe: c.equipe,
        fiche: {
          scores: { tonnage: 0, bouclage: 100, entretien: 100, qhse: 100 },
          scoreGlobal: c.plafond > 0 ? (c.prime_finale / c.plafond) * 100 : 0,
          prime: { montant: c.prime_finale, eligible: c.prime_finale > 0 },
          penalites: c.penalites,
          plafond: c.plafond,
        },
        typeAgent: 'CHAUFFEUR_COLLECTE',
        montantCalcule: c.prime_finale,
        montantFinal,
        primeAvantPresence: c.prime_avant_presence,
        tauxPresence: c.taux_presence,
        prorata: c.prorata,
        ajuste: !!ajust,
        motifAjustement: ajust?.motif || '',
        demande: demandesInfos.value[c.code_transporteur] || null,
      }
    })
  }
  // Fallback : pas de données pont-bascule
  return []
})

const filteredResultats = computed(() => {
  if (!searchQuery.value) return resultats.value
  const q = searchQuery.value.toLowerCase()
  return resultats.value.filter(r =>
    r.nom.toLowerCase().includes(q) || r.matricule.includes(q)
  )
})

const totalPrimesCalculees = computed(() =>
  resultats.value.reduce((s, r) => s + r.montantCalcule, 0)
)
const totalPrimesFinales = computed(() =>
  resultats.value.reduce((s, r) => s + r.montantFinal, 0)
)
const nbEligibles = computed(() =>
  resultats.value.filter(r => r.fiche.prime.eligible).length
)

function ajusterMontant(matricule, montant, motif) {
  ajustements.value[matricule] = { montant: Number(montant), motif }
}

async function marquerValider() {
  const confirmed = await confirmStore.open({
    title: 'Validation définitive',
    message: `Êtes-vous sûr ? Total à verser : ${totalPrimesFinales.value.toLocaleString('fr-FR')} XAF pour ${nbEligibles.value} agent(s).`,
    confirmText: 'Valider & Clôturer',
    cancelText: 'Annuler',
    variant: 'danger'
  })
  if (confirmed) {
    isValide.value = true
    toastStore.addToast('Mois clôturé. Les données sont verrouillées et les exports disponibles.', 'success')
  }
}

function scoreColor(score) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function scoreBg(score) {
  if (score >= 80) return 'bg-emerald-50 ring-1 ring-emerald-500/10'
  if (score >= 60) return 'bg-amber-50 ring-1 ring-amber-500/10'
  return 'bg-red-50 ring-1 ring-red-500/10'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Vue d'ensemble & Validation</h1>
        <p class="text-sm text-gray-500 mt-1">DAF — Consultation des scores, demandes d'infos, validation de la prime</p>
      </div>
      <div class="flex items-center gap-3">
        <div v-if="isValide">
          <BaseButton @click="$router.push('/daf/rapports')" variant="primary">
            Rapports & Exports →
          </BaseButton>
        </div>
        <div v-else>
          <BaseButton @click="marquerValider" variant="primary" :disabled="resultats.length === 0">
            <Lock class="w-4 h-4" />
            Valider & Clôturer le mois
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Validation Success -->
    <div v-if="isValide" class="rounded-2xl bg-emerald-50 border border-emerald-200/60 p-4 flex items-start gap-3">
      <CheckCircle class="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
      <p class="text-sm text-emerald-700 font-medium">
        Mois clôturé. Toutes les primes sont verrouillées. Rendez-vous dans Rapports & Exports pour télécharger.
      </p>
    </div>

    <!-- ── Note de Service (contrôle modification montant) ── -->
    <BaseCard v-if="!isValide">
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
                ? `Réf. ${noteDeServiceRef} — Modification des montants autorisée`
                : 'Requise pour modifier le montant d\'une prime'
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
            Activer
          </BaseButton>
        </div>
        <div v-else>
          <BaseButton @click="desactiverNoteDeService" variant="ghost" size="sm" class="text-amber-600 hover:text-amber-700">
            <Lock class="w-3.5 h-3.5" />
            Verrouiller
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- ── KPIs ── -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Agents éligibles</p>
        <p class="text-3xl font-bold text-gray-900 mt-2">{{ nbEligibles }} <span class="text-base font-normal text-gray-400">/ {{ resultats.length }}</span></p>
      </div>
      <div class="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Total calculé</p>
        <p class="text-3xl font-bold text-gray-900 mt-2">{{ totalPrimesCalculees.toLocaleString('fr-FR') }} <span class="text-base font-normal text-gray-400">XAF</span></p>
      </div>
      <div class="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Total à verser</p>
        <p class="text-3xl font-bold mt-2" :class="totalPrimesFinales !== totalPrimesCalculees ? 'text-amber-600' : 'text-emerald-600'">
          {{ totalPrimesFinales.toLocaleString('fr-FR') }} <span class="text-base font-normal text-gray-400">XAF</span>
        </p>
        <p v-if="totalPrimesFinales !== totalPrimesCalculees" class="text-[11px] text-amber-500 mt-1 font-medium">Montant ajusté par note de service</p>
      </div>
    </div>

    <!-- ── Recherche ── -->
    <div class="relative max-w-sm">
      <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <Search class="h-4 w-4 text-gray-400" />
      </div>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Rechercher un agent (nom, matricule)..."
        class="block w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition shadow-sm"
      />
    </div>

    <!-- ── Liste des bénéficiaires ── -->
    <div class="space-y-3">
      <div
        v-for="r in filteredResultats"
        :key="r.matricule"
        class="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden transition-all duration-200"
        :class="{ 'ring-2 ring-emerald-500/20': expandedAgent === r.matricule }"
      >
        <!-- Ligne résumé -->
        <div
          class="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
          @click="toggleAgent(r.matricule)"
        >
          <!-- Avatar -->
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {{ r.nom.charAt(0) }}
          </div>

          <!-- Infos -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ r.nom }}</p>
              <span class="text-[10px] text-gray-400 font-mono">{{ r.matricule }}</span>
              <BaseBadge v-if="r.demande" :status="r.demande.statut === 'EN_ATTENTE' ? 'warning' : 'success'" text="Info demandée" />
              <BaseBadge v-if="r.ajuste" status="info" text="Ajusté" />
            </div>
            <p class="text-xs text-gray-400">{{ r.fonction }} · {{ r.zone }} · {{ r.equipe }}</p>
          </div>

          <!-- Scores rapides -->
          <div class="hidden lg:flex items-center gap-3">
            <div class="text-center px-2">
              <p class="text-[10px] text-gray-400 font-medium">Tonnage</p>
              <p class="text-sm font-bold" :class="scoreColor(r.fiche.scores.tonnage)">{{ r.fiche.scores.tonnage.toFixed(0) }}%</p>
            </div>
            <div class="text-center px-2">
              <p class="text-[10px] text-gray-400 font-medium">Bouclage</p>
              <p class="text-sm font-bold" :class="scoreColor(r.fiche.scores.bouclage)">{{ r.fiche.scores.bouclage.toFixed(0) }}%</p>
            </div>
            <div class="text-center px-2">
              <p class="text-[10px] text-gray-400 font-medium">Entretien</p>
              <p class="text-sm font-bold" :class="scoreColor(r.fiche.scores.entretien)">{{ r.fiche.scores.entretien.toFixed(0) }}%</p>
            </div>
            <div class="text-center px-2">
              <p class="text-[10px] text-gray-400 font-medium">QHSE</p>
              <p class="text-sm font-bold" :class="scoreColor(r.fiche.scores.qhse)">{{ r.fiche.scores.qhse.toFixed(0) }}%</p>
            </div>
          </div>

          <!-- Score global + prime -->
          <div class="flex items-center gap-4 flex-shrink-0">
            <div class="text-center">
              <p class="text-[10px] text-gray-400 font-medium">Global</p>
              <div class="px-2.5 py-1 rounded-lg" :class="scoreBg(r.fiche.scoreGlobal)">
                <p class="text-sm font-bold" :class="scoreColor(r.fiche.scoreGlobal)">{{ r.fiche.scoreGlobal.toFixed(1) }}%</p>
              </div>
            </div>
            <div class="text-right min-w-[90px]">
              <p class="text-[10px] text-gray-400 font-medium">Prime</p>
              <p class="text-lg font-bold" :class="r.fiche.prime.eligible ? 'text-gray-900' : 'text-gray-300'">
                {{ r.montantFinal.toLocaleString('fr-FR') }}
                <span class="text-xs font-normal text-gray-400">XAF</span>
              </p>
            </div>
            <component :is="expandedAgent === r.matricule ? ChevronUp : ChevronDown" class="w-4 h-4 text-gray-400" />
          </div>
        </div>

        <!-- Détail déplié -->
        <div v-if="expandedAgent === r.matricule" class="border-t border-gray-100 px-5 py-5 bg-gray-50/30">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Col 1: Détail scores -->
            <div class="space-y-3">
              <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Détail des scores</h4>
              <div class="space-y-2">
                <div v-for="(axe, key) in { tonnage: 'Tonnage (50%)', bouclage: 'Bouclage (25%)', entretien: 'Entretien (15%)', qhse: 'QHSE (10%)' }" :key="key" class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">{{ axe }}</span>
                  <div class="flex items-center gap-2">
                    <div class="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all" :class="r.fiche.scores[key] >= 80 ? 'bg-emerald-500' : r.fiche.scores[key] >= 60 ? 'bg-amber-500' : 'bg-red-500'" :style="{ width: r.fiche.scores[key] + '%' }"></div>
                    </div>
                    <span class="text-sm font-semibold w-12 text-right" :class="scoreColor(r.fiche.scores[key])">{{ r.fiche.scores[key].toFixed(0) }}%</span>
                  </div>
                </div>
              </div>
              <div class="pt-2 border-t border-gray-200/60">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-semibold text-gray-700">Score global pondéré</span>
                  <span class="text-lg font-bold" :class="scoreColor(r.fiche.scoreGlobal)">{{ r.fiche.scoreGlobal.toFixed(1) }}%</span>
                </div>
                <p v-if="!r.fiche.prime.eligible" class="text-xs text-red-500 mt-1">{{ r.fiche.prime.raison }}</p>
              </div>
            </div>

            <!-- Col 2: Prime & ajustement -->
            <div class="space-y-3">
              <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Montant de la prime</h4>
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Montant calculé</span>
                  <span class="text-sm font-bold text-gray-900">{{ r.montantCalcule.toLocaleString('fr-FR') }} XAF</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Plafond applicable</span>
                  <span class="text-sm text-gray-500">{{ (primesStore.config.plafonds[r.typeAgent] || 50000).toLocaleString('fr-FR') }} XAF</span>
                </div>
                <div class="border-t border-gray-200/60 pt-3">
                  <label class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Montant final
                    <Lock v-if="!noteDeServiceActive" class="w-3 h-3 inline text-gray-300 ml-1" />
                    <Unlock v-else class="w-3 h-3 inline text-amber-500 ml-1" />
                  </label>
                  <div class="flex items-center gap-2">
                    <div class="relative flex-1">
                      <input
                        type="number"
                        :value="r.montantFinal"
                        :disabled="!noteDeServiceActive || isValide"
                        @change="(e) => ajusterMontant(r.matricule, e.target.value, 'Ajusté par note de service ' + noteDeServiceRef)"
                        class="block w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border transition-colors"
                        :class="noteDeServiceActive && !isValide
                          ? 'bg-white border-amber-300 text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none'
                          : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'"
                      />
                      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">XAF</span>
                    </div>
                  </div>
                  <p v-if="!noteDeServiceActive" class="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                    <Lock class="w-3 h-3" />
                    Activez une note de service pour modifier ce montant
                  </p>
                  <p v-if="r.ajuste" class="text-[11px] text-amber-600 mt-1.5 font-medium">{{ r.motifAjustement }}</p>
                </div>
              </div>
            </div>

            <!-- Col 3: Actions -->
            <div class="space-y-3">
              <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</h4>
              <div class="space-y-2">
                <button
                  @click.stop="ouvrirDemandeInfos(r)"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer text-left"
                >
                  <MessageSquare class="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div>
                    <p class="text-sm font-medium text-gray-700">Demander plus d'infos</p>
                    <p class="text-[11px] text-gray-400">Interroger le service concerné</p>
                  </div>
                </button>
                <button
                  @click.stop="$router.push('/recherche?q=' + r.matricule)"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 transition-colors cursor-pointer text-left"
                >
                  <Eye class="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p class="text-sm font-medium text-gray-700">Voir fiche complète</p>
                    <p class="text-[11px] text-gray-400">Détail des 4 axes et historique</p>
                  </div>
                </button>
                <div v-if="r.demande" class="rounded-xl bg-amber-50 border border-amber-200/60 p-3">
                  <div class="flex items-center gap-2 mb-1">
                    <AlertTriangle class="w-3.5 h-3.5 text-amber-500" />
                    <span class="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Info demandée</span>
                  </div>
                  <p class="text-xs text-amber-700">« {{ r.demande.message }} »</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="filteredResultats.length === 0 && searchQuery" class="text-center py-12">
        <p class="text-sm text-gray-400">Aucun agent trouvé pour « {{ searchQuery }} »</p>
      </div>
    </div>

    <!-- ── Modal Demande d'infos ── -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <div v-if="demandeModal" class="fixed inset-0 z-[9997] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-gray-950/40 backdrop-blur-sm" @click="demandeModal = false"></div>
          <div class="relative bg-white rounded-2xl shadow-2xl border border-gray-200/60 w-full max-w-lg overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Demande d'informations</h3>
                <p class="text-xs text-gray-400 mt-0.5">{{ demandeAgent?.nom }} ({{ demandeAgent?.matricule }})</p>
              </div>
              <button @click="demandeModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-lg hover:bg-gray-100">
                <X class="w-5 h-5" />
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-[13px] font-medium text-gray-600 mb-1.5">Votre demande</label>
                <textarea
                  v-model="demandeMessage"
                  rows="4"
                  placeholder="Ex: Merci de vérifier les données de tonnage pour cet agent — les chiffres semblent anormalement bas pour la période..."
                  class="block w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-xl placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none resize-none"
                ></textarea>
              </div>
              <div class="flex gap-3">
                <BaseButton variant="outline" class="flex-1" @click="demandeModal = false">Annuler</BaseButton>
                <BaseButton variant="primary" class="flex-1" @click="envoyerDemande">
                  <Send class="w-4 h-4" />
                  Envoyer
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
