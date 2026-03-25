import { Router } from 'express'
import db from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

// GET /api/geo/decisions
router.get('/decisions', (req, res) => {
  const { matricule, date, statut, mois } = req.query
  let sql = 'SELECT * FROM geo_decisions WHERE 1=1'
  const params = []
  if (matricule) { sql += ' AND matricule = ?'; params.push(matricule) }
  if (date) { sql += ' AND date = ?'; params.push(date) }
  if (statut) { sql += ' AND statut = ?'; params.push(statut) }
  if (mois) { sql += ' AND date LIKE ?'; params.push(mois + '%') }
  sql += ' ORDER BY date DESC'
  res.json(db.prepare(sql).all(...params))
})

// POST /api/geo/decisions
router.post('/decisions', (req, res) => {
  const { matricule, date, agent_nom, circuit, statut, couverture_gps, justification, gps_data, divergences } = req.body
  if (!matricule || !date || !statut) return res.status(400).json({ error: 'matricule, date et statut requis' })
  try {
    const result = db.prepare(`
      INSERT OR REPLACE INTO geo_decisions (matricule, date, agent_nom, circuit, statut, couverture_gps, justification, gps_data, divergences, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(matricule, date, agent_nom, circuit, statut, couverture_gps || 0, justification || '', JSON.stringify(gps_data || {}), JSON.stringify(divergences || []))

    // Propager la décision vers les bouclages
    db.prepare("UPDATE bouclages SET statut_geo = ?, updated_at = datetime('now') WHERE matricule = ? AND date = ?")
      .run(statut, matricule, date)

    res.status(201).json({ id: result.lastInsertRowid })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/geo/stats
router.get('/stats', (req, res) => {
  const all = db.prepare('SELECT * FROM geo_decisions').all()
  res.json({
    total: all.length,
    valides: all.filter(d => d.statut === 'VALIDE').length,
    partiels: all.filter(d => d.statut === 'PARTIEL').length,
    refuses: all.filter(d => d.statut === 'REFUSE').length,
  })
})

// GET /api/geo/pending — bouclages en attente de validation
router.get('/pending', (req, res) => {
  const pending = db.prepare("SELECT b.*, a.nom as agent_full_nom, a.fonction FROM bouclages b LEFT JOIN agents a ON b.matricule = a.matricule WHERE b.statut_geo = 'EN_ATTENTE_GEO' ORDER BY b.date DESC").all()
  res.json(pending)
})

export default router
