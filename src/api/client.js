/**
 * Client API — couche de communication avec le backend Express
 *
 * Toutes les requêtes passent par ce client qui gère :
 * - L'injection automatique du token JWT
 * - La gestion des erreurs (401 → redirect login)
 * - Le format JSON automatique
 */

const BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
    throw new Error('Session expirée')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur réseau' }))
    throw new Error(error.error || `Erreur ${response.status}`)
  }

  return response.json()
}

export const api = {
  // ═══ Auth ═══
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  me: () => request('/auth/me'),

  // ═══ Agents ═══
  getAgents: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/agents${qs ? '?' + qs : ''}`)
  },
  getAgentStats: () => request('/agents/stats'),
  getAgent: (matricule) => request(`/agents/${matricule}`),
  createAgent: (data) => request('/agents', { method: 'POST', body: JSON.stringify(data) }),
  updateAgent: (matricule, data) => request(`/agents/${matricule}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAgent: (matricule) => request(`/agents/${matricule}`, { method: 'DELETE' }),

  // ═══ Saisies ═══
  getTonnages: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/saisies/tonnages${qs ? '?' + qs : ''}`)
  },
  createTonnage: (data) => request('/saisies/tonnages', { method: 'POST', body: JSON.stringify(data) }),

  getFiches: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/saisies/fiches${qs ? '?' + qs : ''}`)
  },
  getFiche: (id) => request(`/saisies/fiches/${id}`),
  createFiche: (data) => request('/saisies/fiches', { method: 'POST', body: JSON.stringify(data) }),

  getBouclages: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/saisies/bouclages${qs ? '?' + qs : ''}`)
  },
  createBouclage: (data) => request('/saisies/bouclages', { method: 'POST', body: JSON.stringify(data) }),
  updateBouclageGeo: (matricule, date, statut_geo) =>
    request(`/saisies/bouclages/${matricule}/${date}/geo`, { method: 'PATCH', body: JSON.stringify({ statut_geo }) }),

  getEntretiens: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/saisies/entretiens${qs ? '?' + qs : ''}`)
  },
  createEntretien: (data) => request('/saisies/entretiens', { method: 'POST', body: JSON.stringify(data) }),

  getQhse: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/saisies/qhse${qs ? '?' + qs : ''}`)
  },
  createQhse: (data) => request('/saisies/qhse', { method: 'POST', body: JSON.stringify(data) }),

  getTriSaisies: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/saisies/tri${qs ? '?' + qs : ''}`)
  },
  createTriSaisie: (data) => request('/saisies/tri', { method: 'POST', body: JSON.stringify(data) }),

  // ═══ Historique équipages véhicule ═══
  getHistoriqueVehicule: (immatriculation) =>
    request(`/saisies/historique-vehicule/${encodeURIComponent(immatriculation)}`),

  // ═══ Équipes véhicule ═══
  getEquipeVehicule: (immatriculation, service) => {
    const params = new URLSearchParams()
    if (service) params.set('service', service)
    return request(`/saisies/equipe/${encodeURIComponent(immatriculation)}?${params}`)
  },
  saveEquipeVehicule: (data) => request('/saisies/equipe', { method: 'POST', body: JSON.stringify(data) }),

  getSaisiesStats: (mois) => request(`/saisies/stats${mois ? '?mois=' + mois : ''}`),
  getAgregation: (matricule, mois) => request(`/saisies/agregation/${matricule}${mois ? '?mois=' + mois : ''}`),

  // ═══ GEO ═══
  getGeoDecisions: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/geo/decisions${qs ? '?' + qs : ''}`)
  },
  createGeoDecision: (data) => request('/geo/decisions', { method: 'POST', body: JSON.stringify(data) }),
  getGeoStats: () => request('/geo/stats'),
  getGeoPending: () => request('/geo/pending'),

  // ═══ Config ═══
  getConfigPrimes: () => request('/config/primes'),
  updateConfigPrimes: (data) => request('/config/primes', { method: 'PUT', body: JSON.stringify(data) }),
  getNotesDeService: () => request('/config/notes-de-service'),
  getValidations: () => request('/config/validations'),
  cloturerMois: (data) => request('/config/validations', { method: 'POST', body: JSON.stringify(data) }),

  // ═══ Pont-Bascule ═══
  pontBasculeStatus: () => request('/pont-bascule/status'),
  pontBasculeDiagnostic: () => request('/pont-bascule/diagnostic'),
  pontBasculeConnect: () => request('/pont-bascule/connect', { method: 'POST' }),
  pontBasculePesees: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/pont-bascule/pesees${qs ? '?' + qs : ''}`)
  },
  pontBasculeVehiculesDuJour: (date, client, service) => {
    const params = new URLSearchParams({ date: date || '' })
    if (client) params.set('client', client)
    if (service) params.set('service', service)
    return request(`/pont-bascule/vehicules-du-jour?${params}`)
  },
  pontBasculeBilan: (mois, service) => {
    const params = new URLSearchParams()
    if (mois) params.set('mois', mois)
    if (service) params.set('service', service)
    return request(`/pont-bascule/bilan?${params}`)
  },
  pontBasculePresence: (mois) => request(`/pont-bascule/presence${mois ? '?mois=' + mois : ''}`),
  pontBasculeStats: (date) => request(`/pont-bascule/stats${date ? '?date=' + date : ''}`),
  pontBasculeResumeVehicule: (immat, date) =>
    request(`/pont-bascule/resume-vehicule?immat=${encodeURIComponent(immat)}&date=${date}`),
  pontBasculeSync: (date) =>
    request('/pont-bascule/sync', { method: 'POST', body: JSON.stringify({ date }) }),

  // ═══ Health ═══
  health: () => fetch(`${BASE}/health`).then(r => r.json()),
}

export default api
