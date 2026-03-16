import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

/**
 * Formate un nombre en francs CFA (ex: 50 000 XAF)
 */
function formatXAF(montant) {
  return montant.toLocaleString('fr-FR') + ' XAF'
}

/**
 * Retourne la date du jour au format DD/MM/YYYY
 */
function dateFr() {
  const d = new Date()
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Retourne le mois/annee courant en francais
 */
function moisAnneeFr() {
  const d = new Date()
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()
}

/**
 * Dessine le header commun sur une page PDF
 * @returns {number} y position after header
 */
function drawHeader(doc, moisAnnee) {
  const pageWidth = doc.internal.pageSize.getWidth()

  // Titre principal
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('CLEAN AFRICA - Societe d\'Etat', pageWidth / 2, 20, { align: 'center' })

  // Sous-titre
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('FICHE INDIVIDUELLE DE PERFORMANCE', pageWidth / 2, 28, { align: 'center' })

  // Reference
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Ref: Note de Service 25-11-001-DT-DQHSE-DRH-yar-DG', pageWidth / 2, 34, { align: 'center' })

  // Periode
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Periode: ' + (moisAnnee || moisAnneeFr()), pageWidth / 2, 41, { align: 'center' })

  // Ligne de separation
  doc.setDrawColor(16, 185, 129) // emerald-500
  doc.setLineWidth(0.8)
  doc.line(15, 44, pageWidth - 15, 44)

  return 48
}

/**
 * Dessine le footer commun
 */
function drawFooter(doc) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(15, pageHeight - 18, pageWidth - 15, pageHeight - 18)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text('Document genere le ' + dateFr(), 15, pageHeight - 12)
  doc.text('Societe d\'Etat CLEAN AFRICA - Libreville, Gabon', pageWidth - 15, pageHeight - 12, { align: 'right' })
  doc.setTextColor(0, 0, 0)
}

/**
 * Genere la fiche PDF d'un seul agent sur la page courante
 * @param {jsPDF} doc - instance jsPDF
 * @param {Object} agent - { nom, matricule, role, zone }
 * @param {Object} fiche - resultat de calculerFicheAgent()
 * @param {Object} ponderations - { tonnage, bouclage, entretien, qhse }
 */
function drawFicheAgent(doc, agent, fiche, ponderations) {
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = drawHeader(doc)

  // ── Section Infos Agent ──
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(15, y, pageWidth - 30, 24, 2, 2, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Nom: ', 20, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.text(agent.nom, 37, y + 8)

  doc.setFont('helvetica', 'bold')
  doc.text('Matricule: ', 120, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.text(agent.matricule, 147, y + 8)

  doc.setFont('helvetica', 'bold')
  doc.text('Fonction: ', 20, y + 18)
  doc.setFont('helvetica', 'normal')
  doc.text(agent.role || '-', 47, y + 18)

  doc.setFont('helvetica', 'bold')
  doc.text('Zone: ', 120, y + 18)
  doc.setFont('helvetica', 'normal')
  doc.text(agent.zone || '-', 137, y + 18)

  y += 30

  // ── Tableau de performance ──
  const p = ponderations || fiche.ponderations
  const scores = fiche.scores

  doc.autoTable({
    startY: y,
    margin: { left: 15, right: 15 },
    head: [['Critere', 'Ponderation', 'Score (%)', 'Points obtenus']],
    body: [
      ['Tonnage', p.tonnage + '%', scores.tonnage.toFixed(1) + '%', fiche.details.tonnagePondere + ' / ' + p.tonnage],
      ['Bouclage de circuit', p.bouclage + '%', scores.bouclage.toFixed(1) + '%', fiche.details.bouclagePondere + ' / ' + p.bouclage],
      ['Entretien vehicule', p.entretien + '%', scores.entretien.toFixed(1) + '%', fiche.details.entretienPondere + ' / ' + p.entretien],
      ['Securite QHSE', p.qhse + '%', scores.qhse.toFixed(1) + '%', fiche.details.qhsePondere + ' / ' + p.qhse],
    ],
    foot: [['TOTAL', '100%', fiche.scoreGlobal.toFixed(1) + '%', fiche.scoreGlobal.toFixed(1) + ' / 100']],
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    footStyles: {
      fillColor: [240, 253, 244],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { halign: 'center', cellWidth: 35 },
      2: { halign: 'center', cellWidth: 35 },
      3: { halign: 'center' },
    },
    theme: 'grid',
  })

  y = doc.lastAutoTable.finalY + 10

  // ── Section Prime ──
  const plafond = fiche.prime.eligible
    ? Math.round((fiche.prime.montant / fiche.scoreGlobal) * 100)
    : 50000 // fallback

  // Cadre prime
  const primeBoxHeight = 48
  if (fiche.prime.eligible) {
    doc.setFillColor(240, 253, 244) // emerald-50
    doc.setDrawColor(16, 185, 129)
  } else {
    doc.setFillColor(254, 242, 242) // red-50
    doc.setDrawColor(239, 68, 68)
  }
  doc.setLineWidth(0.5)
  doc.roundedRect(15, y, pageWidth - 30, primeBoxHeight, 2, 2, 'FD')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Score Global:', 20, y + 10)
  doc.setFont('helvetica', 'bold')
  doc.text(fiche.scoreGlobal.toFixed(1) + '%', 58, y + 10)

  doc.setFont('helvetica', 'normal')
  doc.text('Plafond applicable:', 110, y + 10)
  doc.setFont('helvetica', 'bold')
  doc.text(formatXAF(plafond), 155, y + 10)

  doc.setFont('helvetica', 'normal')
  doc.text('Eligibilite:', 20, y + 20)
  if (fiche.prime.eligible) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(16, 185, 129)
    doc.text('OUI', 50, y + 20)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(239, 68, 68)
    doc.text('NON - ' + (fiche.prime.raison || ''), 50, y + 20)
  }
  doc.setTextColor(0, 0, 0)

  // Montant prime (grand et gras)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('MONTANT PRIME:', 20, y + 38)

  doc.setFontSize(18)
  if (fiche.prime.eligible) {
    doc.setTextColor(16, 185, 129)
  } else {
    doc.setTextColor(239, 68, 68)
  }
  doc.text(formatXAF(fiche.prime.montant), pageWidth - 20, y + 38, { align: 'right' })
  doc.setTextColor(0, 0, 0)

  drawFooter(doc)
}

/**
 * Genere un PDF avec la fiche individuelle d'un agent et le telecharge
 */
export function generateFicheAgentPdf(agent, fiche, ponderations) {
  const doc = new jsPDF('p', 'mm', 'a4')
  drawFicheAgent(doc, agent, fiche, ponderations)
  doc.save('Fiche_Performance_' + agent.matricule + '_' + agent.nom.replace(/\s+/g, '_') + '.pdf')
}

/**
 * Genere le rapport mensuel complet:
 * - Page 1: recapitulatif de tous les agents
 * - Pages suivantes: fiches individuelles
 */
export function generateRapportMensuelPdf(agents, fiches) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const moisAnnee = moisAnneeFr()

  // ══════════════════════════════════════════════
  // PAGE 1: Recapitulatif
  // ══════════════════════════════════════════════
  let y = drawHeader(doc, moisAnnee)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('RECAPITULATIF MENSUEL DES PRIMES', pageWidth / 2, y + 4, { align: 'center' })
  y += 12

  const tableBody = agents.map((agent, i) => {
    const f = fiches[i]
    return [
      agent.matricule,
      agent.nom,
      agent.role || '-',
      agent.zone || '-',
      f.scoreGlobal.toFixed(1) + '%',
      f.prime.eligible ? 'OUI' : 'NON',
      formatXAF(f.prime.montant),
    ]
  })

  const totalPrimes = fiches.reduce((sum, f) => sum + f.prime.montant, 0)
  const nbEligibles = fiches.filter(f => f.prime.eligible).length

  doc.autoTable({
    startY: y,
    margin: { left: 15, right: 15 },
    head: [['Matr.', 'Nom', 'Fonction', 'Zone', 'Score', 'Eligible', 'Prime']],
    body: tableBody,
    foot: [['', 'TOTAL (' + nbEligibles + '/' + agents.length + ' eligibles)', '', '', '', '', formatXAF(totalPrimes)]],
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
    },
    footStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 40 },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'right' },
    },
    theme: 'grid',
    didParseCell: function (data) {
      // Color eligible/non-eligible cells
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'NON') {
          data.cell.styles.textColor = [239, 68, 68]
          data.cell.styles.fontStyle = 'bold'
        } else {
          data.cell.styles.textColor = [16, 185, 129]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  drawFooter(doc)

  // ══════════════════════════════════════════════
  // PAGES SUIVANTES: Fiches individuelles
  // ══════════════════════════════════════════════
  agents.forEach((agent, i) => {
    doc.addPage()
    drawFicheAgent(doc, agent, fiches[i], fiches[i].ponderations)
  })

  doc.save('Rapport_Mensuel_Primes_' + moisAnnee.replace(/\s+/g, '_') + '.pdf')
}

/**
 * Genere uniquement le recapitulatif (sans les fiches individuelles)
 */
export function generateRecapitulatifPdf(agents, fiches) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const moisAnnee = moisAnneeFr()

  let y = drawHeader(doc, moisAnnee)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('RECAPITULATIF MENSUEL DES PRIMES', pageWidth / 2, y + 4, { align: 'center' })
  y += 12

  const tableBody = agents.map((agent, i) => {
    const f = fiches[i]
    return [
      agent.matricule,
      agent.nom,
      agent.role || '-',
      agent.zone || '-',
      f.scoreGlobal.toFixed(1) + '%',
      f.prime.eligible ? 'OUI' : 'NON',
      formatXAF(f.prime.montant),
    ]
  })

  const totalPrimes = fiches.reduce((sum, f) => sum + f.prime.montant, 0)
  const nbEligibles = fiches.filter(f => f.prime.eligible).length

  doc.autoTable({
    startY: y,
    margin: { left: 15, right: 15 },
    head: [['Matr.', 'Nom', 'Fonction', 'Zone', 'Score', 'Eligible', 'Prime']],
    body: tableBody,
    foot: [['', 'TOTAL (' + nbEligibles + '/' + agents.length + ' eligibles)', '', '', '', '', formatXAF(totalPrimes)]],
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
    },
    footStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 40 },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'right' },
    },
    theme: 'grid',
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'NON') {
          data.cell.styles.textColor = [239, 68, 68]
          data.cell.styles.fontStyle = 'bold'
        } else {
          data.cell.styles.textColor = [16, 185, 129]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  drawFooter(doc)
  doc.save('Recapitulatif_Primes_' + moisAnnee.replace(/\s+/g, '_') + '.pdf')
}
