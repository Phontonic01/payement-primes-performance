import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/client'

/**
 * Store Saisies — Communique avec l'API backend
 * Toutes les écritures sont persistées dans SQLite via Express.
 */
export const useSaisiesStore = defineStore('saisies', () => {

  // ── State local (cache des données chargées) ──
  const tonnages = ref({})
  const fichesCollecte = ref({})
  const bouclages = ref({})
  const entretiens = ref({})
  const qhseEvals = ref({})
  let ficheCounter = 1

  // ── Tonnages ──

  async function enregistrerTonnage(data) {
    try {
      await api.createTonnage({
        matricule: data.matricule,
        date: data.date,
        agent_nom: data.agent,
        vehicule: data.vehicule,
        vehicule_type: data.vehiculeType || data.vehicule,
        vehicule_label: data.vehiculeLabel,
        no_parc: data.noParc,
        immatriculation: data.immatriculation,
        arrondissement: data.arrondissement,
        secteur: data.secteur,
        circuit: data.circuit,
        tonnage: data.tonnage,
        rotations: data.rotations,
      })
      // Update local cache
      const key = `${data.matricule}-${data.date}`
      tonnages.value[key] = { ...data, timestamp: new Date().toISOString() }
    } catch (e) {
      console.error('Erreur enregistrement tonnage:', e.message)
      // Fallback local
      const key = `${data.matricule}-${data.date}`
      tonnages.value[key] = { ...data, timestamp: new Date().toISOString() }
    }
  }

  function getTonnage(matricule, date) {
    return tonnages.value[`${matricule}-${date}`] || null
  }

  // ── Fiches Collecte ──

  async function enregistrerFicheCollecte(data) {
    const id = `FC-${data.date}-${String(ficheCounter++).padStart(3, '0')}`
    const fiche = { id, ...data, timestamp: new Date().toISOString() }
    try {
      await api.createFiche({
        id,
        date: data.date,
        chauffeur_matricule: data.chauffeur?.matricule,
        chauffeur_nom: data.chauffeur?.nom,
        ripeur1_matricule: data.ripeur1?.matricule,
        ripeur1_nom: data.ripeur1?.nom,
        ripeur2_matricule: data.ripeur2?.matricule,
        ripeur2_nom: data.ripeur2?.nom,
        vehicule_type: data.vehiculeType,
        vehicule_label: data.vehiculeLabel,
        no_parc: data.noParc,
        immatriculation: data.immatriculation,
        arrondissement: data.arrondissement,
        secteur: data.secteur,
        circuit: data.circuit,
        tonnage: data.tonnage,
        rotations: data.rotations,
      })
    } catch (e) {
      console.error('Erreur enregistrement fiche:', e.message)
    }
    fichesCollecte.value[id] = fiche
    return id
  }

  function getFicheCollecte(id) {
    return fichesCollecte.value[id] || null
  }

  const historiquesFiches = computed(() =>
    Object.values(fichesCollecte.value).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
  )

  // ── Bouclages ──

  async function enregistrerBouclage(data) {
    const key = `${data.matricule}-${data.date}`
    try {
      await api.createBouclage({
        matricule: data.matricule,
        date: data.date,
        agent_nom: data.agent,
        circuit: data.circuit,
        vehicule: data.vehicule,
        bouclage_declare: data.bouclageDeclare,
      })
    } catch (e) {
      console.error('Erreur enregistrement bouclage:', e.message)
    }
    bouclages.value[key] = {
      ...data,
      statutGeo: 'EN_ATTENTE_GEO',
      timestamp: new Date().toISOString(),
    }
  }

  function getBouclage(matricule, date) {
    return bouclages.value[`${matricule}-${date}`] || null
  }

  function majStatutGeo(matricule, date, statutGeo) {
    const key = `${matricule}-${date}`
    if (bouclages.value[key]) {
      bouclages.value[key].statutGeo = statutGeo
    }
    // Also update backend
    api.updateBouclageGeo(matricule, date, statutGeo).catch(() => {})
  }

  function getBouclagesEnAttente() {
    return Object.values(bouclages.value).filter(b => b.statutGeo === 'EN_ATTENTE_GEO')
  }

  // ── Entretiens ──

  async function enregistrerEntretien(data) {
    const key = `${data.matricule}-${data.date}`
    try {
      await api.createEntretien({
        matricule: data.matricule,
        date: data.date,
        agent_nom: data.agent,
        vehicule: data.vehicule,
        etat_mecanique: data.etatMecanique,
        proprete: data.proprete,
        respect_controles: data.respectControles,
        degradations: data.degradations,
        note: data.note,
      })
    } catch (e) {
      console.error('Erreur enregistrement entretien:', e.message)
    }
    entretiens.value[key] = { ...data, timestamp: new Date().toISOString() }
  }

  function getEntretien(matricule, date) {
    return entretiens.value[`${matricule}-${date}`] || null
  }

  // ── QHSE ──

  async function enregistrerQhse(data) {
    const key = `${data.matricule}-${data.date}`
    try {
      await api.createQhse({
        matricule: data.matricule,
        date: data.date,
        agent_nom: data.agent,
        checklist_sur5: data.checklistSur5,
        alcootest_positif: data.alcootestPositif,
        epi_conforme: data.epiConforme,
        quart_heure_securite: data.quartHeureSecurite,
      })
    } catch (e) {
      console.error('Erreur enregistrement QHSE:', e.message)
    }
    qhseEvals.value[key] = { ...data, timestamp: new Date().toISOString() }
  }

  function getQhse(matricule, date) {
    return qhseEvals.value[`${matricule}-${date}`] || null
  }

  // ── Charger les saisies d'un mois depuis l'API ──
  async function chargerMois(mois) {
    try {
      const [t, b, e, q] = await Promise.all([
        api.getTonnages({ mois }),
        api.getBouclages({ mois: undefined }), // all
        api.getEntretiens({ mois }),
        api.getQhse({ mois }),
      ])

      t.forEach(row => {
        tonnages.value[`${row.matricule}-${row.date}`] = {
          matricule: row.matricule, date: row.date, agent: row.agent_nom,
          vehicule: row.vehicule_type, tonnage: row.tonnage, rotations: row.rotations,
          noParc: row.no_parc, immatriculation: row.immatriculation,
          vehiculeLabel: row.vehicule_label, arrondissement: row.arrondissement,
          secteur: row.secteur, circuit: row.circuit, timestamp: row.created_at,
        }
      })

      b.forEach(row => {
        bouclages.value[`${row.matricule}-${row.date}`] = {
          matricule: row.matricule, date: row.date, agent: row.agent_nom,
          circuit: row.circuit, vehicule: row.vehicule,
          bouclageDeclare: !!row.bouclage_declare,
          statutGeo: row.statut_geo, timestamp: row.created_at,
        }
      })

      e.forEach(row => {
        entretiens.value[`${row.matricule}-${row.date}`] = {
          matricule: row.matricule, date: row.date, agent: row.agent_nom,
          vehicule: row.vehicule, note: row.note, timestamp: row.created_at,
        }
      })

      q.forEach(row => {
        qhseEvals.value[`${row.matricule}-${row.date}`] = {
          matricule: row.matricule, date: row.date, agent: row.agent_nom,
          checklistSur5: row.checklist_sur5, alcootestPositif: !!row.alcootest_positif,
          epiConforme: !!row.epi_conforme, quartHeureSecurite: !!row.quart_heure_securite,
          timestamp: row.created_at,
        }
      })
    } catch (e) {
      console.error('Erreur chargement mois:', e.message)
    }
  }

  // ── Agrégation mensuelle ──
  function getAgregationMensuelle(matricule, mois) {
    const prefix = `${matricule}-${mois}`

    const tonnagesDuMois = Object.values(tonnages.value).filter(t => t.matricule === matricule && t.date?.startsWith(mois))
    const bouclagesDuMois = Object.values(bouclages.value).filter(b => b.matricule === matricule && b.date?.startsWith(mois))
    const entretiensDuMois = Object.values(entretiens.value).filter(e => e.matricule === matricule && e.date?.startsWith(mois))
    const qhseDuMois = Object.values(qhseEvals.value).filter(q => q.matricule === matricule && q.date?.startsWith(mois))

    let tonnageMoyen = 0, rotationsMoyennes = 0, typeVehicule = 'BOM'
    if (tonnagesDuMois.length > 0) {
      tonnageMoyen = tonnagesDuMois.reduce((s, t) => s + (t.tonnage || 0), 0) / tonnagesDuMois.length
      rotationsMoyennes = tonnagesDuMois.reduce((s, t) => s + (t.rotations || 0), 0) / tonnagesDuMois.length
      typeVehicule = tonnagesDuMois[tonnagesDuMois.length - 1].vehicule || 'BOM'
    }

    const statutsBouclage = bouclagesDuMois
      .filter(b => b.bouclageDeclare !== null)
      .map(b => {
        if (b.statutGeo === 'VALIDE') return 'VALIDE'
        if (b.statutGeo === 'PARTIEL') return 'PARTIEL'
        if (b.statutGeo === 'REFUSE') return 'REFUSE'
        return b.bouclageDeclare ? 'VALIDE' : 'REFUSE'
      })

    let noteEntretienMoyenne = null
    if (entretiensDuMois.length > 0) {
      noteEntretienMoyenne = entretiensDuMois.reduce((s, e) => s + (e.note || 0), 0) / entretiensDuMois.length
    }

    let qhseData = { checklistSur5: 5, alcootestPositif: false, epiConforme: true, quartHeureSecurite: true }
    if (qhseDuMois.length > 0) {
      qhseData = {
        checklistSur5: qhseDuMois.reduce((s, q) => s + (q.checklistSur5 || 0), 0) / qhseDuMois.length,
        alcootestPositif: qhseDuMois.some(q => q.alcootestPositif),
        epiConforme: qhseDuMois.every(q => q.epiConforme),
        quartHeureSecurite: qhseDuMois.every(q => q.quartHeureSecurite),
      }
    }

    return {
      tonnageMoyen, rotationsMoyennes, typeVehicule, statutsBouclage,
      noteEntretienMoyenne, qhseData,
      nbSaisiesTonnage: tonnagesDuMois.length,
      nbSaisiesBouclage: bouclagesDuMois.length,
      nbSaisiesEntretien: entretiensDuMois.length,
      nbSaisiesQhse: qhseDuMois.length,
    }
  }

  const historiqueTonnages = computed(() =>
    Object.values(tonnages.value).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  )

  const stats = computed(() => ({
    nbTonnages: Object.keys(tonnages.value).length,
    nbBouclages: Object.keys(bouclages.value).length,
    nbEntretiens: Object.keys(entretiens.value).length,
    nbQhse: Object.keys(qhseEvals.value).length,
  }))

  return {
    fichesCollecte, tonnages, bouclages, entretiens, qhseEvals,
    enregistrerFicheCollecte, getFicheCollecte, historiquesFiches,
    enregistrerTonnage, getTonnage,
    enregistrerBouclage, getBouclage, majStatutGeo, getBouclagesEnAttente,
    enregistrerEntretien, getEntretien,
    enregistrerQhse, getQhse,
    getAgregationMensuelle, historiqueTonnages, stats,
    chargerMois,
  }
})
