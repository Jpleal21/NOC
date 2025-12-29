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
            />
          </div>
        </div>

        <!-- Deployment Progress -->
        <DeploymentProgress
          ref="progress"
          @deployApplication="handleDeployApplication"
        />
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

async function handleDelete(serverName) {
  if (!confirm('Are you sure you want to delete ' + serverName + '? This will destroy the droplet and remove all DNS records.')) {
    return;
  }

  const result = await api.deleteServer(serverName);
  if (result.success) {
    await loadServers();
    alert('Server deleted successfully');
  } else {
    alert('Failed to delete server: ' + result.error);
  }
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
</script>
