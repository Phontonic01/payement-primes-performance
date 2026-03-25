import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Agents de démonstration — chargés automatiquement si le store est vide
const AGENTS_DEMO = [
  { nom: 'Medza Ondo Scheila', matricule: '2823', role: 'CHAUFFEUR', zone: 'Libreville Centre', fonction: 'Chauffeur PL', equipe: 'Équipe BOM-01', vehicule: 'BOM N°484' },
  { nom: 'Nzoghe Obame Patrick', matricule: '0946', role: 'CHAUFFEUR', zone: 'Owendo', fonction: 'Chauffeur PL', equipe: 'Équipe BOM-02', vehicule: 'BOM N°512' },
  { nom: 'Moussavou Lendoye Brice', matricule: '1547', role: 'CHAUFFEUR', zone: 'PK8-PK12', fonction: 'Chauffeur PL', equipe: 'Équipe Bennes-01', vehicule: 'Bennes N°203' },
  { nom: 'Ndong Essono Jean-Claude', matricule: '3012', role: 'CHAUFFEUR', zone: 'Akanda', fonction: 'Chauffeur PL', equipe: 'Équipe Plateaux-01', vehicule: 'Plateaux N°88' },
  { nom: 'Mba Nguema Franck', matricule: '1823', role: 'CHAUFFEUR', zone: 'Nzeng-Ayong', fonction: 'Chauffeur PL', equipe: 'Équipe BOM-03', vehicule: 'BOM N°501' },
  { nom: 'Obiang Nze Rodrigue', matricule: '2156', role: 'CHAUFFEUR', zone: 'Libreville Nord', fonction: 'Chauffeur PL', equipe: 'Équipe Movi-01', vehicule: 'Movi N°45' },
  { nom: 'Essono Mba Thierry', matricule: '0734', role: 'CHAUFFEUR', zone: 'Libreville Sud', fonction: 'Chauffeur PL', equipe: 'Équipe BOM-04', vehicule: 'BOM N°522' },
  { nom: 'Ondo Mengue Sylvie', matricule: '3456', role: 'CHAUFFEUR', zone: 'Owendo Port', fonction: 'Chauffeur PL', equipe: 'Équipe Bennes-02', vehicule: 'Bennes N°210' },
  { nom: 'Bekale Bi Nzue Hervé', matricule: '1290', role: 'EQUIPIER', zone: 'Libreville Centre', fonction: 'Ripeur', equipe: 'Équipe BOM-01', vehicule: '' },
  { nom: 'Mboumba Ella Serge', matricule: '2478', role: 'EQUIPIER', zone: 'Libreville Centre', fonction: 'Ripeur', equipe: 'Équipe BOM-01', vehicule: '' },
  { nom: 'Ntoutoume Akoure Cédric', matricule: '0512', role: 'EQUIPIER', zone: 'Owendo', fonction: 'Ripeur', equipe: 'Équipe BOM-02', vehicule: '' },
  { nom: 'Mintsa Mi Owono Léa', matricule: '3789', role: 'EQUIPIER', zone: 'Owendo', fonction: 'Ripeur', equipe: 'Équipe BOM-02', vehicule: '' },
  { nom: 'Edzang Nkoghe Blaise', matricule: '1678', role: 'EQUIPIER', zone: 'PK8-PK12', fonction: 'Ripeur', equipe: 'Équipe Bennes-01', vehicule: '' },
  { nom: 'Avome Mba Christelle', matricule: '2901', role: 'EQUIPIER', zone: 'Akanda', fonction: 'Ripeur', equipe: 'Équipe Plateaux-01', vehicule: '' },
  { nom: 'Ella Nguema Prosper', matricule: '0423', role: 'EQUIPIER', zone: 'Nzeng-Ayong', fonction: 'Ripeur', equipe: 'Équipe BOM-03', vehicule: '' },
  { nom: 'Bivigou Koumba Aristide', matricule: '3145', role: 'EQUIPIER', zone: 'Libreville Nord', fonction: 'Ripeur', equipe: 'Équipe Movi-01', vehicule: '' },
  { nom: 'Nguema Obame Fabrice', matricule: '1956', role: 'EQUIPIER', zone: 'Libreville Sud', fonction: 'Ripeur', equipe: 'Équipe BOM-04', vehicule: '' },
  { nom: 'Mounanga Ndjambou Yves', matricule: '2634', role: 'EQUIPIER', zone: 'Owendo Port', fonction: 'Ripeur', equipe: 'Équipe Bennes-02', vehicule: '' },
  { nom: 'Oyane Nzame Berthe', matricule: '0867', role: 'GEO', zone: 'Siège', fonction: 'Technicien GPS', equipe: '', vehicule: '' },
  { nom: 'Assoumou Ndong Michel', matricule: '4012', role: 'QHSE', zone: 'Siège', fonction: 'Contrôleur QHSE', equipe: '', vehicule: '' },
]

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
