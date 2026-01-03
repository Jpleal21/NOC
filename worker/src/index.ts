import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { stream } from 'hono/streaming';
import { DigitalOceanService } from './services/digitalocean';
import { InfisicalService } from './services/infisical';
import { CloudflareDNSService } from './services/cloudflare-dns';
import { DatabaseService } from './services/database';
import { renderCloudInit } from './lib/cloud-init';

type Bindings = {
  DB: D1Database;
  INFISICAL_CLIENT_ID: { get(): Promise<string> };
  INFISICAL_CLIENT_SECRET: { get(): Promise<string> };
  INFISICAL_PROJECT_ID: { get(): Promise<string> };
  DIGITALOCEAN_TOKEN: { get(): Promise<string> };
  CLOUDFLARE_API_TOKEN: { get(): Promise<string> };
  CLOUDFLARE_ZONE_ID: { get(): Promise<string> };
  GITHUB_TOKEN: { get(): Promise<string> };
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS for frontend
app.use('/*', cors({
  origin: (origin) => {
    // Allow localhost for development
    if (origin.startsWith('http://localhost:')) return origin;
    // Allow all FlaggerLink subdomains
    if (origin.endsWith('.flaggerlink.com')) return origin;
    return 'https://noc.flaggerlink.com'; // fallback
  },
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'CF-Access-Client-Id', 'CF-Access-Client-Secret'],
  credentials: true,
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'noc-worker' });
});

// Get all available regions
app.get('/api/regions', async (c) => {
  try {
    console.log('[NOC Worker] GET /api/regions');
    const token = await c.env.DIGITALOCEAN_TOKEN.get();
    const doService = new DigitalOceanService(token);
    const regions = await doService.getRegions();
    console.log('[NOC Worker] Returning', regions.length, 'regions');
    return c.json({ success: true, regions });
  } catch (error: any) {
    console.error('[NOC Worker] Error fetching regions:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get VPCs (optionally filtered by region)
app.get('/api/vpcs', async (c) => {
  try {
    const region = c.req.query('region');
    console.log('[NOC Worker] GET /api/vpcs', region ? `(region: ${region})` : '(all)');
    const token = await c.env.DIGITALOCEAN_TOKEN.get();
    const doService = new DigitalOceanService(token);

    const vpcs = region
      ? await doService.getVPCsByRegion(region)
      : await doService.getVPCs();

    console.log('[NOC Worker] Returning', vpcs.length, 'VPCs');
    return c.json({ success: true, vpcs });
  } catch (error: any) {
    console.error('[NOC Worker] Error fetching VPCs:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get all deployed servers
app.get('/api/servers', async (c) => {
  try {
    console.log('[NOC Worker] GET /api/servers');
    const token = await c.env.DIGITALOCEAN_TOKEN.get();
    const doService = new DigitalOceanService(token);
    const droplets = await doService.listDroplets(); // Show all droplets

    console.log('[NOC Worker] Returning', droplets.length, 'servers');
    return c.json({
      success: true,
      servers: droplets.map((d: any) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        ip_address: d.networks?.v4?.find((ip: any) => ip.type === 'public')?.ip_address || null,
        region: d.region?.slug,
        size: d.size?.slug,
        created_at: d.created_at,
        tags: d.tags || [], // Include tags for validation
      }))
    });
  } catch (error: any) {
    console.error('[NOC Worker] Error fetching servers:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get available reserved IPs
app.get('/api/reserved-ips', async (c) => {
  try {
    console.log('[NOC Worker] GET /api/reserved-ips');
    const token = await c.env.DIGITALOCEAN_TOKEN.get();
    const doService = new DigitalOceanService(token);
    const ips = await doService.getAvailableReservedIPs();
    console.log('[NOC Worker] Returning', ips.length, 'available reserved IPs');
    return c.json({ success: true, reserved_ips: ips });
  } catch (error: any) {
    console.error('[NOC Worker] Error fetching reserved IPs:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get SSH keys
app.get('/api/ssh-keys', async (c) => {
  try {
    console.log('[NOC Worker] GET /api/ssh-keys');
    const token = await c.env.DIGITALOCEAN_TOKEN.get();
    const doService = new DigitalOceanService(token);
    const keys = await doService.listSSHKeys();
    console.log('[NOC Worker] Returning', keys.length, 'SSH keys');
    return c.json({ success: true, ssh_keys: keys });
  } catch (error: any) {
    console.error('[NOC Worker] Error fetching SSH keys:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get firewalls
app.get('/api/firewalls', async (c) => {
  try {
    console.log('[NOC Worker] GET /api/firewalls');
    const token = await c.env.DIGITALOCEAN_TOKEN.get();
    const doService = new DigitalOceanService(token);
    const firewalls = await doService.listFirewalls();
    console.log('[NOC Worker] Returning', firewalls.length, 'firewalls');
    return c.json({ success: true, firewalls });
  } catch (error: any) {
    console.error('[NOC Worker] Error fetching firewalls:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get database clusters
app.get('/api/databases', async (c) => {
  try {
    console.log('[NOC Worker] GET /api/databases');
    const token = await c.env.DIGITALOCEAN_TOKEN.get();
    const doService = new DigitalOceanService(token);
    const databases = await doService.listDatabases();
    console.log('[NOC Worker] Returning', databases.length, 'database clusters');
    return c.json({ success: true, databases });
  } catch (error: any) {
    console.error('[NOC Worker] Error fetching databases:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Deploy new server (Server-Sent Events stream)
app.post('/api/deploy', async (c) => {
  try {
    console.log('[NOC Worker] POST /api/deploy');
    const body = await c.req.json();
    const {
      server_name,
      droplet_size,
      droplet_region,
      vpc_uuid,
      branch,
      deployment_profile = 'core', // Default to 'core' (centralized portal)
      enable_cloudflare_proxy,
      reserved_ip,
      ssh_keys,
      firewall_id,
      database_id,
      enable_backups,
      tags
    } = body;

    console.log('[NOC Worker] Deployment request:', {
      server_name,
      droplet_size,
      droplet_region,
      vpc_uuid,
      branch,
      deployment_profile,
      enable_cloudflare_proxy,
      reserved_ip,
      ssh_keys: ssh_keys?.length || 0,
      firewall_id,
      database_id,
      enable_backups
    });

    // Validation
    if (!server_name || !droplet_size || !droplet_region || !vpc_uuid || !branch) {
      console.error('[NOC Worker] Missing required fields');
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    // Get all secrets
    console.log('[NOC Worker] Fetching secrets from Cloudflare Secret Store...');
    const [doToken, cfToken, cfZoneId, githubToken, infisicalClientId, infisicalClientSecret, infisicalProjectId] = await Promise.all([
      c.env.DIGITALOCEAN_TOKEN.get(),
      c.env.CLOUDFLARE_API_TOKEN.get(),
      c.env.CLOUDFLARE_ZONE_ID.get(),
      c.env.GITHUB_TOKEN.get(),
      c.env.INFISICAL_CLIENT_ID.get(),
      c.env.INFISICAL_CLIENT_SECRET.get(),
      c.env.INFISICAL_PROJECT_ID.get(),
    ]);

    console.log('[NOC Worker] All secrets fetched from Secret Store');

    // Initialize services (including db BEFORE stream to ensure scope)
    console.log('[NOC Worker] Initializing services...');
    const doService = new DigitalOceanService(doToken);
    const dnsService = new CloudflareDNSService(cfToken, cfZoneId);
    const infisicalService = new InfisicalService(
      { clientId: infisicalClientId, clientSecret: infisicalClientSecret },
      infisicalProjectId
    );
    console.log('[NOC Worker] Services initialized');

    // Create deployment record OUTSIDE stream() callback to ensure db scope
    const db = new DatabaseService(c.env.DB);
    console.log('[NOC Worker] Creating deployment record in database...');
    const deploymentId = await db.createDeployment({
      server_name,
      region: droplet_region,
      branch,
      deployment_type: 'infrastructure',
      deployment_profile,
      status: 'in_progress',
    });
    console.log('[NOC Worker] Deployment record created with ID:', deploymentId);

    // Stream deployment progress
    return stream(c, async (stream) => {
      const startTime = Date.now();
      try {
        // Step 1: Fetch secrets from Infisical
        console.log('[NOC Worker] Step 1: Fetch secrets from Infisical');
        await stream.write('data: ' + JSON.stringify({ step: 'secrets', message: 'Fetching secrets from Infisical...' }) + '\n\n');
        const secrets = await infisicalService.getSecrets('prod');
        console.log('[NOC Worker] Infisical secrets fetched successfully');

        // Step 2: Render cloud-init template
        console.log('[NOC Worker] Step 2: Render cloud-init template');
        await stream.write('data: ' + JSON.stringify({ step: 'template', message: 'Rendering cloud-init template...' }) + '\n\n');
        const cloudInit = await renderCloudInit({ secrets, githubToken, branch, deploymentProfile: deployment_profile });
        console.log('[NOC Worker] Cloud-init template rendered, length:', cloudInit.length);

        // Step 3: Create droplet
        console.log('[NOC Worker] Step 3: Create DigitalOcean droplet');
        await stream.write('data: ' + JSON.stringify({ step: 'droplet', message: 'Creating DigitalOcean droplet...' }) + '\n\n');
        const droplet = await doService.createDroplet({
          name: server_name,
          region: droplet_region,
          size: droplet_size,
          image: 'ubuntu-24-04-x64',
          vpc_uuid,
          user_data: cloudInit,
          ssh_keys: ssh_keys || [],
          backups: enable_backups || false,
          monitoring: true,
          tags: ['noc-managed', 'flaggerlink'],
        });
        console.log('[NOC Worker] Droplet created, ID:', droplet.id);

        // Step 3a: Wait for droplet to become active (if using reserved IP or firewall)
        if (reserved_ip || firewall_id) {
          console.log('[NOC Worker] Step 3a: Waiting for droplet to become active');
          await stream.write('data: ' + JSON.stringify({ step: 'active', message: 'Waiting for droplet to become active...' }) + '\n\n');

          // Poll for droplet active status with exponential backoff
          let dropletActive = false;
          let attempts = 0;
          let delay = 1000; // Start with 1 second
          const maxDelay = 30000; // Cap at 30 seconds
          const maxTime = 300000; // 5 minutes maximum
          const activationStartTime = Date.now();

          while (!dropletActive && (Date.now() - activationStartTime) < maxTime) {
            // Check immediately on first attempt, otherwise wait
            if (attempts > 0) {
              await new Promise(resolve => setTimeout(resolve, delay));
              // Exponential backoff: double delay, cap at 30s
              delay = Math.min(delay * 2, maxDelay);
            }

            const updated = await doService.getDroplet(droplet.id);
            dropletActive = updated.status === 'active';
            attempts++;

            if (!dropletActive && attempts % 3 === 0) {
              const elapsed = Math.floor((Date.now() - activationStartTime) / 1000);
              console.log('[NOC Worker] Still waiting for active status... attempt', attempts, 'elapsed:', elapsed + 's');
            }
          }

          if (!dropletActive) {
            const elapsed = Math.floor((Date.now() - activationStartTime) / 1000);
            console.error('[NOC Worker] Droplet failed to become active after', elapsed, 'seconds');
            throw new Error('Droplet failed to become active after ' + elapsed + ' seconds');
          }

          const activationTime = Math.floor((Date.now() - activationStartTime) / 1000);
          console.log('[NOC Worker] Droplet is now active after', activationTime, 'seconds');

          // Wait for pending events to clear before IP/firewall operations
          console.log('[NOC Worker] Waiting for pending events to clear...');
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
          console.log('[NOC Worker] Ready for IP/firewall operations');
        }

        // Step 3b: Assign reserved IP (if specified)
        if (reserved_ip) {
          console.log('[NOC Worker] Step 3b: Assign reserved IP');
          await stream.write('data: ' + JSON.stringify({ step: 'reserved_ip', message: 'Assigning reserved IP...' }) + '\n\n');
          await doService.assignReservedIP(reserved_ip, droplet.id);
          console.log('[NOC Worker] Reserved IP assigned:', reserved_ip);
        }

        // Track critical failures that should fail the deployment
        let criticalFailures: string[] = [];

        // Step 3c: Add to firewall (if specified)
        if (firewall_id) {
          try {
            console.log('[NOC Worker] Step 3c: Add to firewall');
            await stream.write('data: ' + JSON.stringify({ step: 'firewall', message: 'Adding to firewall...' }) + '\n\n');
            await doService.addDropletToFirewall(firewall_id, droplet.id);
            console.log('[NOC Worker] Added to firewall:', firewall_id);
          } catch (error: any) {
            console.error('[NOC Worker] CRITICAL: Failed to add to firewall:', error.message);
            criticalFailures.push('Firewall assignment failed: ' + error.message);
            await stream.write('data: ' + JSON.stringify({
              step: 'firewall',
              message: 'CRITICAL: Firewall assignment failed - ' + error.message,
              error: true
            }) + '\n\n');
          }
        }

        // Step 4: Wait for IP address with exponential backoff
        console.log('[NOC Worker] Step 4: Wait for IP address assignment');
        await stream.write('data: ' + JSON.stringify({ step: 'ip', message: 'Waiting for IP address...' }) + '\n\n');

        let ipAddress = null;
        let attempts = 0;
        let delay = 1000; // Start with 1 second
        const maxDelay = 30000; // Cap at 30 seconds
        const maxTime = 300000; // 5 minutes maximum
        const ipPollStartTime = Date.now();

        while (!ipAddress && (Date.now() - ipPollStartTime) < maxTime) {
          // Check immediately on first attempt, otherwise wait
          if (attempts > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            // Exponential backoff: double delay, cap at 30s
            delay = Math.min(delay * 2, maxDelay);
          }

          const updated = await doService.getDroplet(droplet.id);
          ipAddress = updated.networks?.v4?.find(ip => ip.type === 'public')?.ip_address;
          attempts++;

          if (!ipAddress && attempts % 3 === 0) {
            const elapsed = Math.floor((Date.now() - ipPollStartTime) / 1000);
            console.log('[NOC Worker] Still waiting for IP... attempt', attempts, 'elapsed:', elapsed + 's');
          }
        }

        if (!ipAddress) {
          const elapsed = Math.floor((Date.now() - ipPollStartTime) / 1000);
          console.error('[NOC Worker] Failed to get IP address after', elapsed, 'seconds');
          throw new Error('Failed to get droplet IP address after ' + elapsed + ' seconds');
        }

        const ipAssignmentTime = Math.floor((Date.now() - ipPollStartTime) / 1000);
        console.log('[NOC Worker] IP address assigned after', ipAssignmentTime, 'seconds');

        // Use reserved IP if specified, otherwise use droplet IP
        const finalIP = reserved_ip || ipAddress;
        console.log('[NOC Worker] Final IP address:', finalIP);

        // Step 4a: Add to database cluster (if specified)
        if (database_id) {
          try {
            console.log('[NOC Worker] Step 4a: Add to database cluster');
            await stream.write('data: ' + JSON.stringify({ step: 'database_update', message: 'Adding to database cluster...' }) + '\n\n');
            await doService.addDatabaseTrustedSource(database_id, finalIP, droplet.id);
            console.log('[NOC Worker] Added to database cluster:', database_id);
          } catch (error: any) {
            console.error('[NOC Worker] CRITICAL: Failed to add to database cluster:', error.message);
            criticalFailures.push('Database access setup failed: ' + error.message);
            await stream.write('data: ' + JSON.stringify({
              step: 'database_update',
              message: 'CRITICAL: Database access setup failed - ' + error.message,
              error: true
            }) + '\n\n');
          }
        }

        // Step 5: Create DNS records
        console.log('[NOC Worker] Step 5: Create DNS records');
        await stream.write('data: ' + JSON.stringify({ step: 'dns', message: 'Creating DNS records...' }) + '\n\n');
        await dnsService.createServerRecords(server_name, finalIP, enable_cloudflare_proxy || false);
        console.log('[NOC Worker] DNS records created');

        // Step 5a: Add tags if provided (batch operation)
        if (tags && tags.length > 0) {
          console.log('[NOC Worker] Adding', tags.length, 'tags to server in batch:', tags);
          await stream.write('data: ' + JSON.stringify({ step: 'tags', message: `Adding ${tags.length} tag(s)...` }) + '\n\n');
          await db.addServerTags(server_name, tags);
          console.log('[NOC Worker] Tags added successfully (batch operation)');
        }

        // Step 6: Complete or fail based on critical failures
        const duration = Math.floor((Date.now() - startTime) / 1000); // seconds

        if (criticalFailures.length > 0) {
          console.error('[NOC Worker] Deployment FAILED due to critical errors:', criticalFailures);
          await db.updateDeployment(deploymentId, {
            status: 'failed',
            duration,
            droplet_id: droplet.id,
            ip_address: finalIP,
            error_message: criticalFailures.join('; ')
          });
          console.log('[NOC Worker] Deployment record updated with failure');

          await stream.write('data: ' + JSON.stringify({
            step: 'failed',
            message: 'Deployment failed: ' + criticalFailures.join('; '),
            droplet_id: droplet.id,
            ip_address: finalIP,
            errors: criticalFailures
          }) + '\n\n');
        } else {
          console.log('[NOC Worker] Deployment complete!');
          await db.updateDeployment(deploymentId, {
            status: 'success',
            duration,
            droplet_id: droplet.id,
            ip_address: finalIP,
          });
          console.log('[NOC Worker] Deployment record updated with success');

          await stream.write('data: ' + JSON.stringify({
            step: 'completed',
            message: 'Deployment complete!',
            droplet_id: droplet.id,
            ip_address: finalIP,
            reserved_ip_used: !!reserved_ip,
          }) + '\n\n');
        }

      } catch (error: any) {
        console.error('[NOC Worker] Deployment error:', error);
        const duration = Math.floor((Date.now() - startTime) / 1000);
        await db.updateDeployment(deploymentId, {
          status: 'failed',
          duration,
          error_message: error.message,
        });
        console.log('[NOC Worker] Deployment record updated with failure');
        await stream.write('data: ' + JSON.stringify({ step: 'error', message: error.message }) + '\n\n');
      }
    });

  } catch (error: any) {
    console.error('[NOC Worker] Deploy endpoint error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete server (droplet + DNS records)
app.delete('/api/servers/:name', async (c) => {
  try {
    const serverName = c.req.param('name');
    console.log('[NOC Worker] DELETE /api/servers/', serverName);

    const [doToken, cfToken, cfZoneId] = await Promise.all([
      c.env.DIGITALOCEAN_TOKEN.get(),
      c.env.CLOUDFLARE_API_TOKEN.get(),
      c.env.CLOUDFLARE_ZONE_ID.get(),
    ]);

    const doService = new DigitalOceanService(doToken);
    const dnsService = new CloudflareDNSService(cfToken, cfZoneId);

    // Find droplet by name
    console.log('[NOC Worker] Looking for droplet:', serverName);
    const droplets = await doService.listDroplets('noc-managed');
    const droplet = droplets.find((d: any) => d.name === serverName);

    if (!droplet) {
      console.error('[NOC Worker] Server not found:', serverName);
      return c.json({ success: false, error: 'Server not found' }, 404);
    }

    console.log('[NOC Worker] Found droplet, ID:', droplet.id);

    // Delete droplet
    console.log('[NOC Worker] Deleting droplet...');
    await doService.deleteDroplet(droplet.id);

    // Delete DNS records
    console.log('[NOC Worker] Deleting DNS records...');
    await dnsService.deleteServerRecords(serverName);

    console.log('[NOC Worker] Server deleted successfully:', serverName);
    return c.json({ success: true, message: 'Server deleted successfully' });
  } catch (error: any) {
    console.error('[NOC Worker] Delete server error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Deploy application to provisioned server (triggers GitHub Actions)
app.post('/api/deploy/application', async (c) => {
  let deploymentId: number | null = null;
  try {
    console.log('[NOC Worker] POST /api/deploy/application');
    const body = await c.req.json();
    const { droplet_id, droplet_ip, server_name, branch } = body;

    console.log('[NOC Worker] Application deployment request:', {
      droplet_id,
      droplet_ip,
      server_name,
      branch,
    });

    // Validation
    if (!droplet_id || !droplet_ip || !server_name || !branch) {
      console.error('[NOC Worker] Missing required fields');
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    // Create deployment record (status will remain 'in_progress' - GitHub Actions handles completion)
    const db = new DatabaseService(c.env.DB);
    deploymentId = await db.createDeployment({
      server_name,
      droplet_id,
      ip_address: droplet_ip,
      branch,
      deployment_type: 'application',
      status: 'in_progress',
    });
    console.log('[NOC Worker] Application deployment record created with ID:', deploymentId);

    // Get GitHub token
    const githubToken = await c.env.GITHUB_TOKEN.get();

    // Trigger GitHub Actions workflow
    console.log('[NOC Worker] Triggering GitHub Actions workflow...');
    const workflowResponse = await fetch(
      'https://api.github.com/repos/RichardHorwath/FlaggerLink/actions/workflows/noc-deploy-application.yml/dispatches',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'NOC-Deployment-API',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: branch,
          inputs: {
            droplet_ip: droplet_ip,
            droplet_id: droplet_id.toString(),
            server_name: server_name,
            branch: branch,
          },
        }),
      }
    );

    // Always consume response body to prevent resource leaks
    const responseText = await workflowResponse.text();

    if (!workflowResponse.ok) {
      console.error('[NOC Worker] GitHub Actions trigger failed:', workflowResponse.status, responseText);
      throw new Error(`GitHub Actions trigger failed: ${workflowResponse.status} - ${responseText}`);
    }

    console.log('[NOC Worker] GitHub Actions workflow triggered successfully');

    // Get the workflow run (we need to poll for it since GitHub doesn't return it immediately)
    // Wait a moment for the run to be created
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get recent workflow runs to find ours (with timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      var runsResponse = await fetch(
        'https://api.github.com/repos/RichardHorwath/FlaggerLink/actions/workflows/noc-deploy-application.yml/runs?per_page=1',
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'NOC-Deployment-API',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          signal: controller.signal,
        }
      );
    } catch (fetchError: any) {
      console.warn('[NOC Worker] Failed to fetch workflow run URL:', fetchError.message);
      // Non-critical - workflow was triggered successfully, just couldn't get the URL
      var runsResponse = { ok: false } as Response;
    } finally {
      clearTimeout(timeoutId);
    }

    let workflowRunUrl = 'https://github.com/RichardHorwath/FlaggerLink/actions';
    if (runsResponse.ok) {
      const runsData = await runsResponse.json();
      if (runsData.workflow_runs && runsData.workflow_runs.length > 0) {
        workflowRunUrl = runsData.workflow_runs[0].html_url;
      }
    }

    // Update deployment record with workflow URL (don't fail deployment if DB update fails)
    try {
      await db.updateDeployment(deploymentId, {
        workflow_url: workflowRunUrl,
      });
      console.log('[NOC Worker] Deployment record updated with workflow URL');
    } catch (dbError: any) {
      console.error('[NOC Worker] Warning: Failed to update deployment record with workflow URL:', dbError.message);
      // Don't throw - workflow was successfully triggered, DB update is non-critical
    }

    return c.json({
      success: true,
      message: 'Application deployment started',
      workflow_url: workflowRunUrl,
      note: 'Deployment is running in GitHub Actions. Check the workflow URL for progress.',
    });

  } catch (error: any) {
    console.error('[NOC Worker] Deploy application error:', error);
    // Mark deployment as failed
    if (deploymentId) {
      try {
        const db = new DatabaseService(c.env.DB);
        await db.updateDeployment(deploymentId, {
          status: 'failed',
          error_message: error.message,
        });
      } catch (dbError) {
        console.error('[NOC Worker] Failed to update deployment record:', dbError);
      }
    }
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========================================
// DEPLOYMENT HISTORY API
// ========================================

// Get all deployments with optional filtering
app.get('/api/deployments', async (c) => {
  try {
    console.log('[NOC Worker] GET /api/deployments');
    const db = new DatabaseService(c.env.DB);

    const server_name = c.req.query('server_name');
    const status = c.req.query('status');
    const deployment_type = c.req.query('deployment_type');

    // Parse and validate pagination parameters
    const limitParam = c.req.query('limit');
    const offsetParam = c.req.query('offset');

    // Validate limit parameter
    let limit = 50; // default
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit)) {
        console.error('[NOC Worker] Invalid limit parameter:', limitParam);
        return c.json({ success: false, error: `Invalid limit parameter: '${limitParam}' is not a valid number` }, 400);
      }
      limit = Math.max(1, Math.min(parsedLimit, 1000));
    }

    // Validate offset parameter
    let offset = 0; // default
    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (isNaN(parsedOffset)) {
        console.error('[NOC Worker] Invalid offset parameter:', offsetParam);
        return c.json({ success: false, error: `Invalid offset parameter: '${offsetParam}' is not a valid number` }, 400);
      }
      offset = Math.max(0, parsedOffset);
    }

    const deployments = await db.getDeployments({
      server_name,
      status,
      deployment_type,
      limit,
      offset,
    });

    console.log('[NOC Worker] Returning', deployments.length, 'deployments');
    return c.json({ success: true, deployments });
  } catch (error: any) {
    console.error('[NOC Worker] Error fetching deployments:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get deployment statistics
app.get('/api/deployments/stats', async (c) => {
  try {
    console.log('[NOC Worker] GET /api/deployments/stats');
    const db = new DatabaseService(c.env.DB);
    const stats = await db.getDeploymentStats();
    console.log('[NOC Worker] Deployment stats:', stats);
    return c.json({ success: true, stats });
  } catch (error: any) {
    console.error('[NOC Worker] Error fetching deployment stats:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========================================
// SERVER TAGS API
// ========================================

// Get tags for a specific server
app.get('/api/servers/:name/tags', async (c) => {
  try {
    const serverName = c.req.param('name');
    console.log('[NOC Worker] GET /api/servers/:name/tags -', serverName);
    const db = new DatabaseService(c.env.DB);
    const tags = await db.getServerTags(serverName);
    console.log('[NOC Worker] Server', serverName, 'has', tags.length, 'tags');
    return c.json({ success: true, tags });
  } catch (error: any) {
    console.error('[NOC Worker] Error fetching server tags:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Add tag to a server
app.post('/api/servers/:name/tags', async (c) => {
  try {
    const serverName = c.req.param('name');
    const { tag } = await c.req.json();

    if (!tag) {
      return c.json({ success: false, error: 'Tag is required' }, 400);
    }

    console.log('[NOC Worker] POST /api/servers/:name/tags -', serverName, '- tag:', tag);
    const db = new DatabaseService(c.env.DB);
    await db.addServerTag(serverName, tag);
    console.log('[NOC Worker] Tag added successfully');
    return c.json({ success: true, message: 'Tag added successfully' });
  } catch (error: any) {
    console.error('[NOC Worker] Error adding server tag:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Remove tag from a server
app.delete('/api/servers/:name/tags/:tag', async (c) => {
  try {
    const serverName = c.req.param('name');
    const tag = c.req.param('tag');
    console.log('[NOC Worker] DELETE /api/servers/:name/tags/:tag -', serverName, '- tag:', tag);
    const db = new DatabaseService(c.env.DB);
    await db.removeServerTag(serverName, tag);
    console.log('[NOC Worker] Tag removed successfully');
    return c.json({ success: true, message: 'Tag removed successfully' });
  } catch (error: any) {
    console.error('[NOC Worker] Error removing server tag:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get all unique tags
app.get('/api/tags', async (c) => {
  try {
    console.log('[NOC Worker] GET /api/tags');
    const db = new DatabaseService(c.env.DB);
    const tags = await db.getAllTags();
    console.log('[NOC Worker] Returning', tags.length, 'unique tags');
    return c.json({ success: true, tags });
  } catch (error: any) {
    console.error('[NOC Worker] Error fetching tags:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========================================
// DNS MANAGEMENT
// ========================================

// List DNS records from Cloudflare
app.get('/api/dns', async (c) => {
  try {
    console.log('[NOC Worker] GET /api/dns');
    const cfToken = await c.env.CLOUDFLARE_API_TOKEN.get();
    const cfZoneId = await c.env.CLOUDFLARE_ZONE_ID.get();

    if (!cfToken || !cfZoneId) {
      console.error('[NOC Worker] Missing Cloudflare credentials');
      return c.json({ success: false, error: 'Cloudflare credentials not configured' }, 500);
    }

    const dnsService = new CloudflareDNSService(cfToken, cfZoneId);

    // Get optional name pattern filter
    const namePattern = c.req.query('name');

    console.log('[NOC Worker] Fetching DNS records', namePattern ? `(filtered by: ${namePattern})` : '(all)');
    const records = await dnsService.listRecords(namePattern);

    console.log('[NOC Worker] Returning', records.length, 'DNS records');
    return c.json({ success: true, records });
  } catch (error: any) {
    console.error('[NOC Worker] Error fetching DNS records:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
