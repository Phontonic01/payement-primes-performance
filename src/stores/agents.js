import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAgentsStore = defineStore('agents', () => {
  // Source unique des agents — sera remplacée par un appel API/BDD
  const agents = ref([
    { id: 1, nom: 'Medza Ondo Scheila', matricule: '2823', role: 'CHAUFFEUR', zone: 'PK8' },
    { id: 2, nom: 'Mamfoumbi Muriella', matricule: '2948', role: 'CHAUFFEUR', zone: 'LIBREVILLE' },
    { id: 3, nom: 'Mbatsi Davy', matricule: '0946', role: 'EQUIPIER', zone: 'OWENDO' },
    { id: 4, nom: 'Maduka Tiburce', matricule: '1495', role: 'GEO', zone: 'SIEGE' },
    { id: 5, nom: 'Mbele Christopher', matricule: '3016', role: 'COLLECTE', zone: 'SIEGE' },
    { id: 6, nom: 'Tsamba Tchewarny', matricule: '0943', role: 'CHAUFFEUR', zone: 'OWENDO' },
    { id: 7, nom: 'Beka Christ', matricule: '2024', role: 'EQUIPIER', zone: 'LIBREVILLE' },
    { id: 8, nom: 'Tengou Joram', matricule: '2768', role: 'CHAUFFEUR', zone: 'LIBREVILLE' },
  ])

  // Présences mock — sera remplacé par la BDD
  // Clé: "YYYY-MM-DD", Valeur: tableau de matricules présents ce jour
  const today = new Date().toISOString().split('T')[0]
  const presences = ref({
    '2025-12-08': ['2823', '2948', '0946', '1495', '0943', '2768'],
    '2025-12-09': ['2823', '2948', '0946', '1495', '3016', '2024', '2768'],
    '2025-12-10': ['2823', '2948', '0946', '3016', '0943', '2024', '2768'],
    [today]: ['2823', '2948', '0946', '1495', '3016', '0943', '2024', '2768'],
  })

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
    getAgentByMatricule,
    getAgentById,
    searchAgents,
    getPresents,
    isPresent,
    enregistrerPresence,
  }
})
