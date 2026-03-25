import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import AGENTS_OFFICIEL from '@/data/agents-officiel.json'

// Base de données officielle — Source: Service RH, Mars 2026
// 438 agents Collecte (DT) + 36 agents TRI (DQHSE)
const AGENTS_DEMO = AGENTS_OFFICIEL

export const useAgentsStore = defineStore('agents', () => {
  // Source unique des agents — les chefs de service les ajoutent via DAF > Utilisateurs
  const agents = ref([])

  // Compteur auto-incrémenté pour les IDs
  let nextId = 1

  // Charger les agents de démonstration si le store est vide
  function seedIfEmpty() {
    if (agents.value.length === 0) {
      AGENTS_DEMO.forEach(a => {
        agents.value.push({ id: nextId++, ...a, statut: 'ACTIF' })
      })
    } else {
      // Recalculer nextId depuis les agents existants
      nextId = Math.max(...agents.value.map(a => a.id || 0)) + 1
    }
  }

  // Présences par jour — Clé: "YYYY-MM-DD", Valeur: tableau de matricules présents
  const presences = ref({})

  function ajouterAgent({ nom, matricule, role, zone, fonction, equipe, vehicule, service }) {
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
      service: service || 'COLLECTE',
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
      a.matricule.includes(q) ||
      a.nom.toLowerCase().includes(q) ||
      a.nom.toLowerCase().startsWith(q)
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

  // seedIfEmpty() est appelé depuis main.js APRÈS la restauration localStorage

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
    seedIfEmpty,
  }
})
