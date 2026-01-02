# NOC + FlaggerLink Master Implementation Plan

**Coordinating:** 4 major initiatives into one unified deployment strategy

**Created:** 2026-01-01
**Status:** Phase 1 (Secrets) COMPLETE ✅ | Template System IN PROGRESS
**Timeline:** 6 weeks total
**Team:** 2 developers
**Last Updated:** 2026-01-01

---

## Executive Summary

### What We're Building

Four interconnected systems that work together:

1. **NOC Core Platform** ✅ COMPLETE
   - Deploy FlaggerLink servers via web UI
   - Cloudflare Workers + Pages
   - DigitalOcean + DNS automation

2. **Template + Secret System** 🔄 PARTIAL - Secrets Complete ✅
   - Configuration templates in git ⏳
   - Secrets in Infisical ✅ (43 secrets entered)
   - Auto-injection on droplets ⏳

3. **Infisical Agent Integration** ⏳ PENDING
   - Dynamic secret sync (60s refresh)
   - No redeploy for secret changes
   - Free tier ($0/month)

4. **Maintenance System** ⏳ PENDING
   - OS/security updates via UI
   - SSH bridge for remote execution
   - Compliance audit logging

### Why This Order Matters

```
Week 1-2: Template System
    ↓ (Must have templates before Agent can use them)
Week 3-4: Infisical Agent
    ↓ (Must have Agent before Maintenance can manage it)
Week 5-6: Maintenance System
```

**Dependencies:**
- Infisical Agent needs templates → Must do Template System first
- Maintenance System manages Infisical Agent → Must do Agent first
- All depend on NOC Core → Already complete ✅

---

## The Big Picture

### Current State (Week 0)

```
✅ NOC Platform Running
   - Can deploy droplets
   - DNS auto-configured
   - Basic cloud-init provisioning

❌ Secrets in Git
   - production.json has 22 secrets
   - Security risk
   - Can't rotate without redeploy

❌ No Maintenance System
   - Manual SSH for updates
   - No audit trail
   - No UI for operations
```

### Target State (Week 6)

```
✅ Template-Based Configuration
   - Config templates in git
   - Secrets in Infisical
   - Auto-injection on droplets

✅ Infisical Agent Running
   - 60-second secret sync
   - Rotate secrets via UI
   - No redeploy needed

✅ Maintenance System Active
   - OS updates via NOC UI
   - Real-time output streaming
   - Full compliance logging
   - Infisical Agent ops (restart, status)
```

---

## Master Timeline

### Week 1-2: Template + Secret System

**Goal:** Separate secrets from configuration

| Day | Tasks | Owner | Status |
|-----|-------|-------|--------|
| **Mon** | Create production.TEMPLATE.json with placeholders | Dev 1 | ⏳ |
| **Mon** | Create staging.TEMPLATE.json with placeholders | Dev 1 | ⏳ |
| **Tue** | Build inject-secrets.sh helper script | Dev 1 | ⏳ |
| **Tue** | Test template + injection locally | Dev 1 | ⏳ |
| **Wed** | Audit current Infisical state | Dev 2 | ✅ |
| **Wed** | Generate missing secrets (passwords, keys) | Dev 2 | ✅ |
| **Thu** | Enter all 43 secrets into Infisical staging | Dev 2 | ✅ |
| **Thu** | Enter all 43 secrets into Infisical production | Dev 2 | ✅ |
| **Fri** | Test NOC fetch from Infisical | Both | ✅ |
| **Mon** | Update cloud-init to use templates | Dev 1 | ⏳ |
| **Tue** | Deploy test droplet with template system | Both | ⏳ |
| **Wed** | Verify secrets injected correctly | Both | ⏳ |
| **Thu** | Update .gitignore (block production.json) | Dev 1 | ⏳ |
| **Fri** | Commit templates to git | Dev 1 | ⏳ |

**Deliverables:**
- [ ] Templates committed to FlaggerLink repo
- [x] All secrets in Infisical (staging + production) - 43 secrets entered ✅
- [ ] Helper script working
- [ ] Test deployment successful
- [ ] Zero secrets in git

---

### Week 3-4: Infisical Agent Integration

**Goal:** Enable dynamic secret sync on droplets

| Day | Tasks | Owner | Status |
|-----|-------|-------|--------|
| **Mon** | Create machine identities (staging, prod) | Dev 1 | ⏳ |
| **Mon** | Store credentials in NOC config | Dev 1 | ⏳ |
| **Tue** | Update cloud-init to install Infisical Agent | Dev 1 | ⏳ |
| **Tue** | Add agent systemd service to cloud-init | Dev 1 | ⏳ |
| **Wed** | Update helper script for agent compatibility | Dev 1 | ⏳ |
| **Wed** | Test agent installation locally | Dev 1 | ⏳ |
| **Thu** | Deploy new staging droplet with agent | Both | ⏳ |
| **Thu** | Verify agent syncing secrets | Both | ⏳ |
| **Fri** | Test secret rotation on staging | Both | ⏳ |
| **Mon** | Full regression testing on staging | Dev 2 | ⏳ |
| **Tue** | Deploy new production droplet with agent | Both | ⏳ |
| **Wed** | Migrate production to new droplet | Both | ⏳ |
| **Thu** | Monitor production (48 hours begins) | Both | ⏳ |
| **Fri** | Document agent operations | Dev 1 | ⏳ |

**Deliverables:**
- [ ] Infisical Agent running on staging
- [ ] Infisical Agent running on production
- [ ] Secret rotation tested and working
- [ ] Production stable for 48 hours
- [ ] $0/month cost confirmed (free tier)

---

### Week 5-6: Maintenance System

**Goal:** Add OS update and server management capabilities

| Day | Tasks | Owner | Status |
|-----|-------|-------|--------|
| **Mon** | Create D1 database migration (3 tables) | Dev 2 | ⏳ |
| **Mon** | Run migration on NOC D1 database | Dev 2 | ⏳ |
| **Tue** | Create noc-ssh-bridge Node.js service | Dev 2 | ⏳ |
| **Tue** | Generate NOC SSH key, add to DigitalOcean | Dev 1 | ⏳ |
| **Wed** | Deploy SSH bridge to management server | Dev 2 | ⏳ |
| **Wed** | Test SSH bridge connectivity | Both | ⏳ |
| **Thu** | Update cloud-init to add SSH access | Dev 1 | ⏳ |
| **Thu** | Add SSH_BRIDGE_URL to Cloudflare secrets | Dev 2 | ⏳ |
| **Fri** | Build maintenance API endpoints | Dev 2 | ⏳ |
| **Mon** | Build MaintenanceTab.vue UI | Dev 2 | ⏳ |
| **Tue** | Add Infisical Agent operations to UI | Dev 2 | ⏳ |
| **Wed** | Test OS updates on staging | Both | ⏳ |
| **Thu** | Test Infisical Agent restart via UI | Both | ⏳ |
| **Fri** | Full integration testing | Both | ⏳ |

**Deliverables:**
- [ ] SSH bridge operational
- [ ] Maintenance UI functional
- [ ] OS updates working via NOC
- [ ] Infisical Agent ops available
- [ ] Audit logging enabled
- [ ] Documentation complete

---

## Dependency Matrix

### What Depends on What

```
Template System
    ↓ REQUIRES
    ├─ NOC Core (COMPLETE ✅)
    └─ Infisical account setup

Infisical Agent
    ↓ REQUIRES
    ├─ Template System (creates templates)
    ├─ Machine identities created
    └─ Cloud-init updated

Maintenance System
    ↓ REQUIRES
    ├─ NOC Core (COMPLETE ✅)
    ├─ Infisical Agent (to manage agent ops)
    ├─ SSH bridge deployed
    └─ D1 database migration
```

### Parallel Work Opportunities

**Week 1-2:** Both devs work on templates/secrets
**Week 3-4:** Dev 1 (Agent), Dev 2 (Testing)
**Week 5-6:** Dev 2 (Maintenance), Dev 1 (Support)

---

## Critical Path

```
1. Create Templates → 2 days
   ↓
2. Populate Infisical → 2 days
   ↓
3. Deploy Test with Templates → 1 day
   ↓ MILESTONE: Templates Working
   ↓
4. Add Infisical Agent → 3 days
   ↓
5. Deploy Staging with Agent → 2 days
   ↓
6. Deploy Production with Agent → 3 days
   ↓ MILESTONE: Agent Running
   ↓
7. Build Maintenance System → 5 days
   ↓
8. Integration Testing → 2 days
   ↓ MILESTONE: All Systems Operational
```

**Total Critical Path:** 20 days (4 weeks)
**Buffer:** 2 weeks (6 weeks total)

---

## Key Milestones

### Milestone 1: Templates Committed (End of Week 2)
- ✅ Zero secrets in git
- ✅ Templates in FlaggerLink repo
- ✅ All secrets in Infisical
- ✅ Test deployment works

**Exit Criteria:**
- [ ] Can deploy droplet with injected secrets
- [ ] Services start successfully
- [ ] No secrets visible in git history

---

### Milestone 2: Infisical Agent Running (End of Week 4)
- ✅ Agent syncing on staging
- ✅ Agent syncing on production
- ✅ Secret rotation tested
- ✅ Old droplets decommissioned

**Exit Criteria:**
- [ ] Change secret in Infisical UI
- [ ] Droplet updates within 60 seconds
- [ ] Service auto-restarts with new secret
- [ ] Production stable for 48 hours

---

### Milestone 3: Full Platform Complete (End of Week 6)
- ✅ Maintenance system operational
- ✅ OS updates via NOC UI
- ✅ Infisical Agent manageable via UI
- ✅ Audit logging functional

**Exit Criteria:**
- [ ] Execute OS update via NOC UI
- [ ] Real-time output visible
- [ ] Audit log entry created
- [ ] Restart Infisical Agent via UI
- [ ] Force secret sync via UI

---

## File Structure Changes

### FlaggerLink Repo

```
/mnt/c/source/FlaggerLink/
├── config/
│   └── environments/
│       ├── production.TEMPLATE.json      (NEW - git tracked)
│       ├── staging.TEMPLATE.json         (NEW - git tracked)
│       ├── production.json               (BLOCKED - .gitignore)
│       └── staging.json                  (BLOCKED - .gitignore)
├── deployment/
│   └── scripts/
│       └── inject-secrets.sh             (NEW - helper script)
└── .gitignore                            (UPDATED - block configs)
```

### NOC Repo

```
/mnt/c/source/NOC/
├── docs/
│   ├── MASTER_IMPLEMENTATION_PLAN.md            (NEW - this file)
│   ├── TEMPLATE_SECRET_INJECTION_PLAN.md        (NEW)
│   ├── INFISICAL_SECRET_INVENTORY.md            (NEW)
│   ├── CLOUD_INIT_SPECIFICATION.md              (NEW - versions)
│   └── NOC_MAINTENANCE_SYSTEM_PLAN.md           (EXISTING)
├── worker/
│   ├── src/
│   │   ├── lib/
│   │   │   └── cloud-init.ts                    (UPDATED - v3)
│   │   └── services/
│   │       ├── ssh.ts                           (NEW - SSH bridge client)
│   │       └── database.ts                      (UPDATED - maintenance tables)
│   └── migrations/
│       └── 002_add_maintenance_system.sql       (NEW)
├── frontend/
│   └── src/
│       └── components/
│           └── tabs/
│               └── MaintenanceTab.vue           (NEW)
└── noc-ssh-bridge/                              (NEW - separate service)
    ├── index.js
    ├── package.json
    └── .env.example
```

---

## Cloud-Init Evolution

### Version 1 (Current - Week 0)
```yaml
✅ Install .NET, nginx, Redis, RabbitMQ
✅ Write static secrets to /opt/flaggerlink/secrets/.env
❌ No Infisical Agent
❌ No SSH access for NOC
```

### Version 2 (Week 2 - Templates)
```yaml
✅ Install .NET, nginx, Redis, RabbitMQ
✅ Copy templates from FlaggerLink repo
✅ Run inject-secrets.sh helper
❌ No Infisical Agent (still one-time injection)
❌ No SSH access for NOC
```

### Version 3 (Week 4 - Infisical Agent)
```yaml
✅ Install .NET, nginx, Redis, RabbitMQ
✅ Install Infisical Agent
✅ Configure agent with machine identity
✅ Agent auto-syncs secrets every 60s
✅ Agent watches templates and regenerates configs
❌ No SSH access for NOC
```

### Version 4 (Week 6 - Maintenance)
```yaml
✅ Install .NET, nginx, Redis, RabbitMQ
✅ Install Infisical Agent
✅ Configure agent with machine identity
✅ Agent auto-syncs secrets every 60s
✅ Add NOC SSH public key to authorized_keys
✅ Configure firewall for NOC SSH bridge
```

---

## Testing Strategy

### Week 2: Template System Testing
- [ ] Unit test: inject-secrets.sh with sample data
- [ ] Integration test: Deploy test droplet
- [ ] Validation test: Verify all 22 secrets injected
- [ ] Security test: Confirm no secrets in git

### Week 4: Infisical Agent Testing
- [ ] Unit test: Agent authentication
- [ ] Integration test: Secret sync to droplet
- [ ] Rotation test: Change secret, verify auto-update
- [ ] Stress test: Multiple secrets changing simultaneously
- [ ] Failure test: Infisical down, verify fallback

### Week 6: Maintenance System Testing
- [ ] Unit test: SSH bridge command execution
- [ ] Integration test: OS update via UI
- [ ] Compliance test: Audit log entries created
- [ ] Agent ops test: Restart/sync Infisical Agent
- [ ] Load test: Multiple concurrent updates

---

## Rollback Procedures

### If Templates Fail (Week 2)
1. Revert cloud-init to Version 1
2. Use static secrets approach
3. Fix template issues offline
4. Retry when ready

### If Infisical Agent Fails (Week 4)
1. Keep cloud-init Version 2 (templates work)
2. Use one-time secret injection
3. Debug agent issues
4. Upgrade to Version 3 when fixed

### If Maintenance System Fails (Week 6)
1. Core platform still works
2. Fall back to manual SSH
3. Fix maintenance system independently
4. No impact on secret management

---

## Security Considerations

### Secrets Management
- ✅ Secrets never in git after Week 2
- ✅ Infisical free tier (2 staging/prod environments, 4 identities)
- ✅ Secrets auto-rotate without redeploy
- ✅ Audit trail in Infisical

### SSH Bridge
- ✅ Isolated server with firewall
- ✅ Only accessible from Cloudflare Worker IPs
- ✅ Strong authentication token
- ✅ All commands logged for compliance

### Cloud-Init
- ✅ Templates public (no secrets)
- ✅ Machine identity credentials passed securely
- ✅ SSL certificates handled properly
- ✅ File permissions set correctly

---

## Cost Analysis

### One-Time Costs
| Item | Cost | When |
|------|------|------|
| Development time (80 hours) | $0 (internal) | Weeks 1-6 |
| SSH bridge server | $6/month | Week 5 |

### Recurring Costs
| Item | Monthly | Annual |
|------|---------|--------|
| Infisical (Free Plan) | $0 | $0 |
| SSH bridge droplet | $6 | $72 |
| **TOTAL** | **$6/month** | **$72/year** |

### Cost Savings
| Item | Annual Savings |
|------|----------------|
| Manual secret rotation time | $2,000+ |
| Security incident prevention | Invaluable |
| Compliance automation | $1,000+ |

**ROI:** 4,000%+ (minimal cost, massive value)

---

## Success Criteria

### Phase 1: Templates (Week 2)
- [ ] Zero secrets committed to git
- [ ] Can deploy droplet with templates
- [ ] All 22 secrets in Infisical
- [ ] Test deployment successful

### Phase 2: Infisical Agent (Week 4)
- [ ] Agent running on staging and production
- [ ] Secret rotation works without redeploy
- [ ] Production stable for 48 hours
- [ ] Free tier confirmed ($0/month)

### Phase 3: Maintenance (Week 6)
- [ ] OS updates work via NOC UI
- [ ] SSH bridge secure and functional
- [ ] Audit logs capturing actions
- [ ] Infisical Agent manageable via UI
- [ ] Full integration tested

---

## Risk Assessment

### High Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| Template system breaks deployment | HIGH | Thorough testing, rollback plan |
| Infisical Agent doesn't sync | HIGH | Fallback to static injection |
| SSH bridge security issue | HIGH | Strict firewall, token auth |

### Medium Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| Multi-line secret handling | MEDIUM | Base64 encoding, testing |
| Service restart delays | MEDIUM | Graceful restart, health checks |
| Infisical free tier limits | MEDIUM | Only 2 envs, 4 identities (fits) |

### Low Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| Git history contains old secrets | LOW | Rotate all secrets anyway |
| Template syntax confusion | LOW | Clear documentation |

---

## Open Questions

Need decisions before proceeding:

1. **Template Placeholder Syntax**
   - Option A: `{{SECRET_KEY}}`
   - Option B: `${SECRET_KEY}`
   - **Recommendation:** `{{SECRET_KEY}}` (less likely to conflict)

2. **Multi-Line Secrets (SSL Certs)**
   - Option A: Base64 encode in Infisical
   - Option B: Escape newlines as `\n`
   - **Recommendation:** Base64 (cleaner, safer)

3. **Service Auto-Restart**
   - Option A: Auto-restart on secret change
   - Option B: Manual restart required
   - **Recommendation:** Auto-restart (Infisical Agent supports this)

4. **Emergency Fallback**
   - Option A: Keep old production.json on droplet
   - Option B: Rely on git history only
   - **Recommendation:** Keep for 30 days, then remove

5. **Separate Templates Per Service**
   - Option A: One template for all services
   - Option B: Separate templates (api, portal, texting)
   - **Recommendation:** Separate (better organization)

---

## Next Actions

### Immediate (This Week)
1. **Review this master plan** - Get team approval
2. **Answer open questions** - Make final decisions
3. **Begin Week 1** - Create templates

### Week 1 Checklist
- [ ] Create production.TEMPLATE.json
- [ ] Create staging.TEMPLATE.json
- [ ] Build inject-secrets.sh script
- [ ] Test locally

### Communication
- [ ] Schedule weekly sync meetings
- [ ] Create Slack channel: #noc-implementation
- [ ] Document decisions in this file
- [ ] Update progress weekly

---

## Team Responsibilities

### Developer 1 (Infrastructure Focus)
- Cloud-init modifications
- Infisical Agent integration
- Helper script development
- NOC backend updates

### Developer 2 (Application Focus)
- Secret inventory and entry
- Infisical UI configuration
- Testing and validation
- Maintenance system frontend

### Both Developers
- Code reviews
- Testing
- Documentation
- Deployment

---

## Documentation Requirements

By end of project:
- [ ] Cloud-init specification (all versions)
- [ ] Secret inventory (complete list)
- [ ] Template creation guide
- [ ] Infisical Agent operations guide
- [ ] Maintenance system user guide
- [ ] Troubleshooting guide
- [ ] Runbooks for common tasks

---

## Success Metrics

### After 1 Month
- Zero secrets in git
- Zero security incidents
- 100% uptime
- < 5 min secret rotation time

### After 3 Months
- 20+ secret rotations performed
- 10+ OS updates via maintenance system
- Zero manual SSH sessions needed
- Full audit trail maintained

---

**Status:** Phase 1 (Secrets) Complete ✅ - Template System In Progress
**Start Date:** Week of 2026-01-01 (Started)
**Target Completion:** Week of 2026-02-17
**Last Updated:** 2026-01-01

---

## Additional Work Completed

### Modular Deployment System (Parallel Track)

While working on secret management, we also implemented a modular deployment architecture:

**Phase 2 Complete ✅ (2026-01-01)**
- Database migration: Added `deployment_profile` column
- API updated: Accepts `deployment_profile` parameter (CORE | FULL)
- Cloud-init updated: Conditional directory creation based on profile
- Frontend updated: Deployment profile selector UI
- Documentation: MODULAR_DEPLOYMENT_STATUS.md created

**Deployment Profiles:**
- **CORE (default):** Uses centralized portal.flaggerlink.com (worker servers)
- **FULL:** Deploys dedicated Portal API + UserPortal (standalone systems)

**Commits:**
- `791bd62` - Add deployment profile support to NOC platform
- `c57474b` - Add Phase 1 secret management and implementation planning docs

**See:** `MODULAR_DEPLOYMENT_STATUS.md` for complete details
