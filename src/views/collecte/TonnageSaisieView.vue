<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import DateInput from '@/components/ui/DateInput.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import {
  Truck, Calendar, Users, User, Route, Zap, Loader2, WifiOff,
  Search, RefreshCw, ArrowLeft, CheckCircle, X, ChevronRight
} from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useSaisiesStore } from '@/stores/saisies'
import { useAgentsStore } from '@/stores/agents'
import { useAuthStore } from '@/stores/auth'
import { useVehiculesStore } from '@/stores/vehicules'
import { usePrimesStore } from '@/stores/primes'
import ReadOnlyBanner from '@/components/ui/ReadOnlyBanner.vue'
import api from '@/api/client'

const toastStore = useToastStore()
const saisiesStore = useSaisiesStore()
const agentsStore = useAgentsStore()
const authStore = useAuthStore()
const vehiculesStore = useVehiculesStore()
const primesStore = usePrimesStore()
const readOnly = computed(() => authStore.isReadOnly())
const router = useRouter()

// ── Date ──
const date = ref(new Date().toISOString().split('T')[0])

// ── Données pont-bascule ──
const pontBasculeLoading = ref(false)
const pontBasculeError = ref('')
const vehiculesDuJour = ref([])
const bilanMensuel = ref(null)
const searchQuery = ref('')
const filtreEquipe = ref('TOUS')
const selectedVehicule = ref(null)

async function chargerVehiculesDuJour() {
  pontBasculeLoading.value = true
  pontBasculeError.value = ''
  vehiculesDuJour.value = []
  fermerFormulaire()
  try {
    const mois = date.value.slice(0, 7)
    const [dataJour, dataBilan] = await Promise.all([
      api.pontBasculeVehiculesDuJour(date.value, 'CLEAN AFRICA'),
      api.pontBasculeBilan(mois),
    ])

    bilanMensuel.value = dataBilan

    const bilanMap = {}
    if (dataBilan?.chauffeurs) {
      dataBilan.chauffeurs.forEach(c => { bilanMap[c.code_transporteur] = c })
    }

    vehiculesDuJour.value = (dataJour.vehicules || []).map(v => {
      const bilan = bilanMap[v.code_transporteur]
      return {
        ...v,
        bilan: bilan || null,
        jours_present: bilan?.jours_present || v.jours_present || 0,
        taux_presence: bilan?.taux_presence || v.taux_presence || 0,
        penalites_mois: bilan?.penalites || { tonnage: 0, bouclage: 0, entretien: 0, qhse: 0, total: 0 },
        prime_finale: bilan?.prime_finale ?? plafond.value,
        prorata: bilan?.prorata || false,
      }
    })

    if (vehiculesDuJour.value.length > 0) {
      toastStore.addToast(`${vehiculesDuJour.value.length} véhicule(s) · Bilan mensuel chargé`, 'success')
    }
  } catch (err) {
    pontBasculeError.value = err.message
    toastStore.addToast('Pont-bascule indisponible : ' + err.message, 'error')
  } finally {
    pontBasculeLoading.value = false
  }
}

// Recharge à chaque changement de date (mais pas au mount — onMounted s'en charge ci-dessous
// pour garantir que les stores asynchrones soient prêts).
watch(date, () => chargerVehiculesDuJour())

// Auto-chargement à l'arrivée sur la page : on attend que les stores soient prêts
// puis on déclenche le chargement des véhicules pont-bascule.
onMounted(async () => {
  try {
    await Promise.all([
      agentsStore.ensureLoaded?.(),
      primesStore.chargerConfig?.(),
    ])
  } catch { /* on continue même si un store échoue */ }
  await chargerVehiculesDuJour()
})

// ── Paramètres ──
const plafond = computed(() => primesStore.config.plafonds.CHAUFFEUR_COLLECTE)
const seuilPresence = computed(() => primesStore.config.seuilPresence)

function estimerPrime(v) {
  const p = plafond.value
  const penalites = v.penalites_mois || { tonnage: 0, bouclage: 0, entretien: 0, qhse: 0, total: 0 }
  const primeAvant = Math.max(0, p - penalites.total)
  const primeFinale = v.prime_finale ?? primeAvant
  const scoreGlobal = (primeFinale / p) * 100
  return {
    plafond: p, penalites, primeAvant, primeFinale, scoreGlobal,
    joursPresent: v.jours_present || 0,
    tauxPresence: v.taux_presence || 0,
    prorata: v.prorata || false,
  }
}

function primeColor(scoreGlobal) {
  if (scoreGlobal >= 75) return 'text-emerald-700 bg-emerald-50'
  if (scoreGlobal >= 60) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

function barColor(scoreGlobal) {
  if (scoreGlobal >= 75) return 'bg-emerald-500'
  if (scoreGlobal >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

// Filtrer la liste
const vehiculesFiltres = computed(() => {
  let list = vehiculesDuJour.value
  if (filtreEquipe.value !== 'TOUS') list = list.filter(v => v.equipe === filtreEquipe.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(v => {
      const mat = String(v.code_transporteur || '')
      return v.immatriculation.toLowerCase().includes(q) ||
        v.chauffeur.toLowerCase().includes(q) ||
        v.arrondissement.toLowerCase().includes(q) ||
        mat.includes(q) || mat.padStart(4, '0').includes(q)
    })
  }
  return list
})

const nbJour = computed(() => vehiculesDuJour.value.filter(v => v.equipe === 'JOUR').length)
const nbNuit = computed(() => vehiculesDuJour.value.filter(v => v.equipe === 'NUIT').length)

// ── Sélection véhicule → ouvre le formulaire ──
const equipeSuggestion = ref(null)
const equipeLoading = ref(false)
const equipeAcceptee = ref(false)

// ── Historique équipages ──
const historiqueVehicule = ref([])
const historiqueBilan = ref([])
const equipagesRH = ref([])         // équipages quotidiens importés depuis Excel RH
const bilanRH = ref([])             // bilan mensuel basé sur l'Excel
const historiqueLoading = ref(false)
const historiqueOuvert = ref(false)
const equipagesRHOuvert = ref(false)

// ── Historique agent (ripeur) ──
const historiqueAgent = ref(null) // { matricule, nom, saisies, bilan }
const historiqueAgentLoading = ref(false)

async function voirHistoriqueAgent(agent) {
  if (!agent) return
  if (historiqueAgent.value?.matricule === agent.matricule) {
    historiqueAgent.value = null // toggle off
    return
  }
  historiqueAgentLoading.value = true
  try {
    const data = await api.getHistoriqueAgent(agent.matricule)
    historiqueAgent.value = {
      matricule: agent.matricule,
      nom: agent.nom,
      saisies: data.saisies || [],
      bilan: data.bilan || [],
    }
  } catch { historiqueAgent.value = null }
  historiqueAgentLoading.value = false
}

async function chargerHistorique(immat, noParc) {
  historiqueLoading.value = true
  historiqueVehicule.value = []
  historiqueBilan.value = []
  equipagesRH.value = []
  bilanRH.value = []
  historiqueAgent.value = null
  try {
    const data = await api.getHistoriqueVehicule(immat, noParc)
    historiqueVehicule.value = data.saisies || []
    historiqueBilan.value = data.bilan || []
    equipagesRH.value = data.equipagesRH || []
    bilanRH.value = data.bilanRH || []
  } catch { /* pas bloquant */ }
  historiqueLoading.value = false
}

const ripeur1Matricule = ref('')
const ripeur2Matricule = ref('')
const ripeur3Matricule = ref('')
const selectedRipeur1 = ref(null)
const selectedRipeur2 = ref(null)
const selectedRipeur3 = ref(null)
const circuitSaisi = ref('')

// ── Détection chauffeur suspect (Excel non fiable) ──
const chauffeurSuspect = ref(null)  // { matricule, nom, vehicules_distincts, jours_distincts, ... }

// ── Verrouillage historique RH (date > 7 jours) ──
const SEUIL_VERROUILLAGE_JOURS = 7

const isDateHistorique = computed(() => {
  if (!date.value) return false
  const sel = new Date(date.value + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffJours = Math.floor((today - sel) / (24 * 60 * 60 * 1000))
  return diffJours > SEUIL_VERROUILLAGE_JOURS
})

const equipageVerrouille = ref(null)  // équipage Excel pour la date+véhicule exacts (mode lecture seule)
const verrouillageLoading = ref(false)
const verrouillageMessage = ref('')

// Verrou actif = on a un équipage figé issu de l'Excel pour cette date précise
const ripeursVerrouilles = computed(() => isDateHistorique.value && !!equipageVerrouille.value)

const lockReason = computed(() => {
  if (!ripeursVerrouilles.value) return ''
  const d = equipageVerrouille.value?.date?.split('-').reverse().join('/') || ''
  return `Équipage figé d'après l'Excel RH du ${d}`
})

async function chargerEquipageVerrouille() {
  equipageVerrouille.value = null
  verrouillageMessage.value = ''
  // Convention pont-bascule : v.immatriculation = n° de parc
  const noParc = String(selectedVehicule.value?.immatriculation || '').trim()
  if (!isDateHistorique.value || !noParc) return
  // Si le chauffeur est suspect, on REFUSE de verrouiller sur l'Excel : seul le pont-bascule fait foi
  if (chauffeurSuspect.value) {
    verrouillageMessage.value = `Chauffeur ${chauffeurSuspect.value.nom} déclaré sur ${chauffeurSuspect.value.vehicules_distincts} véhicules en ${chauffeurSuspect.value.jours_distincts} jours dans l'Excel — données RH non fiables. Saisie manuelle obligatoire en s'appuyant sur le pont-bascule.`
    return
  }

  verrouillageLoading.value = true
  try {
    const list = await api.getEquipesJournalieres({
      date: date.value,
      no_parc: noParc,
    })
    if (Array.isArray(list) && list.length > 0) {
      // S'il y a JOUR + NUIT, prendre celui dont le chauffeur correspond, sinon le premier
      const normalize = s => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
      const cible = normalize(selectedVehicule.value.chauffeur)
      const match = list.find(e => normalize(e.chauffeur?.nom) === cible) || list[0]
      equipageVerrouille.value = match
      // Auto-application : on remplit ET on bloque les champs
      const ripeurs = match.ripeurs || []
      const matEqu = (rp) => rp ? (agentsStore.getAgentByMatricule(rp.matricule) || { matricule: rp.matricule, nom: rp.nom, role: 'EQUIPIER', zone: '' }) : null
      ripeur1Matricule.value = ripeurs[0]?.matricule || ''
      selectedRipeur1.value = matEqu(ripeurs[0])
      ripeur2Matricule.value = ripeurs[1]?.matricule || ''
      selectedRipeur2.value = matEqu(ripeurs[1])
      ripeur3Matricule.value = ripeurs[2]?.matricule || ''
      selectedRipeur3.value = matEqu(ripeurs[2])
      circuitSaisi.value = match.affectation || ''
      equipeAcceptee.value = true
    } else {
      verrouillageMessage.value = `Aucun équipage RH pour le ${date.value.split('-').reverse().join('/')} sur le véhicule N°${selectedVehicule.value.noParc}. Saisie impossible — vérifie la date ou le véhicule.`
    }
  } catch (err) {
    verrouillageMessage.value = `Erreur de chargement : ${err.message}`
  }
  verrouillageLoading.value = false
}

// Recharge à chaque changement de date OU de véhicule (immatriculation = n° de parc en PB)
watch([date, () => selectedVehicule.value?.immatriculation], () => {
  if (isDateHistorique.value && selectedVehicule.value) {
    chargerEquipageVerrouille()
  } else {
    equipageVerrouille.value = null
    verrouillageMessage.value = ''
  }
})

async function selectionnerVehicule(v) {
  selectedVehicule.value = v
  // Reset formulaire
  ripeur1Matricule.value = ''
  ripeur2Matricule.value = ''
  ripeur3Matricule.value = ''
  selectedRipeur1.value = null
  selectedRipeur2.value = null
  selectedRipeur3.value = null
  circuitSaisi.value = ''
  equipeSuggestion.value = null
  equipeAcceptee.value = false

  // Charger historique + suggestion en parallèle
  historiqueOuvert.value = false
  equipagesRHOuvert.value = false
  // ⚠ Convention pont-bascule : v.immatriculation EST le n° de parc (ex: "237", "125")
  // Le store local utilise des plaques (ex: "JY-557-AA"), mais ici on travaille avec PB.
  const noParcVehicule = String(v.immatriculation || '').trim()
  chargerHistorique(noParcVehicule, noParcVehicule)
  equipeLoading.value = true
  chauffeurSuspect.value = null
  try {
    // 0) Détection chauffeur suspect : trop de véhicules en peu de jours → Excel non fiable
    try {
      const sus = await api.getChauffeursSuspects({ seuilVehicules: 5, seuilJours: 6, dateRef: date.value })
      if (sus?.chauffeurs_suspects?.length) {
        const normalize = s => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
        const cible = normalize(v.chauffeur)
        const match = sus.chauffeurs_suspects.find(c => normalize(c.nom) === cible)
        if (match) chauffeurSuspect.value = match
      }
    } catch { /* non bloquant */ }

    // 1) Priorité : équipage RH le plus récent depuis l'Excel (par n° de parc)
    //    Si possible, on cible la tournée où le chauffeur correspond au nom pont-bascule.
    //    SAUF si le chauffeur est marqué comme suspect → on n'utilise PAS l'Excel.
    if (noParcVehicule && !chauffeurSuspect.value) {
      const equipages = await api.getEquipeJourneeVehicule(noParcVehicule)
      if (Array.isArray(equipages) && equipages.length > 0) {
        const normalize = s => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
        const cibleNom = normalize(v.chauffeur)
        // Tournée prioritaire : même chauffeur, sinon la plus récente
        const matchChauffeur = equipages.find(e => normalize(e.chauffeur?.nom) === cibleNom)
        const eq = matchChauffeur || equipages[0]
        const ripeurs = eq.ripeurs || []
        equipeSuggestion.value = {
          source: 'EXCEL_RH',
          date_source: eq.date,
          poste: eq.poste,
          ripeur1_matricule: ripeurs[0]?.matricule || '',
          ripeur1_nom: ripeurs[0]?.nom || '',
          ripeur2_matricule: ripeurs[1]?.matricule || '',
          ripeur2_nom: ripeurs[1]?.nom || '',
          ripeur3_matricule: ripeurs[2]?.matricule || '',
          ripeur3_nom: ripeurs[2]?.nom || '',
          circuit: eq.affectation || '',
          chauffeur_match: !!matchChauffeur,
          chauffeur_nom_excel: eq.chauffeur?.nom || '',
        }
      }
    }
    // 2) Fallback : table equipes_vehicule (suggestion statique des saisies app)
    if (!equipeSuggestion.value) {
      const eq = await api.getEquipeVehicule(v.immatriculation, 'COLLECTE')
      if (eq && eq.ripeur1_matricule) equipeSuggestion.value = { ...eq, source: 'APP' }
    }
  } catch (err) {
    console.warn('Suggestion équipe échouée :', err.message)
  }
  equipeLoading.value = false

  // Scroll vers le formulaire
  setTimeout(() => {
    document.getElementById('formulaire-equipe')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 100)
}

function fermerFormulaire() {
  selectedVehicule.value = null
  equipeSuggestion.value = null
  equipeAcceptee.value = false
  ripeur1Matricule.value = ''
  ripeur2Matricule.value = ''
  ripeur3Matricule.value = ''
  selectedRipeur1.value = null
  selectedRipeur2.value = null
  selectedRipeur3.value = null
  circuitSaisi.value = ''
}

function appliquerEquipe(eq) {
  if (eq.ripeur1_matricule) {
    ripeur1Matricule.value = eq.ripeur1_matricule
    selectedRipeur1.value = agentsStore.getAgentByMatricule(eq.ripeur1_matricule)
      || { matricule: eq.ripeur1_matricule, nom: eq.ripeur1_nom }
  }
  if (eq.ripeur2_matricule) {
    ripeur2Matricule.value = eq.ripeur2_matricule
    selectedRipeur2.value = agentsStore.getAgentByMatricule(eq.ripeur2_matricule)
      || { matricule: eq.ripeur2_matricule, nom: eq.ripeur2_nom }
  }
  if (eq.ripeur3_matricule) {
    ripeur3Matricule.value = eq.ripeur3_matricule
    selectedRipeur3.value = agentsStore.getAgentByMatricule(eq.ripeur3_matricule)
      || { matricule: eq.ripeur3_matricule, nom: eq.ripeur3_nom }
  }
  if (eq.circuit) circuitSaisi.value = eq.circuit
  equipeAcceptee.value = true
}

// ── Correspondance véhicule local ──
const vehiculeLocal = computed(() => {
  if (!selectedVehicule.value) return null
  return vehiculesStore.vehiculesOperationnels.find(
    v => v.immatriculation === selectedVehicule.value.immatriculation
  ) || null
})
const vehiculeType = computed(() => vehiculeLocal.value?.type || 'BOM')

// ── Soumission ──
function submit() {
  if (!selectedVehicule.value) return
  if (!selectedRipeur1.value) {
    toastStore.addToast('Veuillez sélectionner au moins le Ripeur 1.', 'warning')
    return
  }

  const v = selectedVehicule.value
  const vLocal = vehiculeLocal.value
  const vLabel = vLocal ? `${vLocal.type} N°${vLocal.noParc} — ${vLocal.immatriculation}` : v.immatriculation
  const circuitFinal = circuitSaisi.value || v.origine

  const saisieBase = {
    date: date.value, vehicule: vehiculeType.value,
    noParc: vLocal?.noParc || '', immatriculation: v.immatriculation,
    vehiculeLabel: vLabel, tonnage: v.tonnage_tonnes, rotations: v.rotations,
    arrondissement: v.arrondissement, secteur: '', circuit: circuitFinal,
  }

  // Tonnages chauffeur + ripeurs
  saisiesStore.enregistrerTonnage({ ...saisieBase, matricule: v.code_transporteur || v.immatriculation, agent: v.chauffeur })
  saisiesStore.enregistrerTonnage({ ...saisieBase, matricule: selectedRipeur1.value.matricule, agent: selectedRipeur1.value.nom })
  if (selectedRipeur2.value) saisiesStore.enregistrerTonnage({ ...saisieBase, matricule: selectedRipeur2.value.matricule, agent: selectedRipeur2.value.nom })
  if (selectedRipeur3.value) saisiesStore.enregistrerTonnage({ ...saisieBase, matricule: selectedRipeur3.value.matricule, agent: selectedRipeur3.value.nom })

  // Fiche collecte
  const ficheId = saisiesStore.enregistrerFicheCollecte({
    date: date.value,
    chauffeur: { matricule: v.code_transporteur || v.immatriculation, nom: v.chauffeur },
    ripeur1: selectedRipeur1.value, ripeur2: selectedRipeur2.value, ripeur3: selectedRipeur3.value,
    vehiculeType: vehiculeType.value, vehiculeLabel: vLabel,
    noParc: vLocal?.noParc || '', immatriculation: v.immatriculation,
    arrondissement: v.arrondissement, secteur: '', circuit: circuitFinal,
    tonnage: v.tonnage_tonnes, rotations: v.rotations,
  })

  // Sauvegarder l'équipe pour suggestion future
  api.saveEquipeVehicule({
    immatriculation: v.immatriculation, service: 'COLLECTE',
    chauffeur_matricule: v.code_transporteur || '', chauffeur_nom: v.chauffeur || '',
    ripeur1_matricule: selectedRipeur1.value?.matricule || '', ripeur1_nom: selectedRipeur1.value?.nom || '',
    ripeur2_matricule: selectedRipeur2.value?.matricule || '', ripeur2_nom: selectedRipeur2.value?.nom || '',
    ripeur3_matricule: selectedRipeur3.value?.matricule || '', ripeur3_nom: selectedRipeur3.value?.nom || '',
    circuit: circuitFinal,
  }).catch(() => {})

  toastStore.addToast('Fiche collecte enregistrée !', 'success')
  router.push(`/collecte/fiche/${ficheId}`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Saisie Collecte</h1>
        <p class="text-sm text-gray-500 mt-0.5">Choisissez un chauffeur, ajoutez les ripeurs et le circuit</p>
      </div>
      <div class="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
        <Zap class="w-4 h-4 text-emerald-600" />
        <span class="text-sm font-medium text-emerald-700">Pont-bascule connecté</span>
      </div>
    </div>

    <ReadOnlyBanner service="Collecte" />

    <!-- Date -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Calendar class="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900">Date du relevé</h3>
          <p class="text-xs text-gray-500">Les chauffeurs sont chargés depuis le pont-bascule</p>
        </div>
      </div>
      <DateInput v-model="date" required />
      <button type="button" @click="chargerVehiculesDuJour"
        class="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer">
        <RefreshCw class="w-4 h-4" /> Actualiser
      </button>
    </div>

    <!-- ═══ LISTE DES VÉHICULES / CHAUFFEURS ═══ -->
    <div :class="{ 'opacity-60 pointer-events-none': readOnly }">

      <!-- Chargement -->
      <div v-if="pontBasculeLoading" class="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center gap-3">
        <Loader2 class="w-8 h-8 text-emerald-600 animate-spin" />
        <p class="text-sm text-gray-500">Chargement des données pont-bascule...</p>
      </div>

      <!-- Erreur -->
      <div v-else-if="pontBasculeError" class="bg-red-50 rounded-xl border border-red-200 p-6 flex items-center gap-3">
        <WifiOff class="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <p class="text-sm font-semibold text-red-800">Pont-bascule indisponible</p>
          <p class="text-xs text-red-600 mt-0.5">{{ pontBasculeError }}</p>
        </div>
      </div>

      <template v-else>
        <!-- Barre de recherche + filtres -->
        <div class="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="relative flex-1">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input v-model="searchQuery" type="text"
                placeholder="Rechercher par immatriculation, chauffeur, matricule..."
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors" />
            </div>
            <span class="font-mono font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm">
              {{ vehiculesFiltres.length }} véhicule(s)
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" @click="filtreEquipe = 'TOUS'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              :class="filtreEquipe === 'TOUS' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
              Tous ({{ vehiculesDuJour.length }})
            </button>
            <button type="button" @click="filtreEquipe = 'NUIT'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              :class="filtreEquipe === 'NUIT' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'">
              <span class="text-sm">🌙</span> Nuit ({{ nbNuit }})
            </button>
            <button type="button" @click="filtreEquipe = 'JOUR'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              :class="filtreEquipe === 'JOUR' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'">
              <span class="text-sm">☀️</span> Jour ({{ nbJour }})
            </button>
          </div>
        </div>

        <!-- Tableau des véhicules -->
        <div v-if="!selectedVehicule" class="mt-4 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Immat.</th>
                  <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Mat.</th>
                  <th class="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Chauffeur</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Tonnage</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Tours</th>
                  <th class="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Présence</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-red-500 uppercase">Sanctions</th>
                  <th class="text-right px-3 py-3 text-xs font-semibold text-emerald-600 uppercase">A payer</th>
                  <th class="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="v in vehiculesFiltres" :key="v.immatriculation"
                  class="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                  @click="selectionnerVehicule(v)">
                  <td class="px-3 py-2.5 font-mono font-semibold text-gray-900 text-xs">{{ v.immatriculation }}</td>
                  <td class="px-3 py-2.5 font-mono text-xs text-gray-500">{{ v.code_transporteur }}</td>
                  <td class="px-3 py-2.5 text-gray-900 text-xs">
                    {{ v.chauffeur }}
                    <span class="ml-1 inline-flex px-1 py-0.5 rounded text-[9px] font-bold"
                      :class="v.equipe === 'NUIT' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'">
                      {{ v.equipe === 'NUIT' ? '🌙' : '☀️' }}</span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono font-semibold text-gray-900">{{ v.tonnage_tonnes }} t</td>
                  <td class="px-3 py-2.5 text-right font-mono text-gray-700">{{ v.rotations }}</td>
                  <td class="px-3 py-2.5 text-center">
                    <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded"
                      :class="v.taux_presence >= 93 ? 'text-emerald-700 bg-emerald-50' : v.taux_presence >= 70 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'">
                      {{ v.taux_presence }}%
                    </span>
                  </td>
                  <td class="px-3 py-2.5 text-right font-mono text-xs font-semibold"
                    :class="estimerPrime(v).penalites.total > 0 ? 'text-red-600' : 'text-gray-300'">
                    {{ estimerPrime(v).penalites.total > 0 ? '-' + estimerPrime(v).penalites.total.toLocaleString() : '0' }}
                  </td>
                  <td class="px-3 py-2.5 text-right">
                    <span class="font-mono text-xs font-bold px-2 py-0.5 rounded" :class="primeColor(estimerPrime(v).scoreGlobal)">
                      {{ estimerPrime(v).primeFinale.toLocaleString() }} F
                    </span>
                  </td>
                  <td class="px-2 py-2.5">
                    <Truck class="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                  </td>
                </tr>
                <tr v-if="vehiculesFiltres.length === 0">
                  <td colspan="9" class="px-4 py-8 text-center text-gray-400">Aucun véhicule trouvé pour cette date</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Résumé global -->
        <div class="mt-4 bg-white rounded-xl border border-gray-100 px-4 py-3">
          <div class="flex flex-wrap items-center gap-6 text-xs">
            <div>
              <span class="text-gray-500">Budget total</span>
              <p class="font-mono font-bold text-gray-700">{{ (vehiculesFiltres.length * plafond).toLocaleString() }} F</p>
            </div>
            <div class="text-lg text-gray-300">−</div>
            <div>
              <span class="text-gray-500">Total sanctions</span>
              <p class="font-mono font-bold text-red-600">{{ vehiculesFiltres.reduce((s, v) => s + (v.penalites_mois?.total || 0), 0).toLocaleString() }} F</p>
            </div>
            <div class="text-lg text-gray-300">=</div>
            <div>
              <span class="text-gray-500">Total à payer</span>
              <p class="font-mono font-bold text-emerald-700 text-sm">{{ vehiculesFiltres.reduce((s, v) => s + (v.prime_finale ?? 0), 0).toLocaleString() }} F</p>
            </div>
            <div class="ml-auto text-right">
              <span class="text-gray-400">{{ vehiculesFiltres.length }} agents · Plafond {{ plafond.toLocaleString() }} F · Présence {{ seuilPresence }}%</span>
            </div>
          </div>
        </div>

        <!-- ═══ FORMULAIRE ÉQUIPE (s'affiche quand un véhicule est sélectionné) ═══ -->
        <div v-if="selectedVehicule" id="formulaire-equipe" class="mt-6 space-y-5">

          <!-- En-tête véhicule sélectionné -->
          <div class="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-300 p-5">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <Truck class="w-5 h-5 text-emerald-600" />
                <span class="text-sm font-bold text-emerald-800">Véhicule sélectionné</span>
              </div>
              <button type="button" @click="fermerFormulaire"
                class="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                <X class="w-3.5 h-3.5" /> Changer
              </button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <p class="text-[11px] text-emerald-600 font-medium">N° Parc / Immat.</p>
                <p class="font-bold text-gray-900 font-mono">{{ selectedVehicule.immatriculation }}</p>
              </div>
              <div>
                <p class="text-[11px] text-emerald-600 font-medium">Chauffeur</p>
                <p class="font-semibold text-gray-900">
                  <span class="font-mono text-xs text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded mr-1">{{ selectedVehicule.code_transporteur }}</span>
                  {{ selectedVehicule.chauffeur }}
                </p>
              </div>
              <div>
                <p class="text-[11px] text-emerald-600 font-medium">Tonnage</p>
                <p class="font-bold text-gray-900 font-mono">{{ selectedVehicule.tonnage_tonnes }} t</p>
              </div>
              <div>
                <p class="text-[11px] text-emerald-600 font-medium">Rotations</p>
                <p class="font-bold text-gray-900 font-mono">{{ selectedVehicule.rotations }}</p>
              </div>
              <div>
                <p class="text-[11px] text-emerald-600 font-medium">Arrondissement</p>
                <p class="font-semibold text-gray-900">{{ selectedVehicule.arrondissement }}</p>
              </div>
              <div>
                <p class="text-[11px] text-emerald-600 font-medium">Reste à payer</p>
                <p class="font-bold font-mono" :class="primeColor(estimerPrime(selectedVehicule).scoreGlobal)">
                  {{ estimerPrime(selectedVehicule).primeFinale.toLocaleString() }} F
                </p>
              </div>
            </div>
            <!-- Barre dégression -->
            <div class="mt-3">
              <div class="w-full h-2.5 bg-red-200 rounded-full overflow-hidden flex">
                <div class="h-full rounded-l-full transition-all duration-500"
                  :class="barColor(estimerPrime(selectedVehicule).scoreGlobal)"
                  :style="{ width: (estimerPrime(selectedVehicule).primeFinale / estimerPrime(selectedVehicule).plafond * 100) + '%' }"></div>
              </div>
            </div>
          </div>

          <!-- Bouton + panneau historique équipages -->
          <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <button type="button" @click="historiqueOuvert = !historiqueOuvert"
              class="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
              <span class="flex items-center gap-2">
                <Users class="w-4 h-4 text-gray-400" />
                Historique de ce véhicule
                <span v-if="historiqueVehicule.length > 0" class="text-xs text-gray-400 font-mono">({{ historiqueVehicule.length }} saisies)</span>
              </span>
              <ChevronRight class="w-4 h-4 text-gray-400 transition-transform" :class="{ 'rotate-90': historiqueOuvert }" />
            </button>
            <div v-if="historiqueOuvert" class="border-t border-gray-100">
              <div v-if="historiqueLoading" class="p-4 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 class="w-4 h-4 animate-spin" /> Chargement...
              </div>
              <template v-else>
                <!-- Bilan mensuel par chauffeur -->
                <div v-if="historiqueBilan.length > 0" class="p-4 border-b border-gray-100 space-y-3">
                  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bilan mensuel</p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div v-for="b in historiqueBilan" :key="b.mois + b.matricule"
                      class="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-2">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-gray-700 font-mono">{{ b.mois }}</span>
                        <span class="text-xs text-gray-500">{{ b.agent_nom }}</span>
                      </div>
                      <div class="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p class="text-[10px] text-gray-400">Jours travaillés</p>
                          <p class="font-mono font-bold text-gray-900">{{ b.jours_travailles }} j</p>
                        </div>
                        <div>
                          <p class="text-[10px] text-gray-400">Tonnage cumulé</p>
                          <p class="font-mono font-bold text-gray-900">{{ b.tonnage_cumule }} t</p>
                        </div>
                        <div>
                          <p class="text-[10px] text-gray-400">Rotations cumulées</p>
                          <p class="font-mono font-bold text-gray-900">{{ b.rotations_cumul }}</p>
                        </div>
                        <div>
                          <p class="text-[10px] text-gray-400">Moyenne / jour</p>
                          <p class="font-mono font-bold text-gray-900">{{ b.tonnage_moyen }} t</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Tableau des saisies -->
                <div v-if="historiqueVehicule.length === 0" class="p-4 text-sm text-gray-400 text-center">
                  Aucune saisie précédente pour ce véhicule
                </div>
                <div v-else class="overflow-x-auto">
                  <p class="px-4 pt-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Détail des saisies</p>
                  <table class="w-full text-xs mt-2">
                    <thead>
                      <tr class="bg-gray-50 border-b border-gray-100">
                        <th class="text-left px-3 py-2 font-semibold text-gray-500">Date</th>
                        <th class="text-left px-3 py-2 font-semibold text-gray-500">Chauffeur</th>
                        <th class="text-left px-3 py-2 font-semibold text-gray-500">Ripeur 1</th>
                        <th class="text-left px-3 py-2 font-semibold text-gray-500">Ripeur 2</th>
                        <th class="text-left px-3 py-2 font-semibold text-gray-500">Circuit</th>
                        <th class="text-right px-3 py-2 font-semibold text-gray-500">Tonnage</th>
                        <th class="text-right px-3 py-2 font-semibold text-gray-500">Rotations</th>
                        <th class="text-center px-3 py-2 font-semibold text-gray-500">Service</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                      <tr v-for="(h, i) in historiqueVehicule" :key="i" class="hover:bg-gray-50/50">
                        <td class="px-3 py-2 font-mono text-gray-700">{{ h.date.split('-').reverse().join('/') }}</td>
                        <td class="px-3 py-2 text-gray-900">{{ h.chauffeur_nom || '-' }}</td>
                        <td class="px-3 py-2 text-gray-700">{{ h.ripeur1_nom || '-' }}</td>
                        <td class="px-3 py-2 text-gray-700">{{ h.ripeur2_nom || '-' }}</td>
                        <td class="px-3 py-2 text-gray-600">{{ h.circuit || '-' }}</td>
                        <td class="px-3 py-2 text-right font-mono font-semibold text-gray-900">{{ h.tonnage }} t</td>
                        <td class="px-3 py-2 text-right font-mono text-gray-700">{{ h.rotations }}</td>
                        <td class="px-3 py-2 text-center">
                          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                            :class="h.service === 'TRI' ? 'bg-teal-100 text-teal-700' : 'bg-emerald-100 text-emerald-700'">
                            {{ h.service }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </div>
          </div>

          <!-- ─── Équipages RH (import Excel) ─── -->
          <div v-if="equipagesRH.length > 0" class="rounded-2xl bg-white border border-amber-200 overflow-hidden">
            <button type="button" @click="equipagesRHOuvert = !equipagesRHOuvert"
              class="w-full flex items-center justify-between p-4 hover:bg-amber-50/50 transition-colors cursor-pointer">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Users class="w-5 h-5 text-amber-700" />
                </div>
                <div class="text-left">
                  <span class="text-sm font-semibold text-gray-900">Équipages RH (Excel d'évaluation)</span>
                  <p class="text-xs text-gray-500">{{ equipagesRH.length }} tournées historiques · source officielle RH</p>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-gray-400 transition-transform" :class="{ 'rotate-90': equipagesRHOuvert }" />
            </button>
            <div v-if="equipagesRHOuvert" class="border-t border-amber-100">
              <!-- Bilan mensuel Excel -->
              <div v-if="bilanRH.length > 0" class="p-4 border-b border-amber-100 grid grid-cols-2 md:grid-cols-3 gap-3">
                <div v-for="b in bilanRH" :key="b.mois"
                  class="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <p class="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">{{ b.mois }}</p>
                  <p class="text-lg font-bold text-gray-900 mt-1">{{ b.tonnage_cumule?.toFixed?.(2) || 0 }} t</p>
                  <p class="text-[11px] text-gray-600">{{ b.jours_travailles }} jours · {{ b.rotations_cumul }} rot. · moy {{ b.tonnage_moyen }} t</p>
                </div>
              </div>
              <!-- Tableau des équipages -->
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="bg-amber-50/50 border-b border-amber-100">
                      <th class="text-left px-3 py-2 font-semibold text-amber-800">Date</th>
                      <th class="text-center px-3 py-2 font-semibold text-amber-800">Poste</th>
                      <th class="text-left px-3 py-2 font-semibold text-amber-800">Affectation</th>
                      <th class="text-left px-3 py-2 font-semibold text-amber-800">Chauffeur</th>
                      <th class="text-left px-3 py-2 font-semibold text-amber-800">Ripeurs</th>
                      <th class="text-right px-3 py-2 font-semibold text-amber-800">Tonnage</th>
                      <th class="text-right px-3 py-2 font-semibold text-amber-800">Rot.</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-amber-50">
                    <tr v-for="(e, i) in equipagesRH" :key="i" class="hover:bg-amber-50/30">
                      <td class="px-3 py-2 font-mono text-gray-700">{{ e.date.split('-').reverse().join('/') }}</td>
                      <td class="px-3 py-2 text-center">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          :class="e.poste === 'JOUR' ? 'bg-yellow-100 text-yellow-700' : 'bg-indigo-100 text-indigo-700'">
                          {{ e.poste }}
                        </span>
                      </td>
                      <td class="px-3 py-2 text-gray-600">{{ e.affectation || '-' }}</td>
                      <td class="px-3 py-2">
                        <div class="flex items-center gap-1.5">
                          <span class="text-gray-900">{{ e.chauffeur.nom || '-' }}</span>
                          <span class="font-mono text-[10px] text-gray-400">{{ e.chauffeur.matricule }}</span>
                          <span v-if="!e.chauffeur.rh_ok && e.chauffeur.matricule"
                            class="px-1 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold" title="Matricule absent de la base RH">
                            ⚠ HORS RH
                          </span>
                        </div>
                      </td>
                      <td class="px-3 py-2">
                        <div class="flex flex-wrap gap-1">
                          <span v-for="(r, j) in e.ripeurs" :key="j"
                            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px]">
                            {{ r.nom || r.matricule }}
                            <span v-if="!r.rh_ok" class="text-red-600 font-bold" title="Hors RH">⚠</span>
                          </span>
                        </div>
                      </td>
                      <td class="px-3 py-2 text-right font-mono font-semibold text-gray-900">{{ e.tonnage_excel?.toFixed?.(2) || 0 }} t</td>
                      <td class="px-3 py-2 text-right font-mono text-gray-700">{{ e.rotations_excel }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Suggestion équipe (non pré-remplie) -->
          <div v-if="equipeLoading" class="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <Loader2 class="w-5 h-5 text-blue-500 animate-spin" />
            <span class="text-sm text-blue-700">Recherche de la dernière équipe connue...</span>
          </div>

          <div v-if="equipeSuggestion && !equipeAcceptee"
            class="rounded-xl border p-4 space-y-3"
            :class="equipeSuggestion.source === 'EXCEL_RH'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200'">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <Users class="w-4 h-4" :class="equipeSuggestion.source === 'EXCEL_RH' ? 'text-amber-700' : 'text-blue-600'" />
                <span class="text-sm font-semibold" :class="equipeSuggestion.source === 'EXCEL_RH' ? 'text-amber-800' : 'text-blue-800'">
                  <template v-if="equipeSuggestion.source === 'EXCEL_RH'">
                    Équipage RH (Excel d'évaluation)
                    <span v-if="equipeSuggestion.date_source" class="font-normal text-amber-700">
                      — {{ equipeSuggestion.date_source.split('-').reverse().join('/') }}
                      <span v-if="equipeSuggestion.poste" class="px-1 py-0 rounded bg-amber-200 text-[9px] font-bold ml-1">{{ equipeSuggestion.poste }}</span>
                    </span>
                  </template>
                  <template v-else>Dernière équipe connue (saisies app)</template>
                </span>
              </div>
              <span v-if="equipeSuggestion.source === 'EXCEL_RH' && !equipeSuggestion.chauffeur_match"
                class="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded"
                :title="`L'Excel RH avait un autre chauffeur : ${equipeSuggestion.chauffeur_nom_excel}`">
                ⚠ chauffeur différent
              </span>
            </div>
            <div v-if="equipeSuggestion.source === 'EXCEL_RH' && equipeSuggestion.chauffeur_nom_excel && !equipeSuggestion.chauffeur_match"
              class="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">
              Cette tournée a été conduite par <strong>{{ equipeSuggestion.chauffeur_nom_excel }}</strong>, pas par {{ selectedVehicule?.chauffeur }}.
              Vérifie avant de reprendre l'équipage.
            </div>
            <div class="flex flex-wrap gap-2">
              <span v-if="equipeSuggestion.ripeur1_nom" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border rounded-lg text-xs font-medium text-gray-800"
                :class="equipeSuggestion.source === 'EXCEL_RH' ? 'border-amber-200' : 'border-blue-200'">
                <div class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  :class="equipeSuggestion.source === 'EXCEL_RH' ? 'bg-amber-600' : 'bg-blue-600'">
                  {{ equipeSuggestion.ripeur1_nom.charAt(0) }}
                </div>
                {{ equipeSuggestion.ripeur1_nom }}
                <span class="font-mono text-[10px] text-gray-400">{{ equipeSuggestion.ripeur1_matricule }}</span>
              </span>
              <span v-if="equipeSuggestion.ripeur2_nom" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border rounded-lg text-xs font-medium text-gray-800"
                :class="equipeSuggestion.source === 'EXCEL_RH' ? 'border-amber-200' : 'border-blue-200'">
                <div class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  :class="equipeSuggestion.source === 'EXCEL_RH' ? 'bg-amber-500' : 'bg-blue-500'">
                  {{ equipeSuggestion.ripeur2_nom.charAt(0) }}
                </div>
                {{ equipeSuggestion.ripeur2_nom }}
                <span class="font-mono text-[10px] text-gray-400">{{ equipeSuggestion.ripeur2_matricule }}</span>
              </span>
              <span v-if="equipeSuggestion.ripeur3_nom" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border rounded-lg text-xs font-medium text-gray-800"
                :class="equipeSuggestion.source === 'EXCEL_RH' ? 'border-amber-200' : 'border-blue-200'">
                <div class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  :class="equipeSuggestion.source === 'EXCEL_RH' ? 'bg-amber-400' : 'bg-blue-400'">
                  {{ equipeSuggestion.ripeur3_nom.charAt(0) }}
                </div>
                {{ equipeSuggestion.ripeur3_nom }}
                <span class="font-mono text-[10px] text-gray-400">{{ equipeSuggestion.ripeur3_matricule }}</span>
              </span>
              <span v-if="equipeSuggestion.circuit" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600">
                <Route class="w-3.5 h-3.5 text-gray-400" /> {{ equipeSuggestion.circuit }}
              </span>
            </div>
            <button type="button" @click="appliquerEquipe(equipeSuggestion)"
              class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              :class="equipeSuggestion.source === 'EXCEL_RH' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'">
              <Users class="w-4 h-4" /> Reprendre cette équipe
            </button>
          </div>

          <!-- Formulaire Ripeurs + Circuit -->
          <div class="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users class="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-gray-900">Ripeurs + Circuit</h3>
                <p class="text-xs text-gray-500">
                  <template v-if="ripeursVerrouilles">🔒 Verrouillé sur l'Excel RH (saisie historique)</template>
                  <template v-else>Saisie manuelle — les chauffeurs sont exclus de la liste</template>
                </p>
              </div>
            </div>

            <!-- Bannière chauffeur suspect (Excel RH non fiable) -->
            <div v-if="chauffeurSuspect" class="p-3 bg-red-50 border border-red-300 rounded-xl">
              <div class="flex items-start gap-2">
                <span class="text-red-600 text-base leading-none">⚠</span>
                <div class="text-xs text-red-900 space-y-0.5">
                  <p class="font-semibold">Chauffeur signalé — Excel RH non fiable pour ce cas</p>
                  <p>
                    <strong>{{ chauffeurSuspect.nom }}</strong> apparaît sur
                    <strong>{{ chauffeurSuspect.vehicules_distincts }} véhicules</strong> en
                    <strong>{{ chauffeurSuspect.jours_distincts }} jours</strong> dans l'Excel d'évaluation.
                  </p>
                  <p>
                    👉 Seules les données du <strong>pont-bascule WinStar</strong> sont fiables ici.
                    La suggestion automatique d'équipage est désactivée — saisie manuelle obligatoire.
                  </p>
                </div>
              </div>
            </div>

            <!-- Bannière verrouillage historique -->
            <div v-if="isDateHistorique && verrouillageLoading" class="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <Loader2 class="w-4 h-4 text-amber-600 animate-spin" />
              <span class="text-xs text-amber-800">Chargement de l'équipage Excel RH pour cette date...</span>
            </div>
            <div v-if="ripeursVerrouilles" class="p-3 bg-amber-50 border border-amber-300 rounded-xl">
              <div class="flex items-start gap-2">
                <span class="text-amber-700 text-base leading-none">🔒</span>
                <div class="text-xs text-amber-900 space-y-0.5">
                  <p class="font-semibold">Saisie historique — équipage figé d'après l'Excel RH</p>
                  <p>
                    La date sélectionnée ({{ date.split('-').reverse().join('/') }}) est antérieure à {{ SEUIL_VERROUILLAGE_JOURS }} jours.
                    L'équipage et le circuit sont importés automatiquement et ne peuvent plus être modifiés.
                  </p>
                  <p v-if="equipageVerrouille?.poste" class="text-amber-700">
                    Poste : <strong>{{ equipageVerrouille.poste }}</strong>
                    · Affectation : <strong>{{ equipageVerrouille.affectation || '—' }}</strong>
                  </p>
                </div>
              </div>
            </div>
            <div v-if="isDateHistorique && verrouillageMessage" class="p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-800">
              ⚠ {{ verrouillageMessage }}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AgentSearchInput v-model="ripeur1Matricule" :date="date" :filter-presents="false"
                exclude-role="CHAUFFEUR"
                label="Ripeur 1 (obligatoire)" placeholder="Rechercher un ripeur..." :required="!ripeursVerrouilles"
                :disabled="ripeursVerrouilles" :locked-reason="lockReason"
                @agent-selected="(a) => selectedRipeur1 = a" />
              <div>
                <AgentSearchInput v-model="ripeur2Matricule" :date="date" :filter-presents="false"
                  exclude-role="CHAUFFEUR"
                  label="Ripeur 2 (optionnel)" placeholder="Rechercher un ripeur..."
                  :disabled="ripeursVerrouilles" :locked-reason="lockReason"
                  @agent-selected="(a) => selectedRipeur2 = a" />
                <p class="text-[11px] text-gray-400 mt-1.5">Optionnel</p>
              </div>
              <div>
                <AgentSearchInput v-model="ripeur3Matricule" :date="date" :filter-presents="false"
                  exclude-role="CHAUFFEUR"
                  label="Ripeur 3 (optionnel)" placeholder="Rechercher un ripeur..."
                  :disabled="ripeursVerrouilles" :locked-reason="lockReason"
                  @agent-selected="(a) => selectedRipeur3 = a" />
                <p class="text-[11px] text-gray-400 mt-1.5">Optionnel</p>
              </div>
            </div>

            <!-- Circuit -->
            <div class="space-y-1.5">
              <label class="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Route class="w-3.5 h-3.5 text-gray-400" /> Circuit / Secteur
              </label>
              <input v-model="circuitSaisi" type="text"
                :placeholder="selectedVehicule?.origine || 'Ex: 1er Arrondissement, Akébé, PK5...'"
                :readonly="ripeursVerrouilles"
                :class="[
                  'block w-full px-4 py-2.5 border rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors',
                  ripeursVerrouilles
                    ? 'bg-amber-50 border-amber-300 cursor-not-allowed'
                    : 'bg-gray-50 border-gray-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                ]" />
            </div>
          </div>

          <!-- Résumé équipe + historique ripeurs -->
          <div v-if="selectedRipeur1" class="bg-white rounded-xl border border-emerald-200 p-5 space-y-3">
            <div class="flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-emerald-600" />
              <span class="text-sm font-semibold text-gray-900">Équipe complète</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium">
                <div class="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">{{ selectedVehicule.chauffeur.charAt(0) }}</div>
                {{ selectedVehicule.chauffeur }} <span class="text-emerald-500 text-[10px]">Chauffeur</span>
              </span>
              <button type="button" @click="voirHistoriqueAgent(selectedRipeur1)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                :class="historiqueAgent?.matricule === selectedRipeur1.matricule ? 'bg-blue-600 text-white border border-blue-600' : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'">
                <div class="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">{{ selectedRipeur1.nom.charAt(0) }}</div>
                {{ selectedRipeur1.nom }} <span :class="historiqueAgent?.matricule === selectedRipeur1.matricule ? 'text-blue-200' : 'text-blue-500'" class="text-[10px]">R1</span>
              </button>
              <button v-if="selectedRipeur2" type="button" @click="voirHistoriqueAgent(selectedRipeur2)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                :class="historiqueAgent?.matricule === selectedRipeur2.matricule ? 'bg-blue-500 text-white border border-blue-500' : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'">
                <div class="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">{{ selectedRipeur2.nom.charAt(0) }}</div>
                {{ selectedRipeur2.nom }} <span :class="historiqueAgent?.matricule === selectedRipeur2.matricule ? 'text-blue-200' : 'text-blue-400'" class="text-[10px]">R2</span>
              </button>
              <button v-if="selectedRipeur3" type="button" @click="voirHistoriqueAgent(selectedRipeur3)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                :class="historiqueAgent?.matricule === selectedRipeur3.matricule ? 'bg-blue-400 text-white border border-blue-400' : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'">
                <div class="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center text-white text-[10px] font-bold">{{ selectedRipeur3.nom.charAt(0) }}</div>
                {{ selectedRipeur3.nom }} <span :class="historiqueAgent?.matricule === selectedRipeur3.matricule ? 'text-blue-200' : 'text-blue-300'" class="text-[10px]">R3</span>
              </button>
              <span v-if="circuitSaisi" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600">
                <Route class="w-3.5 h-3.5" /> {{ circuitSaisi }}
              </span>
            </div>
            <p class="text-[10px] text-gray-400">Cliquez sur un ripeur pour voir son historique</p>
          </div>

          <!-- Panneau historique agent (ripeur) -->
          <div v-if="historiqueAgentLoading" class="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <Loader2 class="w-4 h-4 text-blue-500 animate-spin" />
            <span class="text-sm text-blue-700">Chargement historique...</span>
          </div>
          <div v-if="historiqueAgent" class="bg-white rounded-xl border border-blue-200 overflow-hidden">
            <div class="px-5 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <User class="w-4 h-4 text-blue-600" />
                <span class="text-sm font-bold text-blue-800">Historique — {{ historiqueAgent.nom }}</span>
                <span class="font-mono text-xs text-blue-500">{{ historiqueAgent.matricule }}</span>
              </div>
              <button type="button" @click="historiqueAgent = null" class="text-xs text-blue-500 hover:text-red-500 cursor-pointer">Fermer</button>
            </div>
            <!-- Bilan mensuel agent -->
            <div v-if="historiqueAgent.bilan.length > 0" class="p-4 border-b border-gray-100">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Bilan mensuel</p>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <div v-for="b in historiqueAgent.bilan" :key="b.mois" class="rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <p class="text-xs font-bold text-gray-700 font-mono mb-1">{{ b.mois }}</p>
                  <div class="grid grid-cols-2 gap-1 text-[11px]">
                    <div><span class="text-gray-400">Jours</span> <span class="font-mono font-bold text-gray-900 ml-1">{{ b.jours_travailles }}</span></div>
                    <div><span class="text-gray-400">Tonnage</span> <span class="font-mono font-bold text-gray-900 ml-1">{{ b.tonnage_cumule }} t</span></div>
                    <div><span class="text-gray-400">Rotations</span> <span class="font-mono font-bold text-gray-900 ml-1">{{ b.rotations_cumul }}</span></div>
                    <div><span class="text-gray-400">Moy/j</span> <span class="font-mono font-bold text-gray-900 ml-1">{{ b.tonnage_moyen }} t</span></div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Saisies agent -->
            <div v-if="historiqueAgent.saisies.length > 0" class="overflow-x-auto">
              <p class="px-4 pt-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dernières saisies</p>
              <table class="w-full text-xs mt-2">
                <thead>
                  <tr class="bg-gray-50 border-b border-gray-100">
                    <th class="text-left px-3 py-2 font-semibold text-gray-500">Date</th>
                    <th class="text-left px-3 py-2 font-semibold text-gray-500">Rôle</th>
                    <th class="text-left px-3 py-2 font-semibold text-gray-500">Véhicule</th>
                    <th class="text-left px-3 py-2 font-semibold text-gray-500">Chauffeur</th>
                    <th class="text-left px-3 py-2 font-semibold text-gray-500">Circuit</th>
                    <th class="text-right px-3 py-2 font-semibold text-gray-500">Tonnage</th>
                    <th class="text-center px-3 py-2 font-semibold text-gray-500">Service</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  <tr v-for="(h, i) in historiqueAgent.saisies" :key="i" class="hover:bg-gray-50/50">
                    <td class="px-3 py-2 font-mono text-gray-700">{{ h.date.split('-').reverse().join('/') }}</td>
                    <td class="px-3 py-2">
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        :class="h.role_dans_equipe === 'Chauffeur' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'">
                        {{ h.role_dans_equipe }}
                      </span>
                    </td>
                    <td class="px-3 py-2 font-mono text-gray-700">{{ h.immatriculation }}</td>
                    <td class="px-3 py-2 text-gray-900">{{ h.chauffeur_nom || '-' }}</td>
                    <td class="px-3 py-2 text-gray-600">{{ h.circuit || '-' }}</td>
                    <td class="px-3 py-2 text-right font-mono font-semibold">{{ h.tonnage }} t</td>
                    <td class="px-3 py-2 text-center">
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        :class="h.service === 'TRI' ? 'bg-teal-100 text-teal-700' : 'bg-emerald-100 text-emerald-700'">
                        {{ h.service }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="p-4 text-sm text-gray-400 text-center">Aucune saisie trouvée</div>
          </div>

          <!-- Boutons Retour + Valider (toujours visibles) -->
          <div class="flex justify-between items-center bg-white rounded-xl border border-gray-100 px-5 py-4">
            <button type="button" @click="fermerFormulaire"
              class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
              <ArrowLeft class="w-4 h-4" /> Retour à la liste
            </button>
            <BaseButton @click="submit" variant="primary" type="button" :disabled="!selectedRipeur1">
              <CheckCircle class="w-4 h-4 mr-1.5" /> Valider la fiche collecte
            </BaseButton>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
