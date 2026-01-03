<template>
  <div class="bg-dark-surface border border-dark-border rounded-lg">
    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-dark-border">
        <thead class="bg-dark-bg">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Server
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Record Type
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Name
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Content (IP)
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase tracking-wider">
              Proxied
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
                <span class="text-dark-muted">Loading DNS records...</span>
              </div>
            </td>
          </tr>
          <tr v-else-if="records.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-dark-muted">
              No DNS records found
            </td>
          </tr>
          <tr v-for="record in records" :key="record.id" class="hover:bg-dark-hover transition-colors">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-white">{{ record.server_name }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                A
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center space-x-2">
                <span class="text-sm text-white font-mono">{{ record.name }}</span>
                <button
                  @click="copyToClipboard(record.name)"
                  class="text-dark-muted hover:text-primary-400 transition-colors"
                  title="Copy to clipboard"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center space-x-2">
                <span class="text-sm text-dark-muted font-mono">{{ record.content }}</span>
                <button
                  @click="copyToClipboard(record.content)"
                  class="text-dark-muted hover:text-primary-400 transition-colors"
                  title="Copy to clipboard"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                record.proxied ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-400'
              ]">
                {{ record.proxied ? 'Yes' : 'No' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              <a
                :href="`https://${record.name}`"
                target="_blank"
                class="text-primary-400 hover:text-primary-300 transition-colors"
              >
                Visit
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { toast } from 'vue-sonner';

defineProps({
  records: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['refresh']);

async function copyToClipboard(text) {
  // Check if clipboard API is available
  if (!navigator.clipboard) {
    toast.error('Clipboard not supported', {
      description: 'Your browser does not support clipboard operations (HTTPS required)'
    });
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard', {
      description: text
    });
  } catch (error) {
    console.error('[DNSTab] Failed to copy to clipboard:', error);
    toast.error('Failed to copy', {
      description: error.message || 'Clipboard permission denied'
    });
  }
}
</script>
