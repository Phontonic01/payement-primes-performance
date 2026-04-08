#!/usr/bin/env node
/**
 * Sauvegarde automatique de la base SQLite.
 *
 * - Force un checkpoint WAL pour matérialiser toutes les données
 * - Copie atomique de cleanAfrica.db vers data/backups/cleanAfrica-YYYY-MM-DD-HHmm.db
 * - Conserve les 30 derniers backups (purge des plus anciens)
 *
 * Usage : node server/scripts/backup-db.js [--silent]
 */

import { mkdirSync, copyFileSync, readdirSync, statSync, unlinkSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import db from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const DB_PATH = join(ROOT, 'data', 'cleanAfrica.db')
const BACKUP_DIR = join(ROOT, 'data', 'backups')
const KEEP = 30   // nombre de backups conservés
const silent = process.argv.includes('--silent')

function log(...args) { if (!silent) console.log(...args) }

mkdirSync(BACKUP_DIR, { recursive: true })

// 1. Force checkpoint pour matérialiser le WAL dans la DB principale
const checkpoint = db.pragma('wal_checkpoint(TRUNCATE)')
log('  ✓ WAL checkpoint :', checkpoint)

// 2. Vérifier intégrité avant copie
const integrity = db.pragma('integrity_check', { simple: true })
if (integrity !== 'ok') {
  console.error('❌ Intégrité KO :', integrity)
  process.exit(1)
}

// 3. Nom du backup avec timestamp
const now = new Date()
const stamp = now.toISOString().slice(0, 16).replace(':', '').replace('T', '-')
const target = join(BACKUP_DIR, `cleanAfrica-${stamp}.db`)

// 4. Copie atomique (better-sqlite3 supporte db.backup() async pour copies cohérentes)
db.backup(target)
  .then(() => {
    const size = statSync(target).size
    log(`  ✓ Backup : ${target.replace(ROOT + '/', '')} (${(size / 1024 / 1024).toFixed(2)} Mo)`)

    // 5. Purge des anciens (garde KEEP derniers)
    const all = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('cleanAfrica-') && f.endsWith('.db'))
      .map(f => ({ name: f, mtime: statSync(join(BACKUP_DIR, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime)

    const toDelete = all.slice(KEEP)
    for (const f of toDelete) {
      unlinkSync(join(BACKUP_DIR, f.name))
      log(`  ✓ Purge ancien backup : ${f.name}`)
    }

    log(`  ✓ ${Math.min(all.length, KEEP)} backup(s) conservé(s) sur ${KEEP} max`)
    process.exit(0)
  })
  .catch(err => {
    console.error('❌ Erreur backup :', err.message)
    process.exit(1)
  })
