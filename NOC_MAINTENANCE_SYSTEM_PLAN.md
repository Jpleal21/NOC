# NOC Server Maintenance System - Implementation Plan

**Status**: Planning Complete - Awaiting Approval
**Created**: 2025-12-31
**Last Updated**: 2025-12-31

---

## Overview

Add server maintenance capabilities to the NOC Platform:
- Schedule maintenance windows per server
- Execute OS/security updates remotely with real-time output
- Public API endpoint for FlaggerLink apps to check maintenance status
- Complete compliance logging (PCI/SOC2 - 7 year retention)

---

## Architecture

### Components
1. **Database Layer**: 3 new D1 tables (maintenance_windows, update_logs, maintenance_audit_log)
2. **Worker API**: RESTful + SSE endpoints for maintenance operations
3. **SSH Bridge**: External Node.js microservice for remote command execution
4. **Frontend**: New "Maintenance" tab with scheduling, execution, and log viewing
5. **Droplet Setup**: SSH key configuration in cloud-init for NOC access

### Key Decisions
- **SSH Execution**: Use external SSH bridge (Node.js service) since Cloudflare Workers can't SSH directly
- **Real-time Output**: SSE streaming pattern (same as deployment streaming)
- **Authentication**: Cloudflare Access (extract user email from CF-Access-Authenticated-User-Email header)
- **Public API**: Unauthenticated read-only endpoint for FlaggerLink apps to check maintenance status
- **Compliance**: All actions logged to maintenance_audit_log with 7-year retention

---

## Droplet Requirements

**What needs to be on each droplet:**
1. **SSH Access for NOC**:
   - NOC management SSH public key added to authorized_keys during provisioning
   - Key will be added via DigitalOcean's `ssh_keys` parameter (already supported)
   - User: `flaggerlink` (already exists)

2. **No additional software required**: Updates use standard `apt` commands

**SSH Bridge Server Setup:**
- Separate trusted server running Node.js SSH bridge
- Stores NOC private SSH key
- Receives commands from Worker, executes via SSH, returns output
- Deployment location: TBD (dedicated droplet or existing management server)

---

## Database Schema

### Migration: `/worker/migrations/002_add_maintenance_system.sql`

**Table 1: maintenance_windows**
- Tracks scheduled/active/completed maintenance periods
- Fields: id, server_name, droplet_id, status, scheduled_start, scheduled_end, actual_start, actual_end, reason, created_by, created_at, updated_at
- Status values: 'scheduled', 'active', 'completed', 'cancelled'

**Table 2: update_logs**
- Stores execution logs for OS/security updates
- Fields: id, server_name, droplet_id, maintenance_window_id (nullable FK), update_type, status, command, output (full stdout/stderr), packages_updated, duration, error_message, created_by, started_at, completed_at
- Update types: 'security', 'os', 'full-upgrade'
- Status values: 'running', 'success', 'failed', 'partial'

**Table 3: maintenance_audit_log**
- Compliance logging for PCI/SOC2 (7-year retention)
- Fields: id, server_name, droplet_id, action_type, action_detail (JSON), user_email, user_ip, maintenance_window_id, update_log_id, status, error_message, created_at
- Action types: 'schedule_maintenance', 'cancel_maintenance', 'execute_update', 'enter_maintenance', 'exit_maintenance', 'api_status_check'
- Captures ALL maintenance-related actions

---

## Backend Implementation

### New Service: `/worker/src/services/ssh.ts`
- Communicates with SSH bridge via HTTP
- Methods: executeCommand(), executeCommandStream(), getUpdateCommand(), parsePackageCount()
- Returns SSHCommandResult with exit_code, stdout, stderr, duration

### Database Service Updates: `/worker/src/services/database.ts`
Add methods for:
- Maintenance windows: createMaintenanceWindow(), updateMaintenanceWindow(), getMaintenanceWindows(), getMaintenanceWindow()
- Update logs: createUpdateLog(), updateUpdateLog(), getUpdateLogs(), getUpdateLog()
- Audit logs: createAuditLog(), getAuditLogs()

### Worker API Endpoints: `/worker/src/index.ts`

**Maintenance Windows:**
- `GET /api/maintenance/windows` - List windows (filterable)
- `POST /api/maintenance/windows` - Schedule new window
- `PATCH /api/maintenance/windows/:id` - Update window
- `POST /api/maintenance/windows/:id/cancel` - Cancel window

**OS/Security Updates:**
- `POST /api/maintenance/updates/execute` - Execute updates with SSE streaming
- `GET /api/maintenance/updates/logs` - List update logs
- `GET /api/maintenance/updates/logs/:id` - Get single log with full output

**Public API (no auth):**
- `GET /api/public/maintenance/status/:server_name` - Check if server is in maintenance

**Audit Logs:**
- `GET /api/maintenance/audit` - Query audit logs (compliance reports)

### Helper Functions:
- `getUserEmail(c)`: Extract email from CF-Access-Authenticated-User-Email header
- `getUserIP(c)`: Extract IP from CF-Connecting-IP header

---

## Frontend Implementation

### New Tab: `/frontend/src/components/tabs/MaintenanceTab.vue`

**Features:**
1. **Server Selection**: Dropdown to select server, check current maintenance status
2. **Sub-tabs**:
   - Schedule Maintenance: Form for scheduling windows (start time, end time, reason)
   - Execute Updates: Dropdown for update type (security/os/full-upgrade), execute button, real-time output viewer
   - Maintenance Windows: List of scheduled/active/completed windows with cancel option
   - Update Logs: List of past update executions with status, packages updated, duration

**UI Patterns:**
- Follow existing NOC design (dark theme, primary orange color)
- SSE streaming for real-time update output (same pattern as deployment)
- Status badges for window/log status (green/yellow/red)
- Form validation and loading states

### API Client Updates: `/frontend/src/services/api.js`

Add methods:
- getMaintenanceStatus(), getMaintenanceWindows(), scheduleMaintenanceWindow(), cancelMaintenanceWindow()
- executeUpdates() (returns fetch response for SSE), getUpdateLogs(), getUpdateLog()
- getAuditLogs()

### Dashboard Updates: `/frontend/src/views/Dashboard.vue`

- Import MaintenanceTab component
- Add maintenance tab to tabs array with gear icon
- Render MaintenanceTab when activeTab === 'maintenance'

---

## SSH Bridge Microservice

**Repository**: New `noc-ssh-bridge` directory (or separate repo)

**Tech Stack**: Node.js + Express + ssh2 library

**Endpoints:**
- `POST /api/execute` - Execute command, return complete output
- `POST /api/execute/stream` - Execute command with SSE streaming

**Authentication**: Bearer token in Authorization header

**Configuration** (.env):
- PORT (default 3000)
- AUTH_TOKEN (secure random token)
- SSH_KEY_PATH (path to NOC private key)
- SSH_USER (default: flaggerlink)

**Security:**
- Deploy on isolated server with firewall restricting access to Worker IPs only
- Use systemd for process management and auto-restart
- Rotate SSH keys regularly
- Monitor logs for suspicious activity

---

## Cloudflare Secret Store

Add these secrets:
- `SSH_BRIDGE_URL`: URL of SSH bridge service (e.g., https://ssh-bridge.internal:3000)
- `SSH_BRIDGE_TOKEN`: Authentication token for SSH bridge

Update `/worker/wrangler.jsonc` to bind these secrets.

---

## Cloud-Init Updates

**File**: `/worker/src/lib/cloud-init.ts`

**Changes**:
- No code changes required - SSH key is already added via DO's `ssh_keys` parameter
- Document in comments that NOC management key must be included in deployment

**NOC SSH Key Setup**:
1. Generate SSH key on SSH bridge server: `ssh-keygen -t rsa -b 4096 -f /root/.ssh/noc_rsa`
2. Add public key to DigitalOcean via API/dashboard
3. Include key ID in deployments (either hardcode or make selectable in UI)

---

## Implementation Sequence

### Phase 1: Database & SSH Bridge (Week 1)
- [ ] Create migration file `002_add_maintenance_system.sql`
- [ ] Run migration: `wrangler d1 execute noc-platform --file=migrations/002_add_maintenance_system.sql`
- [ ] Create `noc-ssh-bridge` directory with Node.js service
- [ ] Generate NOC SSH key and add to DigitalOcean
- [ ] Deploy SSH bridge to management server
- [ ] Add SSH_BRIDGE_URL and SSH_BRIDGE_TOKEN to Cloudflare Secrets
- [ ] Test SSH bridge connectivity

### Phase 2: Backend API (Week 1-2)
- [ ] Update `/worker/src/services/database.ts` with maintenance methods
- [ ] Create `/worker/src/services/ssh.ts` service
- [ ] Add maintenance API endpoints to `/worker/src/index.ts`
- [ ] Update `/worker/wrangler.jsonc` with secret bindings
- [ ] Test API endpoints with curl/Postman

### Phase 3: Frontend (Week 2)
- [ ] Create `/frontend/src/components/tabs/MaintenanceTab.vue`
- [ ] Update `/frontend/src/views/Dashboard.vue` to include maintenance tab
- [ ] Update `/frontend/src/services/api.js` with maintenance methods
- [ ] Test end-to-end: schedule window, execute updates, view logs

### Phase 4: Integration & Testing (Week 2-3)
- [ ] Test full maintenance workflow
- [ ] Test public API endpoint (call from external client)
- [ ] Verify compliance logging (audit_log entries created)
- [ ] Verify user email tracking from Cloudflare Access
- [ ] Test error handling (SSH failures, timeouts, etc.)
- [ ] Load test SSH bridge
- [ ] Document operational procedures

### Phase 5: Deployment & Documentation (Week 3)
- [ ] Deploy to production
- [ ] Create runbooks for common tasks
- [ ] Train team on maintenance workflows
- [ ] Set up monitoring/alerting for SSH bridge
- [ ] Document compliance report generation

---

## Testing Checklist

- [ ] Schedule maintenance window via UI ✓ Creates maintenance_windows record
- [ ] Cancel scheduled maintenance window ✓ Updates status to 'cancelled'
- [ ] Execute security updates ✓ Streams output, creates update_logs record
- [ ] Execute OS updates ✓ All package types work
- [ ] Execute full upgrade ✓ dist-upgrade completes successfully
- [ ] View real-time update output ✓ SSE streaming works
- [ ] View maintenance windows history ✓ Shows all windows for server
- [ ] View update logs history ✓ Shows all executions with details
- [ ] Public API status check ✓ Returns correct maintenance status
- [ ] Verify audit logs ✓ All actions logged with user email
- [ ] SSH bridge timeout handling ✓ Commands timeout after 5 minutes
- [ ] SSH bridge error handling ✓ Connection failures handled gracefully
- [ ] Multi-server concurrent updates ✓ No race conditions
- [ ] Package count parsing ✓ Correctly extracts updated package count

---

## Security Considerations

1. **SSH Bridge**:
   - Isolated server with strict firewall rules
   - Only accessible from Cloudflare Worker IPs
   - Strong authentication token (minimum 32 chars random)
   - SSH key rotation every 90 days
   - Log all commands executed

2. **API Security**:
   - All write operations require Cloudflare Access auth
   - Public API is read-only (status checks only)
   - User tracking via CF-Access-Authenticated-User-Email
   - Audit logs capture IP addresses

3. **Compliance**:
   - 7-year retention for audit logs (PCI DSS requirement)
   - Immutable logs (INSERT only, no UPDATE/DELETE)
   - Complete audit trail of who/what/when/where
   - Exportable reports for auditors

---

## Rollout Strategy

1. **Week 1**: Deploy SSH bridge and test with 1 test server
2. **Week 2**: Enable for staging servers only
3. **Week 3**: Gradual rollout to production (10% → 50% → 100%)
4. **Week 4**: Full production, monitor for issues

---

## Pending Architectural Changes

### Infisical Agent Migration (In Planning)

**Current State:**
- NOC fetches secrets from Infisical during deployment
- Cloud-init writes secrets to `/opt/flaggerlink/secrets/.env` (one-time, static)
- Secret changes require droplet redeployment

**Planned Future State:**
- Install **Infisical Agent** on each droplet during cloud-init
- Agent runs as systemd service, continuously syncs secrets from Infisical
- Secrets can be rotated/updated without redeployment
- Better security and operational flexibility

**Impact on Maintenance System:**

1. **Cloud-Init Updates Required:**
   - Add Infisical Agent installation steps to cloud-init template
   - Configure agent with client credentials
   - Set up agent as systemd service
   - Update droplet requirements documentation

2. **New Maintenance Operations:**
   - Restart Infisical Agent (if secrets not syncing)
   - Force secret sync from Infisical
   - Update Infisical Agent version
   - View agent status/logs

3. **Update Logs Enhancement:**
   - Track Infisical agent operations
   - Log secret sync events for compliance
   - Monitor agent health

**Action Items:**
- [ ] Wait for Infisical Agent migration plan to be finalized
- [ ] Update cloud-init template with agent installation
- [ ] Add Infisical Agent operations to maintenance UI
- [ ] Document agent troubleshooting procedures
- [ ] Update compliance logging to track secret operations

**Note:** The core maintenance system design (SSH bridge, update execution, compliance logging) remains valid. The Infisical Agent is an additive enhancement that will integrate with the existing maintenance operations.

---

## Open Questions for User

1. **SSH Bridge Hosting**: Where should we deploy the SSH bridge? Options:
   - Dedicated management droplet (recommended)
   - Existing NOC infrastructure server
   - External hosting (AWS/GCP)

2. **Auto-Reboot Policy**: When updates require reboot, should we:
   - Auto-reboot immediately (fastest)
   - Require manual approval (safer)
   - Just log that reboot is needed (manual later)

3. **Maintenance Mode Auto-Activation**: Should maintenance windows:
   - Auto-activate at scheduled_start time (recommended)
   - Require manual toggle only
   - Both options available

4. **Update Scheduling**: Should we support scheduled automatic updates, or only manual execution?

5. **Public API Rate Limiting**: Should the public maintenance status API have rate limiting?

6. **Infisical Agent Operations**: Should the maintenance system include dedicated operations for Infisical Agent management (restart, sync, update)?

---

## Success Criteria

- [ ] Can schedule maintenance windows from NOC UI
- [ ] Can execute OS updates with real-time output streaming
- [ ] FlaggerLink apps can check maintenance status via public API
- [ ] All maintenance actions logged for compliance audits
- [ ] Average update execution time < 5 minutes
- [ ] Zero SSH bridge downtime during first month
- [ ] Positive feedback from operations team

---

## File Paths Reference

**Backend:**
- `/mnt/c/source/NOC/worker/migrations/002_add_maintenance_system.sql`
- `/mnt/c/source/NOC/worker/src/services/database.ts`
- `/mnt/c/source/NOC/worker/src/services/ssh.ts` (new)
- `/mnt/c/source/NOC/worker/src/index.ts`
- `/mnt/c/source/NOC/worker/wrangler.jsonc`

**Frontend:**
- `/mnt/c/source/NOC/frontend/src/components/tabs/MaintenanceTab.vue` (new)
- `/mnt/c/source/NOC/frontend/src/views/Dashboard.vue`
- `/mnt/c/source/NOC/frontend/src/services/api.js`

**SSH Bridge:**
- `/mnt/c/source/noc-ssh-bridge/package.json` (new)
- `/mnt/c/source/noc-ssh-bridge/index.js` (new)
- `/mnt/c/source/noc-ssh-bridge/.env.example` (new)
- `/mnt/c/source/noc-ssh-bridge/systemd/noc-ssh-bridge.service` (new)

---

## Maintenance & Updates

**This plan will be updated with each commit to track progress:**
- Mark checkboxes as features are completed
- Add notes on implementation challenges
- Document deviations from original plan
- Track time spent per phase
