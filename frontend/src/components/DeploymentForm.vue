<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Two-column grid for main fields -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Left Column -->
      <div class="space-y-4">
        <!-- Server Name -->
        <div>
          <label class="block text-sm font-medium text-dark-muted mb-1">
            Server Name
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

        <!-- Region -->
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
            <option value="">Select...</option>
            <option v-for="region in regions" :key="region.slug" :value="region.slug">
              {{ region.name }}
            </option>
          </select>
        </div>

        <!-- VPC -->
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
            <option value="">{{ loadingVPCs ? 'Loading...' : 'Select...' }}</option>
            <option v-for="vpc in vpcs" :key="vpc.id" :value="vpc.id">
              {{ vpc.name }}
            </option>
          </select>
        </div>

        <!-- Size -->
        <div>
          <label class="block text-sm font-medium text-dark-muted mb-1">
            Size
          </label>
          <select
            v-model="form.droplet_size"
            required
            class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
                   focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="s-2vcpu-4gb">Basic (2 vCPU, 4GB)</option>
            <option value="s-4vcpu-8gb">Standard (4 vCPU, 8GB)</option>
            <option value="s-8vcpu-16gb">Performance (8 vCPU, 16GB)</option>
          </select>
        </div>

        <!-- Branch -->
        <div>
          <label class="block text-sm font-medium text-dark-muted mb-1">
            Branch
          </label>
          <select
            v-model="form.branch"
            required
            class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
                   focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="master">master (Production)</option>
            <option value="staging">staging</option>
            <option value="development">development</option>
          </select>
        </div>

        <!-- Deployment Profile -->
        <div>
          <label class="block text-sm font-medium text-dark-muted mb-1">
            Deployment Profile
          </label>
          <select
            v-model="form.deployment_profile"
            required
            class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
                   focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="core">CORE - Centralized Portal (Default)</option>
            <option value="full">FULL - Dedicated Portal (Standalone)</option>
          </select>
          <p class="mt-1 text-xs text-dark-muted">
            <strong>CORE:</strong> Uses shared portal.flaggerlink.com for login (worker servers)<br>
            <strong>FULL:</strong> Deploys local Portal API + UserPortal (standalone systems)
          </p>
        </div>
      </div>

      <!-- Right Column -->
      <div class="space-y-4">
        <!-- Database -->
        <div>
          <label class="block text-sm font-medium text-dark-muted mb-1">
            Database
          </label>
          <select
            v-model="form.database_id"
            required
            class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
                   focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Select...</option>
            <option v-for="db in databases" :key="db.id" :value="db.id">
              {{ db.name }}
            </option>
          </select>
        </div>

        <!-- SSH Keys -->
        <div>
          <label class="block text-sm font-medium text-dark-muted mb-1">
            SSH Keys ({{ form.ssh_keys.length }})
          </label>
          <div class="space-y-1 max-h-[120px] overflow-y-auto border border-dark-border rounded-lg p-2 bg-dark-bg">
            <label v-for="key in sshKeys" :key="key.id" class="flex items-center cursor-pointer hover:bg-dark-hover px-1 py-0.5 rounded">
              <input
                type="checkbox"
                :value="key.id"
                v-model="form.ssh_keys"
                class="h-4 w-4 text-primary-500 bg-dark-bg border-dark-border rounded
                       focus:ring-primary-500 focus:ring-offset-dark-bg"
              />
              <span class="ml-2 text-xs text-dark-muted">
                {{ key.name }}
              </span>
            </label>
          </div>
        </div>

        <!-- Firewall -->
        <div>
          <label class="block text-sm font-medium text-dark-muted mb-1">
            Firewall
          </label>
          <select
            v-model="form.firewall_id"
            class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
                   focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">None</option>
            <option v-for="fw in firewalls" :key="fw.id" :value="fw.id">
              {{ fw.name }}
            </option>
          </select>
        </div>

        <!-- Reserved IP -->
        <div>
          <label class="block text-sm font-medium text-dark-muted mb-1">
            Reserved IP
          </label>
          <select
            v-model="form.reserved_ip"
            class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
                   focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Ephemeral</option>
            <option v-for="ip in reservedIPs" :key="ip.ip" :value="ip.ip">
              {{ ip.ip }}
            </option>
          </select>
        </div>

        <!-- Tags -->
        <div>
          <label class="block text-sm font-medium text-dark-muted mb-1">
            Tags ({{ form.tags.length }})
          </label>
          <div class="space-y-2">
            <!-- Tag input -->
            <div class="flex space-x-2">
              <input
                v-model="newTag"
                @keyup.enter="addTag"
                type="text"
                placeholder="production, staging..."
                class="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white text-sm
                       placeholder-dark-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                @click="addTag"
                type="button"
                :disabled="!newTag.trim()"
                class="px-3 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-dark-hover
                       disabled:text-dark-muted text-white rounded-lg transition-colors text-sm"
              >
                Add
              </button>
            </div>

            <!-- Suggested tags -->
            <div v-if="suggestedTags.length > 0" class="flex flex-wrap gap-1">
              <button
                v-for="tag in suggestedTags"
                :key="tag"
                @click="addSuggestedTag(tag)"
                type="button"
                class="px-2 py-1 bg-dark-hover hover:bg-primary-500/20 text-dark-muted hover:text-primary-400
                       rounded text-xs transition-colors"
              >
                + {{ tag }}
              </button>
            </div>

            <!-- Current tags -->
            <div v-if="form.tags.length > 0" class="flex flex-wrap gap-1">
              <span
                v-for="tag in form.tags"
                :key="tag"
                class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400"
              >
                {{ tag }}
                <button
                  @click="removeTag(tag)"
                  type="button"
                  class="ml-1 text-blue-400 hover:text-red-400 transition-colors"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Options (full width) -->
    <div class="flex items-center space-x-6 pt-2 border-t border-dark-border">
      <label class="flex items-center cursor-pointer">
        <input
          v-model="form.enable_backups"
          type="checkbox"
          class="h-4 w-4 text-primary-500 bg-dark-bg border-dark-border rounded
                 focus:ring-primary-500 focus:ring-offset-dark-bg"
        />
        <span class="ml-2 text-sm text-dark-muted">
          Backups (+20%)
        </span>
      </label>

      <label class="flex items-center cursor-pointer">
        <input
          v-model="form.enable_cloudflare_proxy"
          type="checkbox"
          class="h-4 w-4 text-primary-500 bg-dark-bg border-dark-border rounded
                 focus:ring-primary-500 focus:ring-offset-dark-bg"
        />
        <span class="ml-2 text-sm text-dark-muted">
          Cloudflare Proxy
        </span>
      </label>
    </div>

    <!-- Submit -->
    <button
      type="submit"
      :disabled="deploying"
      class="w-full px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg
             transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {{ deploying ? 'Deploying...' : 'Deploy Server' }}
    </button>
  </form>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import api from '../services/api';

const emit = defineEmits(['deploy']);

const regions = ref([]);
const vpcs = ref([]);
const reservedIPs = ref([]);
const sshKeys = ref([]);
const firewalls = ref([]);
const databases = ref([]);
const allTags = ref([]);
const loadingVPCs = ref(false);
const deploying = ref(false);
const newTag = ref('');

const form = reactive({
  server_name: '',
  droplet_region: '',
  vpc_uuid: '',
  droplet_size: 's-2vcpu-4gb',
  branch: 'master',
  deployment_profile: 'core',
  reserved_ip: '',
  ssh_keys: [],
  firewall_id: '',
  database_id: '',
  enable_backups: false,
  enable_cloudflare_proxy: false,
  tags: [],
});

// Suggest tags that aren't already added
const suggestedTags = computed(() => {
  return allTags.value.filter(tag => !form.tags.includes(tag));
});

onMounted(async () => {
  const [regionsResult, ipsResult, keysResult, firewallsResult, databasesResult, tagsResult] = await Promise.all([
    api.getRegions(),
    api.getReservedIPs(),
    api.getSSHKeys(),
    api.getFirewalls(),
    api.getDatabases(),
    api.getAllTags(),
  ]);

  if (regionsResult.success) regions.value = regionsResult.regions;
  if (ipsResult.success) reservedIPs.value = ipsResult.reserved_ips;
  if (keysResult.success) sshKeys.value = keysResult.ssh_keys;
  if (firewallsResult.success) firewalls.value = firewallsResult.firewalls;
  if (databasesResult.success) databases.value = databasesResult.databases;
  if (tagsResult.success) allTags.value = tagsResult.tags;
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

function addTag() {
  const tag = newTag.value.trim().toLowerCase();
  if (!tag || form.tags.includes(tag)) {
    newTag.value = '';
    return;
  }
  form.tags.push(tag);
  newTag.value = '';
}

function addSuggestedTag(tag) {
  if (!form.tags.includes(tag)) {
    form.tags.push(tag);
  }
}

function removeTag(tag) {
  form.tags = form.tags.filter(t => t !== tag);
}

function handleSubmit() {
  deploying.value = true;
  emit('deploy', { ...form });
}

defineExpose({
  resetForm() {
    deploying.value = false;
    form.server_name = '';
    form.droplet_region = '';
    form.vpc_uuid = '';
    form.droplet_size = 's-2vcpu-4gb';
    form.branch = 'master';
    form.deployment_profile = 'core';
    form.reserved_ip = '';
    form.ssh_keys = [];
    form.firewall_id = '';
    form.database_id = '';
    form.enable_backups = false;
    form.enable_cloudflare_proxy = false;
    form.tags = [];
    newTag.value = '';
  }
});
</script>
