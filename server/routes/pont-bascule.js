import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  connectPontBascule, disconnect, isConnected,
  listTables, describeTable, getPesees, getPeseesParMois,
  syncPesees, diagnostic
} from '../connectors/pont-bascule.js'
import db from '../db.js'

const router = Router()
router.use(authMiddleware)

// GET /api/pont-bascule/status — état de la connexion
router.get('/status', (req, res) => {
  res.json({ connected: isConnected() })
})

// GET /api/pont-bascule/diagnostic — test complet
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
    res.json({ success: true, message: 'Connecté au pont-bascule' })
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

// GET /api/pont-bascule/pesees?date=YYYY-MM-DD
router.get('/pesees', async (req, res) => {
  const { date, mois } = req.query
  try {
    if (mois) {
      const pesees = await getPeseesParMois(mois)
      res.json(pesees)
    } else {
      const pesees = await getPesees(date || new Date().toISOString().split('T')[0])
      res.json(pesees)
    }
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
