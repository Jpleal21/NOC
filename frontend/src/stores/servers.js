import { defineStore } from 'pinia'
import api from '../services/api'

export const useServersStore = defineStore('servers', {
  state: () => ({
    // All servers list
    servers: [],

    // Loading states
    loading: false,
    loadingTags: {}
  }),

  getters: {
    // Get server by name
    getServerByName: (state) => (serverName) => {
      return state.servers.find(s => s.name === serverName)
    },

    // Get servers by status
    getServersByStatus: (state) => (status) => {
      return state.servers.filter(s => s.status === status)
    },

    // Count servers by status
    serverStats: (state) => {
      const stats = {
        total: state.servers.length,
        active: 0,
        new: 0,
        off: 0
      }

      state.servers.forEach(s => {
        if (s.status === 'active') stats.active++
        else if (s.status === 'new') stats.new++
        else if (s.status === 'off') stats.off++
      })

      return stats
    }
  },

  actions: {
    // Fetch all servers with tags
    async fetchServers(options = {}) {
      this.loading = true

      try {
        console.log('[ServersStore] Fetching servers from API')
        const result = await api.getServers(options.signal)

        if (result.success) {
          console.log('[ServersStore] Received', result.servers.length, 'servers')

          // Load tags for each server
          const serversWithTags = await Promise.all(
            result.servers.map(async (server) => {
              const tagsResult = await api.getServerTags(server.name, options.signal)
              return {
                ...server,
                tags: tagsResult.success ? tagsResult.tags : []
              }
            })
          )

          this.servers = serversWithTags
          console.log('[ServersStore] Servers loaded with tags')
        }
      } catch (error) {
        console.error('[ServersStore] Failed to fetch servers:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // Delete server
    async deleteServer(serverName) {
      try {
        console.log('[ServersStore] Deleting server:', serverName)
        const result = await api.deleteServer(serverName)

        if (result.success) {
          // Remove from local state
          this.servers = this.servers.filter(s => s.name !== serverName)
          console.log('[ServersStore] Server deleted successfully')
        }

        return result
      } catch (error) {
        console.error('[ServersStore] Failed to delete server:', error)
        throw error
      }
    },

    // Update server tags locally
    updateServerTags(serverName, tags) {
      const server = this.servers.find(s => s.name === serverName)
      if (server) {
        server.tags = tags
        console.log('[ServersStore] Updated tags for', serverName)
      }
    }
  }
})
