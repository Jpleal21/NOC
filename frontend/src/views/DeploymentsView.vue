<template>
  <div class="min-h-screen bg-dark-bg">
    <!-- Header -->
    <header class="bg-dark-surface border-b border-dark-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-white">Deployment History</h1>
            <p class="text-sm text-dark-muted mt-1">All server deployments and their status</p>
          </div>
          <div class="flex items-center space-x-3">
            <button
              @click="refreshDeployments"
              :disabled="store.loadingHistory"
              class="px-4 py-2 bg-dark-hover text-white rounded-lg hover:bg-dark-border transition-colors disabled:opacity-50"
            >
              {{ store.loadingHistory ? 'Refreshing...' : '↻ Refresh' }}
            </button>
            <router-link
              to="/deploy"
              class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              + Deploy Server
            </router-link>
          </div>
        </div>
      </div>
    </header>

    <!-- Stats Cards -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="grid grid-cols-4 gap-4">
        <div class="bg-dark-surface rounded-lg border border-dark-border p-4">
          <div class="text-sm text-dark-muted">Total Deployments</div>
          <div class="text-2xl font-bold text-white mt-1">{{ store.deploymentStats.total }}</div>
        </div>
        <div class="bg-dark-surface rounded-lg border border-dark-border p-4">
          <div class="text-sm text-dark-muted">In Progress</div>
          <div class="text-2xl font-bold text-blue-400 mt-1">{{ store.deploymentStats.in_progress }}</div>
        </div>
        <div class="bg-dark-surface rounded-lg border border-dark-border p-4">
          <div class="text-sm text-dark-muted">Completed</div>
          <div class="text-2xl font-bold text-green-400 mt-1">{{ store.deploymentStats.completed }}</div>
        </div>
        <div class="bg-dark-surface rounded-lg border border-dark-border p-4">
          <div class="text-sm text-dark-muted">Failed</div>
          <div class="text-2xl font-bold text-red-400 mt-1">{{ store.deploymentStats.failed }}</div>
        </div>
      </div>
    </div>

    <!-- Deployments Table -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <div class="bg-dark-surface rounded-lg border border-dark-border overflow-hidden">
        <!-- Loading State -->
        <div v-if="store.loadingHistory" class="p-8 text-center text-dark-muted">
          Loading deployments...
        </div>

        <!-- Empty State -->
        <div v-else-if="store.deployments.length === 0" class="p-8 text-center text-dark-muted">
          <p class="text-lg mb-4">No deployments yet</p>
          <router-link
            to="/deploy"
            class="inline-block px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Deploy Your First Server
          </router-link>
        </div>

        <!-- Table -->
        <table v-else class="w-full">
          <thead class="bg-dark-hover border-b border-dark-border">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
                Server Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
                Profile
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
                Branch
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
                Created
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-dark-border">
            <tr
              v-for="deployment in store.deployments"
              :key="deployment.id"
              class="hover:bg-dark-hover transition-colors"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-white">{{ deployment.server_name }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'px-2 py-1 text-xs font-medium rounded',
                    deployment.deployment_profile === 'core'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-purple-500/20 text-purple-400'
                  ]"
                >
                  {{ deployment.deployment_profile?.toUpperCase() || 'CORE' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-dark-muted">
                {{ deployment.branch }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'px-2 py-1 text-xs font-medium rounded',
                    deployment.status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : deployment.status === 'failed'
                      ? 'bg-red-500/20 text-red-400'
                      : deployment.status === 'in_progress'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-gray-500/20 text-gray-400'
                  ]"
                >
                  {{ deployment.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-dark-muted">
                {{ formatDate(deployment.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-dark-muted">
                {{ deployment.ip_address || 'Provisioning...' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useDeploymentsStore } from '../stores/deployments'

const store = useDeploymentsStore()

onMounted(() => {
  store.fetchDeployments()
})

function refreshDeployments() {
  store.fetchDeployments()
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}
</script>
