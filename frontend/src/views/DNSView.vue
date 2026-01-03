<template>
  <div class="page-container">
    <!-- Page Header -->
    <PageHeader
      title="DNS Management"
      subtitle="Manage Cloudflare DNS records for FlaggerLink servers"
    >
      <template #actions>
        <button
          @click="loadDNS"
          :disabled="loadingDNS"
          class="px-4 py-2 bg-dark-hover text-white rounded-lg hover:bg-dark-border transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': loadingDNS }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{{ loadingDNS ? 'Refreshing...' : 'Refresh' }}</span>
        </button>
      </template>
    </PageHeader>

    <DNSTab
      :records="dnsRecords"
      :loading="loadingDNS"
      @refresh="loadDNS"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import api from '../services/api';
import PageHeader from '../components/PageHeader.vue';
import DNSTab from '../components/tabs/DNSTab.vue';

const dnsRecords = ref([]);
const loadingDNS = ref(false);

onMounted(() => {
  loadDNS();
});

async function loadDNS() {
  loadingDNS.value = true;
  try {
    console.log('[DNSView] Fetching DNS records from Cloudflare API');
    const result = await api.getDNSRecords();

    if (result.success) {
      console.log('[DNSView] Received', result.records.length, 'DNS records');

      // Map Cloudflare DNS records to our display format
      dnsRecords.value = result.records
        .filter(record => record.type === 'A' && record.name.includes('flaggerlink.com'))
        .map(record => {
          // Extract server name from DNS record
          // Examples: "alpha.flaggerlink.com" → "alpha", "alpha-api.flaggerlink.com" → "alpha"
          const nameParts = record.name.split('.flaggerlink.com')[0];
          const server_name = nameParts.split('-')[0]; // Take first part before any hyphens

          return {
            id: record.id,
            name: record.name,
            server_name: server_name, // Added: Extract server name from DNS record
            content: record.content,
            proxied: record.proxied,
            type: record.type,
            ttl: record.ttl,
            created_on: record.created_on,
            modified_on: record.modified_on
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      console.log('[DNSView] Displaying', dnsRecords.value.length, 'filtered DNS records');
    }
  } catch (error) {
    console.error('[DNSView] Failed to load DNS records:', error);
    toast.error('Failed to load DNS records', {
      description: error.message
    });
    dnsRecords.value = [];
  } finally {
    loadingDNS.value = false;
  }
}
</script>
