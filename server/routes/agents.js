import { Router } from 'express'
import db from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

// GET /api/agents — List all agents (with filters)
router.get('/', (req, res) => {
  const { service, role, search, statut = 'ACTIF' } = req.query
  let sql = 'SELECT * FROM agents WHERE 1=1'
  const params = []

  if (statut) { sql += ' AND statut = ?'; params.push(statut) }
  if (service) { sql += ' AND service = ?'; params.push(service) }
  if (role) { sql += ' AND role = ?'; params.push(role) }
  if (search) {
    sql += ' AND (nom LIKE ? OR matricule LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }

  sql += ' ORDER BY nom ASC'
  res.json(db.prepare(sql).all(...params))
})

// GET /api/agents/stats
router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as n FROM agents WHERE statut = ?').get('ACTIF').n
  const byService = db.prepare('SELECT service, COUNT(*) as n FROM agents WHERE statut = ? GROUP BY service').all('ACTIF')
  const byRole = db.prepare('SELECT role, COUNT(*) as n FROM agents WHERE statut = ? GROUP BY role').all('ACTIF')
  const byDirection = db.prepare('SELECT direction, COUNT(*) as n FROM agents WHERE statut = ? GROUP BY direction').all('ACTIF')
  res.json({ total, byService, byRole, byDirection })
})

// GET /api/agents/:matricule
router.get('/:matricule', (req, res) => {
  const agent = db.prepare('SELECT * FROM agents WHERE matricule = ?').get(req.params.matricule)
  if (!agent) return res.status(404).json({ error: 'Agent non trouvé' })
  res.json(agent)
})

// POST /api/agents
router.post('/', (req, res) => {
  const { no, matricule, nom, role, fonction, serviceRH, direction, service, zone, equipe, vehicule } = req.body
  if (!matricule || !nom || !role || !service) {
    return res.status(400).json({ error: 'Champs requis: matricule, nom, role, service' })
  }
  try {
    const result = db.prepare(`
      INSERT INTO agents (no, matricule, nom, role, fonction, service_rh, direction, service, zone, equipe, vehicule)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(no || '', matricule, nom, role, fonction || role, serviceRH || '', direction || '', service, zone || '', equipe || '', vehicule || '')
    res.status(201).json({ id: result.lastInsertRowid, matricule })
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: `Matricule ${matricule} existe déjà` })
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/agents/:matricule
router.put('/:matricule', (req, res) => {
  const { nom, role, fonction, zone, equipe, vehicule, statut } = req.body
  const sets = []
  const params = []

  if (nom !== undefined) { sets.push('nom = ?'); params.push(nom) }
  if (role !== undefined) { sets.push('role = ?'); params.push(role) }
  if (fonction !== undefined) { sets.push('fonction = ?'); params.push(fonction) }
  if (zone !== undefined) { sets.push('zone = ?'); params.push(zone) }
  if (equipe !== undefined) { sets.push('equipe = ?'); params.push(equipe) }
  if (vehicule !== undefined) { sets.push('vehicule = ?'); params.push(vehicule) }
  if (statut !== undefined) { sets.push('statut = ?'); params.push(statut) }

  if (sets.length === 0) return res.status(400).json({ error: 'Rien à mettre à jour' })

  sets.push("updated_at = datetime('now')")
  params.push(req.params.matricule)

  const result = db.prepare(`UPDATE agents SET ${sets.join(', ')} WHERE matricule = ?`).run(...params)
  if (result.changes === 0) return res.status(404).json({ error: 'Agent non trouvé' })
  res.json({ success: true })
})

// DELETE /api/agents/:matricule (soft delete)
router.delete('/:matricule', (req, res) => {
  const result = db.prepare("UPDATE agents SET statut = 'INACTIF', updated_at = datetime('now') WHERE matricule = ?").run(req.params.matricule)
  if (result.changes === 0) return res.status(404).json({ error: 'Agent non trouvé' })
  res.json({ success: true })
})

export default router
