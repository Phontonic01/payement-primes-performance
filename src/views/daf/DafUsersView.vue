<script setup>
import { ref, computed } from 'vue'
import { Search, Pencil, Ban, X, UserPlus, Save } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useAgentsStore } from '@/stores/agents'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

const agentsStore = useAgentsStore()
const toastStore = useToastStore()
const confirmStore = useConfirmStore()

const searchQuery = ref('')
const roleFilter = ref('')

const columns = [
  { key: 'nom', label: 'Nom & Prénom' },
  { key: 'matricule', label: 'Matricule' },
  { key: 'fonction', label: 'Fonction' },
  { key: 'role', label: 'Profil' },
  { key: 'zone', label: 'Zone / Secteur' },
  { key: 'equipe', label: 'Équipe' },
  { key: 'statut', label: 'Statut' },
]

const filteredUsers = computed(() => {
  let list = agentsStore.agents
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(a => a.nom.toLowerCase().includes(q) || a.matricule.includes(q))
  }
  if (roleFilter.value) {
    list = list.filter(a => a.role === roleFilter.value)
  }
  return list
})

// ── Modal ajout ──
const showModal = ref(false)
const form = ref({ nom: '', matricule: '', role: 'CHAUFFEUR', fonction: '', zone: '', equipe: '', vehicule: '' })

// Rôle système (pour les droits d'accès) — reste un select car c'est technique
const rolesSysteme = ['CHAUFFEUR', 'EQUIPIER', 'GEO', 'COLLECTE', 'LOGISTIQUE', 'QHSE', 'DAF']

// Les rôles existants saisis (pour le filtre)
const rolesExistants = computed(() => {
  const set = new Set(agentsStore.agents.map(a => a.role))
  return [...set].sort()
})

function resetForm() {
  form.value = { nom: '', matricule: '', role: 'CHAUFFEUR', fonction: '', zone: '', equipe: '', vehicule: '' }
}

function ajouterAgent() {
  if (!form.value.nom || !form.value.matricule) {
    toastStore.addToast('Nom et matricule sont obligatoires.', 'warning')
    return
  }
  const result = agentsStore.ajouterAgent(form.value)
  if (!result.success) {
    toastStore.addToast(result.message, 'error')
    return
  }
  toastStore.addToast(`Agent ${form.value.nom} (${form.value.matricule}) ajouté avec succès.`, 'success')
  resetForm()
  showModal.value = false
}

// ── Modal modification ──
const editModal = ref(false)
const editForm = ref({ matricule: '', nom: '', fonction: '', role: 'CHAUFFEUR', zone: '', equipe: '', vehicule: '' })

function ouvrirModification(agent) {
  editForm.value = { matricule: agent.matricule, nom: agent.nom, fonction: agent.fonction || '', role: agent.role, zone: agent.zone || '', equipe: agent.equipe || '', vehicule: agent.vehicule || '' }
  editModal.value = true
}

function sauvegarderModification() {
  agentsStore.modifierAgent(editForm.value.matricule, {
    nom: editForm.value.nom,
    fonction: editForm.value.fonction,
    role: editForm.value.role,
    zone: editForm.value.zone,
    equipe: editForm.value.equipe,
    vehicule: editForm.value.vehicule,
  })
  toastStore.addToast(`Agent ${editForm.value.nom} modifié.`, 'success')
  editModal.value = false
}

async function supprimerAgent(agent) {
  const confirmed = await confirmStore.open({
    title: 'Désactiver l\'agent',
    message: `Voulez-vous retirer "${agent.nom}" (${agent.matricule}) de la liste des agents ?`,
    confirmText: 'Retirer',
    cancelText: 'Annuler',
    variant: 'danger'
  })
  if (confirmed) {
    agentsStore.supprimerAgent(agent.matricule)
    toastStore.addToast(`Agent ${agent.nom} retiré.`, 'success')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gestion des Agents (E50)</h1>
        <p class="text-sm text-gray-500 mt-1">DAF - Ajout et gestion des agents de collecte</p>
      </div>
      <BaseButton @click="showModal = true" variant="primary">
        <UserPlus class="w-4 h-4 mr-1.5" />
        Nouvel Agent
      </BaseButton>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 flex flex-col md:flex-row gap-4">
      <div class="flex-1">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="h-4 w-4 text-gray-400" />
          </div>
          <input
            v-model="searchQuery"
            type="text"
            class="block w-full pl-10 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            placeholder="Rechercher par nom, matricule..."
          />
        </div>
      </div>
      <select v-model="roleFilter" class="bg-gray-50 border border-gray-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition">
        <option value="">Tous les profils</option>
        <option v-for="r in rolesSysteme" :key="r" :value="r">{{ r }}</option>
      </select>
    </div>

    <!-- État vide -->
    <div v-if="agentsStore.agents.length === 0" class="bg-white rounded-xl border border-gray-100 p-12 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 mb-4">
        <UserPlus class="w-8 h-8 text-emerald-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900">Aucun agent enregistré</h3>
      <p class="text-sm text-gray-500 mt-1 max-w-md mx-auto">
        Commencez par ajouter les agents (chauffeurs et ripeurs) via le bouton "Nouvel Agent".
        Les autres services pourront ensuite saisir les données de performance.
      </p>
      <BaseButton @click="showModal = true" variant="primary" class="mt-6">
        <UserPlus class="w-4 h-4 mr-1.5" />
        Ajouter le premier agent
      </BaseButton>
    </div>

    <!-- Table -->
    <BaseCard v-else>
      <BaseTable :columns="columns" :rows="filteredUsers">
        <template #cell-nom="{ row }">
          <div class="flex items-center">
            <div class="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold mr-3">
              {{ row.nom.charAt(0) }}
            </div>
            <div class="text-sm font-medium text-gray-900">{{ row.nom }}</div>
          </div>
        </template>
        <template #cell-fonction="{ value }">
          <span class="text-sm text-gray-700 font-medium">{{ value || '—' }}</span>
        </template>
        <template #cell-role="{ value }">
          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-600">{{ value }}</span>
        </template>
        <template #cell-zone="{ value }">
          <span class="text-sm text-gray-600">{{ value || '—' }}</span>
        </template>
        <template #cell-equipe="{ value }">
          <span class="text-sm text-gray-600">{{ value || '—' }}</span>
        </template>
        <template #cell-statut="{ value }">
          <BaseBadge :status="value === 'ACTIF' ? 'success' : 'neutral'" :text="value || 'ACTIF'" />
        </template>
        <template #actions="{ row }">
          <button @click="ouvrirModification(row)" class="text-gray-400 hover:text-emerald-600 cursor-pointer mx-1 transition" title="Modifier">
            <Pencil class="w-4 h-4" />
          </button>
          <button @click="supprimerAgent(row)" class="text-gray-400 hover:text-red-500 cursor-pointer mx-1 transition" title="Retirer">
            <Ban class="w-4 h-4" />
          </button>
        </template>
      </BaseTable>
    </BaseCard>

    <!-- Modal ajout agent -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div v-if="showModal" class="fixed inset-0 z-[9997] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" @click="showModal = false"></div>
          <div class="relative bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-lg overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 class="text-lg font-semibold text-gray-900">Ajouter un agent</h3>
              <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X class="w-5 h-5" />
              </button>
            </div>

            <form @submit.prevent="ajouterAgent" class="p-6 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <!-- Nom -->
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Nom & Prénom <span class="text-red-500">*</span></label>
                  <input v-model="form.nom" type="text" required placeholder="Ex: Medza Ondo Scheila"
                    class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>

                <!-- Matricule -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Matricule <span class="text-red-500">*</span></label>
                  <input v-model="form.matricule" type="text" required placeholder="Ex: 2823"
                    class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>

                <!-- Fonction (texte libre) -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Fonction <span class="text-red-500">*</span></label>
                  <input v-model="form.fonction" type="text" required placeholder="Ex: Chauffeur PL, Ripeur, Éboueur..."
                    class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>

                <!-- Profil système (détermine les droits d'accès) -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Profil système</label>
                  <select v-model="form.role"
                    class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                    <option v-for="r in rolesSysteme" :key="r" :value="r">{{ r }}</option>
                  </select>
                  <p class="text-[11px] text-gray-400 mt-1">Détermine quel module l'agent peut utiliser</p>
                </div>

                <!-- Zone / Secteur (texte libre) -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Zone / Secteur de collecte</label>
                  <input v-model="form.zone" type="text" placeholder="Ex: Libreville Centre, PK8, Owendo..."
                    class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>

                <!-- Équipe (texte libre) -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Équipe affectée</label>
                  <input v-model="form.equipe" type="text" placeholder="Ex: Équipe BOM-01, Équipe Tri-02..."
                    class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>

                <!-- Véhicule attribué (texte libre) -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Véhicule attribué</label>
                  <input v-model="form.vehicule" type="text" placeholder="Ex: BOM N°484 (KC-012-AA)"
                    class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
              </div>

              <div class="flex gap-3 pt-4 border-t border-gray-100">
                <BaseButton variant="outline" type="button" class="flex-1" @click="showModal = false">Annuler</BaseButton>
                <BaseButton variant="primary" type="submit" class="flex-1">
                  <Save class="w-4 h-4 mr-1.5" />
                  Ajouter l'agent
                </BaseButton>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
    <!-- Modal modification agent -->
    <Teleport to="body">
      <Transition enter-active-class="transition-opacity duration-200 ease-out" enter-from-class="opacity-0" leave-active-class="transition-opacity duration-150 ease-in" leave-to-class="opacity-0">
        <div v-if="editModal" class="fixed inset-0 z-[9997] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" @click="editModal = false"></div>
          <div class="relative bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-lg overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 class="text-lg font-semibold text-gray-900">Modifier l'agent — {{ editForm.matricule }}</h3>
              <button @click="editModal = false" class="text-gray-400 hover:text-gray-600 cursor-pointer"><X class="w-5 h-5" /></button>
            </div>
            <form @submit.prevent="sauvegarderModification" class="p-6 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Nom & Prénom</label>
                  <input v-model="editForm.nom" type="text" required class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Fonction</label>
                  <input v-model="editForm.fonction" type="text" class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Profil système</label>
                  <select v-model="editForm.role" class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                    <option v-for="r in rolesSysteme" :key="r" :value="r">{{ r }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Zone / Secteur</label>
                  <input v-model="editForm.zone" type="text" class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Équipe</label>
                  <input v-model="editForm.equipe" type="text" class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1.5">Véhicule</label>
                  <input v-model="editForm.vehicule" type="text" class="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
              </div>
              <div class="flex gap-3 pt-4 border-t border-gray-100">
                <BaseButton variant="outline" type="button" class="flex-1" @click="editModal = false">Annuler</BaseButton>
                <BaseButton variant="primary" type="submit" class="flex-1"><Save class="w-4 h-4 mr-1.5" />Enregistrer</BaseButton>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
