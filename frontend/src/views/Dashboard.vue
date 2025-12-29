<template>
  <div class="min-h-screen bg-gray-50 dark:bg-dark-bg">
    <header class="bg-white dark:bg-dark-card shadow">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          NOC Platform
        </h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          FlaggerLink Infrastructure Management
        </p>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Deployment Form (Left) -->
          <div class="lg:col-span-1">
            <DeploymentForm
              ref="deploymentForm"
              @deploy="handleDeploy"
            />
          </div>

          <!-- Server List (Right) -->
          <div class="lg:col-span-2">
            <ServerList
              :servers="servers"
              :loading="loadingServers"
              @refresh="loadServers"
              @delete="handleDelete"
              @deploy="handleDeployToServer"
            />
          </div>
        </div>

        <!-- Deployment Progress -->
        <DeploymentProgress
          ref="progress"
          @deployApplication="handleDeployApplication"
        />

        <!-- Delete Confirmation Modal -->
        <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white dark:bg-dark-card rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
              Delete Server
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
              This will permanently destroy the droplet and remove all DNS records.
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Type <strong class="text-gray-900 dark:text-white">{{ serverToDelete }}</strong> to confirm:
            </p>

            <input
              v-model="deleteConfirmation"
              type="text"
              placeholder="Enter server name"
              class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg mb-4
                     bg-white dark:bg-dark-card text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-red-500"
              @keyup.enter="confirmDelete"
            />

            <div class="flex space-x-3">
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
                class="flex-1 px-4 py-2 bg-gray-200 dark:bg-dark-hover hover:bg-gray-300 dark:hover:bg-dark-border
                       text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Branch Selection Modal -->
        <div v-if="showBranchModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white dark:bg-dark-card rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Deploy Application to {{ selectedServer?.name }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              IP: {{ selectedServer?.ip_address }}
            </p>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Branch
              </label>
              <select
                v-model="selectedBranch"
                class="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg
                       bg-white dark:bg-dark-card text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-primary-500"
              >
                <option value="master">master (Production)</option>
                <option value="staging">staging (Staging)</option>
                <option value="development">development (Development)</option>
              </select>
            </div>

            <div class="flex space-x-3">
              <button
                @click="confirmDeploy"
                class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
              >
                Deploy
              </button>
              <button
                @click="showBranchModal = false"
                class="flex-1 px-4 py-2 bg-gray-200 dark:bg-dark-hover hover:bg-gray-300 dark:hover:bg-dark-border
                       text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';
import DeploymentForm from '../components/DeploymentForm.vue';
import ServerList from '../components/ServerList.vue';
import DeploymentProgress from '../components/DeploymentProgress.vue';

const servers = ref([]);
const loadingServers = ref(false);
const deploymentForm = ref(null);
const progress = ref(null);
const lastDeploymentData = ref(null);
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
  progress.value.reset();
  progress.value.setDeploying();

  // Store deployment data for Phase 2
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
            deploymentForm.value.resetForm();
            await loadServers();
          } else if (data.step === 'error') {
            progress.value.updateLastStep('error', data.message);
            progress.value.setError(data.message);
            deploymentForm.value.resetForm();
          }
        }
      }
    }
  } catch (error) {
    progress.value.setError(error.message);
    deploymentForm.value.resetForm();
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
    alert('Server deleted successfully');
  } else {
    alert('Failed to delete server: ' + result.error);
  }

  serverToDelete.value = '';
  deleteConfirmation.value = '';
}

async function handleDeployApplication(data) {
  if (!lastDeploymentData.value) {
    alert('No deployment data available');
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
      alert('Failed to start application deployment: ' + result.error);
      progress.value.setApplicationDeploymentError();
    }
  } catch (error) {
    alert('Error starting application deployment: ' + error.message);
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

  try {
    const result = await api.deployApplication({
      droplet_id: selectedServer.value.id,
      droplet_ip: selectedServer.value.ip_address,
      server_name: selectedServer.value.name,
      branch: selectedBranch.value,
    });

    if (result.success) {
      alert(`Application deployment started!\n\nServer: ${selectedServer.value.name}\nBranch: ${selectedBranch.value}\n\nView progress: ${result.workflow_url}`);
      window.open(result.workflow_url, '_blank');
    } else {
      alert('Failed to start application deployment: ' + result.error);
    }
  } catch (error) {
    alert('Error starting application deployment: ' + error.message);
  }
}
</script>
