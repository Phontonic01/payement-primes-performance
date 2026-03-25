/**
 * Connecteur Pont-Bascule — SQL Server Express
 *
 * Se connecte à pc-pont-bascule\sqlexpress pour récupérer
 * les données de pesée (tonnage) en temps réel.
 *
 * Usage:
 *   import { connectPontBascule, getPesees, syncPesees } from './pont-bascule.js'
 *   await connectPontBascule()
 *   const pesees = await getPesees('2026-03-25')
 */

import sql from 'mssql'

// ═══ Configuration ═══
// Modifier ces valeurs selon l'infrastructure Clean Africa

const CONFIG = {
  server: process.env.PONT_BASCULE_HOST || 'pc-pont-bascule',
  instanceName: process.env.PONT_BASCULE_INSTANCE || 'SQLEXPRESS',
  port: parseInt(process.env.PONT_BASCULE_PORT || '1433'),
  database: process.env.PONT_BASCULE_DB || 'PontBascule',
  user: process.env.PONT_BASCULE_USER || 'sa',
  password: process.env.PONT_BASCULE_PASS || '',
  options: {
    encrypt: false,                    // Pas de TLS en réseau local
    trustServerCertificate: true,      // Accepter certificat auto-signé
    instanceName: process.env.PONT_BASCULE_INSTANCE || 'SQLEXPRESS',
    connectTimeout: 10000,
    requestTimeout: 30000,
  },
  pool: {
    max: 5,
    min: 1,
    idleTimeoutMillis: 30000,
  },
}

let pool = null

// ═══ Connexion ═══

async function connectPontBascule() {
  if (pool) return pool

  try {
    console.log(`  → Connexion à ${CONFIG.server}\\${CONFIG.instanceName}...`)
    pool = await sql.connect(CONFIG)
    console.log(`  ✓ Connecté à ${CONFIG.server}\\${CONFIG.instanceName} (DB: ${CONFIG.database})`)
    return pool
  } catch (err) {
    console.error(`  ✗ Échec connexion pont-bascule: ${err.message}`)
    pool = null
    throw err
  }
}

async function disconnect() {
  if (pool) {
    await pool.close()
    pool = null
    console.log('  ✓ Déconnecté du pont-bascule')
  }
}

function isConnected() {
  return pool !== null && pool.connected
}

// ═══ Requêtes ═══

/**
 * Lister les tables disponibles dans la base pont-bascule
 * Utile pour découvrir la structure
 */
async function listTables() {
  const p = await connectPontBascule()
  const result = await p.request().query(`
    SELECT TABLE_NAME, TABLE_TYPE
    FROM INFORMATION_SCHEMA.TABLES
    ORDER BY TABLE_NAME
  `)
  return result.recordset
}

/**
 * Décrire les colonnes d'une table
 */
async function describeTable(tableName) {
  const p = await connectPontBascule()
  const result = await p.request()
    .input('table', sql.NVarChar, tableName)
    .query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @table
      ORDER BY ORDINAL_POSITION
    `)
  return result.recordset
}

/**
 * Récupérer les pesées d'une date donnée
 * NOTE: Les noms de colonnes seront à adapter selon le schéma réel
 */
async function getPesees(date) {
  const p = await connectPontBascule()
  const result = await p.request()
    .input('date', sql.Date, new Date(date))
    .query(`
      SELECT * FROM Pesees
      WHERE CAST(DatePesee AS DATE) = @date
      ORDER BY DatePesee DESC
    `)
  return result.recordset
}

/**
 * Récupérer les pesées d'un mois
 */
async function getPeseesParMois(mois) {
  // mois au format 'YYYY-MM'
  const [annee, m] = mois.split('-')
  const p = await connectPontBascule()
  const result = await p.request()
    .input('annee', sql.Int, parseInt(annee))
    .input('mois', sql.Int, parseInt(m))
    .query(`
      SELECT * FROM Pesees
      WHERE YEAR(DatePesee) = @annee AND MONTH(DatePesee) = @mois
      ORDER BY DatePesee DESC
    `)
  return result.recordset
}

/**
 * Récupérer les pesées par véhicule (N° Parc ou immatriculation)
 */
async function getPeseesParVehicule(identifiant, mois) {
  const [annee, m] = mois.split('-')
  const p = await connectPontBascule()
  const result = await p.request()
    .input('identifiant', sql.NVarChar, identifiant)
    .input('annee', sql.Int, parseInt(annee))
    .input('mois', sql.Int, parseInt(m))
    .query(`
      SELECT * FROM Pesees
      WHERE (NoParc = @identifiant OR Immatriculation = @identifiant)
        AND YEAR(DatePesee) = @annee AND MONTH(DatePesee) = @mois
      ORDER BY DatePesee DESC
    `)
  return result.recordset
}

/**
 * Synchroniser les pesées du pont-bascule vers la base locale SQLite
 * Appelée périodiquement ou manuellement
 */
async function syncPesees(localDb, date) {
  const pesees = await getPesees(date)

  const insert = localDb.prepare(`
    INSERT OR REPLACE INTO tonnages
    (matricule, date, agent_nom, vehicule, vehicule_type, no_parc, immatriculation, tonnage, rotations, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)

  const tx = localDb.transaction((list) => {
    for (const pesee of list) {
      // Adapter les noms de colonnes selon le schéma réel du pont-bascule
      insert.run(
        pesee.Matricule || '',
        date,
        pesee.NomAgent || '',
        pesee.TypeVehicule || '',
        pesee.TypeVehicule || 'BOM',
        pesee.NoParc || '',
        pesee.Immatriculation || '',
        pesee.PoidsNet || 0,
        1, // 1 rotation par pesée
      )
    }
  })

  tx(pesees)
  return { synced: pesees.length, date }
}

// ═══ Diagnostic ═══

/**
 * Tester la connexion et afficher des infos
 */
async function diagnostic() {
  const info = {
    config: {
      server: CONFIG.server,
      instance: CONFIG.instanceName,
      database: CONFIG.database,
      user: CONFIG.user,
    },
    connected: false,
    tables: [],
    error: null,
  }

  try {
    await connectPontBascule()
    info.connected = true
    info.tables = await listTables()
  } catch (err) {
    info.error = err.message
  }

  return info
}

export {
  connectPontBascule,
  disconnect,
  isConnected,
  listTables,
  describeTable,
  getPesees,
  getPeseesParMois,
  getPeseesParVehicule,
  syncPesees,
  diagnostic,
  CONFIG,
}
