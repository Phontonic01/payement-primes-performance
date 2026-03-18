import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Store Saisies — Centralise toutes les données saisies par les services
 *
 * Chaque service écrit ici, et le Dashboard / Recherche / DAF lisent ici.
 * Cela permet la propagation en temps réel entre services.
 */
export const useSaisiesStore = defineStore('saisies', () => {

  // ── Tonnages (Service Collecte) ──
  // Clé: "matricule-YYYY-MM-DD"
  const tonnages = ref({})

  function enregistrerTonnage({ matricule, date, agent, vehicule, tonnage, rotations }) {
    const key = `${matricule}-${date}`
    tonnages.value[key] = {
      matricule, date, agent, vehicule, tonnage, rotations,
      timestamp: new Date().toISOString(),
    }
  }

  function getTonnage(matricule, date) {
    return tonnages.value[`${matricule}-${date}`] || null
  }

  // ── Bouclages (Service Collecte, validé par GEO) ──
  const bouclages = ref({})

  function enregistrerBouclage({ matricule, date, agent, circuit, vehicule, bouclageDeclare }) {
    const key = `${matricule}-${date}`
    bouclages.value[key] = {
      matricule, date, agent, circuit, vehicule, bouclageDeclare,
      statutGeo: 'EN_ATTENTE_GEO',
      timestamp: new Date().toISOString(),
    }
  }

  function getBouclage(matricule, date) {
    return bouclages.value[`${matricule}-${date}`] || null
  }

  // ── Mise à jour du statut GEO sur un bouclage (appelé par le service GEO) ──
  function majStatutGeo(matricule, date, statutGeo) {
    const key = `${matricule}-${date}`
    if (bouclages.value[key]) {
      bouclages.value[key].statutGeo = statutGeo
    }
  }

  // ── Bouclages en attente de validation GEO ──
  function getBouclagesEnAttente() {
    return Object.values(bouclages.value).filter(b => b.statutGeo === 'EN_ATTENTE_GEO')
  }

  // ── Entretiens (Service Logistique) ──
  const entretiens = ref({})

  function enregistrerEntretien({ matricule, date, agent, vehicule, etatMecanique, proprete, respectControles, degradations, note }) {
    const key = `${matricule}-${date}`
    entretiens.value[key] = {
      matricule, date, agent, vehicule,
      etatMecanique, proprete, respectControles, degradations, note,
      timestamp: new Date().toISOString(),
    }
  }

  function getEntretien(matricule, date) {
    return entretiens.value[`${matricule}-${date}`] || null
  }

  // ── QHSE (Service QHSE) ──
  const qhseEvals = ref({})

  function enregistrerQhse({ matricule, date, agent, checklistSur5, alcootestPositif, epiConforme, quartHeureSecurite }) {
    const key = `${matricule}-${date}`
    qhseEvals.value[key] = {
      matricule, date, agent,
      checklistSur5, alcootestPositif, epiConforme, quartHeureSecurite,
      timestamp: new Date().toISOString(),
    }
  }

  function getQhse(matricule, date) {
    return qhseEvals.value[`${matricule}-${date}`] || null
  }

  // ── Agrégation mensuelle pour un agent ──
  // Retourne les données agrégées du mois pour calculer la prime
  function getAgregationMensuelle(matricule, mois) {
    // mois au format "YYYY-MM"
    const prefix = `${matricule}-${mois}`

    // Tonnages du mois
    const tonnagesDuMois = Object.values(tonnages.value)
      .filter(t => t.matricule === matricule && t.date.startsWith(mois))

    // Bouclages du mois
    const bouclagesDuMois = Object.values(bouclages.value)
      .filter(b => b.matricule === matricule && b.date.startsWith(mois))

    // Entretiens du mois
    const entretiensDuMois = Object.values(entretiens.value)
      .filter(e => e.matricule === matricule && e.date.startsWith(mois))

    // QHSE du mois
    const qhseDuMois = Object.values(qhseEvals.value)
      .filter(q => q.matricule === matricule && q.date.startsWith(mois))

    // Agréger tonnage
    let tonnageMoyen = 0
    let rotationsMoyennes = 0
    let typeVehicule = 'BOM'
    if (tonnagesDuMois.length > 0) {
      tonnageMoyen = tonnagesDuMois.reduce((s, t) => s + t.tonnage, 0) / tonnagesDuMois.length
      rotationsMoyennes = tonnagesDuMois.reduce((s, t) => s + t.rotations, 0) / tonnagesDuMois.length
      typeVehicule = tonnagesDuMois[tonnagesDuMois.length - 1].vehicule
    }

    // Agréger bouclages
    const statutsBouclage = bouclagesDuMois
      .filter(b => b.bouclageDeclare !== null)
      .map(b => {
        if (b.statutGeo === 'VALIDE') return 'VALIDE'
        if (b.statutGeo === 'PARTIEL') return 'PARTIEL'
        if (b.statutGeo === 'REFUSE') return 'REFUSE'
        // Si déclaré mais pas encore validé par GEO, utiliser la déclaration
        return b.bouclageDeclare ? 'VALIDE' : 'REFUSE'
      })

    // Agréger entretien
    let noteEntretienMoyenne = null
    if (entretiensDuMois.length > 0) {
      noteEntretienMoyenne = entretiensDuMois.reduce((s, e) => s + e.note, 0) / entretiensDuMois.length
    }

    // Agréger QHSE (pire cas du mois)
    let qhseData = { checklistSur5: 5, alcootestPositif: false, epiConforme: true, quartHeureSecurite: true }
    if (qhseDuMois.length > 0) {
      qhseData = {
        checklistSur5: qhseDuMois.reduce((s, q) => s + q.checklistSur5, 0) / qhseDuMois.length,
        alcootestPositif: qhseDuMois.some(q => q.alcootestPositif),
        epiConforme: qhseDuMois.every(q => q.epiConforme),
        quartHeureSecurite: qhseDuMois.every(q => q.quartHeureSecurite),
      }
    }

    return {
      tonnageMoyen,
      rotationsMoyennes,
      typeVehicule,
      statutsBouclage,
      noteEntretienMoyenne,
      qhseData,
      nbSaisiesTonnage: tonnagesDuMois.length,
      nbSaisiesBouclage: bouclagesDuMois.length,
      nbSaisiesEntretien: entretiensDuMois.length,
      nbSaisiesQhse: qhseDuMois.length,
    }
  }

  // ── Historique des saisies tonnage (pour le tableau Collecte) ──
  const historiqueTonnages = computed(() => {
    return Object.values(tonnages.value).sort((a, b) => b.date.localeCompare(a.date))
  })

  // ── Stats globales ──
  const stats = computed(() => ({
    nbTonnages: Object.keys(tonnages.value).length,
    nbBouclages: Object.keys(bouclages.value).length,
    nbEntretiens: Object.keys(entretiens.value).length,
    nbQhse: Object.keys(qhseEvals.value).length,
  }))

  return {
    tonnages,
    bouclages,
    entretiens,
    qhseEvals,
    enregistrerTonnage,
    getTonnage,
    enregistrerBouclage,
    getBouclage,
    majStatutGeo,
    getBouclagesEnAttente,
    enregistrerEntretien,
    getEntretien,
    enregistrerQhse,
    getQhse,
    getAgregationMensuelle,
    historiqueTonnages,
    stats,
  }
})
