import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/client'

/**
 * Store Géolocalisation — AUTORITÉ TERRAIN
 * Communique avec l'API backend pour la persistance.
 */
export const useGeoStore = defineStore('geo', () => {

  const decisions = ref({})

  async function enregistrerDecision(data) {
    const key = `${data.matricule}-${data.date}`

    const impacts = calculerImpacts(data.statut, data.couvertureGps, data.divergences || [])

    decisions.value[key] = {
      ...data,
      impacts,
      timestamp: new Date().toISOString(),
    }

    try {
      await api.createGeoDecision({
        matricule: data.matricule,
        date: data.date,
        agent_nom: data.agent,
        circuit: data.circuit,
        statut: data.statut,
        couverture_gps: data.couvertureGps,
        justification: data.justification,
        gps_data: data.gpsData,
        divergences: data.divergences,
      })
    } catch (e) {
      console.error('Erreur enregistrement décision GEO:', e.message)
    }

    return decisions.value[key]
  }

  function calculerImpacts(statut, couvertureGps, divergences) {
    const impacts = []

    if (statut === 'REFUSE') {
      impacts.push({
        service: 'Collecte', type: 'INVALIDE', scoreForce: 0,
        message: 'Bouclage invalidé par la GEO — Circuit non bouclé selon le GPS.',
      })
      impacts.push({
        service: 'Tonnage', type: 'ALERTE',
        message: 'Tonnage déclaré non vérifiable — le véhicule n\'a pas couvert le circuit.',
      })
    }

    if (statut === 'PARTIEL') {
      impacts.push({
        service: 'Collecte', type: 'DEGRADE', scoreForce: 50,
        message: `Bouclage dégradé — Couverture GPS à ${couvertureGps}% seulement.`,
      })
    }

    divergences.forEach(div => {
      if (div.service === 'QHSE' || div.service === 'Logistique') {
        impacts.push({
          service: div.service, type: 'ALERTE',
          message: `Signalement GEO : ${div.message}.`,
        })
      }
    })

    return impacts
  }

  function getDecision(matricule, date) {
    return decisions.value[`${matricule}-${date}`] || null
  }

  function getScoreBouclageGeo(matricule, date) {
    const decision = getDecision(matricule, date)
    if (!decision) return null
    switch (decision.statut) {
      case 'VALIDE': return 100
      case 'PARTIEL': return 50
      case 'REFUSE': return 0
      default: return null
    }
  }

  function estInvalideParGeo(matricule, date) {
    const decision = getDecision(matricule, date)
    return decision && (decision.statut === 'REFUSE' || decision.statut === 'PARTIEL')
  }

  function getImpactsPourService(service) {
    const resultats = []
    Object.values(decisions.value).forEach(decision => {
      (decision.impacts || [])
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

  const toutesDecisions = computed(() => Object.values(decisions.value))

  const stats = computed(() => {
    const all = toutesDecisions.value
    return {
      total: all.length,
      valides: all.filter(d => d.statut === 'VALIDE').length,
      partiels: all.filter(d => d.statut === 'PARTIEL').length,
      refuses: all.filter(d => d.statut === 'REFUSE').length,
      divergences: all.filter(d => (d.divergences || []).length > 0).length,
    }
  })

  // Charger les décisions depuis l'API
  async function chargerDecisions(params = {}) {
    try {
      const data = await api.getGeoDecisions(params)
      data.forEach(row => {
        const key = `${row.matricule}-${row.date}`
        decisions.value[key] = {
          matricule: row.matricule,
          date: row.date,
          agent: row.agent_nom,
          circuit: row.circuit,
          statut: row.statut,
          couvertureGps: row.couverture_gps,
          justification: row.justification,
          gpsData: JSON.parse(row.gps_data || '{}'),
          divergences: JSON.parse(row.divergences || '[]'),
          impacts: calculerImpacts(row.statut, row.couverture_gps, JSON.parse(row.divergences || '[]')),
          timestamp: row.created_at,
        }
      })
    } catch (e) {
      console.error('Erreur chargement décisions GEO:', e.message)
    }
  }

  function chargerDemoData() {
    // Pas de données démo — chargement depuis l'API
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
    chargerDecisions,
    chargerDemoData,
  }
})
