<script setup>
import {
  Truck, MapPin, Wrench, ShieldCheck, LogOut, Landmark, Factory,
  LayoutDashboard, ClipboardList, Route, History,
  CheckCircle, Wine, Recycle, Users, SlidersHorizontal,
  FileCheck, FileSpreadsheet, ChevronDown, Menu, X, AlertTriangle,
  Search, ChevronRight, Sun, Moon, Bell
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useAgentsStore } from '@/stores/agents'
import { usePontBasculeStore } from '@/stores/pontBascule'
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const agentsStore = useAgentsStore()
const pontBasculeStore = usePontBasculeStore()
agentsStore.ensureLoaded()
pontBasculeStore.chargerBilan()
const route = useRoute()
const sidebarOpen = ref(true)
const sidebarMobileOpen = ref(false)
const expandedGroup = ref(null)

watch(() => route.path, () => {
  sidebarMobileOpen.value = false
})

function toggleGroup(group) {
  expandedGroup.value = expandedGroup.value === group ? null : group
}

const sectionRoots = {
  'Collecte': '/collecte/tonnage',
  'Géolocalisation': '/geo/tableau-de-bord',
  'Logistique': '/logistique/entretien',
  'QHSE': '/qhse/checklist',
  'TRI': '/tri/saisie',
  'DÉCHARGE': '/decharge/tableau-de-bord',
  'DAF': '/daf/budget',
}

const breadcrumbs = computed(() => {
  const crumbs = route.meta.breadcrumb || [route.meta.title || route.name]
  return crumbs.map((label, index) => ({
    label,
    isLast: index === crumbs.length - 1,
    to: index === 0 && crumbs.length > 1 ? sectionRoots[label] || null : null,
  }))
})

const isDaf = computed(() => authStore.user?.role === 'DAF')

const navGroups = computed(() => [
  {
    id: 'main',
    items: [
      { name: 'Tableau de bord', to: '/dashboard', icon: LayoutDashboard, show: true },
      { name: 'Recherche Agent', to: '/recherche', icon: Search, show: true },
    ]
  },
  {
    id: 'collecte',
    label: 'Collecte',
    icon: Truck,
    show: authStore.hasRole(['COLLECTE']),
    items: isDaf.value
      ? [{ name: 'Historique Saisies', to: '/collecte/historique', icon: History }]
      : [
          { name: 'Saisie Tonnage', to: '/collecte/tonnage', icon: ClipboardList },
          { name: 'Historique', to: '/collecte/historique', icon: History },
        ]
  },
  {
    id: 'geo',
    label: 'Géolocalisation',
    icon: MapPin,
    show: authStore.hasRole(['GEO']),
    items: isDaf.value
      ? [
          { name: 'Tableau de Bord GEO', to: '/geo/tableau-de-bord', icon: MapPin },
          { name: 'Historique GPS', to: '/geo/historique', icon: History },
        ]
      : [
          { name: 'Tableau de Bord GEO', to: '/geo/tableau-de-bord', icon: MapPin },
          { name: 'Déclaration Bouclage', to: '/geo/bouclage', icon: Route },
          { name: 'File de Validation', to: '/geo/validation', icon: CheckCircle },
          { name: 'Historique', to: '/geo/historique', icon: History },
        ]
  },
  {
    id: 'logistique',
    label: 'Logistique',
    icon: Wrench,
    show: authStore.hasRole(['LOGISTIQUE']),
    items: isDaf.value
      ? [
          { name: 'Historique Entretiens', to: '/logistique/historique', icon: History },
          { name: 'Suivi Matériel', to: '/logistique/materiel', icon: Wrench },
        ]
      : [
          { name: 'Entretien Véhicule', to: '/logistique/entretien', icon: ClipboardList },
          { name: 'Suivi Matériel', to: '/logistique/materiel', icon: Wrench },
          { name: 'Historique', to: '/logistique/historique', icon: History },
        ]
  },
  {
    id: 'qhse',
    label: 'QHSE',
    icon: ShieldCheck,
    show: authStore.hasRole(['QHSE']),
    items: isDaf.value
      ? [{ name: 'Historique QHSE', to: '/qhse/historique', icon: History }]
      : [
          { name: 'Check-list Terrain', to: '/qhse/checklist', icon: ClipboardList },
          { name: 'Test Alcoolémie', to: '/qhse/alcoolemie', icon: Wine },
          { name: 'Historique', to: '/qhse/historique', icon: History },
        ]
  },
  {
    id: 'tri',
    label: 'TRI',
    icon: Recycle,
    show: authStore.hasRole(['TRI']),
    items: isDaf.value
      ? [{ name: 'Historique TRI', to: '/tri/historique', icon: History }]
      : [
          { name: 'Saisie Pesée', to: '/tri/saisie', icon: ClipboardList },
          { name: 'Historique', to: '/tri/historique', icon: History },
        ]
  },
  {
    id: 'decharge',
    label: 'DÉCHARGE',
    icon: Factory,
    show: authStore.hasRole(['DECHARGE']),
    items: isDaf.value
      ? [{ name: 'Historique Décharge', to: '/decharge/historique', icon: History }]
      : [
          { name: 'Tableau de bord', to: '/decharge/tableau-de-bord', icon: LayoutDashboard },
          { name: 'Réception Camions', to: '/decharge/reception', icon: Truck },
          { name: 'Historique', to: '/decharge/historique', icon: History },
        ]
  },
  {
    id: 'daf',
    label: 'DAF',
    icon: Landmark,
    show: authStore.hasRole(['DAF']),
    items: [
      { name: 'Vue Budgétaire', to: '/daf/budget', icon: Landmark },
      { name: 'Utilisateurs', to: '/daf/utilisateurs', icon: Users },
      { name: 'Paramètres', to: '/daf/parametres', icon: SlidersHorizontal },
      { name: 'Consolidation', to: '/daf/consolidation', icon: FileCheck },
      { name: 'Validation Prime', to: '/daf/validation', icon: CheckCircle },
      { name: 'Rapports & Export', to: '/daf/rapports', icon: FileSpreadsheet },
      { name: 'Anomalies Primes', to: '/daf/anomalies-primes', icon: AlertTriangle },
    ]
  }
].filter(g => g.items?.some(i => i.show !== false) && (g.show === undefined || g.show)))

const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

const roleColors = {
  DAF: 'bg-rose-500/15 text-rose-400',
  COLLECTE: 'bg-emerald-500/15 text-emerald-400',
  GEO: 'bg-blue-500/15 text-blue-400',
  LOGISTIQUE: 'bg-amber-500/15 text-amber-400',
  QHSE: 'bg-purple-500/15 text-purple-400',
  TRI: 'bg-teal-500/15 text-teal-400',
  DECHARGE: 'bg-orange-500/15 text-orange-400',
  LECTURE: 'bg-gray-500/15 text-gray-400',
}
</script>

<template>
  <div class="flex h-screen antialiased">
    <!-- Mobile backdrop -->
    <Transition name="backdrop">
      <div
        v-if="sidebarMobileOpen"
        class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        @click="sidebarMobileOpen = false"
      ></div>
    </Transition>

    <!-- ─── Sidebar ─── -->
    <aside
      :class="[
        sidebarOpen ? 'lg:w-60' : 'lg:w-16',
        sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ]"
      class="fixed inset-y-0 left-0 z-50 w-60 bg-[#0c1222] flex flex-col transition-all duration-300 ease-in-out lg:static lg:z-auto"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center justify-between px-4 border-b border-white/[0.06]">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg overflow-hidden bg-white flex-shrink-0">
            <img src="/logo-clean-africa.jpg" alt="Clean Africa" class="w-full h-full object-contain" />
          </div>
          <div v-if="sidebarOpen || sidebarMobileOpen" class="overflow-hidden">
            <h1 class="text-white font-bold text-[13px] tracking-wide leading-tight">CLEAN AFRICA</h1>
            <p class="text-white/20 text-[9px] font-medium tracking-widest uppercase">Prime Performance</p>
          </div>
        </div>
        <button
          @click="sidebarMobileOpen = false"
          class="lg:hidden text-white/40 hover:text-white cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- User info -->
      <div v-if="sidebarOpen || sidebarMobileOpen" class="px-4 py-3 border-b border-white/[0.06]">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
            {{ authStore.user?.name?.charAt(0)?.toUpperCase() || '?' }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-white/80 text-[13px] font-medium truncate">{{ authStore.user?.name || 'Non connecté' }}</p>
            <span
              class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-0.5"
              :class="roleColors[authStore.user?.role] || 'bg-gray-500/15 text-gray-400'"
            >
              {{ authStore.user?.role }}
            </span>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <template v-for="group in navGroups" :key="group.id">
          <!-- Single items (dashboard, search) -->
          <template v-if="group.id === 'main'">
            <router-link
              v-for="item in group.items"
              :key="item.name"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-150"
              :class="[$route.path === item.to
                ? 'bg-white/[0.08] text-white'
                : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70']"
            >
              <component :is="item.icon" class="w-[18px] h-[18px] flex-shrink-0" />
              <span v-if="sidebarOpen || sidebarMobileOpen">{{ item.name }}</span>
            </router-link>
          </template>

          <!-- Grouped items -->
          <template v-else>
            <div v-if="sidebarOpen || sidebarMobileOpen" class="pt-3 first:pt-0">
              <button
                @click="toggleGroup(group.id)"
                class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider cursor-pointer transition-all duration-150"
                :class="[expandedGroup === group.id || $route.path.startsWith('/' + group.id)
                  ? 'text-white/60 bg-white/[0.04]'
                  : 'text-white/25 hover:text-white/40 hover:bg-white/[0.02]']"
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
                class="mt-1 ml-4 pl-3 border-l border-white/[0.06] space-y-0.5"
              >
                <router-link
                  v-for="item in group.items"
                  :key="item.name"
                  :to="item.to"
                  class="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] cursor-pointer transition-all duration-150"
                  :class="[$route.path === item.to
                    ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                    : 'text-white/30 hover:bg-white/[0.04] hover:text-white/60']"
                >
                  <component :is="item.icon" class="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{{ item.name }}</span>
                </router-link>
              </div>
            </div>
          </template>
        </template>
      </nav>

      <!-- Logout -->
      <div class="p-3 border-t border-white/[0.06]">
        <button
          @click="authStore.logout()"
          class="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-red-400/70 hover:bg-red-500/10 hover:text-red-400 cursor-pointer transition-all duration-150"
        >
          <LogOut class="w-[18px] h-[18px] flex-shrink-0" />
          <span v-if="sidebarOpen || sidebarMobileOpen">Déconnexion</span>
        </button>
      </div>
    </aside>

    <!-- ─── Main Content ─── -->
    <main class="flex-1 flex flex-col overflow-hidden bg-[#f8faf9] dark:bg-[#0f1419]">
      <!-- Topbar -->
      <header class="h-14 bg-white dark:bg-[#1a1f2e] border-b border-gray-200/60 dark:border-[#2d3748] flex items-center justify-between px-4 sm:px-6 z-10">
        <div class="flex items-center gap-3">
          <!-- Mobile hamburger -->
          <button
            @click="sidebarMobileOpen = true"
            class="lg:hidden text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <Menu class="w-5 h-5" />
          </button>
          <!-- Desktop sidebar toggle -->
          <button
            @click="sidebarOpen = !sidebarOpen"
            class="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <Menu v-if="!sidebarOpen" class="w-4 h-4" />
            <X v-else class="w-4 h-4" />
          </button>
          <!-- Breadcrumbs -->
          <nav class="flex items-center text-sm" aria-label="Breadcrumb">
            <template v-for="(crumb, index) in breadcrumbs" :key="index">
              <ChevronRight v-if="index > 0" class="w-3.5 h-3.5 text-gray-300 mx-1 flex-shrink-0" />
              <router-link
                v-if="crumb.to && !crumb.isLast"
                :to="crumb.to"
                class="text-gray-400 hover:text-emerald-600 font-medium transition-colors"
              >
                {{ crumb.label }}
              </router-link>
              <span
                v-else
                :class="crumb.isLast ? 'text-gray-800 font-semibold' : 'text-gray-400 font-medium'"
              >
                {{ crumb.label }}
              </span>
            </template>
          </nav>
        </div>
        <div class="flex items-center gap-2">
          <span class="hidden sm:inline text-xs text-gray-400 font-medium capitalize mr-2">{{ currentMonth }}</span>
          <!-- Dark mode toggle -->
          <button
            @click="themeStore.toggle()"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 cursor-pointer transition-colors"
            :aria-label="themeStore.isDark ? 'Mode clair' : 'Mode sombre'"
          >
            <Moon v-if="!themeStore.isDark" class="w-4 h-4" />
            <Sun v-else class="w-4 h-4" />
          </button>
          <div class="hidden sm:flex items-center gap-2 ml-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span class="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">En ligne</span>
          </div>
        </div>
      </header>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-5 sm:p-6">
        <div class="max-w-7xl mx-auto">
          <slot></slot>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}
</style>
