<script setup>
import { FileText, FileSpreadsheet, BarChart3, Download } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useAgentsStore } from '@/stores/agents'
import { usePrimesStore } from '@/stores/primes'
import { useToastStore } from '@/stores/toast'
import { generateRapportMensuelPdf, generateRecapitulatifPdf } from '@/utils/generatePdf'

const agentsStore = useAgentsStore()
const primesStore = usePrimesStore()
const toastStore = useToastStore()

// Donnees mock mensuelles (meme source que RechercheAgentView)
const evaluationsMock = {
  '2823': { typeVehicule: 'BOM', typeAgent: 'CHAUFFEUR_COLLECTE', tonnage: 22, rotations: 2, bouclages: ['VALIDE', 'VALIDE', 'VALIDE'], noteEntretien: 9.5, qhse: { checklistSur5: 5, alcootestPositif: false, epiConforme: true, quartHeureSecurite: true } },
  '2948': { typeVehicule: 'Plateaux', typeAgent: 'CHAUFFEUR_COLLECTE', tonnage: 7.5, rotations: 3, bouclages: ['VALIDE', 'PARTIEL', 'VALIDE'], noteEntretien: 6.0, qhse: { checklistSur5: 4, alcootestPositif: true, epiConforme: true, quartHeureSecurite: true } },
  '0946': { typeVehicule: 'BOM', typeAgent: 'RIPEUR_COLLECTE', tonnage: 16, rotations: 2, bouclages: ['VALIDE', 'VALIDE'], noteEntretien: null, qhse: { checklistSur5: 3.5, alcootestPositif: false, epiConforme: true, quartHeureSecurite: false } },
  '1495': { typeVehicule: 'Canter', typeAgent: 'CHAUFFEUR_COLLECTE', tonnage: 1.2, rotations: 3, bouclages: ['VALIDE', 'VALIDE', 'VALIDE'], noteEntretien: 7.0, qhse: { checklistSur5: 4, alcootestPositif: false, epiConforme: true, quartHeureSecurite: true } },
  '3016': { typeVehicule: 'BOM', typeAgent: 'CHAUFFEUR_COLLECTE', tonnage: 14, rotations: 2, bouclages: ['VALIDE', 'VALIDE', 'VALIDE'], noteEntretien: 7.5, qhse: { checklistSur5: 5, alcootestPositif: false, epiConforme: true, quartHeureSecurite: true } },
  '0943': { typeVehicule: 'Bennes', typeAgent: 'CHAUFFEUR_COLLECTE', tonnage: 15, rotations: 2, bouclages: ['VALIDE', 'VALIDE'], noteEntretien: 6.5, qhse: { checklistSur5: 4, alcootestPositif: false, epiConforme: false, quartHeureSecurite: true } },
  '2024': { typeVehicule: 'Movi', typeAgent: 'RIPEUR_TRI', tonnage: 10, rotations: 3, bouclages: ['PARTIEL', 'PARTIEL'], noteEntretien: null, qhse: { checklistSur5: 3, alcootestPositif: false, epiConforme: true, quartHeureSecurite: false } },
  '2768': { typeVehicule: 'BOM', typeAgent: 'CHAUFFEUR_COLLECTE', tonnage: 22, rotations: 2, bouclages: ['VALIDE', 'VALIDE', 'VALIDE'], noteEntretien: 10, qhse: { checklistSur5: 5, alcootestPositif: false, epiConforme: true, quartHeureSecurite: true }, joursPresents: 28 },
}

function computeAllFiches() {
  const agents = agentsStore.agents
  const fiches = agents.map(agent => {
    const eval_ = evaluationsMock[agent.matricule]
    if (!eval_) {
      // Agent sans evaluation: fiche par defaut (scores a 0)
      return primesStore.calculerFicheAgent({})
    }
    const joursPresents = eval_.joursPresents || Object.entries(agentsStore.presences).filter(
      ([, matricules]) => matricules.includes(agent.matricule)
    ).length
    return primesStore.calculerFicheAgent({
      typeVehicule: eval_.typeVehicule,
      typeAgent: eval_.typeAgent,
      joursPresents,
      tonnageMoyen: eval_.tonnage,
      rotationsMoyennes: eval_.rotations,
      statutsBouclage: eval_.bouclages,
      noteEntretienMoyenne: eval_.noteEntretien,
      qhseData: eval_.qhse,
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
  toastStore.addToast('Génération et téléchargement du fichier Excel...', 'info')
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Rapports & Exports (E54, E55)</h1>
      <p class="text-sm text-gray-500 mt-1">Administration - Generation des documents et rapports statistiques</p>
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
