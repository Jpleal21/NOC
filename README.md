# NOC Platform

Custom IaaS platform for rapid FlaggerLink production server deployment using Cloudflare Workers + Pages.

## Overview

NOC (Network Operations Center) automates the provisioning and management of FlaggerLink production servers on DigitalOcean infrastructure with automatic deployment via cloud-init.

### Features

- **Automated Server Deployment**: Deploy DigitalOcean droplets with one click
- **DNS Management**: Automatically create 3 DNS records per server (base, api, text-api)
- **VPC Integration**: Join droplets to region-specific VPCs
- **Real-time Progress**: Live deployment updates via Server-Sent Events
- **Auto-Deployment**: Cloud-init automatically clones and deploys FlaggerLink code
- **Secure Authentication**: Cloudflare Access with Azure AD SSO

## Architecture

```
User (Azure AD) → Cloudflare Access → Pages UI → Worker API
                                                      ↓
                    ┌─────────────────┬───────────────┼────────────────┐
                    ↓                 ↓               ↓                ↓
                Infisical        DO Droplets     DO Database    Cloudflare DNS
              (FL secrets)    (create+VPC)      (whitelist IP)   (A records)
```

## Project Structure

```
NOC/
├── worker/              # Cloudflare Worker API (Hono.js + TypeScript)
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic (DO, DNS, Infisical)
│   │   ├── lib/         # Utilities (cloud-init generation)
│   │   └── types/       # TypeScript definitions
│   ├── package.json
│   ├── wrangler.toml
│   └── tsconfig.json
├── frontend/            # Cloudflare Pages (Vue 3 + Vite)
│   ├── src/
│   │   ├── views/       # Page components
│   │   ├── components/  # Reusable UI components
│   │   ├── services/    # API client
│   │   └── composables/ # Vue composables
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── shared/              # Shared code and templates
│   └── templates/       # Cloud-init templates
└── docs/                # Documentation
    └── NOC_IMPLEMENTATION_PLAN.md
```

## Tech Stack

### Worker API
- **Framework**: Hono.js (lightweight web framework)
- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **APIs**: DigitalOcean, Cloudflare DNS, Infisical

### Frontend
- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **Styling**: TailwindCSS (matching FlaggerLink CRM design)
- **Auth**: Cloudflare Access (Azure AD)

## Development

### Prerequisites
- Node.js 18+
- Cloudflare account
- DigitalOcean account
- Infisical access

### Local Development

**Worker:**
```bash
cd worker
npm install
npm run dev  # Runs on http://localhost:8787
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173 with API proxy
```

## Deployment

This project uses Cloudflare's built-in GitHub CI/CD workflow:

1. **Push to GitHub**: `git push origin main`
2. **Cloudflare Worker**: Configured in Cloudflare Dashboard → Workers & Pages
3. **Cloudflare Pages**: Configured in Cloudflare Dashboard → Pages
4. **Secrets**: Set environment variables in Cloudflare Dashboard

### Required Secrets (Cloudflare Worker)

Configure in Cloudflare Dashboard → Worker → Settings → Variables:

```bash
INFISICAL_CLIENT_ID=client-xxx
INFISICAL_CLIENT_SECRET=secret-xxx
INFISICAL_PROJECT_ID=64f8...
DIGITALOCEAN_TOKEN=dop_v1_xxx
CLOUDFLARE_API_TOKEN=cf-xxx
CLOUDFLARE_ZONE_ID=zone-xxx
GITHUB_DEPLOY_KEY_PRIVATE=-----BEGIN OPENSSH PRIVATE KEY-----...
```

## Key Features

### Region → VPC Selection Flow

Proper UX flow ensures VPC compatibility with selected region:

1. User selects region (e.g., `nyc1`)
2. Frontend fetches all VPCs from API
3. Worker filters VPCs by `vpc.region === selectedRegion`
4. User selects VPC from filtered list
5. Worker validates VPC region before deployment

### Database Access

Uses DigitalOcean's "DigitalOcean Resources" trusted source feature:

- **One-time setup**: Add "DigitalOcean Resources" in DO Dashboard → Databases → Trusted Sources
- **No code needed**: All droplets in account/VPC automatically trusted
- **No manual IP whitelisting**: Database automatically allows connections from droplets

### Cloud-Init Auto-Deployment

Each droplet automatically:
1. Installs .NET 8.0, Nginx, Redis, RabbitMQ
2. Configures services with Infisical secrets
3. Clones FlaggerLink private repo via SSH deploy key
4. Runs deployment script
5. Configures nginx reverse proxy

## Documentation

See `/docs/NOC_IMPLEMENTATION_PLAN.md` for detailed implementation plan and architecture.

## License

Proprietary - FlaggerLink Internal Use Only
