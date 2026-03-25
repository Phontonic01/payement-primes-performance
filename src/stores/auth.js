import { defineStore } from 'pinia'
import { ref } from 'vue'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)
  const isAuthenticated = ref(!!localStorage.getItem('token'))

  function login(username, role) {
    const mockUser = {
      id: 1,
      name: username,
      role: role
    }

    user.value = mockUser
    isAuthenticated.value = true

    localStorage.setItem('user', JSON.stringify(mockUser))
    localStorage.setItem('token', 'mock-jwt-token-123')
    // La redirection est gérée par le composant appelant (LoginView)
  }

  function logout() {
    user.value = null
    isAuthenticated.value = false

    localStorage.removeItem('user')
    localStorage.removeItem('token')

    router.push('/')
  }

  function hasRole(allowedRoles) {
    if (!user.value) return false
    if (user.value.role === 'DAF') return true // DAF a accès à tout (vue globale, lecture seule)
    return allowedRoles.includes(user.value.role)
  }

  // DAF = lecture seule sur les modules des autres services
  function isReadOnly() {
    if (!user.value) return true
    return user.value.role === 'DAF'
  }

  return { user, isAuthenticated, login, logout, hasRole, isReadOnly }
})
