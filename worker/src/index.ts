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

// Deploy new server (Server-Sent Events stream)
app.post('/api/deploy', async (c) => {
  try {
    console.log('[NOC Worker] POST /api/deploy');
    const body = await c.req.json();
    const { server_name, droplet_size, droplet_region, vpc_uuid, branch, enable_cloudflare_proxy } = body;

    console.log('[NOC Worker] Deployment request:', {
      server_name,
      droplet_size,
      droplet_region,
      vpc_uuid,
      branch,
      enable_cloudflare_proxy
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
          image: 'ubuntu-22-04-x64',
          vpc_uuid,
          user_data: cloudInit,
          tags: ['noc-managed', 'flaggerlink'],
        });
        console.log('[NOC Worker] Droplet created, ID:', droplet.id);

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
        console.log('[NOC Worker] IP address assigned:', ipAddress);

        // Step 5: Create DNS records
        console.log('[NOC Worker] Step 5: Create DNS records');
        await stream.write('data: ' + JSON.stringify({ step: 'dns', message: 'Creating DNS records...' }) + '\n\n');
        await dnsService.createServerRecords(server_name, ipAddress, enable_cloudflare_proxy || false);
        console.log('[NOC Worker] DNS records created');

        // Step 6: Complete
        console.log('[NOC Worker] Deployment complete!');
        await stream.write('data: ' + JSON.stringify({
          step: 'complete',
          message: 'Deployment complete!',
          droplet_id: droplet.id,
          ip_address: ipAddress,
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

export default app;
