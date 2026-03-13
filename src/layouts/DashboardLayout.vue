<script setup>
import {
  Truck, MapPin, Wrench, ShieldCheck, Settings, LogOut,
  LayoutDashboard, ClipboardList, Route, History,
  CheckCircle, Wine, Recycle, Users, SlidersHorizontal,
  FileCheck, FileSpreadsheet, ChevronDown, Menu, X, Leaf
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { ref, computed } from 'vue'

const authStore = useAuthStore()
const sidebarOpen = ref(true)
const expandedGroup = ref(null)

function toggleGroup(group) {
  expandedGroup.value = expandedGroup.value === group ? null : group
}

const navGroups = computed(() => [
  {
    id: 'main',
    items: [
      { name: 'Tableau de bord', to: '/', icon: LayoutDashboard, show: true },
    ]
  },
  {
    id: 'collecte',
    label: 'Collecte',
    icon: Truck,
    show: authStore.hasRole(['COLLECTE']),
    items: [
      { name: 'Saisie Tonnage', to: '/collecte/tonnage', icon: ClipboardList },
      { name: 'Bouclage Circuit', to: '/collecte/bouclage', icon: Route },
      { name: 'Historique', to: '/collecte/historique', icon: History },
    ]
  },
  {
    id: 'geo',
    label: 'Géolocalisation',
    icon: MapPin,
    show: authStore.hasRole(['GEO']),
    items: [
      { name: 'Validations GPS', to: '/geo/validation', icon: CheckCircle },
      { name: 'Historique', to: '/geo/historique', icon: History },
    ]
  },
  {
    id: 'logistique',
    label: 'Logistique',
    icon: Wrench,
    show: authStore.hasRole(['LOGISTIQUE']),
    items: [
      { name: 'Entretien Véhicule', to: '/logistique/entretien', icon: ClipboardList },
      { name: 'Suivi Matériel', to: '/logistique/materiel', icon: Wrench },
      { name: 'Historique', to: '/logistique/historique', icon: History },
    ]
  },
  {
    id: 'qhse',
    label: 'QHSE / TRI',
    icon: ShieldCheck,
    show: authStore.hasRole(['QHSE']),
    items: [
      { name: 'Check-list Terrain', to: '/qhse/checklist', icon: ClipboardList },
      { name: 'Test Alcoolémie', to: '/qhse/alcoolemie', icon: Wine },
      { name: 'Tonnage TRI', to: '/qhse/tri', icon: Recycle },
      { name: 'Historique', to: '/qhse/historique', icon: History },
    ]
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: Settings,
    show: authStore.hasRole(['ADMIN']),
    items: [
      { name: 'Utilisateurs', to: '/admin/utilisateurs', icon: Users },
      { name: 'Paramètres', to: '/admin/parametres', icon: SlidersHorizontal },
      { name: 'Consolidation', to: '/admin/consolidation', icon: FileCheck },
      { name: 'Validation Primes', to: '/admin/validation', icon: CheckCircle },
      { name: 'Rapports & Export', to: '/admin/rapports', icon: FileSpreadsheet },
    ]
  }
].filter(g => g.items?.some(i => i.show !== false) && (g.show === undefined || g.show)))

const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
</script>

<template>
  <div class="flex h-screen bg-background antialiased">
    <!-- Sidebar -->
    <aside
      :class="[sidebarOpen ? 'w-64' : 'w-16', 'bg-sidebar flex flex-col shadow-xl']"
      class="transition-all duration-300 ease-in-out"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center px-4 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-emerald-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Leaf class="w-5 h-5 text-emerald-400" />
          </div>
          <div v-if="sidebarOpen" class="overflow-hidden">
            <h1 class="text-white font-bold text-sm tracking-wide leading-tight">CLEAN AFRICA</h1>
            <p class="text-emerald-300/70 text-[10px] font-medium tracking-widest uppercase">Primes Performance</p>
          </div>
        </div>
      </div>

      <!-- User info -->
      <div v-if="sidebarOpen" class="px-4 py-3 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-300 text-xs font-bold flex-shrink-0">
            {{ authStore.user?.name?.charAt(0)?.toUpperCase() || '?' }}
          </div>
          <div class="min-w-0">
            <p class="text-white text-sm font-medium truncate">{{ authStore.user?.name || 'Non connecté' }}</p>
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 uppercase tracking-wider">
              {{ authStore.user?.role }}
            </span>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        <template v-for="group in navGroups" :key="group.id">
          <!-- Single items (dashboard) -->
          <template v-if="group.id === 'main'">
            <router-link
              v-for="item in group.items"
              :key="item.name"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer"
              :class="[$route.path === item.to
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'text-gray-300 hover:bg-white/5 hover:text-white']"
            >
              <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
              <span v-if="sidebarOpen">{{ item.name }}</span>
            </router-link>
          </template>

          <!-- Grouped items -->
          <template v-else>
            <div v-if="sidebarOpen" class="pt-2">
              <button
                @click="toggleGroup(group.id)"
                class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer"
                :class="[expandedGroup === group.id || $route.path.startsWith('/' + group.id)
                  ? 'text-emerald-300 bg-white/5'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5']"
              >
                <div class="flex items-center gap-2.5">
                  <component :is="group.icon" class="w-4 h-4" />
                  <span>{{ group.label }}</span>
                </div>
                <ChevronDown
                  class="w-3.5 h-3.5 transition-transform duration-200"
                  :class="{ 'rotate-180': expandedGroup === group.id }"
                />
              </button>
              <div
                v-show="expandedGroup === group.id || $route.path.startsWith('/' + group.id)"
                class="mt-1 ml-3 pl-3 border-l border-white/10 space-y-0.5"
              >
                <router-link
                  v-for="item in group.items"
                  :key="item.name"
                  :to="item.to"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer"
                  :class="[$route.path === item.to
                    ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white']"
                >
                  <component :is="item.icon" class="w-4 h-4 flex-shrink-0" />
                  <span>{{ item.name }}</span>
                </router-link>
              </div>
            </div>
          </template>
        </template>
      </nav>

      <!-- Logout -->
      <div class="p-3 border-t border-white/10">
        <button
          @click="authStore.logout()"
          class="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 cursor-pointer"
        >
          <LogOut class="w-5 h-5 flex-shrink-0" />
          <span v-if="sidebarOpen">Déconnexion</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Topbar -->
      <header class="h-14 bg-white border-b border-border flex items-center justify-between px-6 shadow-sm z-10">
        <div class="flex items-center gap-4">
          <button @click="sidebarOpen = !sidebarOpen" class="text-gray-500 hover:text-gray-700 cursor-pointer">
            <Menu v-if="!sidebarOpen" class="w-5 h-5" />
            <X v-else class="w-5 h-5" />
          </button>
          <div>
            <h2 class="text-base font-semibold text-gray-900">{{ $route.meta.title || $route.name }}</h2>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-500 font-medium capitalize">{{ currentMonth }}</span>
          <div class="h-6 w-px bg-gray-200"></div>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span class="text-xs text-gray-500">En ligne</span>
          </div>
        </div>
      </header>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 bg-background">
        <div class="max-w-7xl mx-auto">
          <slot></slot>
        </div>
      </div>
    </main>
  </div>
</template>
