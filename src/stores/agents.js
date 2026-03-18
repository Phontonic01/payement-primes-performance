import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAgentsStore = defineStore('agents', () => {
  // Source unique des agents — les chefs de service les ajoutent via DAF > Utilisateurs
  const agents = ref([])

  // Compteur auto-incrémenté pour les IDs
  let nextId = 1

  // Présences par jour — Clé: "YYYY-MM-DD", Valeur: tableau de matricules présents
  const presences = ref({})

  function ajouterAgent({ nom, matricule, role, zone, fonction, equipe, vehicule }) {
    // Vérifier doublon matricule
    if (agents.value.some(a => a.matricule === matricule)) {
      return { success: false, message: `Le matricule ${matricule} existe déjà.` }
    }
    agents.value.push({
      id: nextId++,
      nom,
      matricule,
      role,
      zone,
      fonction: fonction || role,
      equipe: equipe || '',
      vehicule: vehicule || '',
      statut: 'ACTIF',
    })
    return { success: true }
  }

  function supprimerAgent(matricule) {
    agents.value = agents.value.filter(a => a.matricule !== matricule)
  }

  function modifierAgent(matricule, updates) {
    const agent = agents.value.find(a => a.matricule === matricule)
    if (agent) Object.assign(agent, updates)
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
      a.matricule.includes(q) || a.nom.toLowerCase().includes(q)
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
    if (!presences.value[date]) {
      presences.value[date] = []
    }
    if (!presences.value[date].includes(matricule)) {
      presences.value[date].push(matricule)
    }
  }

  return {
    agents,
    presences,
    ajouterAgent,
    supprimerAgent,
    modifierAgent,
    getAgentByMatricule,
    getAgentById,
    searchAgents,
    getPresents,
    isPresent,
    enregistrerPresence,
  }
})
