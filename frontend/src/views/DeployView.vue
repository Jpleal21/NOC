<template>
  <div class="min-h-screen bg-dark-bg">
    <!-- Header -->
    <header class="bg-dark-surface border-b border-dark-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-white">Deploy New Server</h1>
            <p class="text-sm text-dark-muted mt-1">Provision a new FlaggerLink server</p>
          </div>
          <router-link
            to="/"
            class="px-4 py-2 bg-dark-hover text-white rounded-lg hover:bg-dark-border transition-colors"
          >
            ← Back to Dashboard
          </router-link>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-dark-surface rounded-lg border border-dark-border p-6">
        <DeploymentForm @deploy="handleDeploy" ref="formRef" />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import DeploymentForm from '../components/DeploymentForm.vue'
import { useDeploymentStream } from '../composables/useDeploymentStream'
import { toast } from 'vue-sonner'

const router = useRouter()
const { startDeployment, isStreaming, currentStep, currentMessage } = useDeploymentStream()
const formRef = ref(null)

async function handleDeploy(config) {
  toast.info(`Starting deployment for ${config.server_name}`, {
    description: 'Initiating deployment process...'
  })

  const result = await startDeployment(config)

  if (result.success) {
    // Reset form
    formRef.value?.resetForm()

    // Navigate to deployments view
    router.push('/deployments')
  }
  // Error toasts are handled in the composable
}
</script>
