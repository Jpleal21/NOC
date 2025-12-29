import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { stream } from 'hono/streaming';
import { DigitalOceanService } from './services/digitalocean';
import { InfisicalService } from './services/infisical';
import { CloudflareDNSService } from './services/cloudflare-dns';
import { renderCloudInit } from './lib/cloud-init';

type Bindings = {
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
  origin: ['https://noc.flaggerlink.com', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
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
        ip_address: d.networks?.v4?.[0]?.ip_address || null,
        region: d.region?.slug,
        size: d.size?.slug,
        created_at: d.created_at,
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
      enable_cloudflare_proxy,
      reserved_ip,
      ssh_keys,
      firewall_id,
      database_id,
      enable_backups
    } = body;

    console.log('[NOC Worker] Deployment request:', {
      server_name,
      droplet_size,
      droplet_region,
      vpc_uuid,
      branch,
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

    // Initialize services
    console.log('[NOC Worker] Initializing services...');
    const doService = new DigitalOceanService(doToken);
    const dnsService = new CloudflareDNSService(cfToken, cfZoneId);
    const infisicalService = new InfisicalService(
      { clientId: infisicalClientId, clientSecret: infisicalClientSecret },
      infisicalProjectId
    );
    console.log('[NOC Worker] Services initialized');

    // Stream deployment progress
    return stream(c, async (stream) => {
      try {
        // Step 1: Fetch secrets from Infisical
        console.log('[NOC Worker] Step 1: Fetch secrets from Infisical');
        await stream.write('data: ' + JSON.stringify({ step: 'secrets', message: 'Fetching secrets from Infisical...' }) + '\n\n');
        const secrets = await infisicalService.getSecrets('prod');
        console.log('[NOC Worker] Infisical secrets fetched successfully');

        // Step 2: Render cloud-init template
        console.log('[NOC Worker] Step 2: Render cloud-init template');
        await stream.write('data: ' + JSON.stringify({ step: 'template', message: 'Rendering cloud-init template...' }) + '\n\n');
        const cloudInit = await renderCloudInit({ secrets, githubToken, branch });
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
          tags: ['noc-managed', 'flaggerlink'],
        });
        console.log('[NOC Worker] Droplet created, ID:', droplet.id);

        // Step 3a: Wait for droplet to become active (if using reserved IP or firewall)
        if (reserved_ip || firewall_id) {
          console.log('[NOC Worker] Step 3a: Waiting for droplet to become active');
          await stream.write('data: ' + JSON.stringify({ step: 'active', message: 'Waiting for droplet to become active...' }) + '\n\n');

          let dropletActive = false;
          let attempts = 0;
          while (!dropletActive && attempts < 60) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const updated = await doService.getDroplet(droplet.id);
            dropletActive = updated.status === 'active';
            attempts++;
            if (attempts % 5 === 0) {
              console.log('[NOC Worker] Still waiting for active status... attempt', attempts);
            }
          }

          if (!dropletActive) {
            console.error('[NOC Worker] Droplet failed to become active after', attempts, 'attempts');
            throw new Error('Droplet failed to become active');
          }
          console.log('[NOC Worker] Droplet is now active');

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

        // Step 3c: Add to firewall (if specified)
        if (firewall_id) {
          try {
            console.log('[NOC Worker] Step 3c: Add to firewall');
            await stream.write('data: ' + JSON.stringify({ step: 'firewall', message: 'Adding to firewall...' }) + '\n\n');
            await doService.addDropletToFirewall(firewall_id, droplet.id);
            console.log('[NOC Worker] Added to firewall:', firewall_id);
          } catch (error: any) {
            console.error('[NOC Worker] Failed to add to firewall (non-fatal):', error.message);
            await stream.write('data: ' + JSON.stringify({
              step: 'firewall',
              message: 'Firewall assignment failed (check token permissions) - continuing deployment...',
              warning: true
            }) + '\n\n');
          }
        }

        // Step 4: Wait for IP address
        console.log('[NOC Worker] Step 4: Wait for IP address assignment');
        await stream.write('data: ' + JSON.stringify({ step: 'ip', message: 'Waiting for IP address...' }) + '\n\n');
        let ipAddress = null;
        let attempts = 0;
        while (!ipAddress && attempts < 60) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const updated = await doService.getDroplet(droplet.id);
          ipAddress = updated.networks?.v4?.[0]?.ip_address;
          attempts++;
          if (attempts % 5 === 0) {
            console.log('[NOC Worker] Still waiting for IP... attempt', attempts);
          }
        }

        if (!ipAddress) {
          console.error('[NOC Worker] Failed to get IP address after', attempts, 'attempts');
          throw new Error('Failed to get droplet IP address');
        }

        // Use reserved IP if specified, otherwise use droplet IP
        const finalIP = reserved_ip || ipAddress;
        console.log('[NOC Worker] Final IP address:', finalIP);

        // Step 4a: Add to database cluster (if specified)
        if (database_id) {
          try {
            console.log('[NOC Worker] Step 4a: Add to database cluster');
            await stream.write('data: ' + JSON.stringify({ step: 'database', message: 'Adding to database cluster...' }) + '\n\n');
            await doService.addDatabaseTrustedSource(database_id, finalIP, droplet.id);
            console.log('[NOC Worker] Added to database cluster:', database_id);
          } catch (error: any) {
            console.error('[NOC Worker] Failed to add to database cluster (non-fatal):', error.message);
            await stream.write('data: ' + JSON.stringify({
              step: 'database',
              message: 'Database trusted source assignment failed (check token permissions) - continuing deployment...',
              warning: true
            }) + '\n\n');
          }
        }

        // Step 5: Create DNS records
        console.log('[NOC Worker] Step 5: Create DNS records');
        await stream.write('data: ' + JSON.stringify({ step: 'dns', message: 'Creating DNS records...' }) + '\n\n');
        await dnsService.createServerRecords(server_name, finalIP, enable_cloudflare_proxy || false);
        console.log('[NOC Worker] DNS records created');

        // Step 6: Complete
        console.log('[NOC Worker] Deployment complete!');
        await stream.write('data: ' + JSON.stringify({
          step: 'complete',
          message: 'Deployment complete!',
          droplet_id: droplet.id,
          ip_address: finalIP,
          reserved_ip_used: !!reserved_ip,
        }) + '\n\n');

      } catch (error: any) {
        console.error('[NOC Worker] Deployment error:', error);
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

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      console.error('[NOC Worker] GitHub Actions trigger failed:', workflowResponse.status, errorText);
      throw new Error(`GitHub Actions trigger failed: ${workflowResponse.status} - ${errorText}`);
    }

    console.log('[NOC Worker] GitHub Actions workflow triggered successfully');

    // Get the workflow run (we need to poll for it since GitHub doesn't return it immediately)
    // Wait a moment for the run to be created
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get recent workflow runs to find ours
    const runsResponse = await fetch(
      'https://api.github.com/repos/RichardHorwath/FlaggerLink/actions/workflows/noc-deploy-application.yml/runs?per_page=1',
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    let workflowRunUrl = 'https://github.com/RichardHorwath/FlaggerLink/actions';
    if (runsResponse.ok) {
      const runsData = await runsResponse.json();
      if (runsData.workflow_runs && runsData.workflow_runs.length > 0) {
        workflowRunUrl = runsData.workflow_runs[0].html_url;
      }
    }

    return c.json({
      success: true,
      message: 'Application deployment started',
      workflow_url: workflowRunUrl,
      note: 'Deployment is running in GitHub Actions. Check the workflow URL for progress.',
    });

  } catch (error: any) {
    console.error('[NOC Worker] Deploy application error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
