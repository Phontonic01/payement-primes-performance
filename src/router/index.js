import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/LandingView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false, layout: 'AuthLayout' }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Tableau de bord', breadcrumb: ['Tableau de bord'] }
    },
    {
      path: '/recherche',
      name: 'recherche-agent',
      component: () => import('@/views/RechercheAgentView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Recherche Agent', breadcrumb: ['Recherche Agent'] }
    },
    // Collecte
    {
      path: '/collecte/tonnage',
      name: 'collecte-tonnage',
      component: () => import('@/views/collecte/TonnageSaisieView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Saisie Tonnage', breadcrumb: ['Collecte', 'Saisie Tonnage'] }
    },
    {
      path: '/collecte/fiche/:id',
      name: 'collecte-fiche',
      component: () => import('@/views/collecte/FicheCollecteView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Fiche Collecte', breadcrumb: ['Collecte', 'Fiche Collecte'] }
    },
    {
      path: '/collecte/historique',
      name: 'collecte-historique',
      component: () => import('@/views/collecte/HistoriqueSaisiesView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Historique Collecte', breadcrumb: ['Collecte', 'Historique Collecte'] }
    },
    // Géolocalisation
    {
      path: '/geo/bouclage',
      name: 'geo-bouclage',
      component: () => import('@/views/collecte/BouclageDeclarationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Déclaration Bouclage', breadcrumb: ['Géolocalisation', 'Déclaration Bouclage'] }
    },
    {
      path: '/geo/tableau-de-bord',
      name: 'geo-tableau-de-bord',
      component: () => import('@/views/geo/GeoTableauBordView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Tableau de Bord GEO', breadcrumb: ['Géolocalisation', 'Tableau de Bord'] }
    },
    {
      path: '/geo/validation',
      name: 'geo-validation',
      component: () => import('@/views/geo/FileValidationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'File de Validation GPS', breadcrumb: ['Géolocalisation', 'File de Validation GPS'] }
    },
    {
      path: '/geo/detail/:id',
      name: 'geo-detail',
      component: () => import('@/views/geo/DetailValidationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Détail Validation', breadcrumb: ['Géolocalisation', 'Détail Validation'] }
    },
    {
      path: '/geo/historique',
      name: 'geo-historique',
      component: () => import('@/views/geo/HistoriqueValidationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Historique GPS', breadcrumb: ['Géolocalisation', 'Historique GPS'] }
    },
    // Logistique
    {
      path: '/logistique/entretien',
      name: 'logistique-entretien',
      component: () => import('@/views/logistique/EntretienSaisieView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Saisie Entretien', breadcrumb: ['Logistique', 'Saisie Entretien'] }
    },
    {
      path: '/logistique/materiel',
      name: 'logistique-materiel',
      component: () => import('@/views/logistique/SuiviEquipementsView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Suivi Équipements', breadcrumb: ['Logistique', 'Suivi Équipements'] }
    },
    {
      path: '/logistique/historique',
      name: 'logistique-historique',
      component: () => import('@/views/logistique/HistoriqueEntretiensView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Historique Entretiens', breadcrumb: ['Logistique', 'Historique Entretiens'] }
    },
    // QHSE
    {
      path: '/qhse/checklist',
      name: 'qhse-checklist',
      component: () => import('@/views/qhse/ChecklistSaisieView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Checklist Terrain', breadcrumb: ['QHSE', 'Checklist Terrain'] }
    },
    {
      path: '/qhse/alcoolemie',
      name: 'qhse-alcoolemie',
      component: () => import('@/views/qhse/AlcootestSaisieView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Test Alcoolémie', breadcrumb: ['QHSE', 'Test Alcoolémie'] }
    },
    {
      path: '/qhse/historique',
      name: 'qhse-historique',
      component: () => import('@/views/qhse/HistoriqueQhseView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Historique QHSE', breadcrumb: ['QHSE', 'Historique QHSE'] }
    },
    // TRI (Collecte Sélective)
    {
      path: '/tri/saisie',
      name: 'tri-saisie',
      component: () => import('@/views/tri/CollecteSelectiveView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Saisie Pesée', breadcrumb: ['TRI', 'Saisie Pesée'] }
    },
    {
      path: '/tri/historique',
      name: 'tri-historique',
      component: () => import('@/views/tri/HistoriqueTriView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Historique TRI', breadcrumb: ['TRI', 'Historique TRI'] }
    },
    // DÉCHARGE (Gestion des déchets)
    {
      path: '/decharge/tableau-de-bord',
      name: 'decharge-tableau-de-bord',
      component: () => import('@/views/decharge/DechargeTableauBordView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Tableau de Bord', breadcrumb: ['DÉCHARGE', 'Tableau de Bord'] }
    },
    {
      path: '/decharge/reception',
      name: 'decharge-reception',
      component: () => import('@/views/decharge/DechargeReceptionView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Réception Camions', breadcrumb: ['DÉCHARGE', 'Réception Camions'] }
    },
    {
      path: '/decharge/historique',
      name: 'decharge-historique',
      component: () => import('@/views/decharge/DechargeHistoriqueView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Historique Décharge', breadcrumb: ['DÉCHARGE', 'Historique'] }
    },
    // DAF (Direction Administrative et Financière)
    {
      path: '/daf/budget',
      name: 'daf-budget',
      component: () => import('@/views/daf/DafBudgetView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Vue Budgétaire', breadcrumb: ['DAF', 'Vue Budgétaire'] }
    },
    {
      path: '/daf/utilisateurs',
      name: 'daf-utilisateurs',
      component: () => import('@/views/daf/DafUsersView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Utilisateurs', breadcrumb: ['DAF', 'Utilisateurs'] }
    },
    {
      path: '/daf/parametres',
      name: 'daf-parametres',
      component: () => import('@/views/daf/DafParamsView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Paramètres', breadcrumb: ['DAF', 'Paramètres'] }
    },
    {
      path: '/daf/consolidation',
      name: 'daf-consolidation',
      component: () => import('@/views/daf/DafConsolidationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Consolidation', breadcrumb: ['DAF', 'Consolidation'] }
    },
    {
      path: '/daf/validation',
      name: 'daf-validation',
      component: () => import('@/views/daf/DafValidationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Validation Prime', breadcrumb: ['DAF', 'Validation Prime'] }
    },
    {
      path: '/daf/rapports',
      name: 'daf-rapports',
      component: () => import('@/views/daf/DafRapportsView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Rapports & Export', breadcrumb: ['DAF', 'Rapports & Export'] }
    }
  ]
})

// Route Guard
router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const user = localStorage.getItem('user')
  const isAuthenticated = !!(token && user)

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'landing' }
  }
  if (to.name === 'landing' && isAuthenticated) {
    return { name: 'dashboard' }
  }
  if (to.name === 'login' && isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router
