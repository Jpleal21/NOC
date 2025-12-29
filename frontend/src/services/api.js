// NOC Platform API Client
// Communicates with Worker API

const API_BASE_URL = import.meta.env.DEV 
  ? '/api' // Proxied to Worker dev server in dev mode
  : 'https://noc-api.flaggerlink.com';

class ApiClient {
  async get(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    return response.json();
  }

  async post(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async delete(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
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

  // Deploy new server (returns EventSource for SSE)
  deployServer(data) {
    return fetch(`${API_BASE_URL}/api/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }
}

export default new ApiClient();
