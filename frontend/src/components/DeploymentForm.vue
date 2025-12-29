<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Server Name -->
    <div>
      <label class="block text-sm font-medium text-dark-muted mb-1">
        Server Name (NATO phonetic)
      </label>
      <input
        v-model="form.server_name"
        type="text"
        placeholder="alpha"
        required
        class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
               placeholder-dark-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
    </div>

    <!-- Region Selection -->
    <div>
      <label class="block text-sm font-medium text-dark-muted mb-1">
        Region
      </label>
      <select
        v-model="form.droplet_region"
        @change="loadVPCs"
        required
        class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
               focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        <option value="">Select region...</option>
        <option v-for="region in regions" :key="region.slug" :value="region.slug">
          {{ region.name }}
        </option>
      </select>
    </div>

    <!-- VPC Selection -->
    <div>
      <label class="block text-sm font-medium text-dark-muted mb-1">
        VPC
      </label>
      <select
        v-model="form.vpc_uuid"
        :disabled="!form.droplet_region || loadingVPCs"
        required
        class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
               focus:ring-2 focus:ring-primary-500 focus:border-transparent
               disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">{{ loadingVPCs ? 'Loading VPCs...' : 'Select VPC...' }}</option>
        <option v-for="vpc in vpcs" :key="vpc.id" :value="vpc.id">
          {{ vpc.name }} ({{ vpc.ip_range }})
        </option>
      </select>
    </div>

    <!-- Droplet Size -->
    <div>
      <label class="block text-sm font-medium text-dark-muted mb-1">
        Droplet Size
      </label>
      <select
        v-model="form.droplet_size"
        required
        class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
               focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        <option value="">Select size...</option>
        <option value="s-2vcpu-4gb">Basic (2 vCPU, 4GB RAM)</option>
        <option value="s-4vcpu-8gb">Standard (4 vCPU, 8GB RAM)</option>
        <option value="s-8vcpu-16gb">Performance (8 vCPU, 16GB RAM)</option>
      </select>
    </div>

    <!-- Branch Selection -->
    <div>
      <label class="block text-sm font-medium text-dark-muted mb-1">
        FlaggerLink Branch
      </label>
      <select
        v-model="form.branch"
        required
        class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
               focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        <option value="master">master (Production)</option>
        <option value="staging">staging (Staging)</option>
        <option value="development">development (Development)</option>
      </select>
    </div>

    <!-- Reserved IP -->
    <div>
      <label class="block text-sm font-medium text-dark-muted mb-1">
        Reserved IP (optional)
      </label>
      <select
        v-model="form.reserved_ip"
        class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
               focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        <option value="">Use ephemeral IP</option>
        <option v-for="ip in reservedIPs" :key="ip.ip" :value="ip.ip">
          {{ ip.ip }} ({{ ip.region.name }})
        </option>
      </select>
      <p class="mt-1 text-xs text-dark-muted">
        Reserved IPs persist when droplet is destroyed
      </p>
    </div>

    <!-- SSH Keys -->
    <div>
      <label class="block text-sm font-medium text-dark-muted mb-1">
        SSH Keys
      </label>
      <div class="space-y-2 max-h-32 overflow-y-auto border border-dark-border rounded-lg p-2 bg-dark-bg">
        <label v-for="key in sshKeys" :key="key.id" class="flex items-center cursor-pointer">
          <input
            type="checkbox"
            :value="key.id"
            v-model="form.ssh_keys"
            class="h-4 w-4 text-primary-500 bg-dark-bg border-dark-border rounded
                   focus:ring-primary-500 focus:ring-offset-dark-bg"
          />
          <span class="ml-2 text-sm text-dark-muted">
            {{ key.name }}
          </span>
        </label>
      </div>
      <p class="mt-1 text-xs text-dark-muted">
        {{ form.ssh_keys.length }} key(s) selected
      </p>
    </div>

    <!-- Firewall -->
    <div>
      <label class="block text-sm font-medium text-dark-muted mb-1">
        Firewall (optional)
      </label>
      <select
        v-model="form.firewall_id"
        class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
               focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        <option value="">No firewall</option>
        <option v-for="fw in firewalls" :key="fw.id" :value="fw.id">
          {{ fw.name }}
        </option>
      </select>
    </div>

    <!-- Database Cluster -->
    <div>
      <label class="block text-sm font-medium text-dark-muted mb-1">
        Database Cluster
      </label>
      <select
        v-model="form.database_id"
        required
        class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
               focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        <option value="">Select database...</option>
        <option v-for="db in databases" :key="db.id" :value="db.id">
          {{ db.name }} ({{ db.engine }} {{ db.version }})
        </option>
      </select>
      <p class="mt-1 text-xs text-dark-muted">
        Server will be added to database trusted sources
      </p>
    </div>

    <!-- Options -->
    <div class="space-y-2">
      <div class="flex items-center">
        <input
          v-model="form.enable_backups"
          type="checkbox"
          id="backups"
          class="h-4 w-4 text-primary-500 bg-dark-bg border-dark-border rounded
                 focus:ring-primary-500 focus:ring-offset-dark-bg"
        />
        <label for="backups" class="ml-2 block text-sm text-dark-muted">
          Enable backups (+20% cost)
        </label>
      </div>

      <div class="flex items-center">
        <input
          v-model="form.enable_cloudflare_proxy"
          type="checkbox"
          id="proxy"
          class="h-4 w-4 text-primary-500 bg-dark-bg border-dark-border rounded
                 focus:ring-primary-500 focus:ring-offset-dark-bg"
        />
        <label for="proxy" class="ml-2 block text-sm text-dark-muted">
          Enable Cloudflare Proxy (main domain only)
        </label>
      </div>
    </div>

    <!-- Submit Button -->
    <button
      type="submit"
      :disabled="deploying"
      class="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg
             transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {{ deploying ? 'Deploying...' : 'Deploy Server' }}
    </button>
  </form>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '../services/api';

const emit = defineEmits(['deploy']);

const regions = ref([]);
const vpcs = ref([]);
const reservedIPs = ref([]);
const sshKeys = ref([]);
const firewalls = ref([]);
const databases = ref([]);
const loadingVPCs = ref(false);
const deploying = ref(false);

const form = reactive({
  server_name: '',
  droplet_region: '',
  vpc_uuid: '',
  droplet_size: 's-2vcpu-4gb',
  branch: 'master',
  reserved_ip: '',
  ssh_keys: [],
  firewall_id: '',
  database_id: '',
  enable_backups: false,
  enable_cloudflare_proxy: false,
});

onMounted(async () => {
  const [regionsResult, ipsResult, keysResult, firewallsResult, databasesResult] = await Promise.all([
    api.getRegions(),
    api.getReservedIPs(),
    api.getSSHKeys(),
    api.getFirewalls(),
    api.getDatabases(),
  ]);

  if (regionsResult.success) regions.value = regionsResult.regions;
  if (ipsResult.success) reservedIPs.value = ipsResult.reserved_ips;
  if (keysResult.success) sshKeys.value = keysResult.ssh_keys;
  if (firewallsResult.success) firewalls.value = firewallsResult.firewalls;
  if (databasesResult.success) databases.value = databasesResult.databases;
});

async function loadVPCs() {
  if (!form.droplet_region) return;

  loadingVPCs.value = true;
  form.vpc_uuid = '';

  const result = await api.getVPCs(form.droplet_region);
  if (result.success) {
    vpcs.value = result.vpcs;
  }

  loadingVPCs.value = false;
}

function handleSubmit() {
  deploying.value = true;
  emit('deploy', { ...form });
}

defineExpose({
  resetForm() {
    deploying.value = false;
    form.server_name = '';
    form.vpc_uuid = '';
    form.reserved_ip = '';
    form.ssh_keys = [];
    form.firewall_id = '';
    form.database_id = '';
    form.enable_backups = false;
  }
});
</script>
