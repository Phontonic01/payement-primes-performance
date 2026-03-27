import { Router } from 'express'
import db from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

// ═══ TONNAGES ═══

router.get('/tonnages', (req, res) => {
  const { matricule, mois, date } = req.query
  let sql = 'SELECT * FROM tonnages WHERE 1=1'
  const params = []
  if (matricule) { sql += ' AND matricule = ?'; params.push(matricule) }
  if (mois) { sql += ' AND date LIKE ?'; params.push(mois + '%') }
  if (date) { sql += ' AND date = ?'; params.push(date) }
  sql += ' ORDER BY date DESC, created_at DESC'
  res.json(db.prepare(sql).all(...params))
})

router.post('/tonnages', (req, res) => {
  const { matricule, date, agent_nom, vehicule, vehicule_type, vehicule_label, no_parc, immatriculation, arrondissement, secteur, circuit, tonnage, rotations } = req.body
  if (!matricule || !date) return res.status(400).json({ error: 'matricule et date requis' })
  try {
    const result = db.prepare(`
      INSERT OR REPLACE INTO tonnages (matricule, date, agent_nom, vehicule, vehicule_type, vehicule_label, no_parc, immatriculation, arrondissement, secteur, circuit, tonnage, rotations, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(matricule, date, agent_nom, vehicule, vehicule_type, vehicule_label, no_parc, immatriculation, arrondissement, secteur, circuit, tonnage || 0, rotations || 0)
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══ FICHES COLLECTE ═══

router.get('/fiches', (req, res) => {
  const { date, mois } = req.query
  let sql = 'SELECT * FROM fiches_collecte WHERE 1=1'
  const params = []
  if (date) { sql += ' AND date = ?'; params.push(date) }
  if (mois) { sql += ' AND date LIKE ?'; params.push(mois + '%') }
  sql += ' ORDER BY created_at DESC'
  res.json(db.prepare(sql).all(...params))
})

router.post('/fiches', (req, res) => {
  const f = req.body
  try {
    db.prepare(`
      INSERT INTO fiches_collecte (id, date, chauffeur_matricule, chauffeur_nom, ripeur1_matricule, ripeur1_nom, ripeur2_matricule, ripeur2_nom, vehicule_type, vehicule_label, no_parc, immatriculation, arrondissement, secteur, circuit, tonnage, rotations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(f.id, f.date, f.chauffeur_matricule, f.chauffeur_nom, f.ripeur1_matricule, f.ripeur1_nom, f.ripeur2_matricule, f.ripeur2_nom, f.vehicule_type, f.vehicule_label, f.no_parc, f.immatriculation, f.arrondissement, f.secteur, f.circuit, f.tonnage, f.rotations)
    res.status(201).json({ id: f.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/fiches/:id', (req, res) => {
  const fiche = db.prepare('SELECT * FROM fiches_collecte WHERE id = ?').get(req.params.id)
  if (!fiche) return res.status(404).json({ error: 'Fiche non trouvée' })
  res.json(fiche)
})

// ═══ BOUCLAGES ═══

router.get('/bouclages', (req, res) => {
  const { matricule, date, statut_geo } = req.query
  let sql = 'SELECT * FROM bouclages WHERE 1=1'
  const params = []
  if (matricule) { sql += ' AND matricule = ?'; params.push(matricule) }
  if (date) { sql += ' AND date = ?'; params.push(date) }
  if (statut_geo) { sql += ' AND statut_geo = ?'; params.push(statut_geo) }
  sql += ' ORDER BY date DESC'
  res.json(db.prepare(sql).all(...params))
})

router.post('/bouclages', (req, res) => {
  const { matricule, date, agent_nom, circuit, vehicule, bouclage_declare } = req.body
  if (!matricule || !date) return res.status(400).json({ error: 'matricule et date requis' })
  try {
    const result = db.prepare(`
      INSERT OR REPLACE INTO bouclages (matricule, date, agent_nom, circuit, vehicule, bouclage_declare, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(matricule, date, agent_nom, circuit, vehicule, bouclage_declare ? 1 : 0)
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.patch('/bouclages/:matricule/:date/geo', (req, res) => {
  const { statut_geo } = req.body
  const result = db.prepare("UPDATE bouclages SET statut_geo = ?, updated_at = datetime('now') WHERE matricule = ? AND date = ?")
    .run(statut_geo, req.params.matricule, req.params.date)
  if (result.changes === 0) return res.status(404).json({ error: 'Bouclage non trouvé' })
  res.json({ success: true })
})

// ═══ ENTRETIENS ═══

router.get('/entretiens', (req, res) => {
  const { matricule, mois } = req.query
  let sql = 'SELECT * FROM entretiens WHERE 1=1'
  const params = []
  if (matricule) { sql += ' AND matricule = ?'; params.push(matricule) }
  if (mois) { sql += ' AND date LIKE ?'; params.push(mois + '%') }
  sql += ' ORDER BY date DESC'
  res.json(db.prepare(sql).all(...params))
})

router.post('/entretiens', (req, res) => {
  const { matricule, date, agent_nom, vehicule, etat_mecanique, proprete, respect_controles, degradations, note } = req.body
  if (!matricule || !date) return res.status(400).json({ error: 'matricule et date requis' })
  try {
    const result = db.prepare(`
      INSERT OR REPLACE INTO entretiens (matricule, date, agent_nom, vehicule, etat_mecanique, proprete, respect_controles, degradations, note, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(matricule, date, agent_nom, vehicule, etat_mecanique || 10, proprete || 10, respect_controles || 10, degradations || '', note || 10)
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══ QHSE ═══

router.get('/qhse', (req, res) => {
  const { matricule, mois } = req.query
  let sql = 'SELECT * FROM qhse_evals WHERE 1=1'
  const params = []
  if (matricule) { sql += ' AND matricule = ?'; params.push(matricule) }
  if (mois) { sql += ' AND date LIKE ?'; params.push(mois + '%') }
  sql += ' ORDER BY date DESC'
  res.json(db.prepare(sql).all(...params))
})

router.post('/qhse', (req, res) => {
  const { matricule, date, agent_nom, checklist_sur5, alcootest_positif, epi_conforme, quart_heure_securite } = req.body
  if (!matricule || !date) return res.status(400).json({ error: 'matricule et date requis' })
  try {
    const result = db.prepare(`
      INSERT OR REPLACE INTO qhse_evals (matricule, date, agent_nom, checklist_sur5, alcootest_positif, epi_conforme, quart_heure_securite, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(matricule, date, agent_nom, checklist_sur5 ?? 5, alcootest_positif ? 1 : 0, epi_conforme ? 1 : 0, quart_heure_securite ? 1 : 0)
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══ TRI ═══

router.get('/tri', (req, res) => {
  const { date, mois, arrondissement } = req.query
  let sql = 'SELECT * FROM tri_saisies WHERE 1=1'
  const params = []
  if (date) { sql += ' AND date = ?'; params.push(date) }
  if (mois) { sql += ' AND date LIKE ?'; params.push(mois + '%') }
  if (arrondissement) { sql += ' AND arrondissement = ?'; params.push(arrondissement) }
  sql += ' ORDER BY date DESC'
  res.json(db.prepare(sql).all(...params))
})

router.post('/tri', (req, res) => {
  const { date, arrondissement, immatriculation, chauffeur_matricule, chauffeur_nom,
    ripeur1_matricule, ripeur1_nom, ripeur2_matricule, ripeur2_nom,
    ripeur3_matricule, ripeur3_nom, tonnage_collecte, rotations,
    pourcentage_prime, montant_prime } = req.body
  if (!date) return res.status(400).json({ error: 'date requise' })
  try {
    const result = db.prepare(`
      INSERT OR REPLACE INTO tri_saisies (date, arrondissement, immatriculation,
        chauffeur_matricule, chauffeur_nom, ripeur1_matricule, ripeur1_nom,
        ripeur2_matricule, ripeur2_nom, ripeur3_matricule, ripeur3_nom,
        tonnage_collecte, rotations, pourcentage_prime, montant_prime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(date, arrondissement || '', immatriculation || '',
      chauffeur_matricule || '', chauffeur_nom || '',
      ripeur1_matricule || '', ripeur1_nom || '',
      ripeur2_matricule || '', ripeur2_nom || '',
      ripeur3_matricule || '', ripeur3_nom || '',
      tonnage_collecte || 0, rotations || 0,
      pourcentage_prime || 0, montant_prime || 0)
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══ STATS GLOBALES ═══

router.get('/stats', (req, res) => {
  const mois = req.query.mois || new Date().toISOString().slice(0, 7)
  res.json({
    tonnages: db.prepare('SELECT COUNT(*) as n FROM tonnages WHERE date LIKE ?').get(mois + '%').n,
    bouclages: db.prepare('SELECT COUNT(*) as n FROM bouclages WHERE date LIKE ?').get(mois + '%').n,
    entretiens: db.prepare('SELECT COUNT(*) as n FROM entretiens WHERE date LIKE ?').get(mois + '%').n,
    qhse: db.prepare('SELECT COUNT(*) as n FROM qhse_evals WHERE date LIKE ?').get(mois + '%').n,
    tri: db.prepare('SELECT COUNT(*) as n FROM tri_saisies WHERE date LIKE ?').get(mois + '%').n,
  })
})

// ═══ AGRÉGATION MENSUELLE ═══

router.get('/agregation/:matricule', (req, res) => {
  const { matricule } = req.params
  const mois = req.query.mois || new Date().toISOString().slice(0, 7)

  const tonnagesDuMois = db.prepare('SELECT * FROM tonnages WHERE matricule = ? AND date LIKE ?').all(matricule, mois + '%')
  const bouclagesDuMois = db.prepare('SELECT * FROM bouclages WHERE matricule = ? AND date LIKE ?').all(matricule, mois + '%')
  const entretiensDuMois = db.prepare('SELECT * FROM entretiens WHERE matricule = ? AND date LIKE ?').all(matricule, mois + '%')
  const qhseDuMois = db.prepare('SELECT * FROM qhse_evals WHERE matricule = ? AND date LIKE ?').all(matricule, mois + '%')

  let tonnageMoyen = 0, rotationsMoyennes = 0, typeVehicule = 'BOM'
  if (tonnagesDuMois.length > 0) {
    tonnageMoyen = tonnagesDuMois.reduce((s, t) => s + t.tonnage, 0) / tonnagesDuMois.length
    rotationsMoyennes = tonnagesDuMois.reduce((s, t) => s + t.rotations, 0) / tonnagesDuMois.length
    typeVehicule = tonnagesDuMois[tonnagesDuMois.length - 1].vehicule_type || 'BOM'
  }

  const statutsBouclage = bouclagesDuMois.map(b => b.statut_geo === 'VALIDE' ? 'VALIDE' : b.statut_geo === 'PARTIEL' ? 'PARTIEL' : b.statut_geo === 'REFUSE' ? 'REFUSE' : b.bouclage_declare ? 'VALIDE' : 'REFUSE')

  let noteEntretienMoyenne = null
  if (entretiensDuMois.length > 0) {
    noteEntretienMoyenne = entretiensDuMois.reduce((s, e) => s + e.note, 0) / entretiensDuMois.length
  }

  let qhseData = { checklistSur5: 5, alcootestPositif: false, epiConforme: true, quartHeureSecurite: true }
  if (qhseDuMois.length > 0) {
    qhseData = {
      checklistSur5: qhseDuMois.reduce((s, q) => s + q.checklist_sur5, 0) / qhseDuMois.length,
      alcootestPositif: qhseDuMois.some(q => q.alcootest_positif),
      epiConforme: qhseDuMois.every(q => q.epi_conforme),
      quartHeureSecurite: qhseDuMois.every(q => q.quart_heure_securite),
    }
  }

  res.json({
    tonnageMoyen, rotationsMoyennes, typeVehicule, statutsBouclage,
    noteEntretienMoyenne, qhseData,
    nbSaisiesTonnage: tonnagesDuMois.length,
    nbSaisiesBouclage: bouclagesDuMois.length,
    nbSaisiesEntretien: entretiensDuMois.length,
    nbSaisiesQhse: qhseDuMois.length,
  })
})

export default router
