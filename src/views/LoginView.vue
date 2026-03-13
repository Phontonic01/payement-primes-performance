<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { LogIn, ChevronDown } from 'lucide-vue-next'

const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const role = ref('COLLECTE')
const loading = ref(false)

const roles = [
  { value: 'ADMIN', label: 'Administrateur', desc: 'Accès complet' },
  { value: 'COLLECTE', label: 'Service Collecte', desc: 'Tonnage & bouclage' },
  { value: 'GEO', label: 'Service Géolocalisation', desc: 'Validation GPS' },
  { value: 'LOGISTIQUE', label: 'Service Logistique', desc: 'Entretien véhicules' },
  { value: 'QHSE', label: 'Service QHSE', desc: 'Sécurité & TRI' },
  { value: 'LECTURE', label: 'Consultation', desc: 'Lecture seule' }
]

async function handleLogin() {
  if (username.value && role.value) {
    loading.value = true
    await new Promise(r => setTimeout(r, 400))
    authStore.login(username.value, role.value)
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Connexion</h2>
      <p class="mt-1 text-sm text-gray-500">Accédez à votre espace de travail</p>
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

      <div>
        <label for="role" class="block text-sm font-medium text-gray-700 mb-1.5">
          Service
          <span class="text-gray-400 font-normal">(simulation)</span>
        </label>
        <div class="relative">
          <select
            id="role"
            v-model="role"
            class="block w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm appearance-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none pr-10 cursor-pointer"
          >
            <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }} — {{ r.desc }}</option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <button
        type="submit"
        :disabled="loading || !username"
        class="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/25 hover:shadow-emerald-700/30 cursor-pointer transition-all duration-200"
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
