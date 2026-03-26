import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/client'

/**
 * Store Pont-Bascule — Source unique du bilan mensuel
 *
 * Fournit à TOUS les services :
 * - Présence automatique (jours travaillés par chauffeur)
 * - Pénalités cumulées jour par jour
 * - Prime restante après dégression
 * - Équipe jour/nuit
 *
 * Les données viennent de GET /api/pont-bascule/bilan?mois=YYYY-MM
 */
export const usePontBasculeStore = defineStore('pontBascule', () => {
  const bilan = ref(null)
  const loading = ref(false)
  const error = ref('')
  const moisCharge = ref('')

  // ── Charger le bilan mensuel ──
  async function chargerBilan(mois) {
    if (!mois) mois = new Date().toISOString().slice(0, 7)
    if (mois === moisCharge.value && bilan.value) return // Déjà chargé

    loading.value = true
    error.value = ''
    try {
      bilan.value = await api.pontBasculeBilan(mois)
      moisCharge.value = mois
    } catch (err) {
      error.value = err.message
      console.error('Erreur chargement bilan pont-bascule:', err.message)
    } finally {
      loading.value = false
    }
  }

  // ── Forcer le rechargement ──
  async function recharger() {
    moisCharge.value = ''
    await chargerBilan(moisCharge.value || new Date().toISOString().slice(0, 7))
  }

  // ── Map indexée par code_transporteur ──
  const bilanMap = computed(() => {
    const map = {}
    if (bilan.value?.chauffeurs) {
      bilan.value.chauffeurs.forEach(c => { map[c.code_transporteur] = c })
    }
    return map
  })

  // ── Obtenir le bilan d'un chauffeur par code ──
  function getBilanChauffeur(codeTransporteur) {
    return bilanMap.value[codeTransporteur] || null
  }

  // ── Obtenir le bilan d'un chauffeur par matricule agent local ──
  // (cherche dans les bilans si le nom correspond)
  function getBilanParNom(nom) {
    if (!bilan.value?.chauffeurs || !nom) return null
    const nomLower = nom.toLowerCase()
    return bilan.value.chauffeurs.find(c =>
      c.chauffeur.toLowerCase().includes(nomLower) ||
      nomLower.includes(c.chauffeur.toLowerCase())
    ) || null
  }

  // ── Liste des chauffeurs triés par prime décroissante ──
  const chauffeurs = computed(() => bilan.value?.chauffeurs || [])

  // ── Statistiques globales ──
  const stats = computed(() => {
    const list = chauffeurs.value
    if (list.length === 0) return null
    const totalPrime = list.reduce((s, c) => s + c.prime_finale, 0)
    const totalPenalites = list.reduce((s, c) => s + c.penalites.total, 0)
    const nbEligibles = list.filter(c => c.prime_finale > 0).length
    const nbProrata = list.filter(c => c.prorata).length
    const presenceMoyenne = list.reduce((s, c) => s + c.jours_present, 0) / list.length
    const nbJour = list.filter(c => c.equipe === 'JOUR').length
    const nbNuit = list.filter(c => c.equipe === 'NUIT').length

    return {
      nbChauffeurs: list.length,
      totalPrime,
      totalPenalites,
      nbEligibles,
      nbNonEligibles: list.length - nbEligibles,
      nbProrata,
      presenceMoyenne: +presenceMoyenne.toFixed(1),
      plafond: bilan.value?.plafond || 50000,
      joursOuvres: bilan.value?.jours_ouvres || 30,
      nbJour,
      nbNuit,
    }
  })

  return {
    bilan,
    loading,
    error,
    moisCharge,
    chargerBilan,
    recharger,
    bilanMap,
    getBilanChauffeur,
    getBilanParNom,
    chauffeurs,
    stats,
  }
})
