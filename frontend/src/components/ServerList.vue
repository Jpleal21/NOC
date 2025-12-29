<template>
  <div class="card p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
        Deployed Servers
      </h2>
      <button
        @click="$emit('refresh')"
        class="px-3 py-1 text-sm bg-gray-100 dark:bg-dark-hover hover:bg-gray-200 dark:hover:bg-dark-border
               text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
      >
        Refresh
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <div class="loading-spinner mx-auto"></div>
      <p class="loading-text">Loading servers...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="servers.length === 0" class="text-center py-8">
      <p class="text-gray-500 dark:text-gray-400">
        No servers deployed yet. Deploy your first server above!
      </p>
    </div>

    <!-- Server Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 dark:bg-dark-header-bg border-b border-gray-200 dark:border-dark-border">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-header-text uppercase tracking-wider">
              Name
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-header-text uppercase tracking-wider">
              Status
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-header-text uppercase tracking-wider">
              IP Address
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-header-text uppercase tracking-wider">
              Region
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-header-text uppercase tracking-wider">
              Size
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-header-text uppercase tracking-wider">
              Created
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-dark-header-text uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
          <tr v-for="server in servers" :key="server.id" class="hover:bg-gray-50 dark:hover:bg-dark-hover">
            <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
              {{ server.name }}
            </td>
            <td class="px-4 py-3 text-sm">
              <span :class="getStatusClass(server.status)" class="status-badge">
                {{ server.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
              {{ server.ip_address || 'Pending...' }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
              {{ server.region }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
              {{ server.size }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
              {{ formatDate(server.created_at) }}
            </td>
            <td class="px-4 py-3 text-sm text-right">
              <button
                @click="$emit('delete', server.name)"
                class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
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

defineEmits(['refresh', 'delete']);

function getStatusClass(status) {
  const classes = {
    'active': 'status-badge-green',
    'new': 'status-badge-blue',
    'off': 'status-badge-gray',
  };
  return classes[status] || 'status-badge-gray';
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>
