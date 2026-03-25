import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/client'

export const useAgentsStore = defineStore('agents', () => {
  const agents = ref([])
  const loading = ref(false)
  const loaded = ref(false)

  // ── Charger les agents depuis l'API ──
  async function fetchAgents(params = {}) {
    loading.value = true
    try {
      agents.value = await api.getAgents(params)
      loaded.value = true
    } catch (e) {
      console.error('Erreur chargement agents:', e.message)
    } finally {
      loading.value = false
    }
  }

  // ── Charger si pas encore fait ──
  async function ensureLoaded() {
    if (!loaded.value && !loading.value) await fetchAgents()
  }

  // ── Présences (restera local pour l'instant) ──
  const presences = ref({})

  async function ajouterAgent(data) {
    try {
      await api.createAgent(data)
      await fetchAgents() // Refresh
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  }

  async function supprimerAgent(matricule) {
    try {
      await api.deleteAgent(matricule)
      await fetchAgents()
    } catch (e) {
      console.error('Erreur suppression:', e.message)
    }
  }

  async function modifierAgent(matricule, updates) {
    try {
      await api.updateAgent(matricule, updates)
      await fetchAgents()
    } catch (e) {
      console.error('Erreur modification:', e.message)
    }
  }

  function getAgentByMatricule(matricule) {
    return agents.value.find(a => a.matricule === matricule) || null
  }

  function getAgentById(id) {
    return agents.value.find(a => a.id === id) || null
  }

  function searchAgents(query) {
    if (!query) return agents.value
    const q = query.toLowerCase().trim()
    return agents.value.filter(a =>
      a.matricule.includes(q) ||
      a.nom.toLowerCase().includes(q)
    )
  }

  function getPresents(date) {
    const matricules = presences.value[date] || []
    return agents.value.filter(a => matricules.includes(a.matricule))
  }

  function isPresent(matricule, date) {
    return (presences.value[date] || []).includes(matricule)
  }

  function enregistrerPresence(matricule, date) {
    if (!presences.value[date]) presences.value[date] = []
    if (!presences.value[date].includes(matricule)) {
      presences.value[date].push(matricule)
    }
  }

  // Compat: seedIfEmpty charge depuis l'API au lieu du JSON local
  async function seedIfEmpty() {
    await ensureLoaded()
  }

  return {
    agents,
    loading,
    loaded,
    presences,
    fetchAgents,
    ensureLoaded,
    ajouterAgent,
    supprimerAgent,
    modifierAgent,
    getAgentByMatricule,
    getAgentById,
    searchAgents,
    getPresents,
    isPresent,
    enregistrerPresence,
    seedIfEmpty,
  }
})
