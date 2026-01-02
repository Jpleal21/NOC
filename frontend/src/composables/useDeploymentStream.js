import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { useDeploymentsStore } from '../stores/deployments'
import { API_BASE_URL } from '../config/api'

export function useDeploymentStream() {
  const deploymentsStore = useDeploymentsStore()
  const isStreaming = ref(false)
  const currentStep = ref(null)
  const currentMessage = ref(null)
  let activeReader = null // Track active reader for cleanup

  async function startDeployment(config) {
    isStreaming.value = true
    currentStep.value = null
    currentMessage.value = null

    try {
      const response = await fetch(`${API_BASE_URL}/api/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Client-Id': import.meta.env.VITE_CF_ACCESS_CLIENT_ID || '',
          'CF-Access-Client-Secret': import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET || '',
        },
        body: JSON.stringify(config)
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

              currentStep.value = event.step
              currentMessage.value = event.message

              // Update Pinia store progress
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
                toast.success('Deployment completed!', {
                  description: event.message
                })
              }
            } catch (e) {
              console.error('[SSE] Failed to parse event:', data, e)
            }
          }
        }
      }

      isStreaming.value = false
      activeReader = null
      return { success: true }

    } catch (error) {
      console.error('[SSE] Stream error:', error)
      isStreaming.value = false
      activeReader = null
      toast.error('Deployment failed', {
        description: error.message
      })
      return { success: false, error: error.message }
    }
  }

  // Cleanup function to cancel active stream
  function cleanup() {
    if (activeReader) {
      activeReader.cancel()
      activeReader = null
      isStreaming.value = false
      console.log('[SSE] Stream cancelled on cleanup')
    }
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
    currentStep,
    currentMessage,
    startDeployment,
    cleanup
  }
}
