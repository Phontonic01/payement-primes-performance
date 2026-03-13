<script setup>
import { FileText, FileSpreadsheet, BarChart3, Download } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

function downloadPDF() {
  alert('Génération et téléchargement du Fichier PDF...')
}

function downloadExcel() {
  alert('Génération et téléchargement du Fichier Excel...')
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Rapports & Exports (E54, E55)</h1>
      <p class="text-sm text-gray-500 mt-1">Administration - Génération des documents et rapports statistiques</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

      <!-- Export PDF Fiches de paie annexes -->
      <BaseCard class="flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4">
            <FileText class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Fiches Individuelles (PDF)</h3>
          <p class="text-sm text-gray-500 mb-6">Génère un document PDF contenant le détail du calcul de la prime pour chaque agent. À distribuer ou archiver.</p>
        </div>
        <BaseButton @click="downloadPDF" variant="outline" class="w-full border-gray-200 text-red-600 hover:bg-red-50 transition">
          <Download class="w-4 h-4 mr-2" /> Exporter en PDF
        </BaseButton>
      </BaseCard>

      <!-- Export Excel Comptabilité -->
      <BaseCard class="flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <FileSpreadsheet class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Fichier Comptabilité (Excel/CSV)</h3>
          <p class="text-sm text-gray-500 mb-6">Données consolidées formattées pour l'import dans les logiciels de paie (Sage, etc). Contient matricules et montants nets.</p>
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
          <p class="text-sm text-gray-500 mb-6">Évolution globale des performances métier. Moyennes par axe (Tonnage, logistique...).</p>
        </div>
        <BaseButton @click="$router.push('/dashboard')" variant="primary" class="w-full">
          Voir Tableaux de Bord
        </BaseButton>
      </BaseCard>

    </div>
  </div>
</template>
