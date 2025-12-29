import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { stream } from 'hono/streaming';
import { DigitalOceanService } from './services/digitalocean';
import { InfisicalService } from './services/infisical';
import { CloudflareDNSService } from './services/cloudflare-dns';
import { renderCloudInit } from './lib/cloud-init';

type Bindings = {
  INFISICAL_CLIENT_ID: string;
  INFISICAL_CLIENT_SECRET: string;
  INFISICAL_PROJECT_ID: string;
  DIGITALOCEAN_TOKEN: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ZONE_ID: string;
  GITHUB_TOKEN: string;
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
    const doService = new DigitalOceanService(c.env.DIGITALOCEAN_TOKEN);
    const regions = await doService.getRegions();
    return c.json({ success: true, regions });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get VPCs (optionally filtered by region)
app.get('/api/vpcs', async (c) => {
  try {
    const region = c.req.query('region');
    const doService = new DigitalOceanService(c.env.DIGITALOCEAN_TOKEN);

    const vpcs = region
      ? await doService.getVPCsByRegion(region)
      : await doService.getVPCs();

    return c.json({ success: true, vpcs });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get all deployed servers (filtered by noc-managed tag)
app.get('/api/servers', async (c) => {
  try {
    const doService = new DigitalOceanService(c.env.DIGITALOCEAN_TOKEN);
    const droplets = await doService.listDroplets('noc-managed');

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
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Deploy new server (Server-Sent Events stream)
app.post('/api/deploy', async (c) => {
  try {
    const body = await c.req.json();
    const { server_name, droplet_size, droplet_region, vpc_uuid, branch, enable_cloudflare_proxy } = body;

    // Validation
    if (!server_name || !droplet_size || !droplet_region || !vpc_uuid || !branch) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    // Initialize services
    const doService = new DigitalOceanService(c.env.DIGITALOCEAN_TOKEN);
    const dnsService = new CloudflareDNSService(c.env.CLOUDFLARE_API_TOKEN, c.env.CLOUDFLARE_ZONE_ID);
    const infisicalService = new InfisicalService(
      { clientId: c.env.INFISICAL_CLIENT_ID, clientSecret: c.env.INFISICAL_CLIENT_SECRET },
      c.env.INFISICAL_PROJECT_ID
    );

    // Stream deployment progress
    return stream(c, async (stream) => {
      try {
        // Step 1: Fetch secrets from Infisical
        await stream.write('data: ' + JSON.stringify({ step: 'secrets', message: 'Fetching secrets from Infisical...' }) + '\n\n');
        const secrets = await infisicalService.getSecrets('prod');

        // Step 2: Render cloud-init template
        await stream.write('data: ' + JSON.stringify({ step: 'template', message: 'Rendering cloud-init template...' }) + '\n\n');
        const cloudInit = await renderCloudInit({ secrets, githubToken: c.env.GITHUB_TOKEN, branch });

        // Step 3: Create droplet
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

        // Step 4: Wait for IP address
        await stream.write('data: ' + JSON.stringify({ step: 'ip', message: 'Waiting for IP address...' }) + '\n\n');
        let ipAddress = null;
        let attempts = 0;
        while (!ipAddress && attempts < 60) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const updated = await doService.getDroplet(droplet.id);
          ipAddress = updated.networks?.v4?.[0]?.ip_address;
          attempts++;
        }

        if (!ipAddress) {
          throw new Error('Failed to get droplet IP address');
        }

        // Step 5: Create DNS records
        await stream.write('data: ' + JSON.stringify({ step: 'dns', message: 'Creating DNS records...' }) + '\n\n');
        await dnsService.createServerRecords(server_name, ipAddress, enable_cloudflare_proxy || false);

        // Step 6: Complete
        await stream.write('data: ' + JSON.stringify({
          step: 'complete',
          message: 'Deployment complete!',
          droplet_id: droplet.id,
          ip_address: ipAddress,
        }) + '\n\n');

      } catch (error: any) {
        await stream.write('data: ' + JSON.stringify({ step: 'error', message: error.message }) + '\n\n');
      }
    });

  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete server (droplet + DNS records)
app.delete('/api/servers/:name', async (c) => {
  try {
    const serverName = c.req.param('name');

    const doService = new DigitalOceanService(c.env.DIGITALOCEAN_TOKEN);
    const dnsService = new CloudflareDNSService(c.env.CLOUDFLARE_API_TOKEN, c.env.CLOUDFLARE_ZONE_ID);

    // Find droplet by name
    const droplets = await doService.listDroplets('noc-managed');
    const droplet = droplets.find((d: any) => d.name === serverName);

    if (!droplet) {
      return c.json({ success: false, error: 'Server not found' }, 404);
    }

    // Delete droplet
    await doService.deleteDroplet(droplet.id);

    // Delete DNS records
    await dnsService.deleteServerRecords(serverName);

    return c.json({ success: true, message: 'Server deleted successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
