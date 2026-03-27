import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  connectPontBascule, disconnect, isConnected,
  listTables, describeTable, getPesees, getPeseesParMois,
  getPeseesParVehicule, getPeseesParTransporteur,
  getStatsDuJour, getPresenceMensuelle, getBilanMensuel,
  syncPesees, diagnostic, determinerEquipe
} from '../connectors/pont-bascule.js'
import { db } from '../db.js'

const router = Router()
router.use(authMiddleware)

// GET /api/pont-bascule/status — état de la connexion
router.get('/status', (req, res) => {
  res.json({ connected: isConnected() })
})

// GET /api/pont-bascule/diagnostic — test complet avec stats du jour
router.get('/diagnostic', async (req, res) => {
  try {
    const info = await diagnostic()
    res.json(info)
  } catch (err) {
    res.json({ connected: false, error: err.message })
  }
})

// POST /api/pont-bascule/connect
router.post('/connect', async (req, res) => {
  try {
    await connectPontBascule()
    res.json({ success: true, message: 'Connecté au pont-bascule WinStar' })
  } catch (err) {
    res.status(503).json({ error: `Connexion échouée: ${err.message}` })
  }
})

// POST /api/pont-bascule/disconnect
router.post('/disconnect', async (req, res) => {
  await disconnect()
  res.json({ success: true })
})

// GET /api/pont-bascule/tables — lister les tables
router.get('/tables', async (req, res) => {
  try {
    const tables = await listTables()
    res.json(tables)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// GET /api/pont-bascule/tables/:name — décrire une table
router.get('/tables/:name', async (req, res) => {
  try {
    const columns = await describeTable(req.params.name)
    res.json(columns)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// GET /api/pont-bascule/pesees?date=YYYY-MM-DD&mois=YYYY-MM&immat=XX&transporteur=XX
router.get('/pesees', async (req, res) => {
  const { date, mois, immat, transporteur } = req.query
  try {
    let pesees
    if (immat && mois) {
      pesees = await getPeseesParVehicule(immat, mois)
    } else if (transporteur && mois) {
      pesees = await getPeseesParTransporteur(transporteur, mois)
    } else if (mois) {
      pesees = await getPeseesParMois(mois)
    } else {
      pesees = await getPesees(date || new Date().toISOString().split('T')[0])
    }
    res.json(pesees)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// GET /api/pont-bascule/stats?date=YYYY-MM-DD
router.get('/stats', async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0]
  try {
    const stats = await getStatsDuJour(date)
    res.json(stats)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// GET /api/pont-bascule/vehicules-du-jour?date=YYYY-MM-DD&client=CLEAN AFRICA&service=TRI
// Liste de tous les véhicules du jour, agrégés (pour le formulaire de saisie)
// service=TRI → uniquement véhicules TRI (N° de parc 480,484,124,233,128,135,137,140,515)
// service=COLLECTE → uniquement véhicules Collecte (tout sauf TRI)
router.get('/vehicules-du-jour', async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0]
  const clientFilter = req.query.client || null
  const serviceFilter = req.query.service || null
  try {
    const pesees = await getPesees(date)
    const filtrees = clientFilter
      ? pesees.filter(p => p.Libelle_Client === clientFilter)
      : pesees

    // Grouper par immatriculation
    const parVehicule = {}
    for (const p of filtrees) {
      const immat = p.Immatriculation
      if (!parVehicule[immat]) {
        parVehicule[immat] = {
          immatriculation: immat,
          chauffeur: p.Libelle_Transporteur || '',
          code_transporteur: p.Code_Transporteur || '',
          client: p.Libelle_Client || '',
          arrondissement: p.Libelle_Destination || '',
          origine: p.Libelle_Origine || '',
          produit: p.Libelle_Produit || '',
          equipe: p.Equipe || 'NUIT',
          pesees: [],
          tonnage_kg: 0,
        }
      }
      parVehicule[immat].pesees.push({
        no_ticket: p.No_Ticket,
        poids_net: p.Poids_Net,
        heure_entree: p.Heure_Entree,
        origine: p.Libelle_Origine,
        destination: p.Libelle_Destination,
        equipe: p.Equipe,
      })
      parVehicule[immat].tonnage_kg += (p.Poids_Net || 0)
    }

    // Charger la présence mensuelle pour enrichir chaque chauffeur
    const mois = date.slice(0, 7)
    let presenceMap = {}
    try {
      const presence = await getPresenceMensuelle(mois)
      presence.forEach(c => { presenceMap[c.code_transporteur] = c.jours_present })
    } catch { /* presence non bloquante */ }

    const joursOuvres = 20

    // Charger les agents locaux pour enrichir avec service/direction
    const agentsLocaux = db.prepare('SELECT matricule, nom, direction, service, role, fonction FROM agents WHERE statut = ?').all('ACTIF')
    const agentsParMatricule = {}
    for (const a of agentsLocaux) { agentsParMatricule[a.matricule] = a }

    // Numéros de parc des véhicules dédiés au TRI
    // (le pont-bascule utilise le N° de parc dans le champ Immatriculation)
    const noParcsTRI = new Set(['480', '484', '124', '233', '128', '135', '137', '140', '515'])

    // Convertir en tableau trié par tonnage décroissant
    const vehicules = Object.values(parVehicule).map(v => {
      const joursPresent = Math.min(presenceMap[v.code_transporteur] || 0, joursOuvres)
      const tauxPresence = Math.min(+(joursPresent / joursOuvres * 100).toFixed(1), 100)
      // Service déterminé UNIQUEMENT par le véhicule (N° de parc)
      const estVehiculeTRI = noParcsTRI.has(String(v.immatriculation).trim())
      const service = estVehiculeTRI ? 'TRI' : 'COLLECTE'
      // Recalculer l'équipe avec les bons horaires selon le service
      const premiereHeure = v.pesees?.[v.pesees.length - 1]?.heure_entree
      const equipeCorrigee = premiereHeure ? determinerEquipe(premiereHeure, service) : v.equipe
      return {
        ...v,
        equipe: equipeCorrigee,
        service,
        direction: estVehiculeTRI ? 'DQHSE' : '',
        tonnage_tonnes: +(v.tonnage_kg / 1000).toFixed(2),
        rotations: v.pesees.length,
        jours_present: joursPresent,
        taux_presence: tauxPresence,
        eligible_presence: joursPresent >= Math.ceil(joursOuvres * 0.93),
      }
    }).sort((a, b) => b.tonnage_kg - a.tonnage_kg)

    // Filtrer par service si demandé
    const vehiculesFiltres = serviceFilter
      ? vehicules.filter(v => v.service === serviceFilter)
      : vehicules

    // Compter par équipe
    const nbJour = vehiculesFiltres.filter(v => v.equipe === 'JOUR').length
    const nbNuit = vehiculesFiltres.filter(v => v.equipe === 'NUIT').length

    res.json({ date, mois, jours_ouvres: joursOuvres, total: vehiculesFiltres.length, nb_jour: nbJour, nb_nuit: nbNuit, vehicules: vehiculesFiltres })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// GET /api/pont-bascule/presence?mois=YYYY-MM
router.get('/presence', async (req, res) => {
  const mois = req.query.mois || new Date().toISOString().slice(0, 7)
  try {
    const presence = await getPresenceMensuelle(mois)
    const joursOuvres = 20
    const seuilPresence = 0.93
    res.json({
      mois,
      jours_ouvres: joursOuvres,
      seuil_presence: seuilPresence,
      chauffeurs: presence.map(c => {
        const joursEffectifs = Math.min(c.jours_present, joursOuvres)
        return {
          ...c,
          jours_present: joursEffectifs,
          taux_presence: Math.min(+(joursEffectifs / joursOuvres * 100).toFixed(1), 100),
          eligible: joursEffectifs >= Math.ceil(joursOuvres * seuilPresence),
        }
      }),
    })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// GET /api/pont-bascule/bilan?mois=YYYY-MM&service=TRI — bilan mensuel complet avec pénalités jour par jour
router.get('/bilan', async (req, res) => {
  const mois = req.query.mois || new Date().toISOString().slice(0, 7)
  const serviceFilter = req.query.service || null
  try {
    // Plafond TRI = 25 000 F, Collecte = 50 000 F
    const plafondTRI = 25000
    const plafondCollecte = 50000
    const plafondBilan = serviceFilter === 'TRI' ? plafondTRI : plafondCollecte
    const bilan = await getBilanMensuel(mois, 'CLEAN AFRICA', plafondBilan)

    // Numéros de parc des véhicules dédiés au TRI
    const noParcsTRI = new Set(['480', '484', '124', '233', '128', '135', '137', '140', '515'])

    for (const c of bilan.chauffeurs) {
      // Service déterminé UNIQUEMENT par le véhicule (N° de parc)
      const estVehiculeTRI = noParcsTRI.has(String(c.immatriculation).trim())
      c.service = estVehiculeTRI ? 'TRI' : 'COLLECTE'
      c.direction = estVehiculeTRI ? 'DQHSE' : ''

      // Ajouter le détail de la retenue présence
      if (c.prorata) {
        c.retenue_presence = c.prime_avant_presence - c.prime_finale
      } else {
        c.retenue_presence = 0
      }
    }

    // Filtrer par service si demandé
    if (serviceFilter) {
      bilan.chauffeurs = bilan.chauffeurs.filter(c => c.service === serviceFilter)
    }

    res.json(bilan)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// GET /api/pont-bascule/resume-vehicule?immat=XX&date=YYYY-MM-DD
// Résumé des pesées d'un véhicule pour une date donnée (pré-remplissage formulaire)
router.get('/resume-vehicule', async (req, res) => {
  const { immat, date } = req.query
  if (!immat || !date) return res.status(400).json({ error: 'immat et date requis' })
  try {
    const pesees = await getPesees(date)
    const filtrees = pesees.filter(p => p.Immatriculation === immat)

    if (filtrees.length === 0) {
      return res.json({ found: false, immat, date })
    }

    const tonnageTotal = filtrees.reduce((s, p) => s + (p.Poids_Net || 0), 0)
    const premiere = filtrees[filtrees.length - 1] // plus ancienne
    const derniere = filtrees[0] // plus récente

    res.json({
      found: true,
      immat,
      date,
      chauffeur: premiere.Libelle_Transporteur || '',
      code_transporteur: premiere.Code_Transporteur || '',
      arrondissement: premiere.Libelle_Destination || '',
      origine: premiere.Libelle_Origine || '',
      client: premiere.Libelle_Client || '',
      produit: premiere.Libelle_Produit || '',
      tonnage_kg: tonnageTotal,
      tonnage_tonnes: +(tonnageTotal / 1000).toFixed(2),
      rotations: filtrees.length,
      pesees: filtrees.map(p => ({
        no_ticket: p.No_Ticket,
        poids_net: p.Poids_Net,
        heure_entree: p.Heure_Entree,
        origine: p.Libelle_Origine,
        destination: p.Libelle_Destination,
      })),
    })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// POST /api/pont-bascule/sync — synchroniser les pesées vers SQLite
router.post('/sync', async (req, res) => {
  const { date } = req.body
  if (!date) return res.status(400).json({ error: 'date requise (YYYY-MM-DD)' })
  try {
    const result = await syncPesees(db, date)
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

export default router
