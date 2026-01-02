import { defineStore } from 'pinia'
import api from '../services/api'

export const useDeploymentsStore = defineStore('deployments', {
  state: () => ({
    // Active deployment (currently in progress)
    activeDeployment: null,

    // All deployments history
    deployments: [],

    // Loading states
    loading: false,
    loadingHistory: false,

    // Deployment progress (consolidated from DeploymentProgress component)
    deploymentProgress: {
      isDeploying: false,
      deploymentComplete: false,
      deploymentError: null,
      deploymentResult: null,
      steps: [],
      applicationDeploying: false,
      applicationDeployed: false,
      workflowUrl: null,
      // Legacy fields for SSE updates
      status: null,
      message: null,
      percentage: 0
    }
  }),

  getters: {
    // Get deployment by server name
    getDeploymentByServer: (state) => (serverName) => {
      return state.deployments.find(d => d.server_name === serverName)
    },

    // Get recent deployments (last 10)
    recentDeployments: (state) => {
      return state.deployments
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
    },

    // Get deployments by status
    getDeploymentsByStatus: (state) => (status) => {
      return state.deployments.filter(d => d.status === status)
    },

    // Count deployments by status
    deploymentStats: (state) => {
      const stats = {
        total: state.deployments.length,
        in_progress: 0,
        completed: 0,
        failed: 0
      }

      state.deployments.forEach(d => {
        if (d.status === 'in_progress') stats.in_progress++
        else if (d.status === 'completed') stats.completed++
        else if (d.status === 'failed') stats.failed++
      })

      return stats
    }
  },

  actions: {
    // Fetch deployment history
    async fetchDeployments() {
      this.loadingHistory = true

      try {
        const result = await api.getDeployments()

        if (result.success) {
          this.deployments = result.deployments || []
        }
      } catch (error) {
        console.error('Failed to fetch deployments:', error)
      } finally {
        this.loadingHistory = false
      }
    },

    // Update deployment status (called from SSE)
    updateDeploymentStatus(deploymentId, status, message = null) {
      const deployment = this.deployments.find(d => d.id === deploymentId)

      if (deployment) {
        deployment.status = status

        if (message) {
          deployment.last_message = message
        }
      }

      if (this.activeDeployment?.id === deploymentId) {
        this.activeDeployment.status = status
      }
    },

    // Update deployment progress (called from SSE) - now also builds steps
    updateProgress(status, message, percentage) {
      this.deploymentProgress.status = status
      this.deploymentProgress.message = message
      this.deploymentProgress.percentage = percentage

      // Add step if message changed
      if (message && (!this.deploymentProgress.steps.length ||
          this.deploymentProgress.steps[this.deploymentProgress.steps.length - 1].message !== message)) {
        this.addStep(message, 'loading')
      }
    },

    // Deployment Progress Actions (consolidated from DeploymentProgress component)
    addStep(message, status = 'loading', details = null) {
      this.deploymentProgress.steps.push({ message, status, details })
    },

    updateLastStep(status, details = null) {
      if (this.deploymentProgress.steps.length > 0) {
        const lastStep = this.deploymentProgress.steps[this.deploymentProgress.steps.length - 1]
        lastStep.status = status
        if (details) {
          lastStep.details = details
        }
      }
    },

    setDeploying() {
      this.deploymentProgress.isDeploying = true
      this.deploymentProgress.deploymentComplete = false
      this.deploymentProgress.deploymentError = null
    },

    setComplete(result) {
      this.deploymentProgress.deploymentComplete = true
      this.deploymentProgress.isDeploying = false
      this.deploymentProgress.deploymentResult = result
      this.updateLastStep('complete')
    },

    setError(error) {
      this.deploymentProgress.deploymentError = error
      this.deploymentProgress.isDeploying = false
      this.updateLastStep('error')
    },

    setApplicationDeploymentStarted(url) {
      this.deploymentProgress.applicationDeploying = false
      this.deploymentProgress.applicationDeployed = true
      this.deploymentProgress.workflowUrl = url
    },

    setApplicationDeploymentError() {
      this.deploymentProgress.applicationDeploying = false
      this.deploymentProgress.applicationDeployed = false
    },

    resetDeploymentProgress() {
      this.deploymentProgress = {
        isDeploying: false,
        deploymentComplete: false,
        deploymentError: null,
        deploymentResult: null,
        steps: [],
        applicationDeploying: false,
        applicationDeployed: false,
        workflowUrl: null,
        status: null,
        message: null,
        percentage: 0
      }
    },

    // Clear active deployment
    clearActiveDeployment() {
      this.activeDeployment = null
      this.resetDeploymentProgress()
    }
  }
})
