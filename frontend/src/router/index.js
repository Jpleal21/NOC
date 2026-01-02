import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('../views/Dashboard.vue'),
    children: [
      {
        path: '',
        redirect: '/servers'
      },
      {
        path: 'servers',
        name: 'servers',
        component: () => import('../views/ServersView.vue'),
        meta: { title: 'Servers' }
      },
      {
        path: 'deployments',
        name: 'deployments',
        component: () => import('../views/DeploymentsView.vue'),
        meta: { title: 'Deployments' }
      },
      {
        path: 'dns',
        name: 'dns',
        component: () => import('../views/DNSView.vue'),
        meta: { title: 'DNS Records' }
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../views/SettingsView.vue'),
        meta: { title: 'Settings' }
      },
      {
        path: 'deploy',
        name: 'deploy',
        component: () => import('../views/DeployView.vue'),
        meta: { title: 'Deploy Server' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Update page title on route change
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - NOC Platform` : 'NOC Platform'
  next()
})

export default router
