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
}

export class DigitalOceanService {
  private token: string;
  private baseUrl = 'https://api.digitalocean.com/v2';

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DigitalOcean API error: ${response.status} - ${error}`);
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
    const response = await this.request<{ droplet: any }>('/droplets', {
      method: 'POST',
      body: JSON.stringify({
        name: params.name,
        region: params.region,
        size: params.size,
        image: params.image,
        vpc_uuid: params.vpc_uuid,
        user_data: params.user_data,
        tags: params.tags || ['noc-managed', 'flaggerlink'],
        monitoring: true,
        ipv6: false,
      }),
    });
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
}
