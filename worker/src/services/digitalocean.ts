// DigitalOcean API Service
// Handles droplet creation, VPC management, and region queries

interface DropletCreateParams {
  name: string;
  region: string;
  size: string;
  image: string;
  vpc_uuid: string;
  user_data: string;
  tags?: string[];
  ssh_keys?: string[];
  backups?: boolean;
  ipv6?: boolean;
  monitoring?: boolean;
}

export class DigitalOceanService {
  private token: string;
  private baseUrl = 'https://api.digitalocean.com/v2';

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('[DigitalOcean]', options?.method || 'GET', url);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options?.headers,
      },
    });

    console.log('[DigitalOcean] Response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('[DigitalOcean] API error:', error);
      throw new Error(`DigitalOcean API error: ${response.status} - ${error}`);
    }

    // 204 No Content - return empty object
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Get all available regions
  async getRegions() {
    const response = await this.request<{ regions: any[] }>('/regions');
    return response.regions.filter((r: any) => r.available);
  }

  // Get all VPCs
  async getVPCs() {
    const response = await this.request<{ vpcs: any[] }>('/vpcs');
    return response.vpcs;
  }

  // Get VPCs filtered by region
  async getVPCsByRegion(region: string) {
    const vpcs = await this.getVPCs();
    return vpcs.filter((vpc: any) => vpc.region === region);
  }

  // Get all droplet sizes
  async getSizes() {
    const response = await this.request<{ sizes: any[] }>('/sizes');
    return response.sizes.filter((s: any) => s.available);
  }

  // Create a new droplet
  async createDroplet(params: DropletCreateParams) {
    console.log('[DigitalOcean] Creating droplet:', params.name);
    console.log('[DigitalOcean] Region:', params.region, 'Size:', params.size);
    console.log('[DigitalOcean] VPC UUID:', params.vpc_uuid);
    console.log('[DigitalOcean] SSH Keys:', params.ssh_keys?.length || 0);
    console.log('[DigitalOcean] Backups:', params.backups || false);
    console.log('[DigitalOcean] Monitoring:', params.monitoring !== false);

    const response = await this.request<{ droplet: any }>('/droplets', {
      method: 'POST',
      body: JSON.stringify({
        name: params.name,
        region: params.region,
        size: params.size,
        image: params.image,
        vpc_uuid: params.vpc_uuid,
        user_data: params.user_data,
        ssh_keys: params.ssh_keys || [],
        tags: params.tags || ['noc-managed', 'flaggerlink'],
        backups: params.backups || false,
        ipv6: params.ipv6 || false,
        monitoring: params.monitoring !== false, // Default to true
      }),
    });

    console.log('[DigitalOcean] Droplet created, ID:', response.droplet.id);
    return response.droplet;
  }

  // List all droplets with optional tag filter
  async listDroplets(tag?: string) {
    const endpoint = tag ? `/droplets?tag_name=${tag}` : '/droplets';
    const response = await this.request<{ droplets: any[] }>(endpoint);
    return response.droplets;
  }

  // Get droplet by ID
  async getDroplet(id: number) {
    const response = await this.request<{ droplet: any }>(`/droplets/${id}`);
    return response.droplet;
  }

  // Delete droplet by ID
  async deleteDroplet(id: number) {
    await this.request(`/droplets/${id}`, { method: 'DELETE' });
    return { success: true };
  }

  // Get droplet actions (for tracking deployment progress)
  async getDropletActions(id: number) {
    const response = await this.request<{ actions: any[] }>(`/droplets/${id}/actions`);
    return response.actions;
  }

  // ===== Reserved IPs (Floating IPs) =====

  // List all reserved IPs
  async listReservedIPs() {
    const response = await this.request<{ reserved_ips: any[] }>('/reserved_ips');
    return response.reserved_ips;
  }

  // Get available (unassigned) reserved IPs
  async getAvailableReservedIPs() {
    const ips = await this.listReservedIPs();
    return ips.filter((ip: any) => !ip.droplet);
  }

  // Assign reserved IP to droplet
  async assignReservedIP(ipAddress: string, dropletId: number) {
    console.log('[DigitalOcean] Assigning reserved IP', ipAddress, 'to droplet', dropletId);
    const response = await this.request<{ action: any }>(`/reserved_ips/${ipAddress}/actions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'assign',
        droplet_id: dropletId,
      }),
    });
    return response.action;
  }

  // ===== SSH Keys =====

  // List all SSH keys
  async listSSHKeys() {
    const response = await this.request<{ ssh_keys: any[] }>('/account/keys');
    return response.ssh_keys;
  }

  // ===== Firewalls =====

  // List all firewalls
  async listFirewalls() {
    const response = await this.request<{ firewalls: any[] }>('/firewalls');
    return response.firewalls;
  }

  // Add droplet to firewall
  async addDropletToFirewall(firewallId: string, dropletId: number) {
    console.log('[DigitalOcean] Adding droplet', dropletId, 'to firewall', firewallId);
    await this.request(`/firewalls/${firewallId}/droplets`, {
      method: 'POST',
      body: JSON.stringify({
        droplet_ids: [dropletId],
      }),
    });
    return { success: true };
  }

  // ===== Database Clusters =====

  // List all database clusters
  async listDatabases() {
    const response = await this.request<{ databases: any[] }>('/databases');
    return response.databases;
  }

  // Add trusted source to database cluster with retry logic to handle race conditions
  async addDatabaseTrustedSource(databaseId: string, ipAddress: string, dropletId?: number, maxRetries = 3) {
    console.log('[DigitalOcean] Adding trusted source to database', databaseId);
    console.log('[DigitalOcean] IP:', ipAddress, 'Droplet ID:', dropletId);

    const newSource: any = {
      type: dropletId ? 'droplet' : 'ip_addr',
      value: dropletId ? dropletId.toString() : ipAddress,
    };

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Read current firewall rules
        const firewall = await this.request<{ rules: any[] }>(`/databases/${databaseId}/firewall`);
        const existingRules = firewall.rules || [];
        console.log('[DigitalOcean] Existing firewall rules:', existingRules.length, '(attempt', attempt + 1, 'of', maxRetries + ')');

        // Check if this source already exists
        const sourceExists = existingRules.some((rule: any) =>
          rule.type === newSource.type && rule.value === newSource.value
        );

        if (sourceExists) {
          console.log('[DigitalOcean] Trusted source already exists, skipping');
          return { success: true, alreadyExists: true };
        }

        // Add new source to existing rules
        const updatedRules = [...existingRules, newSource];
        console.log('[DigitalOcean] Updating firewall with', updatedRules.length, 'rules (added 1 new)');

        // Write back updated rules
        await this.request(`/databases/${databaseId}/firewall`, {
          method: 'PUT',
          body: JSON.stringify({
            rules: updatedRules,
          }),
        });

        // Verify the rule was added by re-reading
        const verification = await this.request<{ rules: any[] }>(`/databases/${databaseId}/firewall`);
        const ruleAdded = verification.rules.some((rule: any) =>
          rule.type === newSource.type && rule.value === newSource.value
        );

        if (ruleAdded) {
          console.log('[DigitalOcean] Firewall rule verified successfully');
          return { success: true };
        }

        console.warn('[DigitalOcean] Firewall rule not found after write, possible race condition. Retrying...');
      } catch (error) {
        console.error('[DigitalOcean] Error updating firewall (attempt', attempt + 1, '):', error);
        if (attempt === maxRetries - 1) throw error;
      }

      // Add jittered delay before retry to reduce collision probability
      const baseDelay = 200; // 200ms base
      const jitter = Math.random() * 300; // 0-300ms jitter
      const delay = baseDelay * (attempt + 1) + jitter;
      console.log('[DigitalOcean] Waiting', Math.round(delay), 'ms before retry...');
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new Error('Failed to add database trusted source after ' + maxRetries + ' attempts');
  }
}
