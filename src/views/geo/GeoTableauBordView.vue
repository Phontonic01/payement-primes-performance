<script setup>
import { ref, computed } from 'vue'
import { MapPin, AlertTriangle, CheckCircle, XCircle, Eye, Truck, Wrench, ShieldCheck, TrendingUp, Search } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChart from '@/components/ui/BaseChart.vue'
import { useSaisiesStore } from '@/stores/saisies'
import { useGeoStore } from '@/stores/geo'
import { useAgentsStore } from '@/stores/agents'
import { formatDateFr } from '@/utils/formatDate'

const saisiesStore = useSaisiesStore()
const geoStore = useGeoStore()
const agentsStore = useAgentsStore()
const searchQuery = ref('')

// Construire la synthèse croisée depuis les stores
const synthese = computed(() => {
  const allBouclages = Object.values(saisiesStore.bouclages)
  return allBouclages.map((b, i) => {
    const agent = agentsStore.getAgentByMatricule(b.matricule)
    const tonnage = saisiesStore.getTonnage(b.matricule, b.date)
    const entretien = saisiesStore.getEntretien(b.matricule, b.date)
    const qhse = saisiesStore.getQhse(b.matricule, b.date)
    const geoDecision = geoStore.getDecision(b.matricule, b.date)

    // Déterminer le statut GEO
    let geoStatut = 'ATTENTE'
    if (b.statutGeo === 'VALIDE') geoStatut = 'VALIDE'
    else if (b.statutGeo === 'PARTIEL') geoStatut = 'PARTIEL'
    else if (b.statutGeo === 'REFUSE') geoStatut = 'REFUSE'

    // Divergences
    const divergences = geoDecision?.impacts?.filter(imp => imp.type !== 'VALIDE') || []

    return {
      id: `${b.matricule}__${b.date}`,
      date: b.date,
      dateFr: formatDateFr(b.date),
      agent: agent?.nom || b.agent,
      matricule: b.matricule,
      circuit: b.circuit || '—',
      collecte: {
        declare: b.bouclageDeclare ? 'OUI' : 'NON',
        tonnage: tonnage ? `${tonnage.tonnage} t` : '—',
        rotations: tonnage?.rotations || 0,
      },
      logistique: {
        noteEntretien: entretien?.note ?? null,
        vehicule: tonnage?.vehiculeLabel || tonnage?.vehicule || '—',
      },
      qhse: {
        checklist: qhse ? `${qhse.checklistSur5.toFixed(1)}/5` : '—',
        alcootest: qhse?.alcootestPositif ? 'Positif' : 'Négatif',
        epiConforme: qhse?.epiConforme ?? true,
      },
      gps: geoDecision?.gpsData || { couverture: 0, kmParcourus: 0, tempsCircuit: '—', arrets: 0, vitesseMoyenne: 0 },
      geoStatut,
      divergences: divergences.map(d => ({
        service: d.service,
        type: d.type === 'INVALIDE' || d.type === 'ALERTE' ? 'danger' : 'warning',
        message: d.message,
      })),
    }
  }).sort((a, b) => b.date.localeCompare(a.date))
})

// Filtrage par recherche nom/matricule
const syntheseFiltree = computed(() => {
  if (!searchQuery.value.trim()) return synthese.value
  const q = searchQuery.value.toLowerCase().trim()
  return synthese.value.filter(s =>
    s.agent.toLowerCase().includes(q) || s.matricule.toLowerCase().includes(q)
  )
})

const enAttente = computed(() => synthese.value.filter(s => s.geoStatut === 'ATTENTE').length)
const avecDivergences = computed(() => synthese.value.filter(s => s.divergences.length > 0).length)
const valides = computed(() => synthese.value.filter(s => s.geoStatut === 'VALIDE').length)
const couvertureMoyenne = computed(() => {
  const items = synthese.value.filter(s => s.gps.couverture > 0)
  if (items.length === 0) return 0
  return (items.reduce((s, item) => s + item.gps.couverture, 0) / items.length).toFixed(0)
})

// Chart couverture GPS
const chartData = computed(() => {
  const items = synthese.value.filter(s => s.gps.couverture > 0)
  return {
    labels: items.map(s => s.agent.split(' ')[0]),
    datasets: [{
      label: 'Couverture GPS (%)',
      data: items.map(s => s.gps.couverture),
      backgroundColor: items.map(s =>
        s.gps.couverture >= 90 ? 'rgba(16, 185, 129, 0.8)' :
        s.gps.couverture >= 70 ? 'rgba(245, 158, 11, 0.8)' :
        'rgba(220, 38, 38, 0.8)'
      ),
      borderRadius: 6,
      barThickness: 32,
    }]
  }
})
const chartOptions = {
  scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } },
  plugins: { legend: { display: false } }
}

function getCouvertureColor(pct) {
  if (pct >= 90) return 'text-emerald-600'
  if (pct >= 70) return 'text-amber-600'
  return 'text-red-600'
}
function getCouvertureBg(pct) {
  if (pct >= 90) return 'bg-emerald-500'
  if (pct >= 70) return 'bg-amber-500'
  return 'bg-red-500'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <MapPin class="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Tableau de Bord GEO</h1>
          <p class="text-sm text-gray-500">Vue croisée multi-services — La GEO fait autorité terrain</p>
        </div>
      </div>
      <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200">
        <MapPin class="w-4 h-4 text-blue-600" />
        <span class="text-sm font-medium text-blue-700">Autorité validation</span>
      </div>
    </div>

    <!-- Alerte rôle -->
    <div class="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
      <MapPin class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
      <div>
        <p class="text-sm font-semibold text-blue-800">La Géolocalisation fait autorité sur les données terrain</p>
        <p class="text-xs text-blue-600 mt-1">Le GPS et le suivi terrain permettent de confirmer ou infirmer les déclarations des services. Les divergences sont signalées ci-dessous.</p>
      </div>
    </div>

    <!-- État vide -->
    <div v-if="synthese.length === 0" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-4">
        <MapPin class="w-8 h-8 text-blue-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900">Aucun bouclage à analyser</h3>
      <p class="text-sm text-gray-500 mt-1">Les bouclages déclarés par le service Collecte apparaîtront ici pour validation.</p>
    </div>

    <template v-else>
      <!-- KPIs -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BaseCard class="!p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">En attente</span>
            <AlertTriangle class="w-4 h-4 text-amber-500" />
          </div>
          <p class="text-2xl font-bold text-amber-600">{{ enAttente }}</p>
          <p class="text-xs text-gray-400 mt-1">à valider par GEO</p>
        </BaseCard>
        <BaseCard class="!p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">Divergences</span>
            <XCircle class="w-4 h-4 text-red-500" />
          </div>
          <p class="text-2xl font-bold text-red-600">{{ avecDivergences }}</p>
          <p class="text-xs text-gray-400 mt-1">incohérences</p>
        </BaseCard>
        <BaseCard class="!p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">Validés</span>
            <CheckCircle class="w-4 h-4 text-emerald-500" />
          </div>
          <p class="text-2xl font-bold text-emerald-600">{{ valides }}</p>
          <p class="text-xs text-gray-400 mt-1">confirmés GEO</p>
        </BaseCard>
        <BaseCard class="!p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">Couverture moy.</span>
            <TrendingUp class="w-4 h-4 text-blue-500" />
          </div>
          <p class="text-2xl font-bold" :class="getCouvertureColor(couvertureMoyenne)">{{ couvertureMoyenne }}%</p>
          <p class="text-xs text-gray-400 mt-1">GPS circuits</p>
        </BaseCard>
      </div>

      <!-- Graphique -->
      <BaseCard v-if="chartData.labels.length > 0" title="Couverture GPS par agent">
        <BaseChart type="bar" :data="chartData" :options="chartOptions" class="h-48" />
      </BaseCard>

      <!-- Synthèse croisée -->
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 class="text-lg font-bold text-gray-900">Synthèse Croisée Multi-Services</h2>
          <span class="text-xs text-gray-400 font-medium">{{ syntheseFiltree.length }}/{{ synthese.length }} résultats</span>
        </div>

        <!-- Recherche agent -->
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search class="w-4 h-4 text-gray-400" />
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher un agent par nom ou matricule..."
            class="block w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors duration-200"
          />
        </div>

        <div v-for="item in syntheseFiltree" :key="item.id" class="bg-white rounded-xl border overflow-hidden"
          :class="item.divergences.length > 0 ? 'border-red-200' : (item.geoStatut === 'VALIDE' ? 'border-emerald-200' : 'border-gray-100')">
          <!-- Header agent -->
          <div class="px-5 py-3 border-b flex items-center justify-between"
            :class="item.divergences.length > 0 ? 'bg-red-50 border-red-100' : (item.geoStatut === 'VALIDE' ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100')">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-bold"
                :class="item.divergences.length > 0 ? 'text-red-600' : 'text-emerald-600'">
                {{ item.agent.charAt(0) }}
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ item.agent }} <span class="text-gray-400 font-normal">({{ item.matricule }})</span></p>
                <p class="text-xs text-gray-500">{{ item.dateFr }} — {{ item.circuit }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <BaseBadge v-if="item.divergences.length > 0" status="danger" :text="item.divergences.length + ' divergence(s)'" />
              <BaseBadge v-if="item.geoStatut === 'VALIDE'" status="success" text="Validé GEO" />
              <BaseBadge v-else-if="item.geoStatut === 'ATTENTE'" status="warning" text="En attente GEO" />
              <BaseBadge v-else-if="item.geoStatut === 'PARTIEL'" status="warning" text="Partiel GEO" />
              <BaseBadge v-else-if="item.geoStatut === 'REFUSE'" status="danger" text="Refusé GEO" />
            </div>
          </div>

          <div class="p-5">
            <!-- 4 colonnes -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <!-- Collecte -->
              <div class="rounded-lg bg-emerald-50/50 border border-emerald-100 p-3">
                <div class="flex items-center gap-1.5 mb-2"><Truck class="w-3.5 h-3.5 text-emerald-600" /><span class="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Collecte</span></div>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between"><span class="text-gray-500">Bouclage</span><span class="font-semibold" :class="item.collecte.declare === 'OUI' ? 'text-emerald-600' : 'text-red-600'">{{ item.collecte.declare }}</span></div>
                  <div class="flex justify-between"><span class="text-gray-500">Tonnage</span><span class="font-medium text-gray-900">{{ item.collecte.tonnage }}</span></div>
                </div>
              </div>
              <!-- GPS -->
              <div class="rounded-lg bg-blue-50/50 border border-blue-100 p-3">
                <div class="flex items-center gap-1.5 mb-2"><MapPin class="w-3.5 h-3.5 text-blue-600" /><span class="text-xs font-semibold text-blue-700 uppercase tracking-wider">GPS</span></div>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between"><span class="text-gray-500">Couverture</span><span class="font-bold" :class="getCouvertureColor(item.gps.couverture)">{{ item.gps.couverture || '—' }}%</span></div>
                  <div class="flex justify-between"><span class="text-gray-500">Distance</span><span class="font-medium text-gray-900">{{ item.gps.kmParcourus || '—' }} km</span></div>
                </div>
              </div>
              <!-- Logistique -->
              <div class="rounded-lg bg-amber-50/50 border border-amber-100 p-3">
                <div class="flex items-center gap-1.5 mb-2"><Wrench class="w-3.5 h-3.5 text-amber-600" /><span class="text-xs font-semibold text-amber-700 uppercase tracking-wider">Logistique</span></div>
                <div class="text-sm">
                  <div class="flex justify-between"><span class="text-gray-500">Entretien</span>
                    <span v-if="item.logistique.noteEntretien !== null" class="font-bold" :class="item.logistique.noteEntretien >= 7 ? 'text-emerald-600' : 'text-amber-600'">{{ item.logistique.noteEntretien.toFixed(1) }}/10</span>
                    <span v-else class="text-gray-400 italic">—</span>
                  </div>
                </div>
              </div>
              <!-- QHSE -->
              <div class="rounded-lg bg-purple-50/50 border border-purple-100 p-3">
                <div class="flex items-center gap-1.5 mb-2"><ShieldCheck class="w-3.5 h-3.5 text-purple-600" /><span class="text-xs font-semibold text-purple-700 uppercase tracking-wider">QHSE</span></div>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between"><span class="text-gray-500">Checklist</span><span class="font-medium text-gray-900">{{ item.qhse.checklist }}</span></div>
                  <div class="flex justify-between"><span class="text-gray-500">Alcootest</span><span class="font-semibold" :class="item.qhse.alcootest.includes('Positif') ? 'text-red-600' : 'text-emerald-600'">{{ item.qhse.alcootest }}</span></div>
                  <div class="flex justify-between"><span class="text-gray-500">EPI</span><span class="font-medium" :class="item.qhse.epiConforme ? 'text-emerald-600' : 'text-red-600'">{{ item.qhse.epiConforme ? 'OK' : 'Non' }}</span></div>
                </div>
              </div>
            </div>

            <!-- Divergences -->
            <div v-if="item.divergences.length > 0" class="space-y-2 mb-4">
              <p class="text-xs font-semibold text-red-700 uppercase tracking-wider">Divergences détectées</p>
              <div v-for="(div, i) in item.divergences" :key="i"
                class="rounded-lg p-3 flex items-start gap-2.5"
                :class="div.type === 'danger' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'">
                <AlertTriangle class="w-4 h-4 flex-shrink-0 mt-0.5" :class="div.type === 'danger' ? 'text-red-500' : 'text-amber-500'" />
                <div>
                  <span class="text-xs font-semibold" :class="div.type === 'danger' ? 'text-red-700' : 'text-amber-700'">{{ div.service }}</span>
                  <p class="text-sm" :class="div.type === 'danger' ? 'text-red-600' : 'text-amber-600'">{{ div.message }}</p>
                </div>
              </div>
            </div>

            <!-- Action -->
            <div class="flex justify-end gap-2">
              <BaseButton v-if="item.geoStatut === 'ATTENTE'" @click="$router.push('/geo/detail/' + item.id)" variant="primary" size="sm">
                <Eye class="w-4 h-4 mr-1.5" />
                Analyser et décider
              </BaseButton>
              <span v-else class="text-xs font-semibold flex items-center gap-1" :class="item.geoStatut === 'VALIDE' ? 'text-emerald-600' : 'text-red-500'">
                <CheckCircle v-if="item.geoStatut === 'VALIDE'" class="w-4 h-4" />
                <XCircle v-else class="w-4 h-4" />
                Décision GEO rendue
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
