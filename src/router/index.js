import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false, layout: 'AuthLayout' }
    },
    {
      path: '/',
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
      path: '/collecte/bouclage',
      name: 'collecte-bouclage',
      component: () => import('@/views/collecte/BouclageDeclarationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Déclaration Bouclage', breadcrumb: ['Collecte', 'Déclaration Bouclage'] }
    },
    {
      path: '/collecte/historique',
      name: 'collecte-historique',
      component: () => import('@/views/collecte/HistoriqueSaisiesView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Historique Collecte', breadcrumb: ['Collecte', 'Historique Collecte'] }
    },
    // Géolocalisation
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
      path: '/qhse/tri',
      name: 'qhse-tri',
      component: () => import('@/views/qhse/CollecteSelectiveView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Collecte Sélective', breadcrumb: ['QHSE', 'Collecte Sélective'] }
    },
    {
      path: '/qhse/historique',
      name: 'qhse-historique',
      component: () => import('@/views/qhse/HistoriqueQhseView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Historique QHSE', breadcrumb: ['QHSE', 'Historique QHSE'] }
    },
    // Admin
    {
      path: '/admin/utilisateurs',
      name: 'admin-utilisateurs',
      component: () => import('@/views/admin/AdminUsersView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Utilisateurs', breadcrumb: ['Administration', 'Utilisateurs'] }
    },
    {
      path: '/admin/parametres',
      name: 'admin-parametres',
      component: () => import('@/views/admin/AdminParamsView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Paramètres', breadcrumb: ['Administration', 'Paramètres'] }
    },
    {
      path: '/admin/consolidation',
      name: 'admin-consolidation',
      component: () => import('@/views/admin/AdminConsolidationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Consolidation', breadcrumb: ['Administration', 'Consolidation'] }
    },
    {
      path: '/admin/validation',
      name: 'admin-validation',
      component: () => import('@/views/admin/AdminValidationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Validation Primes', breadcrumb: ['Administration', 'Validation Primes'] }
    },
    {
      path: '/admin/rapports',
      name: 'admin-rapports',
      component: () => import('@/views/admin/AdminRapportsView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout', title: 'Rapports & Export', breadcrumb: ['Administration', 'Rapports & Export'] }
    }
  ]
})

// Simple Route Guard (mock)
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('token') // Mock auth

  if (to.meta.requiresAuth && !isAuthenticated && to.name !== 'login') {
    next({ name: 'login' })
  } else if (to.name === 'login' && isAuthenticated) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
