import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import bcrypt from 'bcryptjs'

import { db, seedAgents, seedUsers, seedPontBasculeMapping } from './db.js'
import authRoutes from './routes/auth.js'
import agentsRoutes from './routes/agents.js'
import saisiesRoutes from './routes/saisies.js'
import geoRoutes from './routes/geo.js'
import configRoutes from './routes/config.js'
import pontBasculeRoutes from './routes/pont-bascule.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(__dirname, '..', 'dist')

const app = express()
const PORT = process.env.API_PORT || 3001

// ═══ Middleware ═══
app.use(helmet({ contentSecurityPolicy: false }))
app.use(compression())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))

// ═══ Request logging ═══
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    if (req.path.startsWith('/api/')) {
      console.log(`  ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`)
    }
  })
  next()
})

// ═══ Routes ═══
app.use('/api/auth', authRoutes)
app.use('/api/agents', agentsRoutes)
app.use('/api/saisies', saisiesRoutes)
app.use('/api/geo', geoRoutes)
app.use('/api/config', configRoutes)
app.use('/api/pont-bascule', pontBasculeRoutes)

// ═══ Health check ═══
app.get('/api/health', (req, res) => {
  const agentsCount = db.prepare('SELECT COUNT(*) as n FROM agents').get().n
  const usersCount = db.prepare('SELECT COUNT(*) as n FROM users').get().n
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'SQLite (WAL mode)',
    agents: agentsCount,
    users: usersCount,
  })
})

// ═══ Servir le frontend buildé (production) ═══
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get('/{*path}', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(join(DIST_DIR, 'index.html'))
    }
  })
  console.log('  ✓ Frontend servi depuis dist/')
} else {
  console.log('  ⚠ Pas de dossier dist/ — lancez "npm run build" pour la production')
}

// ═══ Error handler ═══
app.use((err, req, res, next) => {
  console.error('API Error:', err.message)
  res.status(500).json({ error: 'Erreur serveur interne', details: err.message })
})

// ═══ Initialize & Start ═══
console.log('\n╔═══════════════════════════════════════════╗')
console.log('║  CLEAN AFRICA — API Prime de Performance  ║')
console.log('╚═══════════════════════════════════════════╝\n')

console.log('Initialisation de la base de données...')
seedAgents()
seedUsers(bcrypt)
seedPontBasculeMapping()

app.listen(PORT, () => {
  console.log(`\n  ✓ API démarrée sur http://localhost:${PORT}`)
  console.log(`  ✓ Health: http://localhost:${PORT}/api/health`)
  console.log(`  ✓ Base: data/cleanAfrica.db\n`)
})
