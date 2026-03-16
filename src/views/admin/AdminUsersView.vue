<script setup>
import { ref } from 'vue'
import { Search, Pencil, Ban } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const columns = [
  { key: 'nom', label: 'Nom & Prénom' },
  { key: 'role', label: 'Rôle' },
  { key: 'matricule', label: 'Matricule' },
  { key: 'zone', label: 'Zone Assignée' },
  { key: 'statut', label: 'Statut' },
]

const users = ref([
  { id: 1, nom: 'Medza Ondo Scheila', role: 'CHAUFFEUR', matricule: '2823', zone: 'PK8', statut: 'ACTIF' },
  { id: 2, nom: 'Mamfoumbi Muriella', role: 'CHAUFFEUR', matricule: '2948', zone: 'LIBREVILLE', statut: 'ACTIF' },
  { id: 3, nom: 'Mbatsi Davy', role: 'EQUIPIER', matricule: '0946', zone: 'OWENDO', statut: 'ACTIF' },
  { id: 4, nom: 'Maduka Tiburce', role: 'GEO', matricule: '1495', zone: 'SIEGE', statut: 'ACTIF' },
  { id: 5, nom: 'Mbele Christopher', role: 'COLLECTE', matricule: '3016', zone: 'SIEGE', statut: 'ACTIF' },
  { id: 6, nom: 'Tsamba Tchewarny', role: 'CHAUFFEUR', matricule: '0943', zone: 'OWENDO', statut: 'ACTIF' },
  { id: 7, nom: 'Beka Christ', role: 'EQUIPIER', matricule: '2024', zone: 'LIBREVILLE', statut: 'ACTIF' },
  { id: 8, nom: 'Tengou Joram', role: 'CHAUFFEUR', matricule: '2768', zone: 'LIBREVILLE', statut: 'ACTIF' },
])

const showModal = ref(false)
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gestion des Utilisateurs & Agents (E50)</h1>
        <p class="text-sm text-gray-500 mt-1">Administration - Création et assignation des rôles</p>
      </div>
      <BaseButton @click="showModal = true" variant="primary">
        + Nouvel Utilisateur
      </BaseButton>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 flex flex-col md:flex-row gap-4">
      <div class="flex-1">
        <label class="sr-only">Rechercher</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            class="block w-full pl-10 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            placeholder="Rechercher par nom, matricule..."
          />
        </div>
      </div>
      <select class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition">
        <option value="">Tous les rôles</option>
        <option value="CHAUFFEUR">Chauffeur</option>
        <option value="EQUIPIER">Équipier</option>
        <option value="GEO">Géolocalisation</option>
        <option value="LOGISTIQUE">Logistique</option>
        <option value="QHSE">QHSE</option>
      </select>
      <select class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition">
        <option value="">Tous les statuts</option>
        <option value="ACTIF">Actif</option>
        <option value="INACTIF">Inactif</option>
      </select>
    </div>

    <BaseCard>
      <BaseTable :columns="columns" :rows="users">
        <template #cell-nom="{ row }">
          <div class="flex items-center">
            <div class="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold mr-3">
              {{ row.nom.charAt(0) }}
            </div>
            <div class="text-sm font-medium text-gray-900">{{ row.nom }}</div>
          </div>
        </template>
        <template #cell-statut="{ value }">
          <BaseBadge :status="value === 'ACTIF' ? 'success' : 'neutral'" :text="value" />
        </template>
        <template #actions>
          <button class="text-gray-400 hover:text-emerald-600 cursor-pointer mx-1 transition" title="Éditer">
            <Pencil class="w-4 h-4" />
          </button>
          <button class="text-gray-400 hover:text-red-500 cursor-pointer mx-1 transition" title="Désactiver">
            <Ban class="w-4 h-4" />
          </button>
        </template>
      </BaseTable>
    </BaseCard>
  </div>
</template>
