<script setup>
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import {
  Truck, MapPin, Wrench, ShieldCheck, Recycle, Landmark, Eye,
  ArrowRight, BarChart3, Shield, Zap, Clock, ChevronRight
} from 'lucide-vue-next'

const router = useRouter()

const services = [
  {
    id: 'COLLECTE',
    nom: 'Collecte',
    description: 'Saisie tonnage, bouclage circuit, suivi des performances chauffeurs et équipiers.',
    icon: Truck,
    couleur: 'emerald',
  },
  {
    id: 'GEO',
    nom: 'Géolocalisation',
    description: 'Validation GPS, vérification des bouclages terrain, analyse des parcours.',
    icon: MapPin,
    couleur: 'blue',
  },
  {
    id: 'LOGISTIQUE',
    nom: 'Logistique',
    description: 'Fiches d\'entretien, suivi matériel roulant, état mécanique de la flotte.',
    icon: Wrench,
    couleur: 'amber',
  },
  {
    id: 'QHSE',
    nom: 'QHSE',
    description: 'Checklists terrain, contrôles alcoolémie, conformité EPI.',
    icon: ShieldCheck,
    couleur: 'purple',
  },
  {
    id: 'TRI',
    nom: 'TRI',
    description: 'Collecte sélective, pesée des matériaux recyclables.',
    icon: Recycle,
    couleur: 'teal',
  },
  {
    id: 'DAF',
    nom: 'DAF',
    description: 'Budget, consolidation, validation de la prime, rapports et exports.',
    icon: Landmark,
    couleur: 'rose',
  },
]

const features = [
  { icon: BarChart3, title: 'Calcul automatique', desc: 'Score pondéré sur 4 axes, seuils configurables, prime calculée en temps réel.' },
  { icon: Shield, title: 'Traçabilité complète', desc: 'Chaque saisie, correction et validation est horodatée et tracée.' },
  { icon: Zap, title: 'Temps réel', desc: 'Les données circulent entre services instantanément, sans ressaisie.' },
  { icon: Clock, title: 'Cycle mensuel', desc: 'Du terrain à la DAF : saisie, validation, consolidation, paiement.' },
]

function accederService(serviceId) {
  router.push({ name: 'login', query: { service: serviceId } })
}

function accederConsultation() {
  router.push({ name: 'login', query: { service: 'LECTURE' } })
}

const colorMap = {
  emerald: {
    bg: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
    icon: 'text-emerald-400',
    border: 'border-emerald-500/20 group-hover:border-emerald-500/40',
  },
  blue: {
    bg: 'bg-blue-500/10 group-hover:bg-blue-500/20',
    icon: 'text-blue-400',
    border: 'border-blue-500/20 group-hover:border-blue-500/40',
  },
  amber: {
    bg: 'bg-amber-500/10 group-hover:bg-amber-500/20',
    icon: 'text-amber-400',
    border: 'border-amber-500/20 group-hover:border-amber-500/40',
  },
  purple: {
    bg: 'bg-purple-500/10 group-hover:bg-purple-500/20',
    icon: 'text-purple-400',
    border: 'border-purple-500/20 group-hover:border-purple-500/40',
  },
  teal: {
    bg: 'bg-teal-500/10 group-hover:bg-teal-500/20',
    icon: 'text-teal-400',
    border: 'border-teal-500/20 group-hover:border-teal-500/40',
  },
  rose: {
    bg: 'bg-rose-500/10 group-hover:bg-rose-500/20',
    icon: 'text-rose-400',
    border: 'border-rose-500/20 group-hover:border-rose-500/40',
  },
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0f1a] text-white">

    <!-- ─── Navbar ─── -->
    <nav class="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0f1a]/80 backdrop-blur-xl">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg overflow-hidden bg-white flex-shrink-0">
            <img src="/logo-clean-africa.jpg" alt="Clean Africa" class="w-full h-full object-contain" />
          </div>
          <div>
            <span class="font-bold text-sm tracking-wide">CLEAN AFRICA</span>
            <span class="hidden sm:inline text-[10px] text-white/30 ml-2 font-medium tracking-widest uppercase">Prime de Performance</span>
          </div>
        </div>
        <button
          @click="accederConsultation"
          class="text-sm text-white/50 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Eye class="w-4 h-4" />
          <span class="hidden sm:inline">Consultation</span>
        </button>
      </div>
    </nav>

    <!-- ─── Hero ─── -->
    <section class="relative overflow-hidden">
      <!-- Gradient orbs -->
      <div class="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-600/[0.07] rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-500/[0.05] rounded-full blur-[100px] pointer-events-none"></div>

      <div class="relative max-w-6xl mx-auto px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
        <!-- Badge -->
        <div class="flex justify-center mb-8">
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
            Système opérationnel — Libreville, Gabon
          </div>
        </div>

        <!-- Title -->
        <h1 class="text-center text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight">
          <span class="text-white">Gestion de la Prime</span><br/>
          <span class="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300 bg-clip-text text-transparent">de Performance</span>
        </h1>
        <p class="text-center text-white/40 text-lg sm:text-xl max-w-2xl mx-auto mt-6 leading-relaxed">
          Évaluez, suivez et récompensez la performance de vos équipes de collecte avec transparence et précision.
        </p>

        <!-- Stats row -->
        <div class="flex justify-center mt-10">
          <div class="inline-flex items-center gap-8 sm:gap-12 px-8 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div class="text-center">
              <div class="text-2xl sm:text-3xl font-bold text-white">200+</div>
              <div class="text-[11px] text-white/30 font-medium uppercase tracking-wider mt-0.5">Agents</div>
            </div>
            <div class="w-px h-10 bg-white/[0.08]"></div>
            <div class="text-center">
              <div class="text-2xl sm:text-3xl font-bold text-white">115+</div>
              <div class="text-[11px] text-white/30 font-medium uppercase tracking-wider mt-0.5">Véhicules</div>
            </div>
            <div class="w-px h-10 bg-white/[0.08]"></div>
            <div class="text-center">
              <div class="text-2xl sm:text-3xl font-bold text-white">6</div>
              <div class="text-[11px] text-white/30 font-medium uppercase tracking-wider mt-0.5">Services</div>
            </div>
            <div class="w-px h-10 bg-white/[0.08]"></div>
            <div class="text-center">
              <div class="text-2xl sm:text-3xl font-bold text-emerald-400">4</div>
              <div class="text-[11px] text-white/30 font-medium uppercase tracking-wider mt-0.5">Axes d'éval.</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Services Grid ─── -->
    <section class="max-w-6xl mx-auto px-6 pb-20">
      <div class="text-center mb-10">
        <h2 class="text-sm font-semibold text-white/30 uppercase tracking-widest mb-2">Accès par service</h2>
        <p class="text-white/50 text-sm">Sélectionnez votre espace de travail pour commencer</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          v-for="service in services"
          :key="service.id"
          @click="accederService(service.id)"
          class="group relative text-left rounded-xl p-5 border transition-all duration-300 cursor-pointer
                 bg-white/[0.02] hover:bg-white/[0.05]
                 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-2 focus:ring-offset-[#0a0f1a]"
          :class="colorMap[service.couleur].border"
        >
          <div class="flex items-start gap-4">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-300"
              :class="[colorMap[service.couleur].bg, colorMap[service.couleur].icon]"
            >
              <component :is="service.icon" class="w-5 h-5" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h3 class="text-white font-semibold text-sm group-hover:text-emerald-100 transition-colors">
                  {{ service.nom }}
                </h3>
                <ChevronRight class="w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all duration-300 flex-shrink-0" />
              </div>
              <p class="text-white/35 text-xs leading-relaxed mt-1.5 group-hover:text-white/50 transition-colors">
                {{ service.description }}
              </p>
            </div>
          </div>
        </button>
      </div>
    </section>

    <!-- ─── Features ─── -->
    <section class="border-t border-white/[0.06]">
      <div class="max-w-6xl mx-auto px-6 py-16">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="feat in features" :key="feat.title" class="text-center sm:text-left">
            <div class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/[0.08] text-emerald-400 mb-3">
              <component :is="feat.icon" class="w-5 h-5" />
            </div>
            <h3 class="text-white font-semibold text-sm mb-1">{{ feat.title }}</h3>
            <p class="text-white/30 text-xs leading-relaxed">{{ feat.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Footer ─── -->
    <footer class="border-t border-white/[0.04] bg-[#080c15]">
      <div class="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-7 h-7 rounded-md overflow-hidden bg-white flex-shrink-0">
            <img src="/logo-clean-africa.jpg" alt="Clean Africa" class="w-full h-full object-contain" />
          </div>
          <div>
            <span class="text-white/40 text-xs font-medium">CLEAN AFRICA</span>
            <span class="text-white/20 text-xs mx-1.5">·</span>
            <span class="text-white/20 text-xs">Société d'État — Libreville, Gabon</span>
          </div>
        </div>
        <div class="flex items-center gap-4 text-white/20 text-xs">
          <span>Score = T(50%) + B(25%) + E(15%) + Q(10%)</span>
          <span class="hidden sm:inline">·</span>
          <span class="hidden sm:inline">Seuil 60% · Plafond 50K XAF</span>
        </div>
      </div>
    </footer>

  </div>
</template>
