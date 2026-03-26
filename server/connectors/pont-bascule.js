/**
 * Connecteur Pont-Bascule — SQL Server Express (WinStar)
 *
 * Se connecte à 192.168.120.20\SQLEXPRESS (base winstar)
 * pour récupérer les pesées via la vue VUE_CLEAN_AFRICA.
 *
 * Usage:
 *   import { connectPontBascule, getPesees, syncPesees } from './pont-bascule.js'
 *   await connectPontBascule()
 *   const pesees = await getPesees('2026-03-25')
 */

import sql from 'mssql'

// ═══ Configuration ═══

const CONFIG = {
  server: process.env.PONT_BASCULE_HOST || '192.168.120.20',
  port: parseInt(process.env.PONT_BASCULE_PORT || '1433'),
  database: process.env.PONT_BASCULE_DB || 'winstar',
  user: process.env.PONT_BASCULE_USER || 'Masterk',
  password: process.env.PONT_BASCULE_PASS || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
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
  if (pool && pool.connected) return pool

  try {
    console.log(`  → Connexion à ${CONFIG.server}\\${CONFIG.options.instanceName} (DB: ${CONFIG.database})...`)
    pool = await sql.connect(CONFIG)
    console.log(`  ✓ Connecté au pont-bascule WinStar`)
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

// ═══ Colonnes utiles de VUE_CLEAN_AFRICA ═══

const COLONNES = `
  AutoInc,
  No_Pesee_Entree,
  Immatriculation,
  Poids_P1,
  Poids_P2,
  Poids_Net,
  Date_Entree,
  Heure_Entree,
  Date_Sortie,
  Heure_Sortie,
  No_Ticket,
  Libelle_Produit,
  Libelle_Client,
  Libelle_Transporteur,
  Libelle_Origine,
  Libelle_Destination,
  Code_Produit,
  Code_Client,
  Code_Transporteur,
  Code_Origine,
  Code_Destination,
  Annee,
  Mois,
  Jour
`

// ═══ Requêtes ═══

/**
 * Lister les tables disponibles dans la base winstar
 */
async function listTables() {
  const p = await connectPontBascule()
  const result = await p.request().query(`
    SELECT TABLE_NAME, TABLE_TYPE
    FROM INFORMATION_SCHEMA.TABLES
    ORDER BY TABLE_TYPE, TABLE_NAME
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
 * Déterminer l'équipe (JOUR ou NUIT) à partir de l'heure d'entrée.
 * JOUR  = 09h00 à 18h30
 * NUIT  = 19h00 à 08h30 (du lendemain)
 */
function determinerEquipe(heureEntree) {
  if (!heureEntree) return 'NUIT'
  const h = new Date(heureEntree)
  const heure = h.getUTCHours()
  const minutes = h.getUTCMinutes()
  const totalMinutes = heure * 60 + minutes
  // JOUR = 09:00 (540) à 18:30 (1110)
  if (totalMinutes >= 540 && totalMinutes <= 1110) return 'JOUR'
  return 'NUIT'
}

/**
 * Récupérer les pesées d'une date donnée (YYYY-MM-DD)
 * Chaque pesée est enrichie avec le champ `equipe` (JOUR ou NUIT)
 */
async function getPesees(date) {
  const [annee, mois, jour] = date.split('-').map(Number)
  const p = await connectPontBascule()
  const result = await p.request()
    .input('annee', sql.Int, annee)
    .input('mois', sql.Int, mois)
    .input('jour', sql.Int, jour)
    .query(`
      SELECT ${COLONNES}
      FROM VUE_CLEAN_AFRICA
      WHERE Annee = @annee AND Mois = @mois AND Jour = @jour
      ORDER BY No_Pesee_Entree DESC
    `)
  // Enrichir avec l'équipe
  return result.recordset.map(r => ({
    ...r,
    Equipe: determinerEquipe(r.Heure_Entree),
  }))
}

/**
 * Récupérer les pesées d'un mois (YYYY-MM)
 */
async function getPeseesParMois(mois) {
  const [annee, m] = mois.split('-').map(Number)
  const p = await connectPontBascule()
  const result = await p.request()
    .input('annee', sql.Int, annee)
    .input('mois', sql.Int, m)
    .query(`
      SELECT ${COLONNES}
      FROM VUE_CLEAN_AFRICA
      WHERE Annee = @annee AND Mois = @mois
      ORDER BY No_Pesee_Entree DESC
    `)
  return result.recordset
}

/**
 * Récupérer les pesées par véhicule (immatriculation)
 */
async function getPeseesParVehicule(immatriculation, mois) {
  const [annee, m] = mois.split('-').map(Number)
  const p = await connectPontBascule()
  const result = await p.request()
    .input('immat', sql.NVarChar, immatriculation)
    .input('annee', sql.Int, annee)
    .input('mois', sql.Int, m)
    .query(`
      SELECT ${COLONNES}
      FROM VUE_CLEAN_AFRICA
      WHERE Immatriculation = @immat
        AND Annee = @annee AND Mois = @mois
      ORDER BY No_Pesee_Entree DESC
    `)
  return result.recordset
}

/**
 * Récupérer les pesées par transporteur (chauffeur)
 */
async function getPeseesParTransporteur(transporteur, mois) {
  const [annee, m] = mois.split('-').map(Number)
  const p = await connectPontBascule()
  const result = await p.request()
    .input('transporteur', sql.NVarChar, `%${transporteur}%`)
    .input('annee', sql.Int, annee)
    .input('mois', sql.Int, m)
    .query(`
      SELECT ${COLONNES}
      FROM VUE_CLEAN_AFRICA
      WHERE Libelle_Transporteur LIKE @transporteur
        AND Annee = @annee AND Mois = @mois
      ORDER BY No_Pesee_Entree DESC
    `)
  return result.recordset
}

/**
 * Statistiques du jour : nombre de pesées, tonnage total, par client
 */
async function getStatsDuJour(date) {
  const [annee, mois, jour] = date.split('-').map(Number)
  const p = await connectPontBascule()

  const result = await p.request()
    .input('annee', sql.Int, annee)
    .input('mois', sql.Int, mois)
    .input('jour', sql.Int, jour)
    .query(`
      SELECT
        COUNT(*) AS nb_pesees,
        ISNULL(SUM(Poids_Net), 0) AS tonnage_total_kg,
        ISNULL(SUM(Poids_Net), 0) / 1000.0 AS tonnage_total_tonnes,
        COUNT(DISTINCT Immatriculation) AS nb_vehicules,
        COUNT(DISTINCT Code_Transporteur) AS nb_transporteurs
      FROM VUE_CLEAN_AFRICA
      WHERE Annee = @annee AND Mois = @mois AND Jour = @jour
    `)

  const parClient = await p.request()
    .input('annee2', sql.Int, annee)
    .input('mois2', sql.Int, mois)
    .input('jour2', sql.Int, jour)
    .query(`
      SELECT
        Libelle_Client AS client,
        COUNT(*) AS nb_pesees,
        SUM(Poids_Net) AS tonnage_kg,
        SUM(Poids_Net) / 1000.0 AS tonnage_tonnes
      FROM VUE_CLEAN_AFRICA
      WHERE Annee = @annee2 AND Mois = @mois2 AND Jour = @jour2
      GROUP BY Libelle_Client
      ORDER BY tonnage_kg DESC
    `)

  return {
    ...result.recordset[0],
    par_client: parClient.recordset,
  }
}

/**
 * Calculer le bilan mensuel par chauffeur :
 * - Présence (jours travaillés)
 * - Pénalités journalières cumulées par axe tonnage
 * - Prime restante après dégression
 */
async function getBilanMensuel(mois, client = 'CLEAN AFRICA') {
  const [annee, m] = mois.split('-').map(Number)
  const p = await connectPontBascule()

  const joursOuvres = 20

  // Période de prime = du 21 du mois précédent au 20 du mois courant
  // Ex: "mars 2026" = 21 février 2026 → 20 mars 2026
  // Ex: "avril 2026" = 21 mars 2026 → 20 avril 2026
  let moisPrec = m - 1
  let anneePrec = annee
  if (moisPrec === 0) { moisPrec = 12; anneePrec = annee - 1 }

  const result = await p.request()
    .input('anneePrec', sql.Int, anneePrec)
    .input('moisPrec', sql.Int, moisPrec)
    .input('anneeCour', sql.Int, annee)
    .input('moisCour', sql.Int, m)
    .input('client', sql.NVarChar, client)
    .query(`
      SELECT Code_Transporteur, Libelle_Transporteur, Immatriculation,
             Jour, Mois, Annee, Poids_Net, Libelle_Destination, Heure_Entree
      FROM VUE_CLEAN_AFRICA
      WHERE Libelle_Client = @client
        AND (
          (Annee = @anneePrec AND Mois = @moisPrec AND Jour >= 21)
          OR
          (Annee = @anneeCour AND Mois = @moisCour AND Jour <= 20)
        )
      ORDER BY Code_Transporteur, Annee, Mois, Jour
    `)
  const plafond = 50000
  const partTonnage = plafond * 0.50 // 25000 F pour l'axe tonnage
  const primeJourTonnage = partTonnage / joursOuvres // ~833 F/jour

  // Barème BOM (par défaut)
  function scoreTonnage(tonnesKg, rotations) {
    if (rotations <= 0) return 0
    const avg = (tonnesKg / 1000) / rotations
    if (avg >= 11) return 100
    if (avg >= 8) return 75
    if (avg >= 7) return 50
    return 0
  }

  // Déterminer l'équipe dominante de chaque chauffeur (JOUR ou NUIT)
  // puis ne compter que les pesées de cette équipe
  const chauffeursPesees = {}
  for (const row of result.recordset) {
    const code = row.Code_Transporteur
    if (!chauffeursPesees[code]) chauffeursPesees[code] = []
    chauffeursPesees[code].push(row)
  }

  const chauffeurs = {}
  for (const [code, pesees] of Object.entries(chauffeursPesees)) {
    // Compter combien de pesées JOUR vs NUIT pour ce chauffeur
    let nbJour = 0, nbNuit = 0
    for (const row of pesees) {
      if (determinerEquipe(row.Heure_Entree) === 'JOUR') nbJour++
      else nbNuit++
    }
    const equipe = nbJour > nbNuit ? 'JOUR' : 'NUIT'

    chauffeurs[code] = {
      code_transporteur: code,
      chauffeur: pesees[0].Libelle_Transporteur,
      immatriculation: pesees[0].Immatriculation,
      equipe,
      jours: {},
    }

    // Ne garder que les pesées correspondant à l'équipe du chauffeur
    for (const row of pesees) {
      const eqPesee = determinerEquipe(row.Heure_Entree)
      if (eqPesee !== equipe) continue // ignorer les pesées hors équipe

      const jour = row.Jour
      if (!chauffeurs[code].jours[jour]) {
        chauffeurs[code].jours[jour] = { tonnage_kg: 0, rotations: 0, destination: row.Libelle_Destination }
      }
      chauffeurs[code].jours[jour].tonnage_kg += (row.Poids_Net || 0)
      chauffeurs[code].jours[jour].rotations += 1
    }
  }

  // Calculer le bilan pour chaque chauffeur
  const bilans = Object.values(chauffeurs).map(c => {
    const joursData = Object.entries(c.jours)
    const joursPresent = joursData.length
    let penaliteTonnageCumulee = 0
    const detailJours = []

    for (const [jour, d] of joursData.sort((a, b) => a[0] - b[0])) {
      const score = scoreTonnage(d.tonnage_kg, d.rotations)
      const penalite = Math.round(((100 - score) / 100) * primeJourTonnage)
      penaliteTonnageCumulee += penalite
      detailJours.push({
        jour: parseInt(jour),
        tonnage_kg: d.tonnage_kg,
        tonnage_tonnes: +(d.tonnage_kg / 1000).toFixed(2),
        rotations: d.rotations,
        moyenne: +(d.tonnage_kg / 1000 / d.rotations).toFixed(1),
        score,
        penalite,
        destination: d.destination,
      })
    }

    // Pénalités autres axes (pas encore de données → 0 pour l'instant)
    const penaliteBouclage = 0
    const penaliteEntretien = 0
    const penaliteQhse = 0
    const totalPenalites = penaliteTonnageCumulee + penaliteBouclage + penaliteEntretien + penaliteQhse

    // Prime avant prorata présence
    let primeAvant = Math.max(0, plafond - totalPenalites)

    // Présence plafonnée à joursOuvres (un agent ne peut pas avoir plus de 20j)
    const joursEffectifs = Math.min(joursPresent, joursOuvres)
    const tauxPresence = +(joursEffectifs / joursOuvres * 100).toFixed(1)
    let prorata = false
    let primeFinale = primeAvant
    if (joursEffectifs < Math.ceil(joursOuvres * 0.93)) {
      primeFinale = Math.round(primeAvant * (joursEffectifs / joursOuvres))
      prorata = true
    }

    return {
      code_transporteur: c.code_transporteur,
      chauffeur: c.chauffeur,
      immatriculation: c.immatriculation,
      equipe: c.equipe,
      jours_present: joursEffectifs,
      jours_bruts: joursPresent,
      taux_presence: tauxPresence,
      penalites: {
        tonnage: penaliteTonnageCumulee,
        bouclage: penaliteBouclage,
        entretien: penaliteEntretien,
        qhse: penaliteQhse,
        total: totalPenalites,
      },
      plafond,
      prime_avant_presence: primeAvant,
      prime_finale: primeFinale,
      prorata,
      detail_jours: detailJours,
    }
  }).sort((a, b) => b.prime_finale - a.prime_finale)

  return {
    mois,
    periode: `${anneePrec}-${String(moisPrec).padStart(2,'0')}-21 au ${annee}-${String(m).padStart(2,'0')}-20`,
    jours_ouvres: joursOuvres,
    plafond,
    chauffeurs: bilans,
  }
}

/**
 * Calculer la présence mensuelle par chauffeur depuis le pont-bascule
 * Un chauffeur est "présent" un jour s'il apparaît dans au moins une pesée ce jour-là
 */
async function getPresenceMensuelle(mois, client = 'CLEAN AFRICA') {
  const [annee, m] = mois.split('-').map(Number)
  const p = await connectPontBascule()

  // Période de prime = 21 du mois précédent → 20 du mois courant
  let moisPrec = m - 1
  let anneePrec = annee
  if (moisPrec === 0) { moisPrec = 12; anneePrec = annee - 1 }

  const result = await p.request()
    .input('anneePrec', sql.Int, anneePrec)
    .input('moisPrec', sql.Int, moisPrec)
    .input('anneeCour', sql.Int, annee)
    .input('moisCour', sql.Int, m)
    .input('client', sql.NVarChar, client)
    .query(`
      SELECT
        Code_Transporteur,
        Libelle_Transporteur,
        COUNT(DISTINCT CAST(CONCAT(Annee, '-', Mois, '-', Jour) AS VARCHAR)) AS jours_present
      FROM VUE_CLEAN_AFRICA
      WHERE Libelle_Client = @client
        AND (
          (Annee = @anneePrec AND Mois = @moisPrec AND Jour >= 21)
          OR
          (Annee = @anneeCour AND Mois = @moisCour AND Jour <= 20)
        )
      GROUP BY Code_Transporteur, Libelle_Transporteur
      ORDER BY jours_present DESC
    `)
  return result.recordset.map(r => ({
    code_transporteur: r.Code_Transporteur,
    chauffeur: r.Libelle_Transporteur,
    jours_present: r.jours_present,
  }))
}

/**
 * Synchroniser les pesées du pont-bascule vers la base locale SQLite
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
      insert.run(
        pesee.Code_Transporteur || '',
        date,
        pesee.Libelle_Transporteur || '',
        pesee.Libelle_Transporteur || '',
        pesee.Libelle_Produit || 'Ordures',
        String(pesee.No_Ticket || ''),
        pesee.Immatriculation || '',
        pesee.Poids_Net || 0,
        1,
      )
    }
  })

  tx(pesees)
  return { synced: pesees.length, date }
}

// ═══ Diagnostic ═══

async function diagnostic() {
  const info = {
    config: {
      server: CONFIG.server,
      instance: CONFIG.options.instanceName,
      database: CONFIG.database,
      user: CONFIG.user,
    },
    connected: false,
    tables: [],
    stats: null,
    error: null,
  }

  try {
    await connectPontBascule()
    info.connected = true
    info.tables = await listTables()

    // Stats rapides
    const today = new Date().toISOString().split('T')[0]
    info.stats = await getStatsDuJour(today)
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
  getPeseesParTransporteur,
  getStatsDuJour,
  getPresenceMensuelle,
  getBilanMensuel,
  syncPesees,
  diagnostic,
  CONFIG,
}
