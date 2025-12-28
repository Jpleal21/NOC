import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  INFISICAL_CLIENT_ID: string;
  INFISICAL_CLIENT_SECRET: string;
  INFISICAL_PROJECT_ID: string;
  DIGITALOCEAN_TOKEN: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ZONE_ID: string;
  GITHUB_DEPLOY_KEY_PRIVATE: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS for frontend
app.use('/*', cors({
  origin: ['https://noc.flaggerlink.com', 'http://localhost:5173'], // Add dev origin
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'noc-worker' });
});

// API routes (to be implemented)
app.get('/api/regions', (c) => {
  return c.json({ message: 'Regions endpoint - TODO' });
});

app.get('/api/vpcs', (c) => {
  return c.json({ message: 'VPCs endpoint - TODO' });
});

app.get('/api/servers', (c) => {
  return c.json({ message: 'Servers endpoint - TODO' });
});

app.post('/api/deploy', (c) => {
  return c.json({ message: 'Deploy endpoint - TODO' });
});

app.delete('/api/servers/:name', (c) => {
  return c.json({ message: 'Delete server endpoint - TODO' });
});

export default app;
