import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useDeploymentsStore } from '../stores/deployments'
import { API_BASE_URL } from '../config/api'

export function useDeploymentStream() {
  const deploymentsStore = useDeploymentsStore()
  const isStreaming = ref(false)
  // Removed: currentStep and currentMessage refs (unused - data is in Pinia store)
  let activeReader = null // Track active reader for cleanup
  let abortController = null // Track AbortController for proper request cancellation

  async function startDeployment(config) {
    isStreaming.value = true

    // Create AbortController for this deployment stream
    abortController = new AbortController()

    // Reset and initialize deployment progress
    deploymentsStore.resetDeploymentProgress()
    deploymentsStore.setDeploying()

    // Store deployment config in Pinia for later use (e.g., application deployment)
    deploymentsStore.activeDeployment = {
      server_name: config.server_name,
      branch: config.branch,
      deployment_profile: config.deployment_profile,
      region: config.droplet_region,
      started_at: new Date().toISOString()
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Client-Id': import.meta.env.VITE_CF_ACCESS_CLIENT_ID || '',
          'CF-Access-Client-Secret': import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET || '',
        },
        body: JSON.stringify(config),
        signal: abortController.signal // Add abort signal for proper cleanup
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      activeReader = reader // Store for cleanup
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          console.log('[SSE] Stream completed')
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const event = JSON.parse(data)
              console.log('[SSE] Event:', event)

              // Update Pinia store progress (currentStep/currentMessage removed - unused)
              deploymentsStore.updateProgress(event.step, event.message, getProgressPercentage(event.step))

              // Show toast for major milestones
              if (event.step === 'droplet') {
                toast.info('Creating droplet...', {
                  description: event.message
                })
              } else if (event.step === 'dns') {
                toast.info('Configuring DNS...', {
                  description: event.message
                })
              } else if (event.step === 'completed') {
                deploymentsStore.setComplete({
                  droplet_id: event.droplet_id,
                  ip_address: event.ip_address
                })
                toast.success('Deployment completed!', {
                  description: event.message
                })
                // Refresh deployments list to show the final status
                deploymentsStore.fetchDeployments()
              } else if (event.step === 'failed') {
                deploymentsStore.setError(event.message)
                toast.error('Deployment failed', {
                  description: event.message
                })
                // Refresh deployments list to show the final status
                deploymentsStore.fetchDeployments()
              }
            } catch (e) {
              console.error('[SSE] Failed to parse event:', data, e)
            }
          }
        }
      }

      isStreaming.value = false
      activeReader = null
      abortController = null
      return { success: true }

    } catch (error) {
      console.error('[SSE] Stream error:', error)
      isStreaming.value = false
      activeReader = null
      abortController = null

      // Don't show error toast if request was aborted (user navigated away)
      if (error.name !== 'AbortError') {
        toast.error('Deployment failed', {
          description: error.message
        })
      }
      return { success: false, error: error.message }
    }
  }

  // Cleanup function to cancel active stream
  function cleanup() {
    console.log('[SSE] Cleanup called, isStreaming:', isStreaming.value)

    // Abort the fetch request (most reliable way to stop SSE)
    if (abortController) {
      console.log('[SSE] Aborting fetch request')
      abortController.abort()
      abortController = null
    }

    // Also cancel the reader if it exists
    if (activeReader) {
      console.log('[SSE] Cancelling reader')
      try {
        activeReader.cancel()
      } catch (e) {
        console.error('[SSE] Error cancelling reader:', e)
      }
      activeReader = null
    }

    isStreaming.value = false
  }

  function getProgressPercentage(step) {
    const stepProgressMap = {
      'secrets': 10,
      'template': 20,
      'droplet': 40,
      'active': 50,
      'reserved_ip': 55,
      'firewall': 60,
      'dns': 70,
      'tags': 80,
      'database_update': 90,
      'completed': 100,
      'failed': 0
    }
    return stepProgressMap[step] || 0
  }

  return {
    isStreaming,
    startDeployment,
    cleanup
  }
}
