/**
 * Plugin Pinia — Persistance localStorage
 *
 * Sauvegarde automatiquement les stores dans localStorage
 * et les restaure au chargement de la page.
 *
 * Les stores à persister sont listés dans PERSISTED_STORES.
 */
const PERSISTED_STORES = ['agents', 'saisies', 'geo', 'primes']
const STORAGE_PREFIX = 'cleanAfrica_'

export function piniaPersistPlugin({ store }) {
  const storeId = store.$id

  if (!PERSISTED_STORES.includes(storeId)) return

  const key = STORAGE_PREFIX + storeId

  // Restaurer depuis localStorage au démarrage
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      store.$patch(data)
    } catch (e) {
      console.warn(`[Persist] Impossible de restaurer le store "${storeId}":`, e)
      localStorage.removeItem(key)
    }
  }

  // Sauvegarder à chaque mutation
  store.$subscribe((_mutation, state) => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch (e) {
      console.warn(`[Persist] Impossible de sauvegarder le store "${storeId}":`, e)
    }
  })
}
