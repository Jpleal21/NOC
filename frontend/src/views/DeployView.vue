<template>
  <div class="page-container">
    <!-- Page Header -->
    <PageHeader
      title="Deploy New Server"
      subtitle="Provision a new FlaggerLink server"
    >
      <template #actions>
        <router-link
          to="/"
          class="px-4 py-2 bg-dark-hover text-white rounded-lg hover:bg-dark-border transition-colors"
        >
          ← Back to Dashboard
        </router-link>
      </template>
    </PageHeader>

    <!-- Deployment Form -->
    <div class="bg-dark-surface rounded-lg border border-dark-border p-6">
      <DeploymentForm @deploy="handleDeploy" ref="formRef" />
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import DeploymentForm from '../components/DeploymentForm.vue'
import { useDeploymentStream } from '../composables/useDeploymentStream'
import { toast } from 'vue-sonner'

const router = useRouter()
const { startDeployment, isStreaming, currentStep, currentMessage, cleanup } = useDeploymentStream()
const formRef = ref(null)

// Cleanup SSE stream on unmount to prevent memory leak
onBeforeUnmount(() => {
  cleanup()
})

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
