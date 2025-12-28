# NOC Platform Implementation Plan

**Network Operations Center - FlaggerLink Infrastructure Management**

**Purpose:** Custom IaaS platform for rapid deployment of FlaggerLink production servers using Cloudflare Workers + Pages

**Created:** December 27, 2025

---

## Overview

The NOC platform is a custom Infrastructure-as-a-Service (IaaS) solution that enables rapid deployment and management of FlaggerLink production servers without requiring GitHub repository access.

### Problem Statement

- No access to FlaggerLink GitHub repository settings
- Cannot add GitHub Secrets for deployment automation
- Need independent deployment platform with full control

### Solution

Build a serverless deployment platform using:
- **Cloudflare Workers** - Backend API (orchestration, API calls)
- **Cloudflare Pages** - Frontend UI (deployment interface)
- **Cloudflare Secrets** - NOC platform credentials
- **Infisical** - FlaggerLink application secrets (unchanged)

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    User (Web Browser)                      │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│              Cloudflare Pages (Frontend UI)                │
│  - Vue.js 3 + Vite                                        │
│  - TailwindCSS (matches CRM design)                       │
│  - Server deployment form                                 │
│  - Server list/status dashboard                           │
│  - Deployment logs viewer                                 │
└─────────────────────────┬──────────────────────────────────┘
                          │ HTTPS
                          ▼
┌────────────────────────────────────────────────────────────┐
│           Cloudflare Worker (Backend API)                  │
│  - Hono.js framework                                      │
│  - TypeScript                                             │
│  - Routes:                                                │
│    • POST   /api/deploy                                   │
│    • DELETE /api/servers/:name                           │
│    • GET    /api/servers                                 │
│    • GET    /api/servers/:name/status                    │
│    • GET    /api/servers/:name/logs                      │
└──────┬──────────┬──────────────┬──────────────────────────┘
       │          │              │
       ▼          ▼              ▼
┌──────────┐ ┌──────────┐ ┌────────────────┐
│Infisical │ │ Digital  │ │  Cloudflare    │
│   API    │ │ Ocean    │ │  DNS API       │
│          │ │   API    │ │                │
│(fetch FL │ │(create   │ │(create DNS     │
│ secrets) │ │droplets) │ │ records)       │
└──────────┘ └──────────┘ └────────────────┘
```

---

## Secret Management Strategy

### Clear Separation of Concerns

**Infisical (FlaggerLink Secrets):**
- `REDIS_PASSWORD` - FlaggerLink infrastructure
- `RABBITMQ_USER` - FlaggerLink infrastructure
- `RABBITMQ_PASSWORD` - FlaggerLink infrastructure
- Future: Database, JWT, Encryption keys (if needed)

**Cloudflare Workers Secrets (NOC Platform):**
- `INFISICAL_CLIENT_ID` - To fetch FlaggerLink secrets
- `INFISICAL_CLIENT_SECRET` - To fetch FlaggerLink secrets
- `INFISICAL_PROJECT_ID` - FlaggerLink project identifier
- `DIGITALOCEAN_TOKEN` - To create/destroy droplets
- `CLOUDFLARE_API_TOKEN` - To create/destroy DNS records
- `CLOUDFLARE_ZONE_ID` - flaggerlink.com zone

**Why This Separation?**
- ✅ FlaggerLink secrets stay in Infisical (single source of truth)
- ✅ NOC platform secrets in Cloudflare (platform-specific)
- ✅ No mixing of concerns
- ✅ Easy to rotate NOC credentials without touching FlaggerLink
- ✅ NOC can be reused for other projects

---

## Project Structure

```
NOC/
├── docs/
│   ├── NOC_IMPLEMENTATION_PLAN.md    (this file)
│   ├── API_DOCUMENTATION.md          (API specs)
│   └── DEPLOYMENT_GUIDE.md           (how to deploy NOC)
│
├── worker/                           # Cloudflare Worker (Backend)
│   ├── src/
│   │   ├── index.ts                  # Main entry point
│   │   ├── routes/
│   │   │   ├── deploy.ts             # POST /api/deploy
│   │   │   ├── servers.ts            # Server CRUD
│   │   │   └── status.ts             # Server status/logs
│   │   ├── services/
│   │   │   ├── infisical.ts          # Infisical API client
│   │   │   ├── digitalocean.ts       # DigitalOcean API client
│   │   │   ├── cloudflare-dns.ts     # Cloudflare DNS API
│   │   │   └── deployment.ts         # Deployment orchestration
│   │   ├── lib/
│   │   │   ├── cloud-init.ts         # Generate cloud-init YAML
│   │   │   ├── logger.ts             # Logging utility
│   │   │   └── validators.ts         # Input validation
│   │   └── types/
│   │       └── index.ts              # TypeScript types
│   ├── wrangler.toml                 # Worker config
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                         # Cloudflare Pages (Frontend)
│   ├── src/
│   │   ├── main.js                   # Vue app entry
│   │   ├── App.vue                   # Root component
│   │   ├── views/
│   │   │   ├── Dashboard.vue         # Server list
│   │   │   ├── Deploy.vue            # Deploy new server
│   │   │   └── ServerDetails.vue     # Server details/logs
│   │   ├── components/
│   │   │   ├── ServerCard.vue        # Server status card
│   │   │   ├── DeploymentForm.vue    # Deployment form
│   │   │   └── LogViewer.vue         # Log viewer
│   │   ├── services/
│   │   │   └── api.js                # API client (calls Worker)
│   │   ├── composables/
│   │   │   └── useServers.js         # Server state management
│   │   └── style.css                 # TailwindCSS (from CRM)
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── shared/                           # Shared code
│   ├── cloud-init-template.yml      # Cloud-init from FlaggerLink
│   └── types.ts                      # Shared TypeScript types
│
└── README.md                         # Project overview
```

---

## Implementation Phases

### Phase 1: Project Setup (30 minutes)

**Objectives:**
- Initialize project structure
- Set up development environment
- Configure Cloudflare Workers + Pages

**Tasks:**
- [ ] Create project directories
- [ ] Initialize Worker project (`npm create cloudflare@latest`)
- [ ] Initialize Pages project (Vue 3 + Vite)
- [ ] Copy TailwindCSS config from CRM frontend
- [ ] Copy cloud-init template from FlaggerLink
- [ ] Set up TypeScript configs

**Deliverables:**
- Working dev environment
- Project scaffolding complete

---

### Phase 2: Cloudflare Worker API (3-4 hours)

**Objectives:**
- Build backend API for deployment orchestration
- Implement service integrations (Infisical, DigitalOcean, Cloudflare)

**Tasks:**
- [ ] Set up Hono.js framework
- [ ] Create API routes structure
- [ ] Implement Infisical API client
  - [ ] Authenticate with Machine Identity
  - [ ] Fetch secrets from production environment
- [ ] Implement DigitalOcean API client
  - [ ] Create droplet
  - [ ] List droplets
  - [ ] Delete droplet
  - [ ] Get droplet status
- [ ] Implement Cloudflare DNS API client
  - [ ] Create 3 A records (app, api, text-api)
  - [ ] Delete 3 A records
  - [ ] Verify DNS records
- [ ] Implement deployment orchestration
  - [ ] Fetch secrets from Infisical
  - [ ] Generate cloud-init with secrets
  - [ ] Create droplet with cloud-init
  - [ ] Create DNS records
  - [ ] Return deployment status
- [ ] Add error handling and logging
- [ ] Add input validation

**API Endpoints:**

```typescript
POST /api/deploy
Body: {
  server_name: "alpha",
  droplet_size: "s-2vcpu-4gb",
  droplet_region: "nyc1",
  branch: "master",
  enable_cloudflare_proxy: true
}
Response: {
  success: true,
  deployment_id: "dep_abc123",
  droplet_id: "123456789",
  droplet_ip: "192.168.1.1",
  domains: [
    "alpha.flaggerlink.com",
    "alpha-api.flaggerlink.com",
    "alpha-text-api.flaggerlink.com"
  ]
}

GET /api/servers
Response: {
  servers: [
    {
      name: "alpha",
      droplet_id: "123456789",
      ip: "192.168.1.1",
      status: "active",
      created_at: "2025-12-27T10:00:00Z",
      domains: ["alpha.flaggerlink.com", ...]
    }
  ]
}

DELETE /api/servers/:name
Body: { confirm: "DESTROY" }
Response: {
  success: true,
  deleted_droplet: "123456789",
  deleted_dns_records: 3
}

GET /api/servers/:name/status
Response: {
  name: "alpha",
  status: "active",
  uptime: 86400,
  services: {
    api: "healthy",
    texting: "healthy",
    redis: "healthy",
    rabbitmq: "healthy"
  }
}
```

**Deliverables:**
- Working API deployed to Cloudflare Workers
- All endpoints functional
- Integration tests passing

---

### Phase 3: Cloudflare Pages UI (2-3 hours)

**Objectives:**
- Build user interface matching CRM frontend design
- Implement deployment workflow
- Real-time status updates

**Tasks:**
- [ ] Set up Vue 3 + Vite project
- [ ] Configure TailwindCSS (copy from CRM)
- [ ] Copy design system from CRM frontend
  - [ ] Colors, typography, spacing
  - [ ] Component styles (buttons, cards, forms)
- [ ] Build Dashboard view
  - [ ] Server list/grid
  - [ ] Server status cards
  - [ ] Quick stats (total servers, regions, etc.)
- [ ] Build Deploy view
  - [ ] Server name input
  - [ ] Droplet size selector
  - [ ] Region selector
  - [ ] Branch input
  - [ ] Cloudflare proxy toggle
  - [ ] Deploy button
- [ ] Build ServerDetails view
  - [ ] Server info display
  - [ ] Domain list
  - [ ] Service health status
  - [ ] Destroy button
- [ ] Create API service client
  - [ ] Fetch servers
  - [ ] Deploy server
  - [ ] Delete server
  - [ ] Get server status
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add success notifications

**UI Components:**

```
Dashboard.vue
  ├── ServerCard.vue (for each server)
  │   ├── Server name + status badge
  │   ├── IP address + domains
  │   ├── Uptime + created date
  │   └── View Details button
  └── DeployButton.vue → Navigate to Deploy view

Deploy.vue
  └── DeploymentForm.vue
      ├── Server name input (alpha, bravo, charlie)
      ├── Droplet size dropdown
      ├── Region dropdown
      ├── Branch input (default: master)
      ├── Cloudflare proxy checkbox
      └── Deploy button

ServerDetails.vue
  ├── Server info panel
  ├── Domain list
  ├── Service status (API, Texting, Redis, RabbitMQ)
  ├── LogViewer.vue
  └── Destroy button (with confirmation)
```

**Deliverables:**
- Deployed Cloudflare Pages site
- Fully functional UI
- Matches CRM design system

---

### Phase 4: Integration & Testing (1-2 hours)

**Objectives:**
- End-to-end testing
- Deploy test server
- Verify all functionality

**Tasks:**
- [ ] Configure Cloudflare Worker secrets
  - [ ] Add Infisical credentials
  - [ ] Add DigitalOcean token
  - [ ] Add Cloudflare API token
- [ ] Deploy Worker to production
- [ ] Deploy Pages to production
- [ ] Test deployment flow
  - [ ] Deploy `test` server
  - [ ] Verify droplet created
  - [ ] Verify DNS records created
  - [ ] Verify services started
  - [ ] SSH into droplet and check
- [ ] Test destroy flow
  - [ ] Destroy `test` server
  - [ ] Verify droplet deleted
  - [ ] Verify DNS records deleted
- [ ] Test error scenarios
  - [ ] Invalid server name
  - [ ] Duplicate server name
  - [ ] API failures
- [ ] Add monitoring/logging
- [ ] Document deployment process

**Deliverables:**
- Fully tested platform
- Successful test deployment
- Documentation complete

---

### Phase 5: Production Deployment (30 minutes)

**Objectives:**
- Deploy first production server using NOC platform
- Verify production readiness

**Tasks:**
- [ ] Deploy `alpha` server via NOC UI
- [ ] Verify all services healthy
- [ ] Verify DNS resolves
- [ ] Verify HTTPS works (Cloudflare proxy)
- [ ] Deploy FlaggerLink application to `alpha`
- [ ] Smoke test FlaggerLink on `alpha`
- [ ] Document production deployment

**Deliverables:**
- First production server deployed
- Platform ready for scaling

---

## Tech Stack

### Backend (Cloudflare Worker)

- **Runtime:** Cloudflare Workers (V8 isolates)
- **Framework:** Hono.js (lightweight, fast)
- **Language:** TypeScript
- **APIs:**
  - Infisical API (secret retrieval)
  - DigitalOcean API (droplet management)
  - Cloudflare API (DNS management)

### Frontend (Cloudflare Pages)

- **Framework:** Vue 3 (Composition API)
- **Build Tool:** Vite
- **Styling:** TailwindCSS (from CRM frontend)
- **HTTP Client:** Fetch API
- **State Management:** Vue Composables (lightweight)

### Infrastructure

- **Hosting:** Cloudflare (Workers + Pages)
- **Secrets:** Cloudflare Workers Secrets
- **DNS:** Cloudflare
- **Compute:** DigitalOcean Droplets

---

## Security Considerations

### Authentication

**Phase 1 (MVP):** No authentication - internal tool, Cloudflare zone restricted

**Phase 2 (Future):** Add Cloudflare Access for SSO

### Secret Management

✅ **NOC platform secrets** → Cloudflare Workers environment variables (encrypted)
✅ **FlaggerLink secrets** → Infisical (unchanged)
✅ **API keys never exposed** to frontend
✅ **HTTPS only** via Cloudflare

### Access Control

- Cloudflare Pages deployment restricted to authorized accounts
- Worker API can be restricted by IP/domain if needed
- Cloudflare Access can add SSO (optional)

---

## Cost Estimate

### Cloudflare (NOC Platform)

- **Workers:** Free tier (100,000 requests/day) - sufficient
- **Pages:** Free tier (500 builds/month, unlimited requests) - sufficient
- **DNS:** Free
- **Total NOC Platform Cost:** $0/month

### DigitalOcean (Deployed Servers)

- Per server: $18/month (s-2vcpu-4gb)
- See FlaggerLink docs for scaling costs

**Total:** $0 platform + $18 per deployed server

---

## Future Enhancements

**Phase 2 (Optional):**
- [ ] Cloudflare Access authentication
- [ ] Email notifications on deployment
- [ ] Slack/Discord webhooks
- [ ] Server health monitoring dashboard
- [ ] Automated backups configuration
- [ ] Multi-region deployment
- [ ] Server templates (preset configurations)
- [ ] Deployment history/audit log
- [ ] Cost tracking dashboard
- [ ] Integration with FlaggerLink CRM billing

---

## Success Criteria

✅ Deploy production server without GitHub access
✅ Create/destroy servers via web UI
✅ DNS automatically configured
✅ Cloud-init provisions servers correctly
✅ UI matches CRM design system
✅ Platform is serverless (no infrastructure to manage)
✅ Secrets properly separated (NOC vs FlaggerLink)

---

## Timeline

- **Phase 1:** 30 minutes (project setup)
- **Phase 2:** 3-4 hours (Worker API)
- **Phase 3:** 2-3 hours (Pages UI)
- **Phase 4:** 1-2 hours (testing)
- **Phase 5:** 30 minutes (production deployment)

**Total:** 7-10 hours for complete platform

---

## Next Steps

1. Review this plan
2. Confirm approach
3. Begin Phase 1 (project setup)
4. Build iteratively, testing as we go

---

**Status:** Planning Complete - Ready to Begin Implementation
**Last Updated:** December 27, 2025
**Maintained By:** Development Team
