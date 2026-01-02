<template>
  <div>
    <!-- Servers Tab Content -->
    <ServersTab
      :servers="servers"
      :loading="loadingServers"
      @refresh="loadServers"
      @delete="handleDelete"
      @deploy="handleDeployToServer"
      @manage-tags="handleManageTags"
    />

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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { toast } from 'vue-sonner';
import api from '../services/api';
import ServersTab from '../components/tabs/ServersTab.vue';
import TagsModal from '../components/TagsModal.vue';
import { useServersStore } from '../stores/servers';

const serversStore = useServersStore();

// Computed properties from store
const servers = computed(() => serversStore.servers);
const loadingServers = computed(() => serversStore.loading);

// Local modal state
const showDeleteModal = ref(false);
const serverToDelete = ref('');
const deleteConfirmation = ref('');
const showBranchModal = ref(false);
const selectedServer = ref(null);
const selectedBranch = ref('master');
const showTagsModal = ref(false);
const selectedServerForTags = ref(null);

// AbortController for cancelling pending requests
const abortController = ref(null);

onMounted(() => {
  loadServers();
});

onBeforeUnmount(() => {
  // Cancel any pending server fetch requests
  if (abortController.value) {
    abortController.value.abort();
    abortController.value = null;
  }
});

async function loadServers() {
  try {
    // Cancel previous request if still pending
    if (abortController.value) {
      abortController.value.abort();
    }

    // Create new AbortController for this request
    abortController.value = new AbortController();

    await serversStore.fetchServers({ signal: abortController.value.signal });

    // Clear AbortController after successful completion
    abortController.value = null;
  } catch (error) {
    // Don't show error if request was aborted
    if (error.name === 'AbortError') {
      console.log('[ServersView] Server fetch aborted');
      return;
    }

    console.error('[ServersView] Failed to load servers:', error);
    toast.error('Failed to load servers', {
      description: error.message
    });
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

  try {
    const result = await serversStore.deleteServer(serverToDelete.value);
    if (result.success) {
      toast.success('Server Deleted', {
        description: `${serverToDelete.value} has been destroyed successfully.`
      });
    } else {
      toast.error('Delete Failed', {
        description: result.error
      });
    }
  } catch (error) {
    console.error('[ServersView] Failed to delete server:', error);
    toast.error('Delete Failed', {
      description: error.message
    });
  }

  serverToDelete.value = '';
  deleteConfirmation.value = '';
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

function handleManageTags(server) {
  selectedServerForTags.value = server;
  showTagsModal.value = true;
}

function handleTagsUpdated({ server, tags }) {
  // Update the server's tags in the Pinia store
  serversStore.updateServerTags(server, tags);
}
</script>
