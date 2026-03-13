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
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    // Collecte
    {
      path: '/collecte/tonnage',
      name: 'collecte-tonnage',
      component: () => import('@/views/collecte/TonnageSaisieView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    {
      path: '/collecte/bouclage',
      name: 'collecte-bouclage',
      component: () => import('@/views/collecte/BouclageDeclarationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    {
      path: '/collecte/historique',
      name: 'collecte-historique',
      component: () => import('@/views/collecte/HistoriqueSaisiesView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    // Géolocalisation
    {
      path: '/geo/validation',
      name: 'geo-validation',
      component: () => import('@/views/geo/FileValidationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    {
      path: '/geo/detail/:id',
      name: 'geo-detail',
      component: () => import('@/views/geo/DetailValidationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    {
      path: '/geo/historique',
      name: 'geo-historique',
      component: () => import('@/views/geo/HistoriqueValidationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    // Logistique
    {
      path: '/logistique/entretien',
      name: 'logistique-entretien',
      component: () => import('@/views/logistique/EntretienSaisieView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    {
      path: '/logistique/materiel',
      name: 'logistique-materiel',
      component: () => import('@/views/logistique/SuiviEquipementsView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    {
      path: '/logistique/historique',
      name: 'logistique-historique',
      component: () => import('@/views/logistique/HistoriqueEntretiensView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    // QHSE
    {
      path: '/qhse/checklist',
      name: 'qhse-checklist',
      component: () => import('@/views/qhse/ChecklistSaisieView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    {
      path: '/qhse/alcoolemie',
      name: 'qhse-alcoolemie',
      component: () => import('@/views/qhse/AlcootestSaisieView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    {
      path: '/qhse/tri',
      name: 'qhse-tri',
      component: () => import('@/views/qhse/CollecteSelectiveView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    {
      path: '/qhse/historique',
      name: 'qhse-historique',
      component: () => import('@/views/qhse/HistoriqueQhseView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    // Admin
    {
      path: '/admin/utilisateurs',
      name: 'admin-utilisateurs',
      component: () => import('@/views/admin/AdminUsersView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    {
      path: '/admin/parametres',
      name: 'admin-parametres',
      component: () => import('@/views/admin/AdminParamsView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    {
      path: '/admin/consolidation',
      name: 'admin-consolidation',
      component: () => import('@/views/admin/AdminConsolidationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    {
      path: '/admin/validation',
      name: 'admin-validation',
      component: () => import('@/views/admin/AdminValidationView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
    },
    {
      path: '/admin/rapports',
      name: 'admin-rapports',
      component: () => import('@/views/admin/AdminRapportsView.vue'),
      meta: { requiresAuth: true, layout: 'DashboardLayout' }
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
