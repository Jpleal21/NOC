<template>
  <div class="card p-6">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
      Deploy New Server
    </h2>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Server Name -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Server Name (NATO phonetic)
        </label>
        <input
          v-model="form.server_name"
          type="text"
          placeholder="alpha"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg
                 bg-white dark:bg-dark-card text-gray-900 dark:text-white
                 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <!-- Region Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Region
        </label>
        <select
          v-model="form.droplet_region"
          @change="loadVPCs"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg
                 bg-white dark:bg-dark-card text-gray-900 dark:text-white
                 focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select region...</option>
          <option v-for="region in regions" :key="region.slug" :value="region.slug">
            {{ region.name }}
          </option>
        </select>
      </div>

      <!-- VPC Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          VPC
        </label>
        <select
          v-model="form.vpc_uuid"
          :disabled="!form.droplet_region || loadingVPCs"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg
                 bg-white dark:bg-dark-card text-gray-900 dark:text-white
                 focus:ring-2 focus:ring-primary-500
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
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Droplet Size
        </label>
        <select
          v-model="form.droplet_size"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg
                 bg-white dark:bg-dark-card text-gray-900 dark:text-white
                 focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select size...</option>
          <option value="s-2vcpu-4gb">Basic (2 vCPU, 4GB RAM)</option>
          <option value="s-4vcpu-8gb">Standard (4 vCPU, 8GB RAM)</option>
          <option value="s-8vcpu-16gb">Performance (8 vCPU, 16GB RAM)</option>
        </select>
      </div>

      <!-- Branch Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          FlaggerLink Branch
        </label>
        <select
          v-model="form.branch"
          required
          class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg
                 bg-white dark:bg-dark-card text-gray-900 dark:text-white
                 focus:ring-2 focus:ring-primary-500"
        >
          <option value="master">master (Production)</option>
          <option value="staging">staging (Staging)</option>
          <option value="development">development (Development)</option>
        </select>
      </div>

      <!-- Cloudflare Proxy -->
      <div class="flex items-center">
        <input
          v-model="form.enable_cloudflare_proxy"
          type="checkbox"
          id="proxy"
          class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label for="proxy" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">
          Enable Cloudflare Proxy (main domain only)
        </label>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="deploying"
        class="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg
               transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ deploying ? 'Deploying...' : 'Deploy Server' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '../services/api';

const emit = defineEmits(['deploy']);

const regions = ref([]);
const vpcs = ref([]);
const loadingVPCs = ref(false);
const deploying = ref(false);

const form = reactive({
  server_name: '',
  droplet_region: '',
  vpc_uuid: '',
  droplet_size: 's-2vcpu-4gb',
  branch: 'master',
  enable_cloudflare_proxy: false,
});

onMounted(async () => {
  const result = await api.getRegions();
  if (result.success) {
    regions.value = result.regions;
  }
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
  }
});
</script>
