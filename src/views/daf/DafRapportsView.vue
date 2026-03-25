<script setup>
import { FileText, FileSpreadsheet, BarChart3, Download, BookOpen, Truck, MapPin, Wrench, ShieldCheck, Landmark } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useAgentsStore } from '@/stores/agents'
import { usePrimesStore } from '@/stores/primes'
import { useSaisiesStore } from '@/stores/saisies'
import { useToastStore } from '@/stores/toast'
import { generateRapportMensuelPdf, generateRecapitulatifPdf } from '@/utils/generatePdf'
import { generateGuideDAF, generateGuideCollecte, generateGuideGEO, generateGuideLogistique, generateGuideQHSE, generateTousLesGuides } from '@/utils/generateGuidesPdf'

const agentsStore = useAgentsStore()
const primesStore = usePrimesStore()
const saisiesStore = useSaisiesStore()
const toastStore = useToastStore()

// Mois en cours
const moisCourant = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})()

function computeAllFiches() {
  const agents = agentsStore.agents
  const fiches = agents.map(agent => {
    const agregation = saisiesStore.getAgregationMensuelle(agent.matricule, moisCourant)
    const typeAgent = agent.role === 'EQUIPIER' ? 'RIPEUR_COLLECTE' : 'CHAUFFEUR_COLLECTE'
    return primesStore.calculerFicheAgent({
      typeVehicule: agregation.typeVehicule,
      typeAgent,
      joursPresents: 28,
      tonnageMoyen: agregation.tonnageMoyen,
      rotationsMoyennes: agregation.rotationsMoyennes,
      statutsBouclage: agregation.statutsBouclage,
      noteEntretienMoyenne: agregation.noteEntretienMoyenne,
      qhseData: agregation.qhseData,
    })
  })
  return { agents, fiches }
}

function downloadPDF() {
  const { agents, fiches } = computeAllFiches()
  generateRapportMensuelPdf(agents, fiches)
  toastStore.addToast(`Rapport PDF généré pour ${agents.length} agents`, 'success')
}

function downloadRecapPDF() {
  const { agents, fiches } = computeAllFiches()
  generateRecapitulatifPdf(agents, fiches)
  toastStore.addToast('Récapitulatif PDF exporté avec succès', 'success')
}

function downloadExcel() {
  const { agents, fiches } = computeAllFiches()
  if (agents.length === 0) {
    toastStore.addToast('Aucun agent à exporter.', 'warning')
    return
  }

  // BOM UTF-8 pour que Excel reconnaisse les accents
  const BOM = '\uFEFF'
  const sep = ';'

  // En-têtes
  const headers = [
    'Matricule', 'Nom', 'Fonction', 'Zone', 'Équipe',
    'Score Tonnage (%)', 'Score Bouclage (%)', 'Score Entretien (%)', 'Score QHSE (%)',
    'Score Global (%)', 'Éligible', 'Montant Prime (XAF)'
  ]

  // Lignes
  const rows = agents.map((agent, i) => {
    const f = fiches[i]
    return [
      agent.matricule,
      agent.nom,
      agent.fonction || agent.role,
      agent.zone || '',
      agent.equipe || '',
      f.scores.tonnage.toFixed(1),
      f.scores.bouclage.toFixed(1),
      f.scores.entretien.toFixed(1),
      f.scores.qhse.toFixed(1),
      f.scoreGlobal.toFixed(1),
      f.prime.eligible ? 'OUI' : 'NON',
      f.prime.montant,
    ].map(v => `"${v}"`).join(sep)
  })

  // Ligne totale
  const totalPrime = fiches.reduce((s, f) => s + f.prime.montant, 0)
  rows.push(['', '', '', '', '', '', '', '', '', '', 'TOTAL', totalPrime].map(v => `"${v}"`).join(sep))

  const csv = BOM + headers.join(sep) + '\n' + rows.join('\n')

  // Téléchargement
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const mois = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(' ', '-')
  link.href = url
  link.download = `primes-performance-${mois}.csv`
  link.click()
  URL.revokeObjectURL(url)

  toastStore.addToast(`Fichier Excel/CSV exporté : ${agents.length} agents, total ${totalPrime.toLocaleString('fr-FR')} XAF`, 'success')
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Rapports & Exports (E54, E55)</h1>
      <p class="text-sm text-gray-500 mt-1">DAF - Génération des documents et rapports statistiques</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

      <!-- Export PDF Fiches individuelles -->
      <BaseCard class="flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4">
            <FileText class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Fiches Individuelles (PDF)</h3>
          <p class="text-sm text-gray-500 mb-6">Rapport complet avec recapitulatif et fiches individuelles detaillees pour chaque agent. A distribuer ou archiver.</p>
        </div>
        <BaseButton @click="downloadPDF" variant="outline" class="w-full border-gray-200 text-red-600 hover:bg-red-50 transition">
          <Download class="w-4 h-4 mr-2" /> Exporter fiches individuelles (PDF)
        </BaseButton>
      </BaseCard>

      <!-- Export PDF Recapitulatif seul -->
      <BaseCard class="flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
            <FileText class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Recapitulatif (PDF)</h3>
          <p class="text-sm text-gray-500 mb-6">Tableau recapitulatif des scores et primes de tous les agents sur une seule page. Ideal pour la Direction et la DRH.</p>
        </div>
        <BaseButton @click="downloadRecapPDF" variant="outline" class="w-full border-gray-200 text-amber-600 hover:bg-amber-50 transition">
          <Download class="w-4 h-4 mr-2" /> Exporter recapitulatif (PDF)
        </BaseButton>
      </BaseCard>

      <!-- Export Excel Comptabilite -->
      <BaseCard class="flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <FileSpreadsheet class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Fichier Comptabilite (Excel/CSV)</h3>
          <p class="text-sm text-gray-500 mb-6">Donnees consolidees formattees pour l'import dans les logiciels de paie (Sage, etc). Contient matricules et montants nets.</p>
        </div>
        <BaseButton @click="downloadExcel" variant="outline" class="w-full border-gray-200 text-emerald-600 hover:bg-emerald-50 transition">
          <Download class="w-4 h-4 mr-2" /> Exporter en Excel
        </BaseButton>
      </BaseCard>

      <!-- Rapport Statistique -->
      <BaseCard class="flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <BarChart3 class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Rapport Statistique Mensuel</h3>
          <p class="text-sm text-gray-500 mb-6">Evolution globale des performances metier. Moyennes par axe (Tonnage, logistique...).</p>
        </div>
        <BaseButton @click="$router.push('/dashboard')" variant="primary" class="w-full">
          Voir Tableaux de Bord
        </BaseButton>
      </BaseCard>

    </div>
  </div>
</template>
