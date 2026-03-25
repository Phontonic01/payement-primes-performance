import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

// ── Constantes ──
const EMERALD = [16, 185, 129]
const BLUE = [59, 130, 246]
const AMBER = [245, 158, 11]
const PURPLE = [139, 92, 246]
const RED = [239, 68, 68]
const GRAY_900 = [17, 24, 39]
const GRAY_500 = [107, 114, 128]
const GRAY_100 = [243, 244, 246]

function dateFr() {
  return new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Header commun ──
function drawGuideHeader(doc, titre, sousTitre, couleur) {
  const pw = doc.internal.pageSize.getWidth()

  // Barre couleur en haut
  doc.setFillColor(...couleur)
  doc.rect(0, 0, pw, 8, 'F')

  // Logo / Societe
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY_500)
  doc.text('CLEAN AFRICA — Societe d\'Etat', pw / 2, 18, { align: 'center' })

  // Titre principal
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY_900)
  doc.text(titre, pw / 2, 30, { align: 'center' })

  // Sous-titre
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...couleur)
  doc.text(sousTitre, pw / 2, 38, { align: 'center' })

  // Ref
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_500)
  doc.text('Ref: Note de Service 25-11-001-DT-DQHSE-DRH-yar-DG', pw / 2, 45, { align: 'center' })
  doc.text('Date d\'edition: ' + dateFr(), pw / 2, 50, { align: 'center' })

  // Ligne separation
  doc.setDrawColor(...couleur)
  doc.setLineWidth(0.8)
  doc.line(15, 54, pw - 15, 54)

  doc.setTextColor(0, 0, 0)
  return 62
}

// ── Footer commun ──
function drawGuideFooter(doc, pageNum, totalPages) {
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(15, ph - 18, pw - 15, ph - 18)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text('CLEAN AFRICA — Guide Utilisateur — ' + dateFr(), 15, ph - 12)
  doc.text('Page ' + pageNum + ' / ' + totalPages, pw - 15, ph - 12, { align: 'right' })
  doc.setTextColor(0, 0, 0)
}

// ── Section titre ──
function sectionTitle(doc, y, titre, couleur) {
  const pw = doc.internal.pageSize.getWidth()
  doc.setFillColor(...couleur)
  doc.roundedRect(15, y, pw - 30, 10, 2, 2, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(titre, 20, y + 7)
  doc.setTextColor(0, 0, 0)
  return y + 16
}

// ── Paragraphe ──
function para(doc, y, text, opts = {}) {
  const pw = doc.internal.pageSize.getWidth()
  const maxW = (opts.maxWidth || pw - 40)
  doc.setFontSize(opts.size || 9)
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
  const lines = doc.splitTextToSize(text, maxW)
  doc.text(lines, opts.x || 20, y)
  return y + lines.length * (opts.lineHeight || 4.5) + 2
}

// ── Bullet list ──
function bulletList(doc, y, items) {
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  items.forEach(item => {
    doc.text('•', 22, y)
    const lines = doc.splitTextToSize(item, doc.internal.pageSize.getWidth() - 50)
    doc.text(lines, 28, y)
    y += lines.length * 4.5 + 1.5
  })
  return y + 2
}

// ── Etape numerotee ──
function step(doc, y, num, titre, description) {
  doc.setFillColor(...GRAY_100)
  const pw = doc.internal.pageSize.getWidth()
  doc.roundedRect(15, y, pw - 30, 7, 1.5, 1.5, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...EMERALD)
  doc.text('Etape ' + num, 20, y + 5)
  doc.setTextColor(...GRAY_900)
  doc.text(titre, 45, y + 5)
  doc.setTextColor(0, 0, 0)
  y += 10
  if (description) {
    y = para(doc, y, description)
  }
  return y
}

// ══════════════════════════════════════════════════════════
// GUIDE DAF
// ══════════════════════════════════════════════════════════
export function generateGuideDAF() {
  const doc = new jsPDF('p', 'mm', 'a4')
  let y = drawGuideHeader(doc, 'GUIDE DAF', 'Direction Administrative et Financiere', EMERALD)

  y = sectionTitle(doc, y, '1. ROLE DE LA DAF', EMERALD)
  y = para(doc, y, 'La DAF est le service central de l\'application. Elle gere les agents, les parametres de calcul des primes, la consolidation et la validation finale des primes de performance.')
  y = bulletList(doc, y, [
    'Ajout et gestion des agents (chauffeurs, ripeurs, techniciens)',
    'Configuration des seuils, plafonds et ponderations',
    'Vue budgetaire avec estimation des couts',
    'Consolidation mensuelle de toutes les saisies',
    'Validation finale et generation des rapports PDF',
  ])

  y = sectionTitle(doc, y, '2. GESTION DES AGENTS (E50)', EMERALD)
  y = step(doc, y, '1', 'Acceder au module', 'Menu lateral > DAF > Utilisateurs')
  y = step(doc, y, '2', 'Ajouter un agent', 'Cliquer "Nouvel Agent". Remplir: Nom, Matricule (unique), Fonction (texte libre), Profil systeme (CHAUFFEUR, EQUIPIER, GEO, etc.), Zone de collecte, Equipe.')
  y = step(doc, y, '3', 'Modifier / Retirer', 'Utiliser les icones crayon (modifier) et interdit (retirer) dans le tableau.')
  y = para(doc, y, 'IMPORTANT: Le matricule est unique et ne peut pas etre modifie apres creation. Il sert de cle d\'identification dans tous les services.', { bold: true })

  y = sectionTitle(doc, y, '3. PARAMETRES DE CALCUL', EMERALD)
  y = para(doc, y, 'Menu DAF > Parametres. Les parametres definissent les regles de calcul des primes:')
  doc.autoTable({
    startY: y,
    margin: { left: 15, right: 15 },
    head: [['Parametre', 'Description', 'Valeur par defaut']],
    body: [
      ['Seuil minimum', 'Score minimum pour etre eligible', '50%'],
      ['Plafond Chauffeur', 'Montant maximum de prime', '50 000 XAF'],
      ['Plafond Ripeur', 'Montant maximum de prime', '25 000 XAF'],
      ['Pond. Tonnage', 'Poids du critere tonnage', '50%'],
      ['Pond. Bouclage', 'Poids du critere bouclage', '25%'],
      ['Pond. Entretien', 'Poids du critere entretien', '15%'],
      ['Pond. QHSE', 'Poids du critere securite', '10%'],
    ],
    headStyles: { fillColor: EMERALD, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 8

  y = sectionTitle(doc, y, '4. CONSOLIDATION & VALIDATION', EMERALD)
  y = para(doc, y, 'A la fin du mois, la DAF consolide toutes les saisies des services et valide les primes:')
  y = step(doc, y, '1', 'Consolidation', 'Menu DAF > Consolidation. Visualiser les scores de tous les agents, detecter les anomalies.')
  y = step(doc, y, '2', 'Validation', 'Menu DAF > Validation Primes. Approuver ou rejeter chaque prime individuellement.')
  y = step(doc, y, '3', 'Export', 'Menu DAF > Rapports. Generer le rapport mensuel PDF complet (recapitulatif + fiches individuelles).')

  y = sectionTitle(doc, y, '5. ACCES LECTURE SEULE', EMERALD)
  y = para(doc, y, 'La DAF a un acces en lecture seule a tous les modules des autres services. Les formulaires sont desactives mais les donnees sont visibles. Cela permet un controle sans risque de modification accidentelle.')

  drawGuideFooter(doc, 1, 1)
  doc.save('Guide_DAF_Clean_Africa.pdf')
}

// ══════════════════════════════════════════════════════════
// GUIDE COLLECTE
// ══════════════════════════════════════════════════════════
export function generateGuideCollecte() {
  const doc = new jsPDF('p', 'mm', 'a4')
  let y = drawGuideHeader(doc, 'GUIDE SERVICE COLLECTE', 'Saisie Tonnage, Bouclage & Equipes', EMERALD)

  y = sectionTitle(doc, y, '1. SAISIE COLLECTE PAR EQUIPE', EMERALD)
  y = para(doc, y, 'Chaque saisie concerne une equipe complete: 1 chauffeur PL + 2 ripeurs, sur un vehicule, un arrondissement et un circuit.')

  y = step(doc, y, '1', 'Onglet Chauffeur', 'Rechercher le chauffeur par nom ou matricule. Selectionner le vehicule du parc (BOM, Bennes, Plateaux, Movi).')
  y = step(doc, y, '2', 'Onglet Ripeurs', 'Rechercher et selectionner les 2 ripeurs de l\'equipe. Le ripeur 2 est optionnel.')
  y = step(doc, y, '3', 'Onglet Arrondissement', 'Selectionner l\'arrondissement de collecte (1er a 6e, Owendo, PK8-PK12...) et le secteur.')
  y = step(doc, y, '4', 'Onglet Circuit & Tonnage', 'Saisir le nom du circuit, le tonnage total (tonnes) et le nombre de rotations.')
  y = step(doc, y, '5', 'Enregistrement', 'Cliquer "Enregistrer pour toute l\'equipe". Une fiche recapitulative est generee et partagee avec tous les services.')

  y = sectionTitle(doc, y, '2. BAREME DE NOTATION TONNAGE (50%)', EMERALD)
  doc.autoTable({
    startY: y,
    margin: { left: 15, right: 15 },
    head: [['Type vehicule', 'Excellent (100%)', 'Bien (75%)', 'Passable (50%)', 'Insuffisant (0%)']],
    body: [
      ['BOM', '>= 11 t/rot', '>= 8 t/rot', '>= 7 t/rot', '< 7 t/rot'],
      ['Plateaux', '>= 7.5t ou 4 rot', '>= 3 rot', '>= 2 rot', '< 2 rot'],
      ['Bennes', '>= 7 t/rot et > 2 rot', '-', '>= 7 t/rot et 2 rot', '< 7 t/rot'],
      ['Movi', '> 4 rot', '-', '>= 4 rot', '< 4 rot'],
    ],
    headStyles: { fillColor: EMERALD, fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 8

  y = sectionTitle(doc, y, '3. DECLARATION DE BOUCLAGE', EMERALD)
  y = para(doc, y, 'Menu Collecte > Declaration Bouclage. Pour chaque agent, declarer si le circuit a ete boucle (OUI/NON). La recherche par nom ou matricule permet de trouver rapidement un agent.')
  y = para(doc, y, 'Le bouclage declare sera ensuite valide ou refuse par le service Geolocalisation (GPS).', { bold: true })

  y = sectionTitle(doc, y, '4. FICHE DE COLLECTE', EMERALD)
  y = para(doc, y, 'Apres chaque enregistrement d\'equipe, une fiche de collecte est generee avec toutes les informations. Cette fiche est visible par tous les services (GEO, Logistique, QHSE, DAF).')
  y = bulletList(doc, y, [
    'Equipe complete: chauffeur + ripeurs avec noms et matricules',
    'Vehicule, arrondissement, secteur, circuit',
    'Donnees de performance: tonnage, rotations, moyenne par rotation',
    'Suivi par service: statut de validation de chaque service',
  ])

  y = sectionTitle(doc, y, '5. HISTORIQUE', EMERALD)
  y = para(doc, y, 'Menu Collecte > Historique. Consulter et filtrer toutes les saisies par agent (nom ou matricule) et par mois. Possibilite de modifier une saisie tant qu\'elle n\'est pas validee par la GEO.')

  drawGuideFooter(doc, 1, 1)
  doc.save('Guide_Collecte_Clean_Africa.pdf')
}

// ══════════════════════════════════════════════════════════
// GUIDE GEO
// ══════════════════════════════════════════════════════════
export function generateGuideGEO() {
  const doc = new jsPDF('p', 'mm', 'a4')
  let y = drawGuideHeader(doc, 'GUIDE SERVICE GEOLOCALISATION', 'Validation GPS & Synthese Multi-Services', BLUE)

  y = sectionTitle(doc, y, '1. ROLE DE LA GEOLOCALISATION', BLUE)
  y = para(doc, y, 'Le service GEO fait AUTORITE sur les donnees terrain. Il valide ou refuse les declarations de bouclage en croisant les donnees GPS (couverture, distance, temps de circuit, arrets).')
  y = para(doc, y, 'Notation du bouclage (25% du score global):', { bold: true })
  doc.autoTable({
    startY: y,
    margin: { left: 15, right: 15 },
    head: [['Statut GEO', 'Score bouclage', 'Signification']],
    body: [
      ['VALIDE', '100%', 'Circuit confirme par GPS, donnees coherentes'],
      ['PARTIEL', '50%', 'Circuit partiellement confirme, couverture GPS incomplete'],
      ['REFUSE', '0%', 'Donnees GPS contredisent la declaration'],
    ],
    headStyles: { fillColor: BLUE, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 8

  y = sectionTitle(doc, y, '2. TABLEAU DE BORD GEO', BLUE)
  y = para(doc, y, 'Menu GEO > Tableau de Bord. Vue croisee de toutes les saisies multi-services pour chaque agent. Recherche par nom ou matricule.')
  y = bulletList(doc, y, [
    'KPIs: En attente, Divergences, Valides, Couverture GPS moyenne',
    'Graphique de couverture GPS par agent',
    'Synthese croisee: Collecte + GPS + Logistique + QHSE pour chaque bouclage',
    'Detection automatique des divergences entre services',
  ])

  y = sectionTitle(doc, y, '3. PROCESSUS DE VALIDATION', BLUE)
  y = step(doc, y, '1', 'File de validation', 'Menu GEO > File de Validation. Liste les bouclages en attente de decision GEO.')
  y = step(doc, y, '2', 'Analyser', 'Cliquer "Analyser et decider" pour voir le detail: donnees GPS, donnees declarees, divergences.')
  y = step(doc, y, '3', 'Decider', 'Choisir: VALIDE (100%), PARTIEL (50%) ou REFUSE (0%). Ajouter un commentaire si necessaire.')
  y = para(doc, y, 'La decision GEO est definitive et impacte directement le score de bouclage (25% du total).', { bold: true })

  y = sectionTitle(doc, y, '4. DONNEES GPS', BLUE)
  y = para(doc, y, 'Pour chaque circuit, les donnees GPS suivantes sont analysees:')
  y = bulletList(doc, y, [
    'Couverture GPS (%): pourcentage du circuit couvert par le traceur',
    'Kilometres parcourus: distance totale enregistree',
    'Temps de circuit: duree totale de la tournee',
    'Nombre d\'arrets: arrets prolonges detectes',
    'Vitesse moyenne: km/h moyen sur le circuit',
  ])

  drawGuideFooter(doc, 1, 1)
  doc.save('Guide_GEO_Clean_Africa.pdf')
}

// ══════════════════════════════════════════════════════════
// GUIDE LOGISTIQUE
// ══════════════════════════════════════════════════════════
export function generateGuideLogistique() {
  const doc = new jsPDF('p', 'mm', 'a4')
  let y = drawGuideHeader(doc, 'GUIDE SERVICE LOGISTIQUE', 'Entretien Vehicules & Suivi Equipements', AMBER)

  y = sectionTitle(doc, y, '1. ROLE DE LA LOGISTIQUE', AMBER)
  y = para(doc, y, 'Le service Logistique evalue l\'entretien des vehicules par les chauffeurs. Cette note represente 15% du score global de prime.')
  y = para(doc, y, 'Seuls les CHAUFFEURS sont evalues sur ce critere. Les ripeurs obtiennent automatiquement 100% en entretien.', { bold: true })

  y = sectionTitle(doc, y, '2. SAISIE ENTRETIEN VEHICULE', AMBER)
  y = step(doc, y, '1', 'Acceder au module', 'Menu Logistique > Saisie Entretien')
  y = step(doc, y, '2', 'Selectionner l\'agent', 'Rechercher par nom ou matricule le chauffeur concerne.')
  y = step(doc, y, '3', 'Evaluer le vehicule', 'Noter chaque critere sur 10:')
  y = bulletList(doc, y, [
    'Etat des pneus: usure, pression, degats visibles',
    'Niveaux d\'huile: moteur, frein, direction assistee',
    'Proprete du vehicule: interieur, exterieur, benne',
    'Respect des controles: carnet de bord, pre-demarrage',
    'Degradations: rayures, bosses, retroviseurs',
  ])

  y = sectionTitle(doc, y, '3. BAREME DE NOTATION (15%)', AMBER)
  doc.autoTable({
    startY: y,
    margin: { left: 15, right: 15 },
    head: [['Note /10', 'Score entretien', 'Appreciation']],
    body: [
      ['>= 8/10', '100%', 'Excellent — Vehicule bien entretenu'],
      ['>= 6/10', '75%', 'Bien — Quelques points a ameliorer'],
      ['>= 4/10', '50%', 'Passable — Entretien insuffisant'],
      ['< 4/10', '0%', 'Insuffisant — Negligence constatee'],
    ],
    headStyles: { fillColor: AMBER, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 8

  y = sectionTitle(doc, y, '4. SUIVI DES EQUIPEMENTS', AMBER)
  y = para(doc, y, 'Menu Logistique > Suivi Equipements. Gerer le parc de 99 vehicules:')
  y = bulletList(doc, y, [
    'BOM (Bennes a Ordures Menageres): vehicules principaux de collecte',
    'Bennes: vehicules de transport de gros volumes',
    'Plateaux: vehicules a plateau pour objets encombrants',
    'Movi: vehicules legers de proximite',
    'Statut: Operationnel, En maintenance, Hors service',
  ])

  y = sectionTitle(doc, y, '5. HISTORIQUE', AMBER)
  y = para(doc, y, 'Menu Logistique > Historique. Consulter toutes les evaluations d\'entretien par agent et par mois. Filtrage par nom ou matricule.')

  drawGuideFooter(doc, 1, 1)
  doc.save('Guide_Logistique_Clean_Africa.pdf')
}

// ══════════════════════════════════════════════════════════
// GUIDE QHSE
// ══════════════════════════════════════════════════════════
export function generateGuideQHSE() {
  const doc = new jsPDF('p', 'mm', 'a4')
  let y = drawGuideHeader(doc, 'GUIDE SERVICE QHSE', 'Securite, Checklist & Alcootest', PURPLE)

  y = sectionTitle(doc, y, '1. ROLE DU QHSE', PURPLE)
  y = para(doc, y, 'Le service QHSE (Qualite, Hygiene, Securite, Environnement) evalue la conformite securitaire des agents. Ce critere represente 10% du score global.')
  y = para(doc, y, 'REGLE ELIMINATOIRE: Un alcootest positif entraine 0% sur l\'ensemble du critere QHSE, quelle que soit la note de checklist.', { bold: true })

  y = sectionTitle(doc, y, '2. CHECKLIST TERRAIN', PURPLE)
  y = step(doc, y, '1', 'Acceder au module', 'Menu QHSE > Checklist Terrain')
  y = step(doc, y, '2', 'Selectionner l\'agent', 'Rechercher par nom ou matricule.')
  y = step(doc, y, '3', 'Remplir la checklist', 'Evaluer les elements suivants (OUI/NON):')
  y = bulletList(doc, y, [
    'EPI Bottes: Port des bottes de securite',
    'EPI Gilets: Port du gilet haute visibilite',
    'EPI Gants: Port des gants de protection',
    'Vehicule Extincteur: Presence et validite de l\'extincteur',
    'Vehicule Gyrophare: Fonctionnement du gyrophare/masse-pe',
  ])
  y = para(doc, y, 'La note est calculee automatiquement sur 5 (nombre d\'elements conformes).')

  y = sectionTitle(doc, y, '3. TEST ALCOOLEMIE', PURPLE)
  y = step(doc, y, '1', 'Acceder au module', 'Menu QHSE > Test Alcoolemie')
  y = step(doc, y, '2', 'Selectionner l\'agent', 'Rechercher par nom ou matricule.')
  y = step(doc, y, '3', 'Enregistrer le resultat', 'NEGATIF (0 g/l) ou POSITIF (> 0 g/l). Si positif, saisir le taux et les observations.')

  y = sectionTitle(doc, y, '4. BAREME QHSE (10%)', PURPLE)
  doc.autoTable({
    startY: y,
    margin: { left: 15, right: 15 },
    head: [['Element', 'Impact sur le score']],
    body: [
      ['Alcootest POSITIF', 'Score QHSE = 0% (eliminatoire)'],
      ['Checklist 5/5 + EPI OK', '100%'],
      ['Checklist 4/5 + EPI OK', '80%'],
      ['Checklist 3/5 ou EPI NON', '50-60%'],
      ['Checklist < 3/5', '< 50%'],
    ],
    headStyles: { fillColor: PURPLE, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    theme: 'grid',
  })
  y = doc.lastAutoTable.finalY + 8

  y = sectionTitle(doc, y, '5. COLLECTE SELECTIVE (BONUS)', PURPLE)
  y = para(doc, y, 'Menu QHSE > Collecte Selective (E42). Module bonus hors bareme standard. La pesee des dechets tries (plastique, carton, autre) donne un bonus supplementaire.')

  y = sectionTitle(doc, y, '6. HISTORIQUE', PURPLE)
  y = para(doc, y, 'Menu QHSE > Historique. Consulter toutes les evaluations QHSE par agent et par mois.')

  drawGuideFooter(doc, 1, 1)
  doc.save('Guide_QHSE_Clean_Africa.pdf')
}

// ══════════════════════════════════════════════════════════
// GENERER TOUS LES GUIDES
// ══════════════════════════════════════════════════════════
export function generateTousLesGuides() {
  generateGuideDAF()
  generateGuideCollecte()
  generateGuideGEO()
  generateGuideLogistique()
  generateGuideQHSE()
}
