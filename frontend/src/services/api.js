// NOC Platform API Client
// Communicates with Worker API

import { API_BASE_URL } from '../config/api';

class ApiClient {
  // Get auth headers with service token credentials
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      // Service token authentication (Cloudflare Access)
      'CF-Access-Client-Id': import.meta.env.VITE_CF_ACCESS_CLIENT_ID || '',
      'CF-Access-Client-Secret': import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET || '',
    };
  }

  async get(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async post(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async delete(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  // Get all available regions
  async getRegions() {
    return this.get('/api/regions');
  }

  // Get VPCs filtered by region
  async getVPCs(region) {
    return this.get(`/api/vpcs?region=${region}`);
  }

  // Get all deployed servers
  async getServers() {
    return this.get('/api/servers');
  }

  // Delete server by name
  async deleteServer(name) {
    return this.delete(`/api/servers/${name}`);
  }

  // Get available reserved IPs
  async getReservedIPs() {
    return this.get('/api/reserved-ips');
  }

  // Get SSH keys
  async getSSHKeys() {
    return this.get('/api/ssh-keys');
  }

  // Get firewalls
  async getFirewalls() {
    return this.get('/api/firewalls');
  }

  // Get database clusters
  async getDatabases() {
    return this.get('/api/databases');
  }

  // Deploy new server (returns Response for SSE streaming)
  deployServer(data) {
    return fetch(`${API_BASE_URL}/api/deploy`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
  }

  // Deploy application to provisioned server (triggers GitHub Actions)
  async deployApplication(data) {
    return this.post('/api/deploy/application', data);
  }

  // ========================================
  // DEPLOYMENTS
  // ========================================

  // Get deployment history with optional filters
  async getDeployments(filters = {}) {
    const params = new URLSearchParams();
    if (filters.server_name) params.append('server_name', filters.server_name);
    if (filters.status) params.append('status', filters.status);
    if (filters.deployment_type) params.append('deployment_type', filters.deployment_type);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const query = params.toString();
    return this.get(`/api/deployments${query ? '?' + query : ''}`);
  }

  // Get deployment statistics
  async getDeploymentStats() {
    return this.get('/api/deployments/stats');
  }

  // ========================================
  // SERVER TAGS
  // ========================================

  // Get tags for a specific server
  async getServerTags(serverName) {
    return this.get(`/api/servers/${serverName}/tags`);
  }

  // Add a tag to a server
  async addServerTag(serverName, tag) {
    return this.post(`/api/servers/${serverName}/tags`, { tag });
  }

  // Remove a tag from a server
  async removeServerTag(serverName, tag) {
    return this.delete(`/api/servers/${serverName}/tags/${tag}`);
  }

  // Get all unique tags across all servers
  async getAllTags() {
    return this.get('/api/tags');
  }
}

export default new ApiClient();
