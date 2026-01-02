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
          <!-- Tab Navigation -->
          <nav class="flex items-center space-x-1 mr-4">
            <router-link
              v-for="tab in tabs"
              :key="tab.id"
              :to="tab.route"
              class="px-3 py-2 text-sm rounded-lg transition-colors flex items-center space-x-2"
              :class="$route.path === tab.route ? 'bg-primary-500 text-white' : 'text-dark-muted hover:text-white hover:bg-dark-hover'"
            >
              <component :is="tab.icon" />
              <span>{{ tab.name }}</span>
              <span v-if="tab.count !== undefined" class="ml-1 px-1.5 py-0.5 bg-dark-bg rounded text-xs">{{ tab.count }}</span>
            </router-link>
          </nav>

          <!-- Dark Mode Toggle (Quick Access) -->
          <button
            @click="settingsStore.toggleDarkMode"
            class="p-2 text-dark-muted hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
            title="Toggle dark mode"
          >
            <svg v-if="settingsStore.darkMode" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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
        @deployApplication="handleDeployApplication"
        class="mb-6"
      />

      <!-- Route Content -->
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, h } from 'vue';
import { toast } from 'vue-sonner';
import api from '../services/api';
import DeploymentProgress from '../components/DeploymentProgress.vue';
import { useDeploymentsStore } from '../stores/deployments';
import { useSettingsStore } from '../stores/settings';

// Tab definitions
const tabs = ref([
  {
    id: 'servers',
    name: 'Servers',
    route: '/servers',
    count: 0,
    icon: () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' })
    ]),
  },
  {
    id: 'deployments',
    name: 'Deployments',
    route: '/deployments',
    icon: () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
    ]),
  },
  {
    id: 'dns',
    name: 'DNS',
    route: '/dns',
    icon: () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9' })
    ]),
  },
  {
    id: 'settings',
    name: 'Settings',
    route: '/settings',
    icon: () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }),
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' })
    ]),
  },
]);

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
