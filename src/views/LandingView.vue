<script setup>
import { useRouter } from 'vue-router'
import { Truck, MapPin, Wrench, ShieldCheck, Landmark, Eye } from 'lucide-vue-next'

const router = useRouter()

const services = [
  {
    id: 'COLLECTE',
    nom: 'Service Collecte',
    description: 'Saisie tonnage, déclaration de bouclage circuit, suivi des performances chauffeurs et équipiers.',
    icon: Truck,
    couleur: 'emerald',
    stats: '5 agents actifs',
  },
  {
    id: 'GEO',
    nom: 'Service Géolocalisation',
    description: 'Validation des traces GPS, vérification des bouclages terrain, analyse des parcours.',
    icon: MapPin,
    couleur: 'blue',
    stats: 'Validation GPS',
  },
  {
    id: 'LOGISTIQUE',
    nom: 'Service Logistique',
    description: 'Fiches d\'entretien véhicules, suivi du matériel roulant, état mécanique de la flotte.',
    icon: Wrench,
    couleur: 'amber',
    stats: '115+ véhicules',
  },
  {
    id: 'QHSE',
    nom: 'Service QHSE / TRI',
    description: 'Checklists terrain, contrôles d\'alcoolémie, conformité EPI, collecte sélective.',
    icon: ShieldCheck,
    couleur: 'purple',
    stats: 'Sécurité & Qualité',
  },
  {
    id: 'DAF',
    nom: 'Direction Administrative et Financière',
    description: 'Vue budgétaire globale, consolidation, validation des primes, rapports et exports.',
    icon: Landmark,
    couleur: 'rose',
    stats: 'Vue globale',
  },
  {
    id: 'LECTURE',
    nom: 'Consultation',
    description: 'Accès en lecture seule au tableau de bord et aux données de performance.',
    icon: Eye,
    couleur: 'gray',
    stats: 'Lecture seule',
  },
]

function accederService(serviceId) {
  router.push({ name: 'login', query: { service: serviceId } })
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 relative overflow-hidden">
    <!-- Decorative elements -->
    <div class="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl"></div>
    <div class="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-teal-400/10 rounded-full blur-3xl"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-600/5 rounded-full blur-3xl"></div>

    <div class="relative z-10 max-w-6xl mx-auto px-6 py-12">
      <!-- Header -->
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden bg-white shadow-lg shadow-black/20">
            <img src="/logo-clean-africa.jpg" alt="Clean Africa" class="w-full h-full object-contain" />
          </div>
          <div class="text-left">
            <h1 class="text-white font-bold text-3xl tracking-wide">CLEAN AFRICA</h1>
            <p class="text-emerald-300/60 text-xs font-medium tracking-widest uppercase">Société d'État — Gabon</p>
          </div>
        </div>
        <h2 class="text-2xl md:text-3xl font-bold text-white mb-3">
          Gestion des Primes <span class="text-emerald-400">de Performance</span>
        </h2>
        <p class="text-emerald-200/60 text-base max-w-xl mx-auto">
          Sélectionnez votre service pour accéder à votre espace de travail
        </p>
      </div>

      <!-- Services Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <button
          v-for="service in services"
          :key="service.id"
          @click="accederService(service.id)"
          :aria-label="'Accéder au ' + service.nom"
          class="group relative bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-left transition-all duration-300 ease-out cursor-pointer
                 hover:bg-white/[0.15] hover:border-white/25 hover:shadow-2xl hover:shadow-emerald-500/10 hover:scale-[1.03] hover:-translate-y-1
                 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:ring-offset-2 focus:ring-offset-emerald-900"
        >
          <!-- Glow effect on hover -->
          <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            :class="{
              'bg-gradient-to-br from-emerald-400/10 to-transparent': service.couleur === 'emerald',
              'bg-gradient-to-br from-blue-400/10 to-transparent': service.couleur === 'blue',
              'bg-gradient-to-br from-amber-400/10 to-transparent': service.couleur === 'amber',
              'bg-gradient-to-br from-purple-400/10 to-transparent': service.couleur === 'purple',
              'bg-gradient-to-br from-rose-400/10 to-transparent': service.couleur === 'rose',
              'bg-gradient-to-br from-gray-400/10 to-transparent': service.couleur === 'gray',
            }"
          ></div>

          <div class="relative z-10">
            <!-- Icon -->
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
              :class="{
                'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30 group-hover:shadow-emerald-500/20': service.couleur === 'emerald',
                'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 group-hover:shadow-blue-500/20': service.couleur === 'blue',
                'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30 group-hover:shadow-amber-500/20': service.couleur === 'amber',
                'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30 group-hover:shadow-purple-500/20': service.couleur === 'purple',
                'bg-rose-500/20 text-rose-400 group-hover:bg-rose-500/30 group-hover:shadow-rose-500/20': service.couleur === 'rose',
                'bg-gray-500/20 text-gray-400 group-hover:bg-gray-500/30 group-hover:shadow-gray-500/20': service.couleur === 'gray',
              }"
            >
              <component :is="service.icon" class="w-6 h-6" />
            </div>

            <!-- Content -->
            <h3 class="text-white font-semibold text-base mb-2 group-hover:text-emerald-100 transition-colors">
              {{ service.nom }}
            </h3>
            <p class="text-emerald-200/50 text-sm leading-relaxed mb-4 group-hover:text-emerald-200/70 transition-colors">
              {{ service.description }}
            </p>

            <!-- Footer -->
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-emerald-300/40 uppercase tracking-wider group-hover:text-emerald-300/60 transition-colors">
                {{ service.stats }}
              </span>
              <span class="inline-flex items-center gap-1 text-xs font-medium text-emerald-400/60 group-hover:text-emerald-400 transition-all duration-300 group-hover:translate-x-1">
                Accéder
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </button>
      </div>

      <!-- Footer stats -->
      <div class="mt-12 flex justify-center gap-8">
        <div class="text-center">
          <div class="text-2xl font-bold text-white">115+</div>
          <div class="text-emerald-300/40 text-xs uppercase tracking-wider mt-1">Véhicules</div>
        </div>
        <div class="w-px bg-emerald-500/20 self-stretch"></div>
        <div class="text-center">
          <div class="text-2xl font-bold text-white">5</div>
          <div class="text-emerald-300/40 text-xs uppercase tracking-wider mt-1">Services</div>
        </div>
        <div class="w-px bg-emerald-500/20 self-stretch"></div>
        <div class="text-center">
          <div class="text-2xl font-bold text-white">200+</div>
          <div class="text-emerald-300/40 text-xs uppercase tracking-wider mt-1">Agents</div>
        </div>
      </div>

      <p class="text-center text-emerald-300/30 text-xs mt-8">Libreville, Gabon &mdash; Société d'État « CLEAN AFRICA »</p>
    </div>
  </div>
</template>
