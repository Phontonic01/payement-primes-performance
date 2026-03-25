import { defineStore } from 'pinia'
import { ref } from 'vue'
import router from '@/router'
import api from '@/api/client'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)
  const isAuthenticated = ref(!!localStorage.getItem('token'))
  const loginError = ref('')
  const loginLoading = ref(false)

  async function login(username, password) {
    loginError.value = ''
    loginLoading.value = true

    try {
      const data = await api.login(username, password)

      user.value = data.user
      isAuthenticated.value = true

      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('token', data.token)

      return { success: true }
    } catch (err) {
      loginError.value = err.message || 'Identifiants incorrects'
      return { success: false, error: loginError.value }
    } finally {
      loginLoading.value = false
    }
  }

  function logout() {
    user.value = null
    isAuthenticated.value = false
    loginError.value = ''

    localStorage.removeItem('user')
    localStorage.removeItem('token')

    router.push('/')
  }

  function hasRole(allowedRoles) {
    if (!user.value) return false
    if (user.value.role === 'DAF') return true
    return allowedRoles.includes(user.value.role)
  }

  function isReadOnly() {
    if (!user.value) return true
    return user.value.role === 'DAF'
  }

  return { user, isAuthenticated, loginError, loginLoading, login, logout, hasRole, isReadOnly }
})
