<template>
  <div>
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
        .map(record => ({
          id: record.id,
          name: record.name,
          content: record.content,
          proxied: record.proxied,
          type: record.type,
          ttl: record.ttl,
          created_on: record.created_on,
          modified_on: record.modified_on
        }))
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
