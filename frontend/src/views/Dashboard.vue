<template>
  <div class="min-h-screen bg-dark-bg">
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
        <div class="flex items-center space-x-3">
          <!-- Navigation Links -->
          <nav class="flex items-center space-x-2 mr-4">
            <router-link
              to="/servers"
              class="px-3 py-2 text-sm text-dark-muted hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
            >
              Servers
            </router-link>
            <router-link
              to="/deployments"
              class="px-3 py-2 text-sm text-dark-muted hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
            >
              Deployments
            </router-link>
          </nav>

          <!-- Dark Mode Toggle (Quick Access) -->
          <button
            @click="toggleDarkMode"
            class="p-2 text-dark-muted hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
            title="Toggle dark mode"
          >
            <svg v-if="darkMode" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
            </svg>
          </button>
          <!-- Deploy Button -->
          <router-link
            to="/deploy"
            class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg
                   transition-colors flex items-center space-x-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Deploy New Server</span>
          </router-link>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <!-- Deployment Progress (Always visible at top when active) -->
      <DeploymentProgress
        ref="progress"
        @deployApplication="handleDeployApplication"
        class="mb-6"
      />

      <!-- Tab Navigation -->
      <Tabs :tabs="tabs" :active-tab="activeTab" @change="activeTab = $event" class="mb-6" />

      <!-- Tab Content -->
      <ServersTab
        v-if="activeTab === 'servers'"
        :servers="servers"
        :loading="loadingServers"
        @refresh="loadServers"
        @delete="handleDelete"
        @deploy="handleDeployToServer"
        @manage-tags="handleManageTags"
      />

      <DeploymentsTab
        v-if="activeTab === 'deployments'"
        :deployments="deployments"
        :loading="loadingDeployments"
        @refresh="loadDeployments"
      />

      <DNSTab
        v-if="activeTab === 'dns'"
        :records="dnsRecords"
        :loading="loadingDNS"
        @refresh="loadDNS"
      />

      <SettingsTab
        v-if="activeTab === 'settings'"
        :dark-mode="darkMode"
        @toggle-dark-mode="toggleDarkMode"
      />
    </main>

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

    <!-- Tags Management Modal -->
    <TagsModal
      v-if="showTagsModal"
      :server="selectedServerForTags"
      @close="showTagsModal = false"
      @tags-updated="handleTagsUpdated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue';
import { toast } from 'vue-sonner';
import api from '../services/api';
import DeploymentProgress from '../components/DeploymentProgress.vue';
import Tabs from '../components/Tabs.vue';
import ServersTab from '../components/tabs/ServersTab.vue';
import DeploymentsTab from '../components/tabs/DeploymentsTab.vue';
import DNSTab from '../components/tabs/DNSTab.vue';
import SettingsTab from '../components/tabs/SettingsTab.vue';
import TagsModal from '../components/TagsModal.vue';

// Tab definitions
const tabs = ref([
  {
    id: 'servers',
    name: 'Servers',
    count: 0,
    icon: () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' })
    ]),
  },
  {
    id: 'deployments',
    name: 'Deployments',
    icon: () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
    ]),
  },
  {
    id: 'dns',
    name: 'DNS',
    icon: () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' })
    ]),
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }),
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' })
    ]),
  },
]);

const activeTab = ref('servers');
const servers = ref([]);
const deployments = ref([]);
const dnsRecords = ref([]);
const loadingServers = ref(false);
const loadingDeployments = ref(false);
const loadingDNS = ref(false);
const progress = ref(null);
const lastDeploymentData = ref(null);
const showBranchModal = ref(false);
const selectedServer = ref(null);
const selectedBranch = ref('master');
const showDeleteModal = ref(false);
const serverToDelete = ref('');
const deleteConfirmation = ref('');

// Tags modal
const showTagsModal = ref(false);
const selectedServerForTags = ref(null);

// Settings
const darkMode = ref(true);
onMounted(() => {
  loadServers();
  loadDeployments();
  loadDarkMode();
});

function loadDarkMode() {
  const saved = localStorage.getItem('noc-dark-mode');
  darkMode.value = saved !== 'false'; // Default to true
}

function toggleDarkMode() {
  darkMode.value = !darkMode.value;
  localStorage.setItem('noc-dark-mode', darkMode.value.toString());
}

async function loadServers() {
  loadingServers.value = true;
  try {
    const result = await api.getServers();
    if (result.success) {
      // Load tags for each server
      const serversWithTags = await Promise.all(
        result.servers.map(async (server) => {
          const tagsResult = await api.getServerTags(server.name);
          return {
            ...server,
            tags: tagsResult.success ? tagsResult.tags : [],
          };
        })
      );
      servers.value = serversWithTags;
      tabs.value[0].count = serversWithTags.length;
    }
  } catch (error) {
    console.error('Failed to load servers:', error);
    toast.error('Failed to load servers', {
      description: error.message
    });
    servers.value = [];
  } finally {
    loadingServers.value = false;
  }
}

async function loadDeployments() {
  loadingDeployments.value = true;
  try {
    const result = await api.getDeployments({ limit: 50 });
    if (result.success) {
      deployments.value = result.deployments.map(d => ({
        ...d,
        timestamp: d.created_at,
        duration: d.duration ? `${d.duration}s` : null,
      }));
    }
  } catch (error) {
    console.error('Failed to load deployments:', error);
    toast.error('Failed to load deployments', {
      description: error.message
    });
    deployments.value = [];
  } finally {
    loadingDeployments.value = false;
  }
}

async function loadDNS() {
  loadingDNS.value = true;
  // TODO: Implement API call to fetch DNS records
  // For now, generate from servers
  setTimeout(() => {
    dnsRecords.value = servers.value.flatMap(server => [
      { id: `${server.name}-1`, server_name: server.name, name: `${server.name}.flaggerlink.com`, content: server.ip_address, proxied: true },
      { id: `${server.name}-2`, server_name: server.name, name: `${server.name}-api.flaggerlink.com`, content: server.ip_address, proxied: false },
      { id: `${server.name}-3`, server_name: server.name, name: `${server.name}-text-api.flaggerlink.com`, content: server.ip_address, proxied: false },
    ]);
    loadingDNS.value = false;
  }, 500);
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
    toast.success('Server Deleted', {
      description: `${serverToDelete.value} has been destroyed successfully.`
    });
  } else {
    toast.error('Delete Failed', {
      description: result.error
    });
  }

  serverToDelete.value = '';
  deleteConfirmation.value = '';
}

function handleManageTags(server) {
  selectedServerForTags.value = server;
  showTagsModal.value = true;
}

function handleTagsUpdated({ server, tags }) {
  // Update the server's tags in the local servers array
  const serverIndex = servers.value.findIndex(s => s.name === server);
  if (serverIndex !== -1) {
    servers.value[serverIndex].tags = tags;
  }
}

async function handleDeployApplication(data) {
  if (!lastDeploymentData.value) {
    toast.error('Error', {
      description: 'No deployment data available'
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
      toast.error('Deployment Failed', {
        description: result.error
      });
      progress.value.setApplicationDeploymentError();
    }
  } catch (error) {
    toast.error('Error', {
      description: error.message
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
    toast.error('Invalid Server', {
      description: `Cannot deploy to ${selectedServer.value.name} - server is not NOC-managed. Only servers provisioned through NOC can receive application deployments.`,
      duration: 8000
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
      toast.success('Deployment Started', {
        description: `Deploying ${selectedBranch.value} to ${selectedServer.value.name}`,
        duration: 10000,
        action: {
          label: 'View workflow',
          onClick: () => window.open(result.workflow_url, '_blank')
        }
      });
    } else {
      toast.error('Deployment Failed', {
        description: result.error
      });
    }
  } catch (error) {
    toast.error('Error', {
      description: error.message
    });
  }
}
</script>
