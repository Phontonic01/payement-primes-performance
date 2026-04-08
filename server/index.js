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
import equipesJournalieresRoutes from './routes/equipes-journalieres.js'

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
app.use('/api/equipes-journalieres', equipesJournalieresRoutes)

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

// Force checkpoint au démarrage pour matérialiser le WAL → DB principale
// (sécurité au cas où l'arrêt précédent aurait été brutal)
try {
  const cp = db.pragma('wal_checkpoint(TRUNCATE)')
  console.log(`  ✓ WAL checkpoint au démarrage : ${JSON.stringify(cp[0])}`)
} catch (e) {
  console.error('  ⚠ Checkpoint au démarrage échoué :', e.message)
}

// Backup automatique quotidien (au démarrage + toutes les 24h tant que l'API tourne)
async function autoBackup() {
  try {
    const { mkdirSync, statSync, readdirSync, unlinkSync } = await import('node:fs')
    const { join } = await import('node:path')
    const BACKUP_DIR = join(__dirname, '..', 'data', 'backups')
    mkdirSync(BACKUP_DIR, { recursive: true })

    const stamp = new Date().toISOString().slice(0, 16).replace(':', '').replace('T', '-')
    const target = join(BACKUP_DIR, `cleanAfrica-${stamp}.db`)

    // Skip si un backup de la même minute existe déjà
    if (existsSync(target)) return

    db.pragma('wal_checkpoint(TRUNCATE)')
    await db.backup(target)
    const size = statSync(target).size
    console.log(`  ✓ Backup auto : data/backups/cleanAfrica-${stamp}.db (${(size / 1024 / 1024).toFixed(2)} Mo)`)

    // Purge : garder 30 derniers
    const all = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('cleanAfrica-') && f.endsWith('.db'))
      .map(f => ({ name: f, mtime: statSync(join(BACKUP_DIR, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime)
    for (const f of all.slice(30)) {
      unlinkSync(join(BACKUP_DIR, f.name))
    }
  } catch (e) {
    console.error('  ⚠ Backup auto échoué :', e.message)
  }
}
autoBackup()
setInterval(autoBackup, 24 * 60 * 60 * 1000)  // toutes les 24h

// Checkpoint périodique (toutes les 5 min) pour éviter qu'un WAL trop gros
// ne mette en péril les données récentes en cas de crash
setInterval(() => {
  try { db.pragma('wal_checkpoint(PASSIVE)') } catch {}
}, 5 * 60 * 1000)

// Arrêt propre : checkpoint final + close
function gracefulShutdown(signal) {
  console.log(`\n  ⏸  Signal ${signal} reçu, arrêt propre...`)
  try {
    db.pragma('wal_checkpoint(TRUNCATE)')
    db.close()
    console.log('  ✓ Base fermée proprement, données sauvegardées')
  } catch (e) {
    console.error('  ⚠ Erreur shutdown :', e.message)
  }
  process.exit(0)
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

app.listen(PORT, () => {
  console.log(`\n  ✓ API démarrée sur http://localhost:${PORT}`)
  console.log(`  ✓ Health: http://localhost:${PORT}/api/health`)
  console.log(`  ✓ Base: data/cleanAfrica.db (backups dans data/backups/)\n`)
})
