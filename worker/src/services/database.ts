// Database Service - D1 Operations for NOC Platform
// Handles deployment history and server tags

export interface Deployment {
  id?: number;
  server_name: string;
  droplet_id?: number;
  ip_address?: string;
  region?: string;
  branch: string;
  deployment_type: 'infrastructure' | 'application';
  status: 'in_progress' | 'success' | 'failed';
  duration?: number; // seconds
  workflow_url?: string;
  error_message?: string;
  created_at?: string;
  completed_at?: string;
  created_by?: string;
}

export interface ServerTag {
  server_name: string;
  tag: string;
  created_at?: string;
}

export class DatabaseService {
  constructor(private db: D1Database) {}

  // ========================================
  // DEPLOYMENTS
  // ========================================

  /**
   * Create a new deployment record
   */
  async createDeployment(deployment: Deployment): Promise<number> {
    const result = await this.db
      .prepare(`
        INSERT INTO deployments (
          server_name, droplet_id, ip_address, region, branch,
          deployment_type, status, workflow_url, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        deployment.server_name,
        deployment.droplet_id || null,
        deployment.ip_address || null,
        deployment.region || null,
        deployment.branch,
        deployment.deployment_type,
        deployment.status,
        deployment.workflow_url || null,
        deployment.created_by || 'noc-platform'
      )
      .run();

    return result.meta.last_row_id as number;
  }

  /**
   * Update deployment status and completion details
   */
  async updateDeployment(
    id: number,
    updates: {
      status?: 'in_progress' | 'success' | 'failed';
      duration?: number;
      error_message?: string;
      completed_at?: string;
    }
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.duration !== undefined) {
      fields.push('duration = ?');
      values.push(updates.duration);
    }
    if (updates.error_message !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.error_message);
    }
    if (updates.completed_at !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completed_at);
    } else if (updates.status === 'success' || updates.status === 'failed') {
      // Auto-set completed_at if status is terminal
      fields.push("completed_at = datetime('now')");
    }

    if (fields.length === 0) return;

    values.push(id);

    await this.db
      .prepare(`UPDATE deployments SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }

  /**
   * Get all deployments with optional filtering
   */
  async getDeployments(options?: {
    server_name?: string;
    status?: string;
    deployment_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Deployment[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (options?.server_name) {
      conditions.push('server_name = ?');
      values.push(options.server_name);
    }
    if (options?.status) {
      conditions.push('status = ?');
      values.push(options.status);
    }
    if (options?.deployment_type) {
      conditions.push('deployment_type = ?');
      values.push(options.deployment_type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    values.push(limit, offset);

    const result = await this.db
      .prepare(`
        SELECT * FROM deployments
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...values)
      .all<Deployment>();

    return result.results || [];
  }

  /**
   * Get deployment by ID
   */
  async getDeployment(id: number): Promise<Deployment | null> {
    const result = await this.db
      .prepare('SELECT * FROM deployments WHERE id = ?')
      .bind(id)
      .first<Deployment>();

    return result || null;
  }

  /**
   * Get deployment statistics
   */
  async getDeploymentStats(): Promise<{
    total: number;
    success: number;
    failed: number;
    in_progress: number;
  }> {
    const result = await this.db
      .prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress
        FROM deployments
      `)
      .first<any>();

    return {
      total: result?.total || 0,
      success: result?.success || 0,
      failed: result?.failed || 0,
      in_progress: result?.in_progress || 0,
    };
  }

  // ========================================
  // SERVER TAGS
  // ========================================

  /**
   * Add a tag to a server
   */
  async addServerTag(server_name: string, tag: string): Promise<void> {
    await this.db
      .prepare('INSERT OR IGNORE INTO server_tags (server_name, tag) VALUES (?, ?)')
      .bind(server_name, tag)
      .run();
  }

  /**
   * Remove a tag from a server
   */
  async removeServerTag(server_name: string, tag: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM server_tags WHERE server_name = ? AND tag = ?')
      .bind(server_name, tag)
      .run();
  }

  /**
   * Get all tags for a server
   */
  async getServerTags(server_name: string): Promise<string[]> {
    const result = await this.db
      .prepare('SELECT tag FROM server_tags WHERE server_name = ? ORDER BY tag')
      .bind(server_name)
      .all<{ tag: string }>();

    return (result.results || []).map(r => r.tag);
  }

  /**
   * Get all servers with a specific tag
   */
  async getServersByTag(tag: string): Promise<string[]> {
    const result = await this.db
      .prepare('SELECT server_name FROM server_tags WHERE tag = ? ORDER BY server_name')
      .bind(tag)
      .all<{ server_name: string }>();

    return (result.results || []).map(r => r.server_name);
  }

  /**
   * Get all tags across all servers
   */
  async getAllTags(): Promise<string[]> {
    const result = await this.db
      .prepare('SELECT DISTINCT tag FROM server_tags ORDER BY tag')
      .all<{ tag: string }>();

    return (result.results || []).map(r => r.tag);
  }
}
