<script setup>
import { ref } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const params = ref({
  prixTonne: 500,
  scoreMinBouclage: 60,
  penaliteQhse: 5,
  bonusSelective: 200,
  seuilEntretien: 5,
  montantMaxPrime: 150000
})

function saveParams() {
  alert('Paramètres de calcul enregistrés avec succès. Ils s\'appliqueront sur la prochaine consolidation.')
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Paramétrage des Règles (E51)</h1>
      <p class="text-sm text-gray-500 mt-1">Administration - Configuration du moteur de calcul des primes</p>
    </div>

    <!-- Alert Warning -->
    <div class="rounded-xl bg-amber-50 p-4 flex items-start gap-3">
      <AlertTriangle class="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <p class="text-sm text-amber-700">
        Toute modification de ces paramètres impactera les calculs du mois en cours non encore validé.
      </p>
    </div>

    <form @submit.prevent="saveParams" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BaseCard title="Axe 1: Tonnage">
          <div class="space-y-4">
            <BaseInput v-model.number="params.prixTonne" type="number" label="Taux de base par Tonne (FCFA)" required />
            <p class="text-xs text-gray-500">Coefficient multiplicateur appliqué au tonnage net du mois de l'agent.</p>
          </div>
        </BaseCard>

        <BaseCard title="Axe 2: Bouclage (GEO)">
          <div class="space-y-4">
            <BaseInput v-model.number="params.scoreMinBouclage" type="number" min="0" max="100" label="Seuil validité partiel (%)" required />
            <p class="text-xs text-gray-500">En dessous de ce % de réalisation, le circuit est considéré comme non fait (0 point).</p>
          </div>
        </BaseCard>

        <BaseCard title="Axe 3: Entretien & Logistique">
          <div class="space-y-4">
            <BaseInput v-model.number="params.seuilEntretien" type="number" min="0" max="10" step="0.5" label="Note minimale d'entretien (/10)" required />
            <p class="text-xs text-gray-500">Si la moyenne mensuelle est inférieure, la prime d'entretien est annulée.</p>
          </div>
        </BaseCard>

        <BaseCard title="Axe 4: QHSE & Bonus">
          <div class="space-y-4">
            <BaseInput v-model.number="params.penaliteQhse" type="number" min="0" label="Pénalité par défaut Alcootest (pts)" required />
            <BaseInput v-model.number="params.bonusSelective" type="number" min="0" label="Bonus par tranche 10kg sélectif (FCFA)" required />
          </div>
        </BaseCard>

        <BaseCard title="Plafonds et Limites" class="md:col-span-2">
          <div class="space-y-4 max-w-sm">
            <BaseInput v-model.number="params.montantMaxPrime" type="number" label="Plafond global de prime (FCFA)" required />
            <p class="text-xs text-gray-500">Aucune prime ne pourra dépasser ce montant mensuel, quels que soient les scores.</p>
          </div>
        </BaseCard>
      </div>

      <div class="flex justify-end pt-4 bg-white rounded-xl border border-gray-100 p-5">
        <BaseButton type="submit" variant="primary">Enregistrer la Configuration</BaseButton>
      </div>
    </form>
  </div>
</template>
