// Cloudflare DNS API Service
// Manages DNS A records for deployed servers

interface DNSRecordParams {
  name: string;
  content: string; // IP address
  proxied: boolean;
}

export class CloudflareDNSService {
  private token: string;
  private zoneId: string;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(token: string, zoneId: string) {
    this.token = token;
    this.zoneId = zoneId;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(this.baseUrl + endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.token,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error('Cloudflare API error: ' + response.status + ' - ' + error);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error('Cloudflare API error: ' + JSON.stringify(data.errors));
    }

    return data.result;
  }

  // Create DNS A record
  async createARecord(params: DNSRecordParams) {
    return this.request('/zones/' + this.zoneId + '/dns_records', {
      method: 'POST',
      body: JSON.stringify({
        type: 'A',
        name: params.name,
        content: params.content,
        ttl: 1,
        proxied: params.proxied,
      }),
    });
  }

  // Create 3 DNS records for a server
  async createServerRecords(serverName: string, ipAddress: string, enableProxy: boolean) {
    const records = [
      { name: serverName + '.flaggerlink.com', content: ipAddress, proxied: enableProxy },
      { name: serverName + '-api.flaggerlink.com', content: ipAddress, proxied: false },
      { name: serverName + '-text-api.flaggerlink.com', content: ipAddress, proxied: false },
    ];

    return Promise.all(records.map(record => this.createARecord(record)));
  }

  // List DNS records
  async listRecords(namePattern?: string) {
    const endpoint = namePattern 
      ? '/zones/' + this.zoneId + '/dns_records?name=' + namePattern
      : '/zones/' + this.zoneId + '/dns_records';
    
    return this.request<any[]>(endpoint);
  }

  // Delete DNS record
  async deleteRecord(recordId: string) {
    await this.request('/zones/' + this.zoneId + '/dns_records/' + recordId, {
      method: 'DELETE',
    });
    return { success: true };
  }

  // Delete all records for a server
  async deleteServerRecords(serverName: string) {
    const patterns = [
      serverName + '.flaggerlink.com',
      serverName + '-api.flaggerlink.com',
      serverName + '-text-api.flaggerlink.com',
    ];

    const deletions = await Promise.all(
      patterns.map(async (pattern) => {
        const records = await this.listRecords(pattern);
        return Promise.all(records.map((r: any) => this.deleteRecord(r.id)));
      })
    );

    return { success: true, deleted: deletions.flat().length };
  }
}
