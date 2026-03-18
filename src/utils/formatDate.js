/**
 * Formater une date ISO (YYYY-MM-DD) en format francophone (dd/mm/yyyy)
 */
export function formatDateFr(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Formater un mois ISO (YYYY-MM) en "mois année" francophone
 */
export function formatMoisFr(isoMonth) {
  if (!isoMonth) return ''
  const [y, m] = isoMonth.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}
