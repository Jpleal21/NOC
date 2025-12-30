<template>
  <div class="min-h-screen bg-dark-bg">
    <!-- Toast notifications -->
    <Toast ref="toast" />

    <!-- Header -->
    <header class="bg-dark-card border-b border-dark-border shadow-lg">
      <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <img src="/logo-small.png" alt="FlaggerLink" class="h-10 w-auto" />
          <div>
            <h1 class="text-2xl font-bold text-white">
              NOC Platform
            </h1>
            <p class="text-sm text-dark-muted">
              Infrastructure Management
            </p>
          </div>
        </div>
        <button
          @click="showDeployModal = true"
          class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg
                 transition-colors flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Deploy New Server</span>
        </button>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <!-- Deployment Progress (Always visible at top when active) -->
      <DeploymentProgress
        ref="progress"
        @deployApplication="handleDeployApplication"
        class="mb-6"
      />

      <!-- Server List (Full width) -->
      <ServerList
        :servers="servers"
        :loading="loadingServers"
        @refresh="loadServers"
        @delete="handleDelete"
        @deploy="handleDeployToServer"
      />
    </main>

    <!-- Deploy New Server Modal -->
    <div v-if="showDeployModal" class="fixed inset-0 bg-black/70 flex items-start justify-center z-50 overflow-y-auto py-8">
      <div class="bg-dark-card border border-dark-border rounded-lg shadow-2xl w-full max-w-lg mx-4 relative">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-4 border-b border-dark-border">
          <h2 class="text-xl font-semibold text-white">Deploy New Server</h2>
          <button
            @click="showDeployModal = false"
            class="text-dark-muted hover:text-white transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <!-- Modal Body -->
        <div class="p-4">
          <DeploymentForm
            ref="deploymentForm"
            @deploy="handleDeploy"
          />
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div class="bg-dark-card border border-dark-border rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-red-400 mb-4">
          Delete Server
        </h3>
        <p class="text-sm text-dark-muted mb-2">
          This will permanently destroy the droplet and remove all DNS records.
        </p>
        <p class="text-sm text-dark-muted mb-4">
          Type <strong class="text-white">{{ serverToDelete }}</strong> to confirm:
        </p>

        <input
          v-model="deleteConfirmation"
          type="text"
          placeholder="Enter server name"
          class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
                 placeholder-dark-muted focus:ring-2 focus:ring-red-500 focus:border-transparent"
          @keyup.enter="confirmDelete"
        />

        <div class="flex space-x-3 mt-4">
          <button
            @click="confirmDelete"
            :disabled="deleteConfirmation !== serverToDelete"
            class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg
                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Server
          </button>
          <button
            @click="cancelDelete"
            class="flex-1 px-4 py-2 bg-dark-hover hover:bg-dark-border text-dark-muted
                   font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Branch Selection Modal -->
    <div v-if="showBranchModal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div class="bg-dark-card border border-dark-border rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-white mb-4">
          Deploy Application to {{ selectedServer?.name }}
        </h3>
        <p class="text-sm text-dark-muted mb-4">
          IP: {{ selectedServer?.ip_address }}
        </p>

        <div class="mb-4">
          <label class="block text-sm font-medium text-dark-muted mb-2">
            Select Branch
          </label>
          <select
            v-model="selectedBranch"
            class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
                   focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="master">master (Production)</option>
            <option value="staging">staging (Staging)</option>
            <option value="development">development (Development)</option>
          </select>
        </div>

        <div class="flex space-x-3">
          <button
            @click="confirmDeploy"
            class="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
          >
            Deploy
          </button>
          <button
            @click="showBranchModal = false"
            class="flex-1 px-4 py-2 bg-dark-hover hover:bg-dark-border text-dark-muted
                   font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';
import DeploymentForm from '../components/DeploymentForm.vue';
import ServerList from '../components/ServerList.vue';
import DeploymentProgress from '../components/DeploymentProgress.vue';
import Toast from '../components/Toast.vue';

const servers = ref([]);
const loadingServers = ref(false);
const deploymentForm = ref(null);
const progress = ref(null);
const toast = ref(null);
const lastDeploymentData = ref(null);
const showDeployModal = ref(false);
const showBranchModal = ref(false);
const selectedServer = ref(null);
const selectedBranch = ref('master');
const showDeleteModal = ref(false);
const serverToDelete = ref('');
const deleteConfirmation = ref('');

onMounted(() => {
  loadServers();
});

async function loadServers() {
  loadingServers.value = true;
  const result = await api.getServers();
  if (result.success) {
    servers.value = result.servers;
  }
  loadingServers.value = false;
}

async function handleDeploy(formData) {
  showDeployModal.value = false;
  progress.value.reset();
  progress.value.setDeploying();

  lastDeploymentData.value = {
    server_name: formData.server_name,
    branch: formData.branch,
  };

  try {
    const response = await api.deployServer(formData);

    if (!response.ok) {
      throw new Error('Deployment request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.step === 'secrets') {
            progress.value.addStep('Fetching secrets from Infisical', 'loading');
          } else if (data.step === 'template') {
            progress.value.updateLastStep('complete');
            progress.value.addStep('Rendering cloud-init template', 'loading');
          } else if (data.step === 'droplet') {
            progress.value.updateLastStep('complete');
            progress.value.addStep('Creating DigitalOcean droplet', 'loading');
          } else if (data.step === 'active') {
            progress.value.updateLastStep('complete');
            progress.value.addStep('Waiting for droplet to become active', 'loading');
          } else if (data.step === 'reserved_ip') {
            progress.value.updateLastStep('complete');
            progress.value.addStep('Assigning reserved IP address', 'loading');
          } else if (data.step === 'firewall') {
            progress.value.updateLastStep('complete');
            progress.value.addStep('Adding droplet to firewall', 'loading');
          } else if (data.step === 'ip') {
            progress.value.updateLastStep('complete');
            progress.value.addStep('Waiting for IP address assignment', 'loading');
          } else if (data.step === 'database') {
            progress.value.updateLastStep('complete');
            progress.value.addStep('Adding to database cluster trusted sources', 'loading');
          } else if (data.step === 'dns') {
            progress.value.updateLastStep('complete');
            progress.value.addStep('Creating DNS records', 'loading');
          } else if (data.step === 'complete') {
            progress.value.updateLastStep('complete');
            progress.value.setComplete(data);
            deploymentForm.value?.resetForm();
            await loadServers();
          } else if (data.step === 'error') {
            progress.value.updateLastStep('error', data.message);
            progress.value.setError(data.message);
            deploymentForm.value?.resetForm();
          }
        }
      }
    }
  } catch (error) {
    progress.value.setError(error.message);
    deploymentForm.value?.resetForm();
  }
}

function handleDelete(serverName) {
  serverToDelete.value = serverName;
  deleteConfirmation.value = '';
  showDeleteModal.value = true;
}

function cancelDelete() {
  showDeleteModal.value = false;
  serverToDelete.value = '';
  deleteConfirmation.value = '';
}

async function confirmDelete() {
  if (deleteConfirmation.value !== serverToDelete.value) {
    return;
  }

  showDeleteModal.value = false;

  const result = await api.deleteServer(serverToDelete.value);
  if (result.success) {
    await loadServers();
    toast.value.addToast({
      type: 'success',
      title: 'Server Deleted',
      message: `${serverToDelete.value} has been destroyed successfully.`,
    });
  } else {
    toast.value.addToast({
      type: 'error',
      title: 'Delete Failed',
      message: result.error,
    });
  }

  serverToDelete.value = '';
  deleteConfirmation.value = '';
}

async function handleDeployApplication(data) {
  if (!lastDeploymentData.value) {
    toast.value.addToast({
      type: 'error',
      title: 'Error',
      message: 'No deployment data available',
    });
    progress.value.setApplicationDeploymentError();
    return;
  }

  try {
    const result = await api.deployApplication({
      droplet_id: data.droplet_id,
      droplet_ip: data.ip_address,
      server_name: lastDeploymentData.value.server_name,
      branch: lastDeploymentData.value.branch,
    });

    if (result.success) {
      progress.value.setApplicationDeploymentStarted(result.workflow_url);
    } else {
      toast.value.addToast({
        type: 'error',
        title: 'Deployment Failed',
        message: result.error,
      });
      progress.value.setApplicationDeploymentError();
    }
  } catch (error) {
    toast.value.addToast({
      type: 'error',
      title: 'Error',
      message: error.message,
    });
    progress.value.setApplicationDeploymentError();
  }
}

function handleDeployToServer(server) {
  selectedServer.value = server;
  selectedBranch.value = 'master';
  showBranchModal.value = true;
}

async function confirmDeploy() {
  showBranchModal.value = false;

  if (!selectedServer.value) return;

  // Validate server is NOC-managed
  if (!selectedServer.value.tags || !selectedServer.value.tags.includes('noc-managed')) {
    toast.value.addToast({
      type: 'error',
      title: 'Invalid Server',
      message: `Cannot deploy to ${selectedServer.value.name} - server is not NOC-managed. Only servers provisioned through NOC can receive application deployments.`,
      duration: 8000,
    });
    return;
  }

  try {
    const result = await api.deployApplication({
      droplet_id: selectedServer.value.id,
      droplet_ip: selectedServer.value.ip_address,
      server_name: selectedServer.value.name,
      branch: selectedBranch.value,
    });

    if (result.success) {
      toast.value.addToast({
        type: 'success',
        title: 'Deployment Started',
        message: `Deploying ${selectedBranch.value} to ${selectedServer.value.name}`,
        link: result.workflow_url,
        linkText: 'View workflow',
        duration: 10000,
      });
    } else {
      toast.value.addToast({
        type: 'error',
        title: 'Deployment Failed',
        message: result.error,
      });
    }
  } catch (error) {
    toast.value.addToast({
      type: 'error',
      title: 'Error',
      message: error.message,
    });
  }
}
</script>
