<script setup>
import { ref, computed } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import AgentSearchInput from '@/components/ui/AgentSearchInput.vue'
import { Truck, AlertTriangle, XCircle, ClipboardCheck, Save, CheckCircle, X } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { useVehiculesStore } from '@/stores/vehicules'

const toastStore = useToastStore()
const vehiculesStore = useVehiculesStore()
const selectedAgentRestitution = ref(null)

// ── Flotte véhicules (depuis le store) ──
const flotteColumns = [
  { key: 'noParc', label: 'N° Parc' },
  { key: 'type', label: 'Type' },
  { key: 'marque', label: 'Marque' },
  { key: 'immatriculation', label: 'Immatriculation' },
  { key: 'etat', label: 'État' },
]

const flotte = computed(() => vehiculesStore.vehiculesPL)

// ── Petits équipements - Restitution ──
const equipements = [
  { id: 'pelle', nom: 'Pelle', icon: 'PE' },
  { id: 'fourche', nom: 'Fourche', icon: 'FO' },
  { id: 'rateau', nom: 'Râteau', icon: 'RA' },
  { id: 'balai', nom: 'Balai', icon: 'BA' },
  { id: 'brouette', nom: 'Brouette', icon: 'BR' },
  { id: 'seau', nom: 'Seau', icon: 'SE' },
]

const restitutionForm = ref({
  date: new Date().toISOString().split('T')[0],
  agent: '',
  items: equipements.reduce((acc, e) => {
    acc[e.id] = { sorti: true, restitue: false, etat: 'BON' }
    return acc
  }, {}),
  observations: '',
})

function resetRestitution() {
  restitutionForm.value.agent = ''
  restitutionForm.value.observations = ''
  selectedAgentRestitution.value = null
  equipements.forEach(e => {
    restitutionForm.value.items[e.id] = { sorti: true, restitue: false, etat: 'BON' }
  })
}

const scoreRestitution = computed(() => {
  const items = restitutionForm.value.items
  let total = 0
  let restitues = 0
  let bonEtat = 0
  for (const key in items) {
    if (items[key].sorti) {
      total++
      if (items[key].restitue) {
        restitues++
        if (items[key].etat === 'BON') bonEtat++
      }
    }
  }
  if (total === 0) return { pct: 100, restitues: 0, total: 0, bonEtat: 0 }
  const pct = Math.round((restitues / total) * 100)
  return { pct, restitues, total, bonEtat }
})

function submitRestitution() {
  if (!selectedAgentRestitution.value) {
    toastStore.addToast('Veuillez selectionner un agent.', 'warning')
    return
  }
  const s = scoreRestitution.value
  historiqueRestitutions.value.unshift({
    id: historiqueRestitutions.value.length + 1,
    date: restitutionForm.value.date,
    agent: selectedAgentRestitution.value.nom + ' (' + selectedAgentRestitution.value.matricule + ')',
    equipements: `${s.total} sortis`,
    restitues: `${s.restitues}/${s.total}`,
    etat: s.restitues === s.total ? 'COMPLET' : 'INCOMPLET',
  })
  toastStore.addToast(`Restitution enregistrée. ${s.restitues}/${s.total} équipements (${s.pct}%).`, 'success')
  resetRestitution()
}

// ── Historique restitutions ──
const restitutionColumns = [
  { key: 'date', label: 'Date' },
  { key: 'agent', label: 'Agent' },
  { key: 'equipements', label: 'Équipements' },
  { key: 'restitues', label: 'Restitués' },
  { key: 'etat', label: 'État' },
]

const historiqueRestitutions = ref([])
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Suivi Équipements & Matériel (E32)</h1>
      <p class="text-sm text-gray-500 mt-1">Flotte véhicules et restitution des petits équipements</p>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div class="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Véhicules Opérationnels</p>
            <p class="text-3xl font-bold text-gray-900 mt-2">{{ vehiculesStore.vehiculesOperationnels.length }} <span class="text-sm font-normal text-gray-500">/ {{ vehiculesStore.vehiculesPL.length }}</span></p>
          </div>
          <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50">
            <Truck class="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <div class="mt-3 h-1 rounded-full bg-gray-100"><div class="h-1 rounded-full bg-emerald-600" style="width: 82%"></div></div>
      </div>

      <div class="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">En Panne / Standby</p>
            <p class="text-3xl font-bold text-gray-900 mt-2">{{ vehiculesStore.vehiculesPL.filter(v => ['Panne', 'Standby'].includes(v.etat)).length }}</p>
          </div>
          <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50">
            <AlertTriangle class="w-5 h-5 text-amber-500" />
          </div>
        </div>
        <div class="mt-3 h-1 rounded-full bg-gray-100"><div class="h-1 rounded-full bg-amber-500" style="width: 14%"></div></div>
      </div>

      <div class="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">HS / Accidentés</p>
            <p class="text-3xl font-bold text-gray-900 mt-2">{{ vehiculesStore.vehiculesPL.filter(v => ['HS', 'Accidenté'].includes(v.etat)).length }}</p>
          </div>
          <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50">
            <XCircle class="w-5 h-5 text-red-500" />
          </div>
        </div>
        <div class="mt-3 h-1 rounded-full bg-gray-100"><div class="h-1 rounded-full bg-red-500" style="width: 5%"></div></div>
      </div>
    </div>

    <!-- Fleet Table -->
    <div class="bg-white rounded-xl border border-gray-100">
      <div class="px-6 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">Détail de la flotte</h2>
      </div>
      <BaseTable :columns="flotteColumns" :rows="flotte">
        <template #cell-immatriculation="{ value }">
          <span class="text-sm font-mono text-gray-700">{{ value || '—' }}</span>
        </template>
        <template #cell-etat="{ value }">
          <BaseBadge v-if="value === 'Opérationnel'" status="success" text="Opérationnel" />
          <BaseBadge v-else-if="value === 'Panne'" status="danger" text="Panne" />
          <BaseBadge v-else-if="value === 'Standby'" status="warning" text="Standby" />
          <BaseBadge v-else-if="value === 'HS'" status="danger" text="Hors Service" />
          <BaseBadge v-else-if="value === 'Accidenté'" status="danger" text="Accidenté" />
          <BaseBadge v-else status="neutral" :text="value" />
        </template>
      </BaseTable>
    </div>

    <!-- ══════════════════════════════════════════ -->
    <!-- RESTITUTION PETITS ÉQUIPEMENTS            -->
    <!-- ══════════════════════════════════════════ -->
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <ClipboardCheck class="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-gray-900">Restitution Petits Équipements</h2>
          <p class="text-xs text-gray-500">Pelles, fourches, râteaux, balais — restitués propres au magasin</p>
        </div>
      </div>

      <form @submit.prevent="submitRestitution" class="p-6 space-y-6">
        <!-- Agent + Date -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AgentSearchInput
            v-model="restitutionForm.agent"
            :date="restitutionForm.date"
            :filter-presents="false"
            label="Agent concerne"
            placeholder="Tapez un nom ou matricule..."
            required
            @agent-selected="(a) => selectedAgentRestitution = a"
          />
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-700">Date</label>
            <input
              v-model="restitutionForm.date"
              type="date"
              class="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
          </div>
        </div>

        <!-- Grille équipements -->
        <div>
          <h3 class="text-sm font-semibold text-gray-900 mb-3">Équipements sortis / restitués</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="eq in equipements"
              :key="eq.id"
              class="rounded-xl border p-4 transition-all duration-200"
              :class="restitutionForm.items[eq.id].restitue ? 'border-emerald-200 bg-emerald-50/50' : (restitutionForm.items[eq.id].sorti ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-gray-50/50')"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-emerald-700 bg-emerald-100 w-7 h-7 rounded-lg flex items-center justify-center">{{ eq.icon }}</span>
                  <span class="text-sm font-semibold text-gray-900">{{ eq.nom }}</span>
                </div>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" v-model="restitutionForm.items[eq.id].sorti" class="h-3.5 w-3.5 accent-emerald-600 rounded" />
                  <span class="text-xs text-gray-500">Sorti</span>
                </label>
              </div>

              <div v-if="restitutionForm.items[eq.id].sorti" class="space-y-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" v-model="restitutionForm.items[eq.id].restitue" class="h-4 w-4 accent-emerald-600 rounded" />
                  <span class="text-sm font-medium" :class="restitutionForm.items[eq.id].restitue ? 'text-emerald-700' : 'text-red-600'">
                    {{ restitutionForm.items[eq.id].restitue ? 'Restitué' : 'Non restitué' }}
                  </span>
                </label>

                <select
                  v-if="restitutionForm.items[eq.id].restitue"
                  v-model="restitutionForm.items[eq.id].etat"
                  class="block w-full text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="BON">Bon état</option>
                  <option value="USE">Usé</option>
                  <option value="CASSE">Cassé / Endommagé</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Score restitution -->
        <div
          class="rounded-xl border p-4 flex items-center justify-between"
          :class="scoreRestitution.pct >= 80 ? 'bg-emerald-50 border-emerald-200' : (scoreRestitution.pct >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200')"
        >
          <div class="flex items-center gap-2">
            <CheckCircle v-if="scoreRestitution.pct >= 80" class="w-5 h-5 text-emerald-600" />
            <AlertTriangle v-else class="w-5 h-5 text-amber-600" />
            <span class="text-sm font-medium text-gray-700">
              Restitution: {{ scoreRestitution.restitues }}/{{ scoreRestitution.total }} équipements
              <span v-if="scoreRestitution.bonEtat < scoreRestitution.restitues" class="text-amber-600">
                ({{ scoreRestitution.bonEtat }} en bon état)
              </span>
            </span>
          </div>
          <span
            class="text-2xl font-bold"
            :class="scoreRestitution.pct >= 80 ? 'text-emerald-600' : (scoreRestitution.pct >= 50 ? 'text-amber-600' : 'text-red-600')"
          >
            {{ scoreRestitution.pct }}%
          </span>
        </div>

        <!-- Observations -->
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-700">Observations</label>
          <textarea
            v-model="restitutionForm.observations"
            rows="2"
            placeholder="Équipement manquant, dégradation constatée..."
            class="block w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <BaseButton type="button" variant="outline" @click="resetRestitution">Annuler</BaseButton>
          <BaseButton type="submit" variant="primary">
            <Save class="w-4 h-4 mr-1.5" />
            Enregistrer la restitution
          </BaseButton>
        </div>
      </form>
    </div>

    <!-- Historique restitutions -->
    <div class="bg-white rounded-xl border border-gray-100">
      <div class="px-6 py-4 border-b border-gray-100">
        <h2 class="text-base font-semibold text-gray-900">Historique des restitutions</h2>
      </div>
      <BaseTable :columns="restitutionColumns" :rows="historiqueRestitutions">
        <template #cell-etat="{ value }">
          <BaseBadge v-if="value === 'COMPLET'" status="success" text="Complet" />
          <BaseBadge v-else status="warning" text="Incomplet" />
        </template>
      </BaseTable>
    </div>
  </div>
</template>
