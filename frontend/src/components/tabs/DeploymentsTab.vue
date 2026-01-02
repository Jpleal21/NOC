<template>
  <div class="bg-dark-card border border-dark-border rounded-lg shadow-sm">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-white">Deployment History</h2>
        <p class="text-sm text-dark-muted mt-1">
          Recent deployments across all servers
        </p>
      </div>
      <button
        @click="$emit('refresh')"
        class="px-3 py-2 text-sm bg-dark-hover hover:bg-dark-border text-dark-muted hover:text-white
               rounded-lg transition-colors flex items-center space-x-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Refresh</span>
      </button>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-dark-border">
        <thead class="bg-dark-bg">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Server
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Branch
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Status
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Duration
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Timestamp
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-dark-card divide-y divide-dark-border">
          <tr v-if="loading">
            <td colspan="6" class="px-6 py-8 text-center">
              <div class="flex items-center justify-center space-x-2">
                <svg class="animate-spin h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-dark-muted">Loading deployments...</span>
              </div>
            </td>
          </tr>
          <tr v-else-if="deployments.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-dark-muted">
              No deployment history available yet
            </td>
          </tr>
          <tr v-for="deployment in deployments" :key="deployment.id" class="hover:bg-dark-hover transition-colors">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-white">{{ deployment.server_name }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400">
                {{ deployment.branch }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                deployment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                deployment.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                deployment.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                'bg-yellow-500/20 text-yellow-400'
              ]">
                {{ deployment.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-dark-muted">
              {{ deployment.duration || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-dark-muted">
              {{ formatTimestamp(deployment.timestamp) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <a
                v-if="deployment.workflow_url"
                :href="deployment.workflow_url"
                target="_blank"
                class="text-primary-400 hover:text-primary-300 transition-colors"
              >
                View Logs
              </a>
              <span v-else class="text-dark-muted">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { formatDateTime as formatTimestamp } from '../../utils/date';

defineProps({
  deployments: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['refresh']);
</script>
