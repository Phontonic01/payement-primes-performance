<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { LogIn, ArrowLeft, AlertCircle } from 'lucide-vue-next'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const password = ref('')
const selectedService = ref('COLLECTE')

// Mapping service → username du compte backend
const serviceAccounts = {
  DAF: 'daf',
  COLLECTE: 'collecte',
  GEO: 'geo',
  LOGISTIQUE: 'logistique',
  QHSE: 'qhse',
  TRI: 'tri',
  LECTURE: 'lecture',
}

const serviceLabels = {
  DAF: 'DAF — Direction Administrative et Financière',
  COLLECTE: 'Service Collecte',
  GEO: 'Service Géolocalisation',
  LOGISTIQUE: 'Service Logistique',
  QHSE: 'Service QHSE',
  TRI: 'Service TRI',
  LECTURE: 'Consultation',
}

const serviceRedirects = {
  DAF: '/daf/budget',
  COLLECTE: '/collecte/tonnage',
  GEO: '/geo/tableau-de-bord',
  LOGISTIQUE: '/logistique/entretien',
  QHSE: '/qhse/checklist',
  TRI: '/tri/saisie',
  LECTURE: '/dashboard',
}

onMounted(() => {
  if (route.query.service && serviceLabels[route.query.service]) {
    selectedService.value = route.query.service
  }
})

const username = computed(() => serviceAccounts[selectedService.value] || 'collecte')

async function handleLogin() {
  const result = await authStore.login(username.value, password.value)
  if (result.success) {
    const redirect = serviceRedirects[selectedService.value] || '/dashboard'
    router.push(redirect)
  }
}
</script>

<template>
  <div>
    <!-- Bouton retour -->
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
        class="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-3"
        :class="{
          'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/10': selectedService === 'COLLECTE',
          'bg-blue-50 text-blue-700 ring-1 ring-blue-500/10': selectedService === 'GEO',
          'bg-amber-50 text-amber-700 ring-1 ring-amber-500/10': selectedService === 'LOGISTIQUE',
          'bg-purple-50 text-purple-700 ring-1 ring-purple-500/10': selectedService === 'QHSE',
          'bg-teal-50 text-teal-700 ring-1 ring-teal-500/10': selectedService === 'TRI',
          'bg-rose-50 text-rose-700 ring-1 ring-rose-500/10': selectedService === 'DAF',
          'bg-gray-50 text-gray-700 ring-1 ring-gray-500/10': selectedService === 'LECTURE',
        }"
      >
        {{ serviceLabels[selectedService] || selectedService }}
      </div>
      <h2 class="text-2xl font-bold text-gray-900 tracking-tight">Connexion</h2>
      <p class="mt-1 text-sm text-gray-500">Identifiez-vous pour accéder à votre espace</p>
    </div>

    <!-- Erreur -->
    <div v-if="authStore.loginError" class="mb-4 rounded-xl bg-red-50 border border-red-200/60 p-3 flex items-center gap-2.5">
      <AlertCircle class="w-4 h-4 text-red-500 flex-shrink-0" />
      <p class="text-sm text-red-700">{{ authStore.loginError }}</p>
    </div>

    <form class="space-y-5" @submit.prevent="handleLogin">
      <!-- Compte (auto-rempli selon le service) -->
      <div>
        <label class="block text-[13px] font-medium text-gray-600 mb-1.5">Compte service</label>
        <input
          :value="username"
          type="text"
          disabled
          class="block w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
        />
      </div>

      <!-- Mot de passe -->
      <div>
        <label for="password" class="block text-[13px] font-medium text-gray-600 mb-1.5">Mot de passe</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          placeholder="••••••••"
          class="block w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-colors"
        />
      </div>

      <button
        type="submit"
        :disabled="authStore.loginLoading || !password"
        class="w-full flex items-center justify-center gap-2 py-3 px-4 text-white font-semibold rounded-xl text-sm shadow-sm cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
        :class="{
          'bg-emerald-600 hover:bg-emerald-700': selectedService === 'COLLECTE',
          'bg-blue-600 hover:bg-blue-700': selectedService === 'GEO',
          'bg-amber-600 hover:bg-amber-700': selectedService === 'LOGISTIQUE',
          'bg-purple-600 hover:bg-purple-700': selectedService === 'QHSE',
          'bg-teal-600 hover:bg-teal-700': selectedService === 'TRI',
          'bg-rose-600 hover:bg-rose-700': selectedService === 'DAF',
          'bg-gray-600 hover:bg-gray-700': selectedService === 'LECTURE',
        }"
      >
        <svg v-if="authStore.loginLoading" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
          <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" class="opacity-75" />
        </svg>
        <LogIn v-else class="w-4 h-4" />
        <span>{{ authStore.loginLoading ? 'Connexion...' : 'Se connecter' }}</span>
      </button>
    </form>
  </div>
</template>
