// NOC Platform API Client
// Communicates with Worker API

const API_BASE_URL = import.meta.env.DEV
  ? '/api' // Proxied to Worker dev server in dev mode
  : 'https://noc-api.flaggerlink.com';

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
    return response.json();
  }

  async post(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async delete(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
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
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
  }

  // Deploy application to provisioned server (triggers GitHub Actions)
  async deployApplication(data) {
    return this.post('/api/deploy/application', data);
  }
}

export default new ApiClient();
