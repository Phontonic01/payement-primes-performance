<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { LogIn, ArrowLeft } from 'lucide-vue-next'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const role = ref('COLLECTE')
const loading = ref(false)

// Mapping service → label pour affichage
const serviceLabels = {
  DAF: 'DAF — Direction Administrative et Financière',
  COLLECTE: 'Service Collecte',
  GEO: 'Service Géolocalisation',
  LOGISTIQUE: 'Service Logistique',
  QHSE: 'Service QHSE',
  TRI: 'Service TRI',
  LECTURE: 'Consultation',
}

// Mapping service → route de destination après login
const serviceRedirects = {
  DAF: '/daf/budget',
  COLLECTE: '/collecte/tonnage',
  GEO: '/geo/tableau-de-bord',
  LOGISTIQUE: '/logistique/entretien',
  QHSE: '/qhse/checklist',
  TRI: '/tri/saisie',
  LECTURE: '/',
}

// Pré-sélectionner le service depuis le query param
onMounted(() => {
  if (route.query.service && serviceLabels[route.query.service]) {
    role.value = route.query.service
  }
})

async function handleLogin() {
  if (username.value && role.value) {
    loading.value = true
    await new Promise(r => setTimeout(r, 400))
    authStore.login(username.value, role.value)
    loading.value = false
    // Rediriger vers la page du service concerné
    const redirect = serviceRedirects[role.value] || '/'
    router.push(redirect)
  }
}
</script>

<template>
  <div>
    <!-- Bouton retour vers sélection services -->
    <button
      @click="router.push({ name: 'landing' })"
      class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-600 mb-5 transition-colors cursor-pointer"
    >
      <ArrowLeft class="w-4 h-4" />
      Changer de service
    </button>

    <!-- Service badge -->
    <div class="mb-6">
      <div
        class="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider mb-3"
        :class="{
          'bg-emerald-50 text-emerald-700': role === 'COLLECTE',
          'bg-blue-50 text-blue-700': role === 'GEO',
          'bg-amber-50 text-amber-700': role === 'LOGISTIQUE',
          'bg-purple-50 text-purple-700': role === 'QHSE',
          'bg-teal-50 text-teal-700': role === 'TRI',
          'bg-rose-50 text-rose-700': role === 'DAF',
          'bg-gray-50 text-gray-700': role === 'LECTURE',
        }"
      >
        {{ serviceLabels[role] || role }}
      </div>
      <h2 class="text-2xl font-bold text-gray-900">Connexion</h2>
      <p class="mt-1 text-sm text-gray-500">Identifiez-vous pour accéder à votre espace</p>
    </div>

    <form class="space-y-5" @submit.prevent="handleLogin">
      <div>
        <label for="username" class="block text-sm font-medium text-gray-700 mb-1.5">Nom d'utilisateur</label>
        <input
          id="username"
          v-model="username"
          type="text"
          autocomplete="username"
          required
          placeholder="Entrez votre nom"
          class="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          class="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
        />
      </div>

      <button
        type="submit"
        :disabled="loading || !username"
        class="w-full flex items-center justify-center gap-2 py-3 px-4 text-white font-semibold rounded-xl text-sm shadow-lg cursor-pointer transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
        :class="{
          'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 hover:shadow-emerald-700/30': role === 'COLLECTE',
          'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25 hover:shadow-blue-700/30': role === 'GEO',
          'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25 hover:shadow-amber-700/30': role === 'LOGISTIQUE',
          'bg-purple-600 hover:bg-purple-700 shadow-purple-600/25 hover:shadow-purple-700/30': role === 'QHSE',
          'bg-teal-600 hover:bg-teal-700 shadow-teal-600/25 hover:shadow-teal-700/30': role === 'TRI',
          'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25 hover:shadow-rose-700/30': role === 'DAF',
          'bg-gray-600 hover:bg-gray-700 shadow-gray-600/25 hover:shadow-gray-700/30': role === 'LECTURE',
        }"
      >
        <svg v-if="loading" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
          <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" class="opacity-75" />
        </svg>
        <LogIn v-else class="w-4 h-4" />
        <span>{{ loading ? 'Connexion...' : 'Se connecter' }}</span>
      </button>
    </form>
  </div>
</template>
