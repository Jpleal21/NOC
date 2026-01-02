<template>
  <div class="min-h-screen bg-dark-bg">
    <!-- Sidebar Navigation -->
    <Sidebar />

    <!-- Main Content Area (with sidebar offset) -->
    <main class="main-content">
      <!-- Deployment Progress (Always visible at top when active) -->
      <DeploymentProgress
        @deployApplication="handleDeployApplication"
        class="mb-6"
      />

      <!-- Route Content -->
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { toast } from 'vue-sonner';
import api from '../services/api';
import Sidebar from '../components/Sidebar.vue';
import DeploymentProgress from '../components/DeploymentProgress.vue';
import { useDeploymentsStore } from '../stores/deployments';
import { useSettingsStore } from '../stores/settings';

const deploymentsStore = useDeploymentsStore();
const settingsStore = useSettingsStore();

// Initialize dark mode from localStorage
settingsStore.loadDarkMode();

async function handleDeployApplication(data) {
  const activeDeployment = deploymentsStore.activeDeployment;

  if (!activeDeployment || !activeDeployment.server_name || !activeDeployment.branch) {
    toast.error('Error', {
      description: 'No active deployment data available'
    });
    deploymentsStore.setApplicationDeploymentError();
    return;
  }

  try {
    const result = await api.deployApplication({
      droplet_id: data.droplet_id,
      droplet_ip: data.ip_address,
      server_name: activeDeployment.server_name,
      branch: activeDeployment.branch,
    });

    if (result.success) {
      deploymentsStore.setApplicationDeploymentStarted(result.workflow_url);
      toast.success('Application deployment started', {
        description: `Deploying ${activeDeployment.branch} to ${activeDeployment.server_name}`,
        action: {
          label: 'View workflow',
          onClick: () => window.open(result.workflow_url, '_blank')
        }
      });
    } else {
      toast.error('Deployment Failed', {
        description: result.error
      });
      deploymentsStore.setApplicationDeploymentError();
    }
  } catch (error) {
    toast.error('Error', {
      description: error.message
    });
    deploymentsStore.setApplicationDeploymentError();
  }
}
</script>

<style scoped>
/* Main content area with sidebar offset */
.main-content {
  padding: 1.5rem;
  transition: margin-left 0.3s ease, padding-left 0.3s ease;
}

/* Desktop: offset for sidebar */
@media screen and (min-width: 768px) {
  .main-content {
    margin-left: 60px; /* Sidebar collapsed width */
    padding: 1.5rem 2rem;
  }
}

/* Mobile: add top padding for mobile header */
@media screen and (max-width: 767px) {
  .main-content {
    padding-top: 76px; /* 60px mobile header + 16px spacing */
  }
}
</style>
