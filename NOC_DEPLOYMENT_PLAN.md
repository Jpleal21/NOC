# NOC Cloud-Init and Deployment Separation Plan

## Executive Summary

**Goal**: Properly separate cloud-init provisioning from GitHub workflow deployment for NOC tenant servers without breaking production workflow.

**Key Changes**:
1. Remove Portal components from NOC deployment (Portal API + User Portal)
2. Create parameterized nginx templates for server-specific domains (charlie.flaggerlink.com)
3. Use only Cloudflare Origin certs for NOC servers (no Let's Encrypt)
4. Keep systemd Type=notify (correct for ASP.NET Core 8.0)
5. Keep production workflow unchanged

---

## Architecture Understanding

### Centralized Login Flow
```
User → portal.flaggerlink.com (login + tenant lookup)
     → Token handoff to charlie.flaggerlink.com
     → charlie.flaggerlink.com serves Web Frontend
     → charlie-api.flaggerlink.com serves Main API
     → charlie-text-api.flaggerlink.com serves Texting Service
```

### NOC Server Components (Per Tenant)
- ✅ Web Frontend (Vue.js SPA)
- ✅ Main API (REST + SignalR)
- ✅ Texting Service (SMS API)
- ❌ Portal API (centralized at portal.flaggerlink.com)
- ❌ User Portal (centralized at portal.flaggerlink.com)

---

## Separation of Concerns

### Cloud-Init Responsibilities (Infrastructure - Once)
**File**: `/mnt/c/source/NOC/worker/src/lib/cloud-init.ts`

**Deploys**:
- System packages (.NET runtime, nginx, Redis, RabbitMQ)
- Directory structure (`/opt/flaggerlink/*`, `/var/www/flaggerlink/*`)
- SSL certificates (Cloudflare Origin - wildcard `*.flaggerlink.com`)
- Secrets file (`/opt/flaggerlink/secrets/.env`)
- Default nginx config (placeholder only)
- Firewall rules (UFW)

**Does NOT Deploy**:
- Application code
- Systemd service files
- Application-specific nginx configs

**Status**: ✅ Already correct - no changes needed

---

### GitHub Workflow Responsibilities (Application - Repeated)
**File**: `/mnt/c/source/FlaggerLink/.github/workflows/noc-deploy-application.yml`

**Current Problems**:
1. Deploys all 5 components including Portal (should skip Portal)
2. Nginx configs hardcoded to `app.flaggerlink.com` (need server-specific domains)
3. Nginx configs reference Let's Encrypt paths (should use Cloudflare)

**Should Deploy**:
- ✅ Compiled binaries (API, Texting only - skip Portal API)
- ✅ Frontend dist files (Web only - skip User Portal)
- ✅ Systemd service files (environment-specific: production/staging/development)
- ✅ Nginx configs (server-specific: charlie/alpha/bravo)

---

## Implementation Plan

### Step 1: Create Nginx Templates

**New Directory**: `/mnt/c/source/FlaggerLink/deployment/nginx/noc-templates/`

**Create 3 template files** with `{SERVER_NAME}` placeholder:

1. **`{SERVER_NAME}.flaggerlink.com.template`** - Web Frontend
   - Server name: `{SERVER_NAME}.flaggerlink.com`
   - SSL: `/etc/ssl/cloudflare/flaggerlink.com.pem`
   - Proxy API to: `https://{SERVER_NAME}-api.flaggerlink.com/api/`
   - Proxy SignalR to: `https://{SERVER_NAME}-api.flaggerlink.com/communicationHub`
   - Root: `/var/www/flaggerlink/web`

2. **`{SERVER_NAME}-api.flaggerlink.com.template`** - Main API
   - Server name: `{SERVER_NAME}-api.flaggerlink.com`
   - SSL: `/etc/ssl/cloudflare/flaggerlink.com.pem`
   - Proxy to: `http://localhost:8081`
   - WebSocket support for SignalR

3. **`{SERVER_NAME}-text-api.flaggerlink.com.template`** - Texting Service
   - Server name: `{SERVER_NAME}-text-api.flaggerlink.com`
   - SSL: `/etc/ssl/cloudflare/flaggerlink.com.pem`
   - Proxy to: `http://localhost:5131`
   - Telnyx webhook endpoint

### Step 2: Update Systemd Service Files

**Files**: `/mnt/c/source/FlaggerLink/deployment/systemd/production/*.service`

**Change in all three files**:
```ini
# OLD
Type=notify

# NEW
Type=simple
```

**Files to modify**:
- `flaggerlink-api.service` (line 8)
- `flaggerlink-texting.service` (line 8)
- `flaggerlink-portal-api.service` (line 8)

**Why**: Type=notify times out because .NET apps don't send systemd notifications. Type=simple starts service immediately and considers it running once process starts.

### Step 3: Update NOC Workflow

**File**: `/mnt/c/source/FlaggerLink/.github/workflows/noc-deploy-application.yml`

**Remove Portal Builds**:
- Delete: `Build Portal API` step (~lines 107-113)
- Delete: `Build User Portal` step (~lines 144-150)

**Remove Portal Deployments**:
- Delete: Portal API rsync (~lines 217-221)
- Delete: User Portal rsync (~lines 239-243)

**Update Nginx Deployment** (~lines 286-314):
Replace entire nginx deployment section with:

```yaml
- name: Deploy Nginx Configuration
  run: |
    echo "🌐 Deploying nginx configuration..."

    # Create temp directory for processed templates
    mkdir -p /tmp/nginx-configs

    # Process templates (replace {SERVER_NAME} with actual server name)
    for template in deployment/nginx/noc-templates/*.template; do
      filename=$(basename "$template" .template)
      processed_file="/tmp/nginx-configs/${filename}"
      sed "s/{SERVER_NAME}/${{ inputs.server_name }}/g" "$template" > "$processed_file"
      echo "Processed: $filename"
    done

    # Deploy to server
    scp -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no \
      /tmp/nginx-configs/* \
      root@${{ inputs.droplet_ip }}:/etc/nginx/sites-available/

    # Enable sites and reload
    ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no root@${{ inputs.droplet_ip }} << EOF
      rm -f /etc/nginx/sites-enabled/default
      ln -sf /etc/nginx/sites-available/${{ inputs.server_name }}.flaggerlink.com /etc/nginx/sites-enabled/
      ln -sf /etc/nginx/sites-available/${{ inputs.server_name }}-api.flaggerlink.com /etc/nginx/sites-enabled/
      ln -sf /etc/nginx/sites-available/${{ inputs.server_name }}-text-api.flaggerlink.com /etc/nginx/sites-enabled/
      nginx -t && systemctl reload nginx
    EOF
```

**Update Service Startup** (~lines 408-438):
Remove Portal API service commands:
- Delete: `systemctl start flaggerlink-portal-api`
- Delete: `systemctl enable flaggerlink-portal-api`

**Update Health Checks** (~lines 444-473):
Remove Portal API health check:
- Delete: `curl -f http://localhost:5100/health`

**Update Summary** (~lines 479-522):
Remove Portal references, add note about centralized portal.

### Step 3: Update NOC Worker Database Fix

**File**: `/mnt/c/source/NOC/worker/src/services/digitalocean.ts`

**Status**: ✅ Already fixed (lines 202-234) - GET existing rules, add new source, PUT updated list

No changes needed - just verify it's deployed.

---

## Systemd Configuration Decision

**Current State**: All systemd files use `Type=notify`

**Recommendation**: **Change to Type=simple** - PROVEN to work on Charlie

**Rationale**:
- Tested on Charlie: Type=notify timed out even with `TimeoutStartSec=120`
- Changed to Type=simple: Services started successfully
- The .NET applications don't send systemd sd_notify() signals
- Type=simple is simpler and more reliable for our use case

**Required Changes**: Update all production systemd files from `Type=notify` to `Type=simple`

---

## Production Workflow Protection

**File**: `/mnt/c/source/FlaggerLink/.github/workflows/deploy-production.yml`

**Required Changes**: **NONE**

**Why it's safe**:
- Production workflow does NOT deploy systemd files
- Production workflow does NOT deploy nginx configs
- Only deploys application binaries and frontend dist files
- Assumes pre-existing infrastructure configuration
- Uses Let's Encrypt certs (different from NOC's Cloudflare certs)
- Deploys all 5 components (including Portal)

---

## Critical Files to Modify

### New Files (Create)
1. `/mnt/c/source/FlaggerLink/deployment/nginx/noc-templates/{SERVER_NAME}.flaggerlink.com.template`
2. `/mnt/c/source/FlaggerLink/deployment/nginx/noc-templates/{SERVER_NAME}-api.flaggerlink.com.template`
3. `/mnt/c/source/FlaggerLink/deployment/nginx/noc-templates/{SERVER_NAME}-text-api.flaggerlink.com.template`

### Modified Files
4. `/mnt/c/source/FlaggerLink/.github/workflows/noc-deploy-application.yml` - Remove Portal, add template processing
5. `/mnt/c/source/FlaggerLink/deployment/systemd/production/flaggerlink-api.service` - Change Type=notify to Type=simple
6. `/mnt/c/source/FlaggerLink/deployment/systemd/production/flaggerlink-texting.service` - Change Type=notify to Type=simple
7. `/mnt/c/source/FlaggerLink/deployment/systemd/production/flaggerlink-portal-api.service` - Change Type=notify to Type=simple (even though not deployed to NOC)

### Already Fixed (Verify)
8. `/mnt/c/source/NOC/worker/src/services/digitalocean.ts` - Database firewall fix
9. `/mnt/c/source/NOC/worker/src/lib/cloud-init.ts` - SSL cert naming (already correct)

### Unchanged Files
10. `/mnt/c/source/FlaggerLink/.github/workflows/deploy-production.yml` - No changes

---

## Testing Plan

### 1. Test Nginx Templates Locally
```bash
cd /mnt/c/source/FlaggerLink/deployment/nginx/noc-templates
sed "s/{SERVER_NAME}/charlie/g" charlie.flaggerlink.com.template | nginx -t -c /dev/stdin
```

### 2. Test NOC Deployment (Staging)
- Deploy to test NOC server (alpha or charlie)
- Verify only 3 services start (API, Texting, Web - NO Portal API)
- Verify nginx serves correct domains (charlie.flaggerlink.com)
- Verify SSL uses Cloudflare certs
- Test login flow: portal.flaggerlink.com → charlie.flaggerlink.com

### 3. Verify Production Unaffected
- No changes to production workflow
- Production still deploys all 5 components
- Production still uses Let's Encrypt certs

---

## Success Criteria

✅ NOC servers deploy only 3 components (Web, API, Texting)
✅ Each NOC server uses server-specific domains (charlie.flaggerlink.com)
✅ All NOC servers use Cloudflare Origin certs only
✅ Production workflow remains unchanged
✅ Database firewall preserves existing rules when adding new server
✅ Login flow works: portal → tenant server handoff
✅ Nginx configs templated and parameterized
✅ Systemd services start successfully with Type=notify

---

## Rollback Plan

### If NOC Deployment Fails
1. SSH to server: `ssh root@<droplet_ip>`
2. Restore default nginx: `ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/`
3. Reload nginx: `systemctl reload nginx`
4. Or destroy droplet and re-provision

### If Production Breaks
- Production unchanged, no rollback needed
- If somehow affected: redeploy previous commit

---

## Timeline Estimate

- **Step 1** (Nginx templates): 30 minutes
- **Step 2** (Workflow updates): 45 minutes
- **Step 3** (Testing): 1 hour
- **Total**: ~2.5 hours

---

## Next Steps After Implementation

1. Update NOC frontend checkbox label (separate task)
2. Deploy NOC Worker database fix to Cloudflare
3. Test complete deployment flow end-to-end
4. Document NOC-specific deployment process in CLAUDE.md
