# NOC Platform

FlaggerLink Network Operations Center - Self-service infrastructure deployment platform.

## Overview

NOC Platform enables automated deployment of FlaggerLink production servers on DigitalOcean using Cloudflare Workers + Pages architecture.

**Architecture:**
- **Worker API** (`/worker`): Hono.js backend handling deployments, DNS, VPC management
- **Pages Frontend** (`/frontend`): Vue 3 + Vite UI for server management
- **Authentication**: Cloudflare Access with Azure AD SSO

## Features

- Deploy DigitalOcean droplets with one click
- Automatic DNS configuration (3 records per server)
- VPC integration (region-aware)
- Cloud-init auto-provisioning
- Real-time deployment progress (SSE)
- Server lifecycle management

## Tech Stack

**Backend:**
- Cloudflare Workers
- Hono.js web framework
- TypeScript
- Infisical (FlaggerLink app secrets)
- Cloudflare Secret Store (NOC secrets)

**Frontend:**
- Vue 3 (Composition API)
- Vite
- TailwindCSS (FlaggerLink design system)
- TypeScript

**Infrastructure:**
- DigitalOcean API (droplets, VPC, networking)
- Cloudflare DNS API
- Cloudflare Access (authentication)

## Project Structure

```
/worker              # Cloudflare Worker API
  /src
    /routes          # API endpoints
    /services        # Business logic
    /lib             # Utilities
    /types           # TypeScript definitions
  wrangler.toml      # Cloudflare Worker config

/frontend            # Cloudflare Pages app
  /src
    /views           # Page components
    /components      # Reusable components
    /services        # API clients
    /composables     # Vue composables
  vite.config.js     # Vite configuration

/shared              # Shared resources
  /templates         # Cloud-init templates
  /types             # Shared TypeScript types

/docs                # Documentation
```

## Development

### Worker API

```bash
cd worker
npm install
npm run dev          # Start Wrangler dev server on :8787
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # Start Vite dev server on :5173
```

Frontend proxies `/api` requests to Worker dev server (configured in `vite.config.js`).

## Deployment

Uses Cloudflare's GitHub CI/CD integration:

1. Push to GitHub repository
2. Configure Worker in Cloudflare dashboard:
   - Connect to GitHub repo
   - Set build command: `cd worker && npm install && npm run build`
   - Set publish directory: `worker/dist`
3. Configure Pages in Cloudflare dashboard:
   - Connect to GitHub repo
   - Set build command: `cd frontend && npm install && npm run build`
   - Set publish directory: `frontend/dist`
4. Configure secrets in Cloudflare Secret Store (accessed via Worker binding):
   - `INFISICAL_CLIENT_ID`
   - `INFISICAL_CLIENT_SECRET`
   - `INFISICAL_PROJECT_ID`
   - `DIGITALOCEAN_TOKEN`
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ZONE_ID`
   - `GITHUB_DEPLOY_KEY_PRIVATE`

## Secret Management

**NOC Platform Secrets** (Cloudflare Secret Store):
- Accessed via Worker binding configured in `wrangler.toml`
- Stores API keys for DigitalOcean, Cloudflare, Infisical, GitHub

**FlaggerLink Application Secrets** (Infisical):
- Fetched from Infisical during deployment
- Injected into cloud-init as environment variables
- Includes: Redis password, RabbitMQ credentials, database credentials

## API Endpoints

- `GET /health` - Health check
- `GET /api/regions` - List DigitalOcean regions
- `GET /api/vpcs` - List VPCs (filtered by region)
- `GET /api/servers` - List deployed servers
- `POST /api/deploy` - Deploy new server (SSE stream)
- `DELETE /api/servers/:name` - Destroy server

## Security

- **Authentication**: Cloudflare Access with Azure AD
- **Secrets**: Cloudflare Secret Store (NOC), Infisical (FlaggerLink app secrets)
- **Network**: VPC isolation, firewall rules
- **Database**: DigitalOcean Resources trusted source

## License

Proprietary - FlaggerLink Internal Use Only
