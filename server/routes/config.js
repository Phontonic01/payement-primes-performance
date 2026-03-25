import { Router } from 'express'
import db from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

// GET /api/config/primes
router.get('/primes', (req, res) => {
  const config = db.prepare('SELECT * FROM config_primes WHERE id = 1').get()
  config.ponderations = JSON.parse(config.ponderations)
  res.json(config)
})

// PUT /api/config/primes — requires note de service
router.put('/primes', (req, res) => {
  const { note_service_ref, note_service_date, ponderations, seuil_min_prime, seuil_presence, jours_ouvres_mois, plafond_collecte, plafond_tri, tri_bom_seuil100, tri_bom_seuil75, tri_bom_seuil50, tri_movi_seuil100, tri_movi_seuil75, tri_movi_seuil50 } = req.body

  if (!note_service_ref || !note_service_date) {
    return res.status(403).json({ error: 'Note de service officielle requise pour modifier les paramètres' })
  }

  // Log the note de service
  db.prepare(`
    INSERT INTO notes_de_service (reference, date_note, description, type, auteur, modifications)
    VALUES (?, ?, ?, 'PARAMS', ?, ?)
  `).run(note_service_ref, note_service_date, 'Modification des paramètres de calcul de la prime', req.user.username, JSON.stringify(req.body))

  // Update config
  const sets = []
  const params = []

  if (ponderations) { sets.push('ponderations = ?'); params.push(JSON.stringify(ponderations)) }
  if (seuil_min_prime !== undefined) { sets.push('seuil_min_prime = ?'); params.push(seuil_min_prime) }
  if (seuil_presence !== undefined) { sets.push('seuil_presence = ?'); params.push(seuil_presence) }
  if (jours_ouvres_mois !== undefined) { sets.push('jours_ouvres_mois = ?'); params.push(jours_ouvres_mois) }
  if (plafond_collecte !== undefined) { sets.push('plafond_collecte = ?'); params.push(plafond_collecte) }
  if (plafond_tri !== undefined) { sets.push('plafond_tri = ?'); params.push(plafond_tri) }
  if (tri_bom_seuil100 !== undefined) { sets.push('tri_bom_seuil100 = ?'); params.push(tri_bom_seuil100) }
  if (tri_bom_seuil75 !== undefined) { sets.push('tri_bom_seuil75 = ?'); params.push(tri_bom_seuil75) }
  if (tri_bom_seuil50 !== undefined) { sets.push('tri_bom_seuil50 = ?'); params.push(tri_bom_seuil50) }
  if (tri_movi_seuil100 !== undefined) { sets.push('tri_movi_seuil100 = ?'); params.push(tri_movi_seuil100) }
  if (tri_movi_seuil75 !== undefined) { sets.push('tri_movi_seuil75 = ?'); params.push(tri_movi_seuil75) }
  if (tri_movi_seuil50 !== undefined) { sets.push('tri_movi_seuil50 = ?'); params.push(tri_movi_seuil50) }

  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')")
    db.prepare(`UPDATE config_primes SET ${sets.join(', ')} WHERE id = 1`).run(...params)
  }

  res.json({ success: true, note_service_ref })
})

// GET /api/config/notes-de-service
router.get('/notes-de-service', (req, res) => {
  res.json(db.prepare('SELECT * FROM notes_de_service ORDER BY created_at DESC').all())
})

// GET /api/config/validations
router.get('/validations', (req, res) => {
  res.json(db.prepare('SELECT * FROM validations_mensuelles ORDER BY mois DESC').all())
})

// POST /api/config/validations — clôturer un mois
router.post('/validations', (req, res) => {
  const { mois, total_primes, nb_eligibles, note_service_ref } = req.body
  if (!mois) return res.status(400).json({ error: 'mois requis' })
  try {
    db.prepare(`
      INSERT OR REPLACE INTO validations_mensuelles (mois, statut, total_primes, nb_eligibles, note_service_ref, validee_par, validated_at)
      VALUES (?, 'CLOTURE', ?, ?, ?, ?, datetime('now'))
    `).run(mois, total_primes || 0, nb_eligibles || 0, note_service_ref || '', req.user.username)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
