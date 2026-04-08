import { Router } from 'express'
import db from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

// ─── Helpers ──────────────────────────────────────────────────────────

function parseRipeurs(json) {
  try { return JSON.parse(json || '[]') } catch { return [] }
}

function rowToEquipe(r) {
  return {
    id: r.id,
    date: r.date,
    no_parc: r.no_parc,
    poste: r.poste,
    mois_exercice: r.mois_exercice,
    type_logistique: r.type_logistique,
    affectation: r.affectation,
    chauffeur: {
      matricule: r.chauffeur_matricule,
      nom: r.chauffeur_nom,
      rh_ok: !!r.chauffeur_rh_ok,
    },
    ripeurs: parseRipeurs(r.ripeurs_json),
    tonnage_excel: r.tonnage_excel,
    rotations_excel: r.rotations_excel,
    presences_excel: r.presences_excel,
    absences_excel: r.absences_excel,
    source: r.source,
    fichier_source: r.fichier_source,
  }
}

// ─── GET /api/equipes-journalieres ────────────────────────────────────
// Filtres : date, dateDebut/dateFin, no_parc, poste, matricule (cherche dans membres)
router.get('/', (req, res) => {
  const { date, dateDebut, dateFin, no_parc, poste, matricule } = req.query

  if (matricule) {
    // historique d'un agent : on passe par la table membres
    const sql = `
      SELECT m.role, m.fonction, m.presence, m.absence, m.rh_ok,
             e.*
      FROM equipes_journalieres_membres m
      JOIN equipes_journalieres e ON e.id = m.equipe_id
      WHERE m.matricule = ?
      ${dateDebut ? 'AND e.date >= ?' : ''}
      ${dateFin ? 'AND e.date <= ?' : ''}
      ORDER BY e.date DESC, e.poste
    `
    const params = [matricule]
    if (dateDebut) params.push(dateDebut)
    if (dateFin) params.push(dateFin)
    const rows = db.prepare(sql).all(...params)
    return res.json(rows.map(r => ({
      ...rowToEquipe(r),
      role_membre: r.role,
      fonction_membre: r.fonction,
      presence_membre: r.presence,
      absence_membre: r.absence,
    })))
  }

  let sql = 'SELECT * FROM equipes_journalieres WHERE 1=1'
  const params = []
  if (date) { sql += ' AND date = ?'; params.push(date) }
  if (dateDebut) { sql += ' AND date >= ?'; params.push(dateDebut) }
  if (dateFin) { sql += ' AND date <= ?'; params.push(dateFin) }
  if (no_parc) { sql += ' AND no_parc = ?'; params.push(String(no_parc)) }
  if (poste) { sql += ' AND poste = ?'; params.push(poste) }
  sql += ' ORDER BY date DESC, no_parc, poste'
  res.json(db.prepare(sql).all(...params).map(rowToEquipe))
})

// ─── GET /api/equipes-journalieres/vehicule/:noParc ───────────────────
// Toutes les tournées d'un véhicule sur une période
router.get('/vehicule/:noParc', (req, res) => {
  const { noParc } = req.params
  const { dateDebut, dateFin } = req.query
  let sql = 'SELECT * FROM equipes_journalieres WHERE no_parc = ?'
  const params = [noParc]
  if (dateDebut) { sql += ' AND date >= ?'; params.push(dateDebut) }
  if (dateFin) { sql += ' AND date <= ?'; params.push(dateFin) }
  sql += ' ORDER BY date DESC, poste'
  res.json(db.prepare(sql).all(...params).map(rowToEquipe))
})

// ─── GET /api/equipes-journalieres/agent/:matricule ───────────────────
// Historique d'un agent : tous les jours où il a tourné
router.get('/agent/:matricule', (req, res) => {
  const { matricule } = req.params
  const { dateDebut, dateFin } = req.query
  let sql = `
    SELECT m.role, m.fonction, m.presence, m.absence, m.rh_ok as membre_rh_ok,
           e.*
    FROM equipes_journalieres_membres m
    JOIN equipes_journalieres e ON e.id = m.equipe_id
    WHERE m.matricule = ?
  `
  const params = [matricule]
  if (dateDebut) { sql += ' AND e.date >= ?'; params.push(dateDebut) }
  if (dateFin) { sql += ' AND e.date <= ?'; params.push(dateFin) }
  sql += ' ORDER BY e.date DESC, e.poste'
  const rows = db.prepare(sql).all(...params)
  res.json(rows.map(r => ({
    ...rowToEquipe(r),
    role_membre: r.role,
    fonction_membre: r.fonction,
    presence_membre: r.presence,
    absence_membre: r.absence,
  })))
})

// ─── GET /api/equipes-journalieres/chauffeurs-suspects ────────────────
// Chauffeurs qui apparaissent sur >= seuilVehicules véhicules différents
// dans une fenêtre de seuilJours jours. Indicateur fort d'erreur de saisie
// dans l'Excel RH → l'API consommatrice doit alors privilégier le pont-bascule.
router.get('/chauffeurs-suspects', (req, res) => {
  const seuilVehicules = Number(req.query.seuilVehicules) || 5
  const seuilJours = Number(req.query.seuilJours) || 6
  const dateRef = req.query.dateRef || new Date().toISOString().slice(0, 10)

  const dateMin = new Date(dateRef + 'T00:00:00')
  dateMin.setDate(dateMin.getDate() - seuilJours)
  const dateMinStr = dateMin.toISOString().slice(0, 10)

  const rows = db.prepare(`
    SELECT chauffeur_matricule as matricule, chauffeur_nom as nom,
           COUNT(DISTINCT no_parc) as vehicules_distincts,
           COUNT(DISTINCT date) as jours_distincts,
           GROUP_CONCAT(DISTINCT no_parc) as vehicules,
           GROUP_CONCAT(DISTINCT date) as dates,
           MIN(date) as premiere_date, MAX(date) as derniere_date
    FROM equipes_journalieres
    WHERE chauffeur_matricule != ''
      AND date >= ? AND date <= ?
    GROUP BY chauffeur_matricule, chauffeur_nom
    HAVING COUNT(DISTINCT no_parc) >= ?
    ORDER BY vehicules_distincts DESC, jours_distincts ASC
  `).all(dateMinStr, dateRef, seuilVehicules)

  res.json({
    seuils: { vehicules: seuilVehicules, jours: seuilJours },
    fenetre: { debut: dateMinStr, fin: dateRef },
    chauffeurs_suspects: rows,
  })
})

// ─── GET /api/equipes-journalieres/anomalies ──────────────────────────
// Matricules présents dans l'Excel mais introuvables dans la base RH.
// + comparaison Excel ↔ pont-bascule (à implémenter côté front pour matching véhicule).
router.get('/anomalies', (req, res) => {
  const { dateDebut, dateFin } = req.query
  let where = 'WHERE m.rh_ok = 0'
  const params = []
  if (dateDebut) { where += ' AND m.date >= ?'; params.push(dateDebut) }
  if (dateFin) { where += ' AND m.date <= ?'; params.push(dateFin) }

  const inconnus = db.prepare(`
    SELECT m.matricule, m.nom, m.fonction, m.role,
           COUNT(*) as occurrences,
           MIN(m.date) as premiere_date,
           MAX(m.date) as derniere_date,
           GROUP_CONCAT(DISTINCT m.no_parc) as vehicules
    FROM equipes_journalieres_membres m
    ${where}
    GROUP BY m.matricule, m.nom
    ORDER BY occurrences DESC
  `).all(...params)

  res.json({
    total_distincts: inconnus.length,
    total_occurrences: inconnus.reduce((s, r) => s + r.occurrences, 0),
    matricules: inconnus,
  })
})

// ─── GET /api/equipes-journalieres/stats ──────────────────────────────
router.get('/stats', (_req, res) => {
  const total = db.prepare('SELECT COUNT(*) as n FROM equipes_journalieres').get().n
  const dates = db.prepare('SELECT MIN(date) as min, MAX(date) as max, COUNT(DISTINCT date) as n FROM equipes_journalieres').get()
  const vehicules = db.prepare('SELECT COUNT(DISTINCT no_parc) as n FROM equipes_journalieres').get().n
  const membres = db.prepare(`
    SELECT
      SUM(CASE WHEN role='CHAUFFEUR' THEN 1 ELSE 0 END) as chauffeurs,
      SUM(CASE WHEN role='RIPEUR' THEN 1 ELSE 0 END) as ripeurs,
      SUM(CASE WHEN role='CONDUCTEUR' THEN 1 ELSE 0 END) as conducteurs,
      SUM(CASE WHEN rh_ok=0 THEN 1 ELSE 0 END) as inconnus_rh,
      COUNT(*) as total
    FROM equipes_journalieres_membres
  `).get()
  res.json({
    equipes: total,
    couverture: { debut: dates.min, fin: dates.max, jours: dates.n },
    vehicules,
    membres,
  })
})

export default router
