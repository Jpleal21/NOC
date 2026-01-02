import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: 'Dashboard' }
  },
  {
    path: '/deploy',
    name: 'deploy',
    component: () => import('../views/DeployView.vue'),
    meta: { title: 'Deploy Server' }
  },
  {
    path: '/deployments',
    name: 'deployments',
    component: () => import('../views/DeploymentsView.vue'),
    meta: { title: 'Deployment History' }
  },
  {
    path: '/servers',
    name: 'servers',
    component: () => import('../views/ServersView.vue'),
    meta: { title: 'Servers' }
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
