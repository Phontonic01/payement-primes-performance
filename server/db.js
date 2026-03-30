import Database from 'better-sqlite3'
import { readFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '..', 'data', 'cleanAfrica.db')

mkdirSync(join(__dirname, '..', 'data'), { recursive: true })

const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.pragma('busy_timeout = 5000')

// ═══ Schema ═══

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no TEXT,
    matricule TEXT UNIQUE NOT NULL,
    nom TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('CHAUFFEUR','EQUIPIER')),
    fonction TEXT NOT NULL,
    service_rh TEXT DEFAULT '',
    direction TEXT DEFAULT '',
    service TEXT NOT NULL CHECK(service IN ('COLLECTE','TRI')),
    zone TEXT DEFAULT '',
    equipe TEXT DEFAULT '',
    vehicule TEXT DEFAULT '',
    statut TEXT DEFAULT 'ACTIF' CHECK(statut IN ('ACTIF','INACTIF','SUSPENDU')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    nom TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tonnages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricule TEXT NOT NULL,
    date TEXT NOT NULL,
    agent_nom TEXT,
    vehicule TEXT,
    vehicule_type TEXT,
    vehicule_label TEXT,
    no_parc TEXT,
    immatriculation TEXT,
    arrondissement TEXT,
    secteur TEXT,
    circuit TEXT,
    tonnage REAL NOT NULL DEFAULT 0,
    rotations INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(matricule, date)
  );

  CREATE TABLE IF NOT EXISTS fiches_collecte (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    chauffeur_matricule TEXT,
    chauffeur_nom TEXT,
    ripeur1_matricule TEXT,
    ripeur1_nom TEXT,
    ripeur2_matricule TEXT,
    ripeur2_nom TEXT,
    vehicule_type TEXT,
    vehicule_label TEXT,
    no_parc TEXT,
    immatriculation TEXT,
    arrondissement TEXT,
    secteur TEXT,
    circuit TEXT,
    tonnage REAL NOT NULL DEFAULT 0,
    rotations INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bouclages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricule TEXT NOT NULL,
    date TEXT NOT NULL,
    agent_nom TEXT,
    circuit TEXT,
    vehicule TEXT,
    bouclage_declare INTEGER DEFAULT 0,
    statut_geo TEXT DEFAULT 'EN_ATTENTE_GEO',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(matricule, date)
  );

  CREATE TABLE IF NOT EXISTS entretiens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricule TEXT NOT NULL,
    date TEXT NOT NULL,
    agent_nom TEXT,
    vehicule TEXT,
    etat_mecanique REAL DEFAULT 10,
    proprete REAL DEFAULT 10,
    respect_controles REAL DEFAULT 10,
    degradations TEXT DEFAULT '',
    note REAL NOT NULL DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(matricule, date)
  );

  CREATE TABLE IF NOT EXISTS qhse_evals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricule TEXT NOT NULL,
    date TEXT NOT NULL,
    agent_nom TEXT,
    checklist_sur5 REAL DEFAULT 5,
    alcootest_positif INTEGER DEFAULT 0,
    epi_conforme INTEGER DEFAULT 1,
    quart_heure_securite INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(matricule, date)
  );

  CREATE TABLE IF NOT EXISTS tri_saisies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    arrondissement TEXT DEFAULT '',
    immatriculation TEXT DEFAULT '',
    chauffeur_matricule TEXT DEFAULT '',
    chauffeur_nom TEXT DEFAULT '',
    ripeur1_matricule TEXT DEFAULT '',
    ripeur1_nom TEXT DEFAULT '',
    ripeur2_matricule TEXT DEFAULT '',
    ripeur2_nom TEXT DEFAULT '',
    ripeur3_matricule TEXT DEFAULT '',
    ripeur3_nom TEXT DEFAULT '',
    tonnage_collecte REAL DEFAULT 0,
    rotations INTEGER DEFAULT 0,
    pourcentage_prime REAL DEFAULT 0,
    montant_prime INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, chauffeur_matricule)
  );

  CREATE TABLE IF NOT EXISTS geo_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricule TEXT NOT NULL,
    date TEXT NOT NULL,
    agent_nom TEXT,
    circuit TEXT,
    statut TEXT NOT NULL,
    couverture_gps REAL DEFAULT 0,
    justification TEXT DEFAULT '',
    gps_data TEXT DEFAULT '{}',
    divergences TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(matricule, date)
  );

  CREATE TABLE IF NOT EXISTS presences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricule TEXT NOT NULL,
    date TEXT NOT NULL,
    present INTEGER DEFAULT 1,
    UNIQUE(matricule, date)
  );

  CREATE TABLE IF NOT EXISTS notes_de_service (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL,
    date_note TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT NOT NULL,
    auteur TEXT DEFAULT '',
    modifications TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS config_primes (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    ponderations TEXT DEFAULT '{"tonnage":50,"bouclage":25,"entretien":15,"qhse":10}',
    seuil_min_prime REAL DEFAULT 60,
    seuil_presence REAL DEFAULT 93,
    jours_ouvres_mois INTEGER DEFAULT 30,
    plafond_collecte INTEGER DEFAULT 50000,
    plafond_tri INTEGER DEFAULT 25000,
    tri_bom_seuil100 REAL DEFAULT 1.2,
    tri_bom_seuil75 REAL DEFAULT 1.0,
    tri_bom_seuil50 REAL DEFAULT 0.8,
    tri_movi_seuil100 INTEGER DEFAULT 5,
    tri_movi_seuil75 INTEGER DEFAULT 4,
    tri_movi_seuil50 INTEGER DEFAULT 3,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  INSERT OR IGNORE INTO config_primes (id) VALUES (1);

  CREATE TABLE IF NOT EXISTS validations_mensuelles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mois TEXT UNIQUE NOT NULL,
    statut TEXT DEFAULT 'OUVERT',
    total_primes INTEGER DEFAULT 0,
    nb_eligibles INTEGER DEFAULT 0,
    note_service_ref TEXT,
    validee_par TEXT,
    validated_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pont_bascule_mapping (
    code_transporteur TEXT PRIMARY KEY,
    matricule_rh TEXT NOT NULL,
    nom_pont_bascule TEXT DEFAULT '',
    nom_rh TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS equipes_vehicule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    immatriculation TEXT NOT NULL,
    service TEXT NOT NULL CHECK(service IN ('COLLECTE','TRI')),
    chauffeur_matricule TEXT DEFAULT '',
    chauffeur_nom TEXT DEFAULT '',
    ripeur1_matricule TEXT DEFAULT '',
    ripeur1_nom TEXT DEFAULT '',
    ripeur2_matricule TEXT DEFAULT '',
    ripeur2_nom TEXT DEFAULT '',
    ripeur3_matricule TEXT DEFAULT '',
    ripeur3_nom TEXT DEFAULT '',
    circuit TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(immatriculation, service)
  );

  CREATE INDEX IF NOT EXISTS idx_equipes_immat ON equipes_vehicule(immatriculation);
  CREATE INDEX IF NOT EXISTS idx_pb_mapping_matricule ON pont_bascule_mapping(matricule_rh);
  CREATE INDEX IF NOT EXISTS idx_agents_matricule ON agents(matricule);
  CREATE INDEX IF NOT EXISTS idx_agents_service ON agents(service);
  CREATE INDEX IF NOT EXISTS idx_tonnages_date ON tonnages(date);
  CREATE INDEX IF NOT EXISTS idx_bouclages_statut ON bouclages(statut_geo);
  CREATE INDEX IF NOT EXISTS idx_tri_date ON tri_saisies(date);
  CREATE INDEX IF NOT EXISTS idx_geo_date ON geo_decisions(date);
`

db.pragma('journal_mode = WAL')
SCHEMA.split(';').filter(s => s.trim()).forEach(stmt => {
  try { db.prepare(stmt + ';').run() } catch {}
})

// Migration : ajouter les colonnes manquantes à tri_saisies si table existe déjà
const triMigrations = [
  'ALTER TABLE tri_saisies ADD COLUMN immatriculation TEXT DEFAULT ""',
  'ALTER TABLE tri_saisies ADD COLUMN chauffeur_matricule TEXT DEFAULT ""',
  'ALTER TABLE tri_saisies ADD COLUMN chauffeur_nom TEXT DEFAULT ""',
  'ALTER TABLE tri_saisies ADD COLUMN ripeur1_matricule TEXT DEFAULT ""',
  'ALTER TABLE tri_saisies ADD COLUMN ripeur1_nom TEXT DEFAULT ""',
  'ALTER TABLE tri_saisies ADD COLUMN ripeur2_matricule TEXT DEFAULT ""',
  'ALTER TABLE tri_saisies ADD COLUMN ripeur2_nom TEXT DEFAULT ""',
  'ALTER TABLE tri_saisies ADD COLUMN ripeur3_matricule TEXT DEFAULT ""',
  'ALTER TABLE tri_saisies ADD COLUMN ripeur3_nom TEXT DEFAULT ""',
  'ALTER TABLE tri_saisies ADD COLUMN rotations INTEGER DEFAULT 0',
]
for (const sql of triMigrations) {
  try { db.prepare(sql).run() } catch {}
}

// ═══ Seed agents ═══

function seedAgents() {
  const count = db.prepare('SELECT COUNT(*) as n FROM agents').get().n
  if (count > 0) return

  const dataPath = join(__dirname, '..', 'src', 'data', 'agents-officiel.json')
  const agents = JSON.parse(readFileSync(dataPath, 'utf8'))

  const insert = db.prepare(`
    INSERT OR IGNORE INTO agents (no, matricule, nom, role, fonction, service_rh, direction, service, zone, equipe, vehicule)
    VALUES (@no, @matricule, @nom, @role, @fonction, @serviceRH, @direction, @service, @zone, @equipe, @vehicule)
  `)

  const tx = db.transaction((list) => { for (const a of list) insert.run(a) })
  tx(agents)
  console.log(`  ✓ Seeded ${agents.length} agents`)
}

// ═══ Seed default users ═══

function seedUsers(bcrypt) {
  const count = db.prepare('SELECT COUNT(*) as n FROM users').get().n
  if (count > 0) return

  const hash = bcrypt.hashSync('cleanAfrica2026', 10)
  const hashAdmin = bcrypt.hashSync('admin', 10)
  const insert = db.prepare('INSERT INTO users (username, password_hash, role, nom) VALUES (?, ?, ?, ?)')
  const users = [
    ['admin', hashAdmin, 'ADMIN', 'Administrateur'],
    ['daf', hash, 'DAF', 'Direction Administrative et Financière'],
    ['collecte', hash, 'COLLECTE', 'Service Collecte'],
    ['geo', hash, 'GEO', 'Service Géolocalisation'],
    ['logistique', hash, 'LOGISTIQUE', 'Service Logistique'],
    ['qhse', hash, 'QHSE', 'Service QHSE'],
    ['tri', hash, 'TRI', 'Service TRI'],
    ['lecture', hash, 'LECTURE', 'Consultation'],
  ]
  users.forEach(u => insert.run(...u))
  console.log('  ✓ Seeded default users')
}

// ═══ Seed pont-bascule mapping ═══

function seedPontBasculeMapping() {
  const count = db.prepare('SELECT COUNT(*) as n FROM pont_bascule_mapping').get().n
  if (count > 0) return

  const dataPath = join(__dirname, '..', 'src', 'data', 'pont-bascule-mapping.json')
  try {
    const mapping = JSON.parse(readFileSync(dataPath, 'utf8'))

    const insert = db.prepare(`
      INSERT OR REPLACE INTO pont_bascule_mapping (code_transporteur, matricule_rh, nom_pont_bascule, nom_rh)
      VALUES (@code_transporteur, @matricule_rh, @nom_pont_bascule, @nom_rh)
    `)

    const tx = db.transaction((list) => { for (const m of list) insert.run(m) })
    tx(mapping)
    console.log(`  ✓ Seeded ${mapping.length} pont-bascule mappings`)
  } catch (err) {
    console.error(`  ✗ Erreur seed pont-bascule mapping: ${err.message}`)
  }
}

export { db, seedAgents, seedUsers, seedPontBasculeMapping }
export default db
