#!/usr/bin/env node
/**
 * Import des équipages journaliers depuis le fichier Excel RH
 * "Données traitées du 21 au 28 03 2026.xlsx" (ou tout fichier au même format).
 *
 * Structure attendue (feuille "BD EVALUATION", header ligne 10) :
 *   DATE | MOIS D'EXERCICE | POSTE JOUR/NUIT | N° DE PARC | MAT |
 *   NOM(S) & PRENOM(S) | FONCTIONS | P/A | PRESENCES | ABSENCES |
 *   B/NB | TYPE DE LOGISTIQUE | AFFECTATION COLLECTE | % TONNAGE |
 *   TONNAGE 1..5 | ROTATION | TONNAGE | KG
 *
 * Regroupe par (date, n°parc, poste). Détecte chauffeur vs ripeurs.
 * Match chaque MAT contre agents.matricule → flag rh_ok.
 * Upsert dans equipes_journalieres + insère membres.
 */

import XLSX from 'xlsx'
import { readFileSync, mkdirSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, basename } from 'path'
import db from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_FILE = join(__dirname, '..', '..', 'data', 'imports', 'equipes-21-28-mars-2026.xlsx')

const filePath = process.argv[2] || DEFAULT_FILE
console.log(`\n📂 Lecture : ${filePath}\n`)

// ─── Backup pré-import (sécurité) ───
const backupDir = join(__dirname, '..', '..', 'data', 'backups')
mkdirSync(backupDir, { recursive: true })
const stamp = new Date().toISOString().slice(0, 16).replace(':', '').replace('T', '-')
const backupPath = join(backupDir, `cleanAfrica-pre-import-${stamp}.db`)
try {
  db.pragma('wal_checkpoint(TRUNCATE)')
  await db.backup(backupPath)
  const size = statSync(backupPath).size
  console.log(`💾 Backup pré-import : ${backupPath.replace(join(__dirname, '..', '..') + '/', '')} (${(size / 1024 / 1024).toFixed(2)} Mo)\n`)
} catch (e) {
  console.error('⚠️  Backup pré-import échoué :', e.message)
}

const wb = XLSX.readFile(filePath)
const sheetName = wb.SheetNames.find(n => n.toUpperCase().includes('EVALUATION')) || wb.SheetNames[0]
const ws = wb.Sheets[sheetName]
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

// Excel serial → ISO date
function excelDate(n) {
  if (typeof n !== 'number') return String(n)
  const d = new Date(Math.round((n - 25569) * 86400 * 1000))
  return d.toISOString().slice(0, 10)
}

// Détection header (ligne contenant "DATE" et "MAT")
let headerIdx = -1
for (let i = 0; i < Math.min(30, rows.length); i++) {
  const r = rows[i].map(c => String(c).trim().toUpperCase())
  if (r.includes('DATE') && r.includes('MAT')) { headerIdx = i; break }
}
if (headerIdx < 0) {
  console.error('❌ Header introuvable (attendu : DATE ... MAT ...)')
  process.exit(1)
}

const header = rows[headerIdx].map(c => String(c).trim().toUpperCase())
const col = (name) => header.findIndex(h => h === name.toUpperCase())
const IDX = {
  date: col('DATE'),
  mois: col("MOIS D'EXERCICE"),
  poste: col('POSTE JOUR/NUIT'),
  parc: col('N° DE PARC'),
  mat: col('MAT'),
  nom: col('NOM(S) & PRENOM(S)'),
  fonction: col('FONCTIONS'),
  pa: col('P / A'),
  presence: col('PRESENCES'),
  absence: col('ABSENCES'),
  typeLog: col('TYPE DE LOGISTIQUE'),
  affect: col('AFFECTATION COLLECTE'),
  rotation: col('ROTATION'),
  tonnage: col('TONNAGE'),
}

// Chargement des matricules RH pour validation
const rhMatricules = new Set(
  db.prepare('SELECT matricule FROM agents').all().map(r => String(r.matricule).trim())
)
console.log(`📋 ${rhMatricules.size} matricules RH chargés pour validation`)

function roleFromFonction(fonction) {
  const f = String(fonction || '').toLowerCase()
  if (f.includes('chauffeur')) return 'CHAUFFEUR'
  if (f.includes('ripeur')) return 'RIPEUR'
  if (f.includes("conducteur d'engins") || f.includes('conducteur engins')) return 'CONDUCTEUR'
  return 'AUTRE'
}

// Parsing + regroupement
const groups = new Map() // key = date|parc|poste

let rowsRead = 0, rowsSkipped = 0
for (let i = headerIdx + 1; i < rows.length; i++) {
  const r = rows[i]
  const dateRaw = r[IDX.date]
  const mat = String(r[IDX.mat] || '').trim()
  const parc = String(r[IDX.parc] || '').trim()
  if (!dateRaw || !mat || !parc) { rowsSkipped++; continue }
  // exclure parcs aberrants (non numériques corrects)
  if (!/^\d{2,4}$/.test(parc)) { rowsSkipped++; continue }

  const date = excelDate(dateRaw)
  const poste = String(r[IDX.poste] || '').trim().toUpperCase()
  if (poste !== 'JOUR' && poste !== 'NUIT') { rowsSkipped++; continue }

  const key = `${date}|${parc}|${poste}`
  if (!groups.has(key)) {
    groups.set(key, {
      date, no_parc: parc, poste,
      mois_exercice: String(r[IDX.mois] || '').trim(),
      type_logistique: String(r[IDX.typeLog] || '').trim(),
      affectation: String(r[IDX.affect] || '').trim(),
      tonnage_excel: Number(r[IDX.tonnage]) || 0,
      rotations_excel: Number(r[IDX.rotation]) || 0,
      members: []
    })
  }
  const g = groups.get(key)

  const fonction = String(r[IDX.fonction] || '').trim()
  const role = roleFromFonction(fonction)
  const nom = String(r[IDX.nom] || '').trim()
  const presence = Number(r[IDX.presence]) || 0
  const absence = Number(r[IDX.absence]) || 0
  const rh_ok = rhMatricules.has(mat) ? 1 : 0

  g.members.push({ matricule: mat, nom, fonction, role, rh_ok, presence, absence })
  // prend le max (les lignes du groupe portent la même valeur globale)
  g.tonnage_excel = Math.max(g.tonnage_excel, Number(r[IDX.tonnage]) || 0)
  g.rotations_excel = Math.max(g.rotations_excel, Number(r[IDX.rotation]) || 0)
  rowsRead++
}

console.log(`📊 ${rowsRead} lignes lues · ${rowsSkipped} ignorées (parc/date/mat/poste vides ou invalides)`)
console.log(`👥 ${groups.size} équipages (date × véhicule × poste) à importer\n`)

// Upsert
const insertEquipe = db.prepare(`
  INSERT INTO equipes_journalieres
    (date, no_parc, poste, mois_exercice, type_logistique, affectation,
     chauffeur_matricule, chauffeur_nom, chauffeur_rh_ok,
     ripeurs_json, tonnage_excel, rotations_excel,
     presences_excel, absences_excel, source, fichier_source)
  VALUES
    (@date, @no_parc, @poste, @mois_exercice, @type_logistique, @affectation,
     @chauffeur_matricule, @chauffeur_nom, @chauffeur_rh_ok,
     @ripeurs_json, @tonnage_excel, @rotations_excel,
     @presences_excel, @absences_excel, 'EXCEL', @fichier_source)
  ON CONFLICT(date, no_parc, poste) DO UPDATE SET
    mois_exercice = excluded.mois_exercice,
    type_logistique = excluded.type_logistique,
    affectation = excluded.affectation,
    chauffeur_matricule = excluded.chauffeur_matricule,
    chauffeur_nom = excluded.chauffeur_nom,
    chauffeur_rh_ok = excluded.chauffeur_rh_ok,
    ripeurs_json = excluded.ripeurs_json,
    tonnage_excel = excluded.tonnage_excel,
    rotations_excel = excluded.rotations_excel,
    presences_excel = excluded.presences_excel,
    absences_excel = excluded.absences_excel,
    fichier_source = excluded.fichier_source
`)

const deleteMembers = db.prepare('DELETE FROM equipes_journalieres_membres WHERE date=? AND no_parc=? AND poste=?')
const insertMember = db.prepare(`
  INSERT INTO equipes_journalieres_membres
    (equipe_id, date, no_parc, poste, matricule, nom, fonction, role, rh_ok, presence, absence)
  VALUES (@equipe_id, @date, @no_parc, @poste, @matricule, @nom, @fonction, @role, @rh_ok, @presence, @absence)
`)
const getEquipeId = db.prepare('SELECT id FROM equipes_journalieres WHERE date=? AND no_parc=? AND poste=?')

const fichierSource = basename(filePath)

const unknownMats = new Set()
const stats = { equipes: 0, chauffeurs: 0, ripeurs: 0, autres: 0, matUnknown: 0, presences: 0 }

const tx = db.transaction(() => {
  for (const g of groups.values()) {
    // chauffeur = premier CHAUFFEUR trouvé (il peut y en avoir un seul)
    const chauffeur = g.members.find(m => m.role === 'CHAUFFEUR') || null
    const ripeurs = g.members.filter(m => m.role === 'RIPEUR')
    const presencesTotal = g.members.reduce((s, m) => s + m.presence, 0)
    const absencesTotal = g.members.reduce((s, m) => s + m.absence, 0)

    insertEquipe.run({
      date: g.date, no_parc: g.no_parc, poste: g.poste,
      mois_exercice: g.mois_exercice, type_logistique: g.type_logistique, affectation: g.affectation,
      chauffeur_matricule: chauffeur?.matricule || '',
      chauffeur_nom: chauffeur?.nom || '',
      chauffeur_rh_ok: chauffeur?.rh_ok || 0,
      ripeurs_json: JSON.stringify(ripeurs.map(r => ({
        matricule: r.matricule, nom: r.nom, rh_ok: r.rh_ok, presence: r.presence
      }))),
      tonnage_excel: g.tonnage_excel,
      rotations_excel: g.rotations_excel,
      presences_excel: presencesTotal,
      absences_excel: absencesTotal,
      fichier_source: fichierSource
    })

    const eq = getEquipeId.get(g.date, g.no_parc, g.poste)
    deleteMembers.run(g.date, g.no_parc, g.poste)

    for (const m of g.members) {
      insertMember.run({ equipe_id: eq.id, date: g.date, no_parc: g.no_parc, poste: g.poste, ...m })
      if (!m.rh_ok) { unknownMats.add(`${m.matricule}|${m.nom}`); stats.matUnknown++ }
      if (m.role === 'CHAUFFEUR') stats.chauffeurs++
      else if (m.role === 'RIPEUR') stats.ripeurs++
      else stats.autres++
      stats.presences += m.presence
    }
    stats.equipes++
  }
})
tx()

console.log('✅ Import terminé')
console.log(`   • Équipages importés : ${stats.equipes}`)
console.log(`   • Chauffeurs         : ${stats.chauffeurs}`)
console.log(`   • Ripeurs            : ${stats.ripeurs}`)
console.log(`   • Autres rôles       : ${stats.autres}`)
console.log(`   • Présences cumulées : ${stats.presences}`)
console.log(`   • Matricules inconnus en base RH : ${unknownMats.size} distincts (${stats.matUnknown} occurrences)`)

if (unknownMats.size > 0) {
  console.log('\n⚠️  Aperçu matricules inconnus (10 premiers) :')
  Array.from(unknownMats).slice(0, 10).forEach(m => {
    const [mat, nom] = m.split('|')
    console.log(`   - ${mat.padEnd(8)} ${nom}`)
  })
}

// Rapport dates/véhicules
const dates = [...new Set([...groups.values()].map(g => g.date))].sort()
console.log(`\n📅 Couverture : ${dates[0]} → ${dates[dates.length - 1]} (${dates.length} jours)`)
const vehicules = [...new Set([...groups.values()].map(g => g.no_parc))].sort()
console.log(`🚛 Véhicules distincts : ${vehicules.length}`)

process.exit(0)
