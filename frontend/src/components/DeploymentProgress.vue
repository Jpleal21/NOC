<template>
  <div v-if="isDeploying || showProgress" class="bg-dark-card border border-dark-border rounded-lg shadow-lg p-6">
    <h2 class="text-xl font-semibold text-white mb-4">
      Deployment Progress
    </h2>

    <div class="space-y-3">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="flex items-start space-x-3 p-3 rounded-lg"
        :class="getStepClass(step)"
      >
        <!-- Icon -->
        <div class="flex-shrink-0 mt-0.5">
          <svg v-if="step.status === 'loading'" class="animate-spin h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else-if="step.status === 'complete'" class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <svg v-else-if="step.status === 'error'" class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <div v-else class="h-5 w-5 rounded-full border-2 border-dark-border"></div>
        </div>

        <!-- Message -->
        <div class="flex-1">
          <p class="text-sm font-medium" :class="step.status === 'error' ? 'text-red-400' : 'text-white'">
            {{ step.message }}
          </p>
          <p v-if="step.details" class="text-xs text-dark-muted mt-1">
            {{ step.details }}
          </p>
        </div>
      </div>
    </div>

    <!-- Final Success -->
    <div v-if="deploymentComplete && !deploymentError" class="mt-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <p class="text-sm font-medium text-green-300">
            Infrastructure provisioning complete!
          </p>
          <p v-if="deploymentResult" class="text-xs text-green-400 mt-1">
            IP: {{ deploymentResult.ip_address }} | ID: {{ deploymentResult.droplet_id }}
          </p>
          <p class="text-xs text-green-400 mt-2">
            Next: Deploy FlaggerLink application to this server
          </p>
        </div>
        <button
          v-if="!applicationDeploying && !applicationDeployed"
          @click="emitDeployApplication"
          class="ml-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Deploy Application
        </button>
      </div>

      <!-- Application Deployment Status -->
      <div v-if="applicationDeploying" class="mt-4 pt-4 border-t border-green-700">
        <div class="flex items-center space-x-2">
          <svg class="animate-spin h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-xs text-green-400">
            Deploying application via GitHub Actions...
          </p>
        </div>
        <a
          v-if="workflowUrl"
          :href="workflowUrl"
          target="_blank"
          class="text-xs text-primary-400 hover:text-primary-300 mt-2 inline-block"
        >
          View workflow progress →
        </a>
      </div>

      <div v-if="applicationDeployed" class="mt-4 pt-4 border-t border-green-700">
        <p class="text-xs text-green-400">
          ✓ Application deployment started in GitHub Actions
        </p>
        <a
          v-if="workflowUrl"
          :href="workflowUrl"
          target="_blank"
          class="text-xs text-primary-400 hover:text-primary-300 mt-1 inline-block"
        >
          View workflow →
        </a>
      </div>
    </div>

    <!-- Error -->
    <div v-if="deploymentError" class="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
      <p class="text-sm font-medium text-red-300">
        Deployment failed: {{ deploymentError }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useDeploymentsStore } from '../stores/deployments';

const emit = defineEmits(['deployApplication']);
const deploymentsStore = useDeploymentsStore();

// All state now comes from Pinia store
const progress = computed(() => deploymentsStore.deploymentProgress);
const isDeploying = computed(() => progress.value.isDeploying);
const deploymentComplete = computed(() => progress.value.deploymentComplete);
const deploymentError = computed(() => progress.value.deploymentError);
const deploymentResult = computed(() => progress.value.deploymentResult);
const steps = computed(() => progress.value.steps);
const applicationDeploying = computed(() => progress.value.applicationDeploying);
const applicationDeployed = computed(() => progress.value.applicationDeployed);
const workflowUrl = computed(() => progress.value.workflowUrl);

const showProgress = computed(() => steps.value.length > 0);

function emitDeployApplication() {
  if (!deploymentResult.value) return;

  // Fixed: Don't directly mutate store - state will be set by Dashboard.vue after API call succeeds
  emit('deployApplication', {
    droplet_id: deploymentResult.value.droplet_id,
    ip_address: deploymentResult.value.ip_address,
  });
}

function getStepClass(step) {
  if (step.status === 'loading') {
    return 'bg-primary-900/20 border border-primary-700';
  } else if (step.status === 'complete') {
    return 'bg-green-900/20 border border-green-700';
  } else if (step.status === 'error') {
    return 'bg-red-900/20 border border-red-700';
  }
  return 'bg-dark-hover border border-dark-border';
}
</script>
