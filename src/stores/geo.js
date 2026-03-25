import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Store Géolocalisation — AUTORITÉ TERRAIN
 *
 * La GEO fait autorité sur les données terrain.
 * Quand la GEO invalide un bouclage, cette décision se propage
 * automatiquement aux autres services : Collecte, Logistique, QHSE.
 *
 * Les scores de primes DOIVENT utiliser le verdict GEO, pas les déclarations services.
 */
export const useGeoStore = defineStore('geo', () => {

  // ── Décisions GEO par agent/date ──
  // Clé: "matricule-YYYY-MM-DD", Valeur: objet décision
  const decisions = ref({})

  // ── Enregistrer une décision GEO ──
  function enregistrerDecision({
    matricule,
    date,
    agent,
    circuit,
    // Décision GEO
    statut,           // 'VALIDE' | 'PARTIEL' | 'REFUSE'
    couvertureGps,    // % couverture GPS
    justification,    // motif GEO
    // Données GPS de preuve
    gpsData = {},
    // Services impactés
    divergences = [], // [{ service, message }]
  }) {
    const key = `${matricule}-${date}`

    decisions.value[key] = {
      matricule,
      date,
      agent,
      circuit,
      statut,
      couvertureGps,
      justification,
      gpsData,
      divergences,
      timestamp: new Date().toISOString(),
      // Impacts automatiques sur les autres services
      impacts: calculerImpacts(statut, couvertureGps, divergences),
    }

    return decisions.value[key]
  }

  // ── Calculer les impacts automatiques de la décision GEO ──
  function calculerImpacts(statut, couvertureGps, divergences) {
    const impacts = []

    if (statut === 'REFUSE') {
      impacts.push({
        service: 'Collecte',
        type: 'INVALIDE',
        scoreForce: 0,
        message: 'Bouclage invalidé par la GEO — Circuit non bouclé selon le GPS. Se rapprocher du service Géolocalisation.',
      })
      impacts.push({
        service: 'Tonnage',
        type: 'ALERTE',
        message: 'Tonnage déclaré non vérifiable — le véhicule n\'a pas couvert le circuit. Se rapprocher du service Géolocalisation.',
      })
    }

    if (statut === 'PARTIEL') {
      impacts.push({
        service: 'Collecte',
        type: 'DEGRADE',
        scoreForce: 50,
        message: `Bouclage dégradé par la GEO — Couverture GPS à ${couvertureGps}% seulement. Se rapprocher du service Géolocalisation.`,
      })
    }

    // Propager les divergences spécifiques
    divergences.forEach(div => {
      if (div.service === 'QHSE' || div.service === 'Logistique') {
        impacts.push({
          service: div.service,
          type: 'ALERTE',
          message: `Signalement GEO : ${div.message}. Se rapprocher du service Géolocalisation.`,
        })
      }
    })

    return impacts
  }

  // ── Obtenir la décision GEO pour un agent/date ──
  function getDecision(matricule, date) {
    return decisions.value[`${matricule}-${date}`] || null
  }

  // ── Obtenir le score bouclage selon la GEO (fait autorité) ──
  // Retourne le score GEO s'il existe, sinon null (pas encore traité)
  function getScoreBouclageGeo(matricule, date) {
    const decision = getDecision(matricule, date)
    if (!decision) return null // Pas encore de décision GEO

    switch (decision.statut) {
      case 'VALIDE': return 100
      case 'PARTIEL': return 50
      case 'REFUSE': return 0
      default: return null
    }
  }

  // ── Vérifier si un agent a une invalidation GEO ──
  function estInvalideParGeo(matricule, date) {
    const decision = getDecision(matricule, date)
    return decision && (decision.statut === 'REFUSE' || decision.statut === 'PARTIEL')
  }

  // ── Obtenir les impacts pour un service donné ──
  function getImpactsPourService(service) {
    const resultats = []
    Object.values(decisions.value).forEach(decision => {
      decision.impacts
        .filter(impact => impact.service === service)
        .forEach(impact => {
          resultats.push({
            ...impact,
            matricule: decision.matricule,
            agent: decision.agent,
            date: decision.date,
            circuit: decision.circuit,
            geoStatut: decision.statut,
            geoJustification: decision.justification,
          })
        })
    })
    return resultats
  }

  // ── Toutes les décisions ──
  const toutesDecisions = computed(() => Object.values(decisions.value))

  // ── Stats ──
  const stats = computed(() => {
    const all = toutesDecisions.value
    return {
      total: all.length,
      valides: all.filter(d => d.statut === 'VALIDE').length,
      partiels: all.filter(d => d.statut === 'PARTIEL').length,
      refuses: all.filter(d => d.statut === 'REFUSE').length,
      divergences: all.filter(d => d.divergences.length > 0).length,
    }
  })

  // ── Charger des données de démonstration (vide — en attente de données officielles) ──
  function chargerDemoData() {
    // Pas de données démo — les décisions seront saisies par le service GEO
  }

  return {
    decisions,
    enregistrerDecision,
    getDecision,
    getScoreBouclageGeo,
    estInvalideParGeo,
    getImpactsPourService,
    toutesDecisions,
    stats,
    chargerDemoData,
  }
})
