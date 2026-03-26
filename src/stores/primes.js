import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Moteur de calcul des primes — conforme à la Note de Service
 * Réf: 25-11-001-DT-DQHSE-DRH-yar-DG du 05/11/2025
 *
 * ═══ SERVICE COLLECTE ═══
 * Principe: Chaque agent démarre à 100% sur chaque axe.
 * Les infractions constatées font baisser les scores.
 * Score global = Tonnage(50%) + Bouclage(25%) + Entretien(15%) + QHSE(10%)
 * Prime = scoreGlobal% × plafond (si score ≥ 60%, sinon 0)
 *
 * ═══ SERVICE TRI & VALORISATION ═══
 * Prime octroyée par équipe d'arrondissement (1 Canter + 1 BOM par zone).
 * Le Canter charge la BOM de sa zone pour maximiser le temps de collecte.
 *
 * Barème BOM + CANTER (par tonnage collecté par l'équipe) :
 *   - ≥ 1.2 tonne  → 100% de la prime
 *   - ≥ 1.0 tonne  → 75% de la prime
 *   - ≥ 0.8 tonne  → 50% de la prime
 *   - < 0.8 tonne  → 0%
 *
 * Barème MOVI (par nombre de bennes levées) :
 *   - ≥ 5 bennes levées → 100% de la prime
 *   - ≥ 4 bennes levées → 75% de la prime
 *   - ≥ 3 bennes levées → 50% de la prime
 *   - < 3 bennes levées → 0%
 */
export const usePrimesStore = defineStore('primes', () => {

  // ── Pondérations (paramétrables par l'admin) ──
  const ponderations = ref({
    tonnage: 50,
    bouclage: 25,
    entretien: 15,
    qhse: 10,
  })

  // ── Seuils et plafonds ──
  const config = ref({
    seuilMinPrime: 60,            // En dessous de 60%, pas de prime
    seuilPresence: 93,            // 93% de présence minimum
    joursOuvresMois: 20,
    plafonds: {
      CHAUFFEUR_COLLECTE: 50000,  // Chauffeurs PL Collecte + Ripeurs éboueurs
      RIPEUR_COLLECTE: 50000,
      CHAUFFEUR_TRI: 25000,       // Chauffeurs PL TRI + Ripeurs collecte sélective
      RIPEUR_TRI: 25000,
    }
  })

  // ═══════════════════════════════════════════════
  // SERVICE TRI — Barème et configuration
  // ═══════════════════════════════════════════════

  const configTri = ref({
    plafondTri: 25000,  // Plafond prime TRI (XAF) — modifiable par note de service
    // Barème BOM + Canter (tonnage en tonnes)
    bomCanter: {
      seuil100: 1.2,    // ≥ 1.2t → 100%
      seuil75: 1.0,     // ≥ 1.0t → 75%
      seuil50: 0.8,     // ≥ 0.8t → 50%
    },
    // Barème Movi (nombre de bennes levées)
    movi: {
      seuil100: 5,      // ≥ 5 bennes → 100%
      seuil75: 4,        // ≥ 4 bennes → 75%
      seuil50: 3,        // ≥ 3 bennes → 50%
    },
  })

  /**
   * Calcul de la prime TRI pour une équipe
   *
   * @param {string} typeEquipement - 'BOM_CANTER' ou 'MOVI'
   * @param {number} valeur - Tonnage (en tonnes) pour BOM+Canter, ou nombre de bennes levées pour Movi
   * @returns {{ pourcentage: number, montant: number, eligible: boolean, palier: string }}
   */
  function calculerPrimeTri(typeEquipement, valeur) {
    const c = configTri.value
    let pourcentage = 0
    let palier = 'Insuffisant'

    if (typeEquipement === 'BOM_CANTER') {
      if (valeur >= c.bomCanter.seuil100) {
        pourcentage = 100
        palier = `≥ ${c.bomCanter.seuil100}t → 100%`
      } else if (valeur >= c.bomCanter.seuil75) {
        pourcentage = 75
        palier = `≥ ${c.bomCanter.seuil75}t → 75%`
      } else if (valeur >= c.bomCanter.seuil50) {
        pourcentage = 50
        palier = `≥ ${c.bomCanter.seuil50}t → 50%`
      }
    } else if (typeEquipement === 'MOVI') {
      if (valeur >= c.movi.seuil100) {
        pourcentage = 100
        palier = `≥ ${c.movi.seuil100} bennes → 100%`
      } else if (valeur >= c.movi.seuil75) {
        pourcentage = 75
        palier = `≥ ${c.movi.seuil75} bennes → 75%`
      } else if (valeur >= c.movi.seuil50) {
        pourcentage = 50
        palier = `≥ ${c.movi.seuil50} bennes → 50%`
      }
    }

    const montant = Math.round((pourcentage / 100) * c.plafondTri)

    return {
      pourcentage,
      montant,
      eligible: pourcentage > 0,
      palier,
      plafond: c.plafondTri,
    }
  }

  // ═══════════════════════════════════════════════
  // SERVICE COLLECTE — Barème Tonnage
  // ═══════════════════════════════════════════════

  // ── Barème Tonnage par type de véhicule ──
  // Retourne le % de performance tonnage (0, 50, 75 ou 100)
  function calculerScoreTonnage(typeVehicule, tonnage, rotations) {
    if (!rotations || rotations <= 0) return 0
    const moyenne = tonnage / rotations

    switch (typeVehicule) {
      case 'BOM':
        if (moyenne >= 11) return 100
        if (moyenne >= 8) return 75
        if (moyenne >= 7) return 50
        return 0

      case 'Plateaux':
        // 2.5t par rotation: x2=50%, x3=75%, ≥4=100%, cumul>7.5t=100%
        if (tonnage >= 7.5) return 100
        if (rotations >= 4) return 100
        if (rotations >= 3) return 75
        if (rotations >= 2) return 50
        return 0

      case 'Bennes':
        // 7t x2 rotations = 50%, >2 rotations = 100%
        if (moyenne >= 7 && rotations > 2) return 100
        if (moyenne >= 7 && rotations >= 2) return 50
        return 0

      case 'Movi':
        // 4 rotations = 50%, >4 = 100%
        if (rotations > 4) return 100
        if (rotations >= 4) return 50
        return 0

      default:
        // Canter ou autre: calcul générique
        if (moyenne >= 5) return 100
        if (moyenne >= 3) return 75
        if (moyenne >= 1) return 50
        return 0
    }
  }

  // ── Calcul du score Bouclage (0, 50, 100) ──
  function calculerScoreBouclage(statutGeo) {
    switch (statutGeo) {
      case 'VALIDE': return 100      // Circuit complet, validé GEO
      case 'PARTIEL': return 50      // Couverture partielle
      case 'REFUSE': return 0        // Circuit non bouclé / refusé
      default: return 0              // Non saisi
    }
  }

  // ── Score Entretien: note sur 10 → % ──
  function calculerScoreEntretien(noteSur10) {
    if (noteSur10 === null || noteSur10 === undefined || noteSur10 === 'N/A') return 100 // Non applicable (ripeurs)
    return (noteSur10 / 10) * 100
  }

  // ── Score QHSE composite ──
  // checklistSur5, alcootest (boolean positif), epiConforme (boolean)
  function calculerScoreQhse({ checklistSur5 = 5, alcootestPositif = false, epiConforme = true, quartHeureSecurite = true }) {
    let score = 100

    // Checklist terrain: notée sur 5, convertie en %
    const pctChecklist = (checklistSur5 / 5) * 100
    score = pctChecklist

    // Alcootest positif = pénalité totale sur l'axe QHSE (0%)
    if (alcootestPositif) return 0

    // EPI non conforme: -20%
    if (!epiConforme) score = Math.max(0, score - 20)

    // Quart d'heure sécurité manqué: -10%
    if (!quartHeureSecurite) score = Math.max(0, score - 10)

    return Math.min(100, Math.max(0, score))
  }

  // ── Calcul du score global pondéré ──
  function calculerScoreGlobal(scores) {
    const p = ponderations.value
    return (
      (scores.tonnage * p.tonnage / 100) +
      (scores.bouclage * p.bouclage / 100) +
      (scores.entretien * p.entretien / 100) +
      (scores.qhse * p.qhse / 100)
    )
  }

  // ── Calcul du montant de la prime ──
  function calculerPrime(scoreGlobal, typeAgent, joursPresents) {
    const c = config.value

    // Vérifier l'éligibilité de présence
    const tauxPresence = (joursPresents / c.joursOuvresMois) * 100
    if (tauxPresence < c.seuilPresence) {
      // Arrêts maladie / accidents: prime au prorata
      // Sinon: non éligible
      return { montant: 0, eligible: false, raison: `Présence insuffisante (${tauxPresence.toFixed(0)}% < ${c.seuilPresence}%)` }
    }

    // Seuil minimum
    if (scoreGlobal < c.seuilMinPrime) {
      return { montant: 0, eligible: false, raison: `Score global insuffisant (${scoreGlobal.toFixed(1)}% < ${c.seuilMinPrime}%)` }
    }

    // Déterminer le plafond selon le type d'agent
    const plafond = c.plafonds[typeAgent] || c.plafonds.CHAUFFEUR_COLLECTE

    // Prime = scoreGlobal% × plafond
    const montant = Math.round((scoreGlobal / 100) * plafond)

    return { montant, eligible: true, raison: null }
  }

  // ── Calcul complet pour un agent sur un mois ──
  // infractions = tableau des évaluations journalières agrégées pour le mois
  function calculerFicheAgent({
    typeVehicule = 'BOM',
    typeAgent = 'CHAUFFEUR_COLLECTE',
    joursPresents = 28,
    // Moyennes mensuelles
    tonnageMoyen = 0,
    rotationsMoyennes = 0,
    statutsBouclage = [],       // ['VALIDE', 'PARTIEL', 'VALIDE', ...]
    noteEntretienMoyenne = 10,
    qhseData = {},
  }) {
    // Score Tonnage (moyenne du mois)
    const scoreTonnage = calculerScoreTonnage(typeVehicule, tonnageMoyen, rotationsMoyennes)

    // Score Bouclage (moyenne des statuts du mois)
    let scoreBouclage = 100
    if (statutsBouclage.length > 0) {
      const totalBouclage = statutsBouclage.reduce((sum, s) => sum + calculerScoreBouclage(s), 0)
      scoreBouclage = totalBouclage / statutsBouclage.length
    }

    // Score Entretien
    const scoreEntretien = calculerScoreEntretien(noteEntretienMoyenne)

    // Score QHSE
    const scoreQhse = calculerScoreQhse(qhseData)

    const scores = {
      tonnage: scoreTonnage,
      bouclage: scoreBouclage,
      entretien: scoreEntretien,
      qhse: scoreQhse,
    }

    const scoreGlobal = calculerScoreGlobal(scores)
    const prime = calculerPrime(scoreGlobal, typeAgent, joursPresents)

    return {
      scores,
      scoreGlobal,
      prime,
      ponderations: { ...ponderations.value },
      details: {
        tonnagePondere: (scoreTonnage * ponderations.value.tonnage / 100).toFixed(1),
        bouclagePondere: (scoreBouclage * ponderations.value.bouclage / 100).toFixed(1),
        entretienPondere: (scoreEntretien * ponderations.value.entretien / 100).toFixed(1),
        qhsePondere: (scoreQhse * ponderations.value.qhse / 100).toFixed(1),
      }
    }
  }

  return {
    ponderations,
    config,
    configTri,
    calculerScoreTonnage,
    calculerScoreBouclage,
    calculerScoreEntretien,
    calculerScoreQhse,
    calculerScoreGlobal,
    calculerPrime,
    calculerPrimeTri,
    calculerFicheAgent,
  }
})
