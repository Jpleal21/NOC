<template>
  <div class="bg-dark-card border border-dark-border rounded-lg shadow-lg">
    <div class="flex justify-between items-center p-4 border-b border-dark-border">
      <h2 class="text-xl font-semibold text-white">
        Deployed Servers
      </h2>
      <button
        @click="$emit('refresh')"
        class="px-3 py-1.5 text-sm bg-dark-hover hover:bg-dark-border text-dark-muted
               hover:text-white rounded-lg transition-colors flex items-center space-x-1"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Refresh</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="loading-spinner mx-auto mb-3"></div>
      <p class="text-dark-muted">Loading servers...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="servers.length === 0" class="text-center py-12">
      <svg class="w-16 h-16 mx-auto text-dark-border mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
      <p class="text-dark-muted">
        No servers deployed yet
      </p>
      <p class="text-sm text-dark-muted mt-1">
        Click "Deploy New Server" to get started
      </p>
    </div>

    <!-- Server Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-dark-hover border-b border-dark-border">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Name
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Tags
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Status
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              IP Address
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Region
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Size
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Created
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-dark-muted uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-dark-border">
          <tr v-for="server in servers" :key="server.id" class="hover:bg-dark-hover transition-colors">
            <td class="px-4 py-3 text-sm font-medium text-white">
              {{ server.name }}
            </td>
            <td class="px-4 py-3 text-sm">
              <div class="flex items-center space-x-1">
                <span
                  v-for="tag in (server.tags || [])"
                  :key="tag"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400"
                >
                  {{ tag }}
                </span>
                <button
                  @click="$emit('manage-tags', server)"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-dark-muted hover:text-primary-400 hover:bg-dark-hover transition-colors"
                  title="Manage tags"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            </td>
            <td class="px-4 py-3 text-sm">
              <span :class="getStatusClass(server.status)" class="status-badge">
                {{ server.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm font-mono text-dark-muted">
              {{ server.ip_address || 'Pending...' }}
            </td>
            <td class="px-4 py-3 text-sm text-dark-muted">
              {{ server.region }}
            </td>
            <td class="px-4 py-3 text-sm text-dark-muted">
              {{ server.size }}
            </td>
            <td class="px-4 py-3 text-sm text-dark-muted">
              {{ formatDate(server.created_at) }}
            </td>
            <td class="px-4 py-3 text-sm text-right space-x-3">
              <button
                v-if="server.status === 'active' && server.ip_address"
                @click="$emit('deploy', server)"
                class="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Deploy App
              </button>
              <button
                @click="$emit('delete', server.name)"
                class="text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { formatDateTime as formatDate } from '../utils/date';

defineProps({
  servers: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['refresh', 'delete', 'deploy', 'manage-tags']);

function getStatusClass(status) {
  const classes = {
    'active': 'status-badge-green',
    'new': 'status-badge-blue',
    'off': 'status-badge-gray',
  };
  return classes[status] || 'status-badge-gray';
}
</script>
