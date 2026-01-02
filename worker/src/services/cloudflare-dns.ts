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
  private defaultTimeout = 30000; // 30 seconds default timeout

  constructor(token: string, zoneId: string) {
    this.token = token;
    this.zoneId = zoneId;
  }

  private async request<T>(endpoint: string, options?: RequestInit, timeout: number = this.defaultTimeout): Promise<T> {
    const url = this.baseUrl + endpoint;
    console.log('[Cloudflare DNS]', options?.method || 'GET', url, `(timeout: ${timeout}ms)`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('[Cloudflare DNS] Request timeout after', timeout, 'ms');
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + this.token,
          ...options?.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('[Cloudflare DNS] Response status:', response.status);

      if (!response.ok) {
        const error = await response.text();
        console.error('[Cloudflare DNS] API error:', error);
        throw new Error('Cloudflare API error: ' + response.status + ' - ' + error);
      }

      const data = await response.json();
      if (!data.success) {
        console.error('[Cloudflare DNS] API returned errors:', data.errors);
        throw new Error('Cloudflare API error: ' + JSON.stringify(data.errors));
      }

      return data.result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Cloudflare DNS API timeout after ${timeout}ms for ${endpoint}`);
      }
      throw error;
    }
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
  // All records are proxied through Cloudflare for security and DDoS protection
  async createServerRecords(serverName: string, ipAddress: string, enableProxy: boolean = true) {
    console.log('[Cloudflare DNS] Creating server records for:', serverName);
    console.log('[Cloudflare DNS] IP address:', ipAddress, 'Proxy enabled:', enableProxy);

    const records = [
      { name: serverName + '.flaggerlink.com', content: ipAddress, proxied: enableProxy },
      { name: serverName + '-api.flaggerlink.com', content: ipAddress, proxied: enableProxy },
      { name: serverName + '-text-api.flaggerlink.com', content: ipAddress, proxied: enableProxy },
    ];

    console.log('[Cloudflare DNS] Creating', records.length, 'DNS records');
    const results = await Promise.all(records.map(record => this.createARecord(record)));
    console.log('[Cloudflare DNS] All DNS records created successfully');

    return results;
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

  // Delete all records for a server (handles partial failures gracefully)
  async deleteServerRecords(serverName: string) {
    const patterns = [
      serverName + '.flaggerlink.com',
      serverName + '-api.flaggerlink.com',
      serverName + '-text-api.flaggerlink.com',
    ];

    console.log('[Cloudflare DNS] Deleting DNS records for server:', serverName);
    let deletedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Use Promise.allSettled to handle partial failures gracefully
    const results = await Promise.allSettled(
      patterns.map(async (pattern) => {
        try {
          const records = await this.listRecords(pattern);
          console.log('[Cloudflare DNS] Found', records.length, 'records for pattern:', pattern);

          // Delete each record individually, tracking failures
          const deleteResults = await Promise.allSettled(
            records.map((r: any) => this.deleteRecord(r.id))
          );

          deleteResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              deletedCount++;
            } else {
              failedCount++;
              const recordId = records[index]?.id || 'unknown';
              console.error('[Cloudflare DNS] Failed to delete record', recordId, ':', result.reason);
              errors.push(`Failed to delete ${pattern} (${recordId}): ${result.reason}`);
            }
          });
        } catch (error: any) {
          failedCount++;
          console.error('[Cloudflare DNS] Failed to list/delete records for pattern', pattern, ':', error);
          errors.push(`Failed to process ${pattern}: ${error.message}`);
        }
      })
    );

    console.log('[Cloudflare DNS] DNS cleanup complete:', deletedCount, 'deleted,', failedCount, 'failed');

    if (failedCount > 0) {
      console.warn('[Cloudflare DNS] Some DNS deletions failed:', errors);
      return {
        success: false,
        deleted: deletedCount,
        failed: failedCount,
        errors: errors,
        partialSuccess: deletedCount > 0
      };
    }

    return { success: true, deleted: deletedCount, failed: 0 };
  }
}
