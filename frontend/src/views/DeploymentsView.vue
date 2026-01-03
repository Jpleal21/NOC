<template>
  <div class="page-container">
    <!-- Page Header -->
    <PageHeader
      title="Deployments"
      subtitle="View deployment history and track infrastructure provisioning"
    />

    <!-- Stats Cards -->
    <div class="mb-6">
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
    <div>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-white">Recent Deployments</h2>
        <button
          @click="refreshDeployments"
          :disabled="store.loadingHistory"
          class="px-4 py-2 bg-dark-hover text-white rounded-lg hover:bg-dark-border transition-colors disabled:opacity-50"
        >
          {{ store.loadingHistory ? 'Refreshing...' : '↻ Refresh' }}
        </button>
      </div>
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import { useDeploymentsStore } from '../stores/deployments'
import { formatRelativeDate as formatDate } from '../utils/date'

const store = useDeploymentsStore()
const pollIntervalId = ref(null)

onMounted(() => {
  store.fetchDeployments()
  startPolling()
})

onBeforeUnmount(() => {
  stopPolling()
})

// Start polling for in-progress deployments
function startPolling() {
  // Poll every 10 seconds to check for in-progress deployments
  pollIntervalId.value = setInterval(async () => {
    // Only poll if there are in-progress deployments
    if (store.deploymentStats.in_progress > 0) {
      try {
        await store.fetchDeployments()
      } catch (error) {
        console.error('[DeploymentsView] Polling error:', error)
        // Don't show toast for polling errors (too noisy), just log them
        // If errors persist, polling will continue trying
      }
    }
  }, 10000) // 10 seconds
}

// Stop polling
function stopPolling() {
  if (pollIntervalId.value) {
    clearInterval(pollIntervalId.value)
    pollIntervalId.value = null
  }
}

function refreshDeployments() {
  store.fetchDeployments()
}
</script>
